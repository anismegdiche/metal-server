"""
HuggingFace Audio Classification Service

This module provides a FastAPI-based service for running HuggingFace audio classification.
"""

from fastapi import FastAPI, HTTPException, status, APIRouter, UploadFile, File
from fastapi.responses import PlainTextResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional, Union
import logging
import os
import psutil
import io
import tempfile
import time
import json
import numpy as np

# CPU monitoring history
CPU_HISTORY: List[float] = []
MAX_HISTORY = int(os.getenv("MAX_HISTORY", 5))
MAX_LOAD = float(os.getenv("MAX_LOAD", 70))

# Initialize psutil to get accurate readings later
# Using Process().cpu_percent() provides usage relative to one CPU core (100% = 1 core)
# which is consistent with Docker monitoring and container limits.
process = psutil.Process()
process.cpu_percent(interval=None)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    force=True,
)
logger = logging.getLogger(__name__)

# FastAPI app and CORS
app = FastAPI(
    title="HuggingFace Audio Classification Service",
    description="API for HuggingFace audio classification",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter(prefix="/audio-audio-classification")

# Model cache
PIPELINE_CACHE: Dict[str, Any] = {}

# Default model configuration
DEFAULT_MODEL = "superb/hubert-large-superb-er"

class AudioTaskRequest(BaseModel):
    """Request model for audio classification."""
    input_data: str = Field(
        ...,
        description="Base64-encoded audio data. Must be a valid audio format (WAV, MP3, etc.)"
    )
    model: Optional[str] = Field(
        default=None,
        description="Optional model name to override the default model"
    )
    parameters: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Additional parameters for the pipeline"
    )

class AudioClassificationResponse(BaseModel):
    """Response model for audio classification results.
    
    Attributes:
        result: The classification results including labels and scores
    """
    result: Any

def process_item(item: Any) -> Any:
    """Convert tensors and NumPy types to native Python types for JSON serialization."""
    if isinstance(item, dict):
        return {str(k): process_item(v) for k, v in item.items()}
    if isinstance(item, list):
        return [process_item(i) for i in item]
    return item

def load_pipeline(model_name: Optional[str] = None) -> Any:
    """Load and cache the audio classification pipeline.
    
    Args:
        model_name: Optional model name to override the default model
    """
    model_to_use = model_name or DEFAULT_MODEL
    if model_to_use not in PIPELINE_CACHE:
        logger.info(f"Loading audio classification pipeline with model: {model_to_use}")
        try:
            from transformers import pipeline
            PIPELINE_CACHE[model_to_use] = pipeline(
                task="audio-classification",
                model=model_to_use
            )
        except Exception as e:
            logger.error(f"Error loading pipeline: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to load pipeline: {str(e)}"
            )
    return PIPELINE_CACHE[model_to_use]

@router.get("/health", response_class=PlainTextResponse)
async def health() -> str:
    """Health check endpoint."""
    return "healthy"

class AudioRequest(BaseModel):
    """Request model for audio classification."""
    input_data: str = Field(..., description="Base64 encoded audio data")
    params: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Additional parameters for the pipeline"
    )

@router.post("/run", response_model=AudioClassificationResponse)
async def run_audio_classification(
    request: AudioRequest,
    model: Optional[str] = None
) -> AudioClassificationResponse:
    """Run audio classification on the provided audio data.
    
    Args:
        request: The request containing base64 audio data and parameters
        model: Optional model name to override the default
    """
    # Update CPU history with a new snapshot (per-process usage)
    current_cpu = process.cpu_percent(interval=None)
    CPU_HISTORY.append(current_cpu)
    if len(CPU_HISTORY) > MAX_HISTORY:
        CPU_HISTORY.pop(0)
    
    # Calculate average
    avg_cpu = sum(CPU_HISTORY) / len(CPU_HISTORY)

    logger.info(f"ℹ️ Average CPU usage: {avg_cpu:.2f}%")
    
    if avg_cpu > MAX_LOAD:
        logger.warning(f"⚠️ Average CPU usage too high: {avg_cpu:.2f}%")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Server is overloaded. Please try again later.",
            headers={"Retry-After": "15"}
        )

    try:
        import base64
        
        # Decode base64 audio data
        try:
            audio_data = base64.b64decode(request.input_data)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid base64 data: {str(e)}"
            )
        
        # Save to a temporary file for processing
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            tmp.write(audio_data)
            tmp_path = tmp.name
        
        try:
            # Load the pipeline with the specified model
            pipe = load_pipeline(model)
            
            # Run inference
            result = pipe(tmp_path, **request.params)
            
            # Process the result for JSON serialization
            processed_result = process_item(result)
            
            return AudioClassificationResponse(result=processed_result)
            
        finally:
            # Clean up the temporary file
            try:
                os.unlink(tmp_path)
            except Exception as e:
                logger.warning(f"Failed to delete temporary file {tmp_path}: {e}")
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing audio classification: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing audio classification: {str(e)}"
        )

app.include_router(router)

# ------------------------
# CLI Entry Point
# ------------------------

if __name__ == "__main__":
    import argparse
    import uvicorn
    
    parser = argparse.ArgumentParser()
    parser.add_argument('--load-pipe', action='store_true', help='Load pipeline and exit')
    args = parser.parse_args()
    
    if args.load_pipe:
        load_pipeline()
        exit(0)
    
    uvicorn.run(app, host="0.0.0.0", port=5000)
