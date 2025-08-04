"""
HuggingFace Object Detection Service

This module provides a FastAPI-based service for running HuggingFace object detection.
"""

from fastapi import FastAPI, HTTPException, status, APIRouter
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any, Union, List, Optional
import logging
from transformers import pipeline
from PIL import Image
import io
import torch
import numpy as np
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
    title="HuggingFace Object Detection Service",
    description="API for HuggingFace object detection",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter(prefix="/image-object-detection")

TASK_CACHE: Dict[str, Any] = {}

class ObjectDetectionRequest(BaseModel):
    """Request model for object detection.
    
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

class ObjectDetectionResponse(BaseModel):
    """Response model for object detection results.
    
    Attributes:
        result: The detection results including bounding boxes and labels
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
    """Load and cache the object detection pipeline."""
    cache_key = "object-detection"
    if cache_key not in TASK_CACHE:
        logger.info("Loading object detection pipeline...")
        TASK_CACHE[cache_key] = pipeline(
            task="object-detection",
            model="facebook/detr-resnet-50"
        )
    return TASK_CACHE[cache_key]

@router.get("/health", response_class=PlainTextResponse)
async def health() -> str:
    """Health check endpoint."""
    return "healthy"

@router.post("/run", response_model=ObjectDetectionResponse)
async def run(
    request: ObjectDetectionRequest
) -> ObjectDetectionResponse:
    """Run object detection on the provided image data.
    
    Args:
        request: Request containing base64-encoded image data and optional parameters
    """
    try:
        # Decode base64 image
        image_data = base64.b64decode(request.input_data)
        image = Image.open(BytesIO(image_data)).convert("RGB")
        
        # Get the pipeline and run inference
        pipe = load_pipeline()
        result = pipe(image, **({} if request.parameters is None else request.parameters))
        
        # Process the result
        processed_result = process_item(result)
        
        return ObjectDetectionResponse(result=processed_result)
        
    except Exception as e:
        logger.error(f"Error processing object detection: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing object detection"
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
