"""
HuggingFace Image Segmentation Service

This module provides a FastAPI-based service for running HuggingFace image segmentation.
"""

from fastapi import FastAPI, HTTPException, status, APIRouter
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any, Union, List, Optional
import logging
import os
from transformers import SegformerImageProcessor, SegformerForSemanticSegmentation
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
    title="HuggingFace Image Segmentation Service",
    description="API for HuggingFace image segmentation",
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

router = APIRouter(prefix="/image-image-segmentation")

TASK_CACHE: Dict[str, Any] = {}

class ImageSegmentationRequest(BaseModel):
    """Request model for image segmentation.
    
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

class SegmentationMask(BaseModel):
    """Individual segmentation mask data."""
    score: Optional[float]
    label: str
    mask: str  # Base64 encoded mask

class ImageSegmentationResponse(BaseModel):
    """Response model for image segmentation results.
    
    Attributes:
        masks: List of segmentation masks with scores and labels
        model: Name of the model used for inference
    """
    masks: List[SegmentationMask]
    model: str

def process_item(item: Any) -> Any:
    """Convert tensors, NumPy types, and PIL Images to JSON-serializable types."""
    if isinstance(item, dict):
        return {str(k): process_item(v) for k, v in item.items()}
    if isinstance(item, list):
        return [process_item(i) for i in item]
    if isinstance(item, Image.Image):
        # Convert PIL Image to base64 string
        buffered = BytesIO()
        item.save(buffered, format="PNG")
        return {
            "_type": "pil_image",
            "data": base64.b64encode(buffered.getvalue()).decode('utf-8'),
            "format": "png"
        }
    if isinstance(item, np.integer):
        return int(item)
    if isinstance(item, np.floating):
        return float(item)
    if isinstance(item, np.ndarray):
        return item.tolist()
    if torch.is_tensor(item):
        return item.cpu().numpy().tolist()
    return item

def process_image(image_data: bytes) -> Image.Image:
    """Process image data into a PIL Image.
    
    Args:
        image_data: Raw image data bytes or base64 string
        
    Returns:
        PIL.Image: The processed image
    """
    try:
        # Ensure we're working with raw bytes
        if hasattr(image_data, 'read'):  # If it's a file-like object
            image_data = image_data.read()
        
        # Convert to bytes if it's a string (base64)
        if isinstance(image_data, str):
            if "," in image_data:
                # Handle data URL format: data:image/...;base64,...
                image_data = image_data.split(",", 1)[1]
            image_data = base64.b64decode(image_data)
            
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

def load_pipeline() -> Any:
    """Load and cache the SegFormer model and processor.
    
    Returns:
        A dictionary containing the model, processor, and model name
    """
    cache_key = "image-segmentation"
    if cache_key not in TASK_CACHE:
        logger.info("Loading SegFormer model and processor...")
        try:
            model_name = "nvidia/segformer-b0-finetuned-ade-512-512"
            device = "cuda" if torch.cuda.is_available() else "cpu"
            
            # Load model and processor
            processor = SegformerImageProcessor.from_pretrained(model_name)
            model = SegformerForSemanticSegmentation.from_pretrained(model_name).to(device)
            model.eval()
            
            TASK_CACHE[cache_key] = {
                'model': model,
                'processor': processor,
                'model_name': model_name,
                'device': device
            }
            logger.info(f"Successfully loaded {model_name} on {device}")
        except Exception as e:
            logger.error(f"Failed to load model: {str(e)}")
            raise
    return TASK_CACHE[cache_key]

@router.get("/health", response_class=PlainTextResponse)
async def health() -> str:
    """Health check endpoint."""
    return "healthy"

@router.post("/run", response_model=ImageSegmentationResponse)
async def run(
    request: ImageSegmentationRequest
) -> ImageSegmentationResponse:
    """Run image segmentation on base64-encoded image data.
    
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
            image = process_image(request.input_data)
        except HTTPException as e:
            raise e
        except Exception as e:
            logger.error(f"Error processing base64 image: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid base64 image data: {str(e)}"
            )
        
        # Load the model and processor
        model_data = load_pipeline()
        
        # Process the image
        inputs = model_data['processor'](images=image, return_tensors="pt").to(model_data['device'])
        
        with torch.no_grad():
            outputs = model_data['model'](**inputs)
        
        # Get the predicted segmentation map
        logits = outputs.logits  # shape (batch_size, num_labels, height/4, width/4)
        upsampled_logits = torch.nn.functional.interpolate(
            logits,
            size=image.size[::-1],  # (height, width)
            mode='bilinear',
            align_corners=False
        )
        
        # Get the predicted class for each pixel
        predicted = upsampled_logits.argmax(dim=1)[0]
        
        # Convert to numpy for processing
        predicted_np = predicted.cpu().numpy()
        
        # Get the class labels from the model's config
        id2label = model_data['model'].config.id2label
        
        # Create a mask for each class
        masks = []
        for class_id in np.unique(predicted_np):
            if class_id not in id2label:
                continue
                
            # Create a binary mask for this class
            mask = (predicted_np == class_id).astype(np.uint8) * 255
            mask_image = Image.fromarray(mask)
            
            # Convert mask to base64
            buffered = BytesIO()
            mask_image.save(buffered, format="PNG")
            mask_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
            
            # Get the class label
            label = id2label.get(int(class_id), f"class_{class_id}")
            
            # For semantic segmentation, all pixels in the mask have confidence 1.0
            # since we're doing hard classification
            masks.append(SegmentationMask(
                score=None,
                label=label,
                mask=mask_base64
            ))
        
        return ImageSegmentationResponse(
            masks=masks,
            model=model_data.get('model_name', 'unknown')
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing image segmentation: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing image segmentation: {str(e)}"
        )

app.include_router(router)

# ------------------------
# CLI Entry Point
# ------------------------

if __name__ == "__main__":
    import argparse
    import sys

    parser = argparse.ArgumentParser(description="Image Segmentation utility")
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
