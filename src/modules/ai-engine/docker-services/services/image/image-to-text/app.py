"""
HuggingFace Image to Text Service

This module provides a FastAPI-based service for running HuggingFace image-to-text tasks.
"""

from fastapi import FastAPI, HTTPException, status, APIRouter, UploadFile, File
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Union, List, Optional
import logging
from transformers import pipeline
from PIL import Image
import io
import torch
import numpy as np

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    force=True,
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="HuggingFace Image to Text Service",
    description="API for HuggingFace image-to-text tasks",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter(prefix="/image-image-to-text")

TASK_CACHE: Dict[str, Any] = {}

class ImageToTextRequest(BaseModel):
    """Request model for image-to-text tasks.
    
    Attributes:
        model: Optional model name to override the default model
        parameters: Optional dictionary of task-specific parameters
    """
    model: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None

class ImageToTextResponse(BaseModel):
    """Response model for image-to-text results.
    
    Attributes:
        result: The generated text from the image
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
    """Load and cache the image-to-text pipeline."""
    cache_key = "image-to-text"
    if cache_key not in TASK_CACHE:
        logger.info("Loading image-to-text pipeline...")
        TASK_CACHE[cache_key] = pipeline(
            task="image-to-text",
            model="nlpconnect/vit-gpt2-image-captioning"
        )
    return TASK_CACHE[cache_key]

@router.get("/health", response_class=PlainTextResponse)
async def health() -> str:
    """Health check endpoint."""
    return "healthy"

@router.post("/run", response_model=ImageToTextResponse)
async def run(
    file: UploadFile = File(..., description="Image file to process"),
    request: Optional[ImageToTextRequest] = None
) -> ImageToTextResponse:
    """Run image-to-text on the uploaded image.
    
    Args:
        file: The image file to process
        request: Optional parameters including model and processing parameters
    """
    try:
        # Read and validate the image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # Load the pipeline
        model = load_pipeline()
        
        # Get parameters from request or use defaults
        params = (request.parameters if request else None) or {}
        
        # Process the image
        result = model(image, **params)
        processed_result = process_item(result)
        
        return ImageToTextResponse(result=processed_result)
        
    except Exception as e:
        logger.error(f"Error processing image-to-text: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing image-to-text"
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
