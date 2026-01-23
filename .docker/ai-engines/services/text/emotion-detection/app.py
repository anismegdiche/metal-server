"""
HuggingFace Emotion Detection Service

This module provides a FastAPI-based service for running HuggingFace emotion detection.
"""

from fastapi import FastAPI, HTTPException, status, APIRouter
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any, Union, List, Optional
import logging
import os
import psutil
from transformers import pipeline

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
    title="HuggingFace Emotion Detection Service",
    description="API for running HuggingFace emotion detection",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router
router = APIRouter(prefix="/text-emotion-detection")

# Model cache
TASK_CACHE: Dict[str, Any] = {}

class TextTaskRequest(BaseModel):
    input_data: Union[str, List[str]] = Field(..., description="Input text or list of texts")

class TaskResponse(BaseModel):
    result: Any = Field(..., description="The processed result from the task")

def process_item(item: Any) -> Any:
    if isinstance(item, dict):
        return {str(k): process_item(v) for k, v in item.items()}
    if isinstance(item, list):
        return [process_item(i) for i in item]
    return item

def load_emotion_model() -> Any:
    cache_key = "emotion-detection"
    if cache_key not in TASK_CACHE:
        try:
            logger.info("Loading emotion-detection model...")
            TASK_CACHE[cache_key] = pipeline(
                task="text-classification",
                model="j-hartmann/emotion-english-distilroberta-base"
            )
        except Exception as e:
            logger.error(f"Failed to load model: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to load model: {str(e)}"
            )
    return TASK_CACHE[cache_key]

@router.get("/health", response_class=PlainTextResponse)
async def health() -> str:
    return "healthy"

@router.post("/run", response_model=TaskResponse)
async def run_emotion_detection(request: Union[TextTaskRequest, Dict[str, Any]]) -> TaskResponse:
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

    if isinstance(request, dict):
        request = TextTaskRequest(**request)
    input_data = request.input_data
    if not input_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Input data cannot be empty"
        )
    if isinstance(input_data, str):
        input_data = [input_data]
    try:
        model = load_emotion_model()
        result = model(input_data)
        processed_result = process_item(result)
        return TaskResponse(result=processed_result)
    except Exception as e:
        logger.error(f"Error processing emotion detection: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred"
        )

app.include_router(router)

# ------------------------
# CLI Entry Point
# ------------------------

if __name__ == "__main__":
    import argparse
    import sys

    parser = argparse.ArgumentParser(description="Emotion detection service utility")
    parser.add_argument("--load-pipe", action="store_true", help="Load the emotion detection pipeline and exit")
    args = parser.parse_args()
    
    if args.load_pipe:
        try:
            load_emotion_model()
            print("Pipeline loaded successfully.")
            sys.exit(0)
        except Exception as e:
            print(f"Failed to load pipeline: {str(e)}")
            sys.exit(1)
