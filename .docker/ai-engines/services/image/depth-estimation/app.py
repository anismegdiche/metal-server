"""
HuggingFace Depth Estimation Service

This module provides a FastAPI-based service for running HuggingFace depth estimation.
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
    title="HuggingFace Depth Estimation Service",
    description="API for HuggingFace depth estimation",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter(prefix="/image-depth-estimation")

TASK_CACHE: Dict[str, Any] = {}

class DepthEstimationRequest(BaseModel):
    """Request model for depth estimation.
    
    Attributes:
        model: Optional model name to override the default model
        parameters: Optional dictionary of task-specific parameters
    """
    model: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None

class DepthEstimationResponse(BaseModel):
    """Response model for depth estimation results.
    
    Attributes:
        result: The depth estimation result including depth map and metadata
    """
    result: Any

def process_item(item: Any) -> Any:
    """Convert various types to JSON-serializable formats."""
    if isinstance(item, dict):
        return {str(k): process_item(v) for k, v in item.items()}
    if isinstance(item, list):
        return [process_item(i) for i in item]
    if isinstance(item, torch.Tensor):
        return item.tolist()
    if isinstance(item, np.ndarray):
        return item.tolist()
    if isinstance(item, (np.int64, np.int32, np.float32, np.float64)):
        return item.item()
    if isinstance(item, Image.Image):
        # Convert PIL Image to base64 string
        buffered = BytesIO()
        item.save(buffered, format="PNG")
        return {
            "__type__": "image",
            "format": "png",
            "data": base64.b64encode(buffered.getvalue()).decode('utf-8')
        }
    return item

def load_pipeline() -> Any:
    """Load and cache the depth estimation pipeline."""
    cache_key = "depth-estimation"
    if cache_key not in TASK_CACHE:
        logger.info("Loading depth estimation pipeline...")
        TASK_CACHE[cache_key] = pipeline(
            task="depth-estimation",
            model="Intel/dpt-large"
        )
    return TASK_CACHE[cache_key]

@router.get("/health", response_class=PlainTextResponse)
async def health() -> str:
    """Health check endpoint."""
    return "healthy"

@router.post("/run", response_model=DepthEstimationResponse)
async def run(
    file: UploadFile = File(..., description="Image file to process"),
    request: Optional[DepthEstimationRequest] = None
) -> DepthEstimationResponse:
    """Run depth estimation on the uploaded image.
    
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
        
        return DepthEstimationResponse(result=processed_result)
        
    except Exception as e:
        logger.error(f"Error processing depth estimation: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing depth estimation"
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
