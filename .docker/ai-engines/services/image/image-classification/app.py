"""
HuggingFace Image Classification Service

This module provides a FastAPI-based service for running HuggingFace image classification.
"""

from fastapi import FastAPI, HTTPException, status, APIRouter
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any, Union, List, Optional
import logging
import os
from transformers import pipeline
from PIL import Image
import psutil
import io
import torch
import numpy as np
import base64
from io import BytesIO

# CPU monitoring history
CPU_HISTORY: List[float] = []
MAX_HISTORY = int(os.getenv("MAX_HISTORY", 5))
MAX_LOAD = float(os.getenv("MAX_LOAD", 70))

# Initialize psutil to get accurate readings later
# Using Process().cpu_percent() provides usage relative to one CPU core (100% = 1 core)
# which is consistent with Docker monitoring and container limits.
process = psutil.Process()
process.cpu_percent(interval=None)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    force=True,
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="HuggingFace Image Classification Service",
    description="API for HuggingFace image classification",
    version="1.0.0"
)
# CORS configuration - restrict origins for better security
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS if origin.strip()]

ALLOWED_METHODS = os.getenv("ALLOWED_METHODS", "*").split(",")
ALLOWED_METHODS = [method.strip() for method in ALLOWED_METHODS if method.strip()]

ALLOWED_HEADERS = os.getenv("ALLOWED_HEADERS", "*").split(",")
ALLOWED_HEADERS = [header.strip() for header in ALLOWED_HEADERS if header.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=ALLOWED_METHODS,
    allow_headers=ALLOWED_HEADERS,
)

router = APIRouter(prefix="/image-image-classification")

TASK_CACHE: Dict[str, Any] = {}

class ImageClassificationRequest(BaseModel):
    """Request model for image classification.
    
    Attributes:
        input_data: Base64-encoded image data (required)
        model: Optional model name to override the default model
        parameters: Optional dictionary of task-specific parameters
    """
    input_data: str = Field(
        ...,
        description="Base64-encoded image data. Must be a valid image format (JPEG, PNG, etc.)"
    )
    model: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None

class ImageClassificationResponse(BaseModel):
    """Response model for image classification results.
    
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

def load_pipeline() -> Any:
    """Load and cache the image classification pipeline."""
    cache_key = "image-classification"
    if cache_key not in TASK_CACHE:
        logger.info("Loading image classification pipeline...")
        TASK_CACHE[cache_key] = pipeline(
            task="image-classification",
            model="google/vit-base-patch16-224"
        )
    return TASK_CACHE[cache_key]

@router.get("/health", response_class=PlainTextResponse)
async def health() -> str:
    """Health check endpoint."""
    return "healthy"

def process_image(image_data: bytes) -> Image.Image:
    """Process image data into a PIL Image.
    
    Args:
        image_data: Raw image data bytes
        
    Returns:
        PIL.Image: The processed image
    """
    try:
        # Ensure we're working with raw bytes
        if hasattr(image_data, 'read'):  # If it's a file-like object
            image_data = image_data.read()
        
        # Convert to bytes if it's a string
        if isinstance(image_data, str):
            image_data = image_data.encode('latin-1')
            
        # Create a BytesIO object and open the image
        image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
            
        return image
    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image data: {str(e)}"
        )

@router.post("/run", response_model=ImageClassificationResponse)
async def run(
    request: ImageClassificationRequest
) -> ImageClassificationResponse:
    """Run image classification on base64-encoded image data.
    
    Args:
        request: Request containing base64-encoded image data and optional parameters
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
        # Handle base64 input
        try:
            if "," in request.input_data:
                # Handle data URL format: data:image/...;base64,...
                image_data = request.input_data.split(",", 1)[1]
            else:
                image_data = request.input_data
            contents = base64.b64decode(image_data)
            image = process_image(contents)
        except Exception as e:
            logger.error(f"Error decoding base64 image: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid base64 image data: {str(e)}"
            )
        
        # Load the pipeline
        model = load_pipeline()
        
        # Get parameters from request or use defaults
        params = (request.parameters if request else None) or {}
        
        # Process the image
        result = model(image, **params)
        processed_result = process_item(result)
        
        return ImageClassificationResponse(result=processed_result)
        
    except Exception as e:
        logger.error(f"Error processing image classification: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing image classification"
        )

app.include_router(router)

# ------------------------
# CLI Entry Point
# ------------------------

if __name__ == "__main__":
    import argparse
    import sys

    parser = argparse.ArgumentParser(description="Image Classification utility")
    parser.add_argument("--load-pipe", action="store_true", help="Load the pipeline and exit")
    args = parser.parse_args()
    
    if args.load_pipe:
        try:
            load_pipeline()
            print("Pipeline loaded successfully.")
            sys.exit(0)
        except Exception as e:
            print(f"Failed to load pipeline: {str(e)}")
            sys.exit(1)
