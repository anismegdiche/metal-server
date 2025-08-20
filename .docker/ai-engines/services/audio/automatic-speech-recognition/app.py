"""
HuggingFace Automatic Speech Recognition Service

This module provides a FastAPI-based service for running HuggingFace automatic speech recognition.
"""

from fastapi import FastAPI, HTTPException, status, APIRouter
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
import logging
from transformers import pipeline
import soundfile as sf
import numpy as np
import io
import base64
from io import BytesIO

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    force=True,
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="HuggingFace Automatic Speech Recognition Service",
    description="API for HuggingFace automatic speech recognition",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter(prefix="/audio-automatic-speech-recognition")

TASK_CACHE: Dict[str, Any] = {}
# MODEL = "facebook/wav2vec2-base-960h"
MODEL = "openai/whisper-base"

class ASRRequest(BaseModel):
    """Request model for automatic speech recognition.
    
    Attributes:
        input_data: Base64-encoded audio data (required)
        model: Optional model name to override the default model
        parameters: Optional dictionary of task-specific parameters
    """
    input_data: str = Field(
        ...,
        description="Base64-encoded audio data. Must be a valid audio format (WAV, MP3, etc.)"
    )
    model: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None

class ASRResponse(BaseModel):
    """Response model for ASR results.
    
    Attributes:
        result: The transcription result including text and metadata
    """
    result: Any

def process_item(item: Any) -> Any:
    """Convert tensors and NumPy types to native Python types for JSON serialization."""
    if isinstance(item, dict):
        return {str(k): process_item(v) for k, v in item.items()}
    if isinstance(item, list):
        return [process_item(i) for i in item]
    return item

def load_pipeline() -> Any:
    """Load and cache the automatic speech recognition pipeline."""
    cache_key = "automatic-speech-recognition"
    if cache_key not in TASK_CACHE:
        logger.info("Loading automatic speech recognition pipeline...")
        TASK_CACHE[cache_key] = pipeline(
            task="automatic-speech-recognition",
            model=MODEL
        )
    return TASK_CACHE[cache_key]

@router.get("/health", response_class=PlainTextResponse)
async def health() -> str:
    """Health check endpoint."""
    return "healthy"

@router.post("/run", response_model=ASRResponse)
async def run(
    request: ASRRequest
) -> ASRResponse:
    """Run automatic speech recognition on the provided audio data.
    
    Args:
        request: Request containing base64-encoded audio data and optional parameters
    """
    try:
        # Decode base64 audio
        audio_data = base64.b64decode(request.input_data)
        
        # Convert to numpy array using soundfile
        with io.BytesIO(audio_data) as audio_file:
            audio_array, sample_rate = sf.read(audio_file, always_2d=False)
            
            # Convert to mono if stereo
            if len(audio_array.shape) > 1:
                audio_array = np.mean(audio_array, axis=1)
            
            # Get the pipeline and run inference
            pipe = load_pipeline()
            result = pipe(
                {"array": audio_array, "sampling_rate": sample_rate},
                **({} if request.parameters is None else request.parameters)
            )
            
            # Process the result
            processed_result = process_item(result)
            
            return ASRResponse(result=processed_result)
            
    except Exception as e:
        logger.error(f"Error processing speech recognition: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing speech recognition: {str(e)}"
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
