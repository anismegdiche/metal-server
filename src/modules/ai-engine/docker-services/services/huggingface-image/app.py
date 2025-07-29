"""
HuggingFace Image Processing Service

This module provides a FastAPI-based service for running HuggingFace image processing tasks.
It supports various CV tasks like image classification, object detection, image segmentation, etc.
"""

from fastapi import FastAPI, HTTPException, status, UploadFile, File
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
import logging
import json
import numpy as np
from transformers import pipeline
import time
import sys
import io
from PIL import Image

# Logging setup

def configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S',
        force=True,
        handlers=[logging.StreamHandler(sys.stdout)]
    )

configure_logging()
logger = logging.getLogger(__name__)

# FastAPI app and CORS
app = FastAPI(
    title="HuggingFace Image Processing Service",
    description="API for running HuggingFace image processing tasks",
    version="1.0.0",
    openapi_prefix=""
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router for endpoints
from fastapi import APIRouter
router = APIRouter(prefix="/huggingface/image")

# Task config (flat)
TASKS = {
    "image-classification": {
        "desc": "Classify objects in images",
        "model": "google/vit-base-patch16-224"
    },
    "object-detection": {
        "desc": "Detect objects in images",
        "model": "facebook/detr-resnet-50"
    },
    "image-segmentation": {
        "desc": "Segment objects in an image",
        "model": "facebook/detr-resnet-50-panoptic"
    },
    "image-to-text": {
        "desc": "Generate a caption for an image",
        "model": "nlpconnect/vit-gpt2-image-captioning"
    },
    "zero-shot-image-classification": {
        "desc": "Classify an image using zero-shot learning",
        "model": "openai/clip-vit-base-patch32"
    }
}

def get_task_info(task_name: str) -> Optional[Dict[str, Any]]:
    return TASKS.get(task_name)

TASK_CACHE: Dict[str, Any] = {}

def process_item(item: Any) -> Any:
    try:
        if item is None:
            return None
        if isinstance(item, dict):
            return {str(k): process_item(v) for k, v in item.items()}
        if isinstance(item, (list, tuple)):
            return [process_item(i) for i in item]
        if hasattr(item, 'tolist') and callable(item.tolist):
            return process_item(item.tolist())
        if hasattr(item, 'item') and callable(item.item):
            return process_item(item.item())
        if isinstance(item, (np.integer, np.int8, np.int16, np.int32, np.int64, np.uint8, np.uint16, np.uint32, np.uint64)):
            return int(item)
        if isinstance(item, (np.floating, np.float16, np.float32, np.float64)):
            return float(item)
        if isinstance(item, (bool, np.bool_)):
            return bool(item)
        if isinstance(item, (str, bytes, bytearray)):
            return str(item)
        if hasattr(item, '__dict__'):
            return process_item({k: getattr(item, k) for k in dir(item) if not k.startswith('_') and not callable(getattr(item, k))})
        return str(item)
    except Exception as e:
        logger.warning(f"Error processing item of type {type(item).__name__}: {e}")
        return str(item)

# Request/response models
class TaskResponse(BaseModel):
    result: Any

def load_task(task: str, model: Optional[str] = None, params: Optional[Dict[str, Any]] = None) -> Any:
    task_info = get_task_info(task)
    if not task_info:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown task: {task}"
        )
    model_name = model or (params.get('model') if params else None) or task_info['model']
    cache_key = f"{task}:{model_name}"
    if cache_key not in TASK_CACHE:
        try:
            logger.info(f"Loading model: {model_name} for task: {task}")
            start_time = time.time()
            pipeline_params = {k: v for k, v in (params or {}).items() if k != 'model'}
            pipe = pipeline(task=task, model=model_name, **pipeline_params)
            load_time = time.time() - start_time
            logger.info(f"Successfully loaded model {model_name} in {load_time:.2f} seconds")
            TASK_CACHE[cache_key] = pipe
        except Exception as e:
            logger.error(f"Failed to load task: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to load task: {str(e)}"
            )
    return TASK_CACHE[cache_key]

# Health check endpoint
@router.get(
    "/health",
    response_class=PlainTextResponse,
    summary="Health Check",
    description="Check if the service is running"
)
async def health() -> str:
    return "healthy"

# List all available image tasks
@router.get(
    "/tasks",
    response_model=Dict[str, Dict[str, Any]],
    summary="List Tasks",
    description="List all available image processing tasks"
)
async def list_tasks() -> Dict[str, Dict[str, Any]]:
    return TASKS

# Image task endpoint
@router.post(
    "/{task}",
    response_model=TaskResponse,
    summary="Process Image",
    description="Process an image using the specified HuggingFace task"
)
async def run_image_task(
    task: str,
    file: UploadFile = File(...),
    model: Optional[str] = None,
    params: Optional[str] = None
) -> TaskResponse:
    logger.info(f"Received request for task: {task}")
    if task not in TASKS:
        error_msg = f"Task '{task}' is not supported. Available tasks: {', '.join(TASKS.keys())}"
        logger.error(error_msg)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": error_msg, "available_tasks": list(TASKS.keys())}
        )
    try:
        # Parse params if provided
        task_params = {}
        if params:
            try:
                task_params = json.loads(params)
            except json.JSONDecodeError as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid JSON in params: {str(e)}"
                )
        # Load the task pipeline
        pipe = load_task(task=task, model=model, params=task_params)
        # Read and process the image
        try:
            contents = await file.read()
            image = Image.open(io.BytesIO(contents)).convert("RGB")
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to process image: {str(e)}"
            )
        # Run the pipeline
        logger.info(f"Running task: {task}")
        start_time = time.time()
        try:
            result = pipe(image, **{k: v for k, v in task_params.items() if k != 'model'})
            processing_time = time.time() - start_time
            logger.info(f"Task completed in {processing_time:.2f} seconds")
            processed_result = process_item(result)
            try:
                json.dumps(processed_result)
                return {"result": processed_result}
            except (TypeError, OverflowError) as e:
                logger.error(f"JSON serialization error: {e}")
                return {"result": str(processed_result)}
        except Exception as e:
            logger.error(f"Error in task execution: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "error": "Error processing image",
                    "message": str(e)
                }
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Internal server error",
                "message": str(e)
            }
        )

# Register router
app.include_router(router)