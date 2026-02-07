"""
HuggingFace Fill-Mask Service

This module provides a FastAPI-based service for running HuggingFace fill-mask inference.
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

app = FastAPI(
    title="HuggingFace Fill-Mask Service",
    description="API for HuggingFace fill-mask inference",
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

router = APIRouter(prefix="/text-fill-mask")

TASK_CACHE: Dict[str, Any] = {}

class FillMaskRequest(BaseModel):
    input_data: Union[str, List[str]] = Field(..., description="Input text(s) with [MASK] token")

class FillMaskResponse(BaseModel):
    result: Any = Field(..., description="The fill-mask model output")

def process_item(item: Any) -> Any:
    if isinstance(item, dict):
        return {str(k): process_item(v) for k, v in item.items()}
    if isinstance(item, list):
        return [process_item(i) for i in item]
    return item

def load_fill_mask_model() -> Any:
    cache_key = "fill-mask"
    if cache_key not in TASK_CACHE:
        try:
            logger.info("Loading fill-mask model...")
            TASK_CACHE[cache_key] = pipeline(
                task="fill-mask",
                model="bert-base-uncased"
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

@router.post("/run", response_model=FillMaskResponse)
async def run_fill_mask(request: Union[FillMaskRequest, Dict[str, Any]]) -> FillMaskResponse:
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
        request = FillMaskRequest(**request)
    input_data = request.input_data
    if not input_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Input data cannot be empty"
        )
    if isinstance(input_data, str):
        input_data = [input_data]
    try:
        model = load_fill_mask_model()
        mask_token = model.tokenizer.mask_token
        for text in input_data:
            if mask_token not in text:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Input text must contain the mask token: '{mask_token}'"
                )
        result = model(input_data)
        processed_result = process_item(result)
        return FillMaskResponse(result=processed_result)
    except Exception as e:
        logger.error(f"Error processing fill-mask: {str(e)}", exc_info=True)
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

    parser = argparse.ArgumentParser(description="Fill-mask service utility")
    parser.add_argument("--load-pipe", action="store_true", help="Load the fill-mask pipeline and exit")
    args = parser.parse_args()
    
    if args.load_pipe:
        try:
            load_fill_mask_model()
            print("Pipeline loaded successfully.")
            sys.exit(0)
        except Exception as e:
            print(f"Failed to load pipeline: {str(e)}")
            sys.exit(1)
