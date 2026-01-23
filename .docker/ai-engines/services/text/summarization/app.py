"""
HuggingFace Summarization Service

This module provides a FastAPI-based service for running HuggingFace summarization.
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
    title="HuggingFace Summarization Service",
    description="API for HuggingFace summarization",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter(prefix="/text-summarization")

TASK_CACHE: Dict[str, Any] = {}

class SummarizationRequest(BaseModel):
    input_data: Union[str, List[str]] = Field(..., description="Input text or list of texts to summarize")

class SummarizationResponse(BaseModel):
    result: Any = Field(..., description="The summarization result")

def process_item(item: Any) -> Any:
    if isinstance(item, dict):
        return {str(k): process_item(v) for k, v in item.items()}
    if isinstance(item, list):
        return [process_item(i) for i in item]
    return item

def load_summarization_pipeline() -> Any:
    cache_key = "summarization"
    if cache_key not in TASK_CACHE:
        logger.info("Loading summarization pipeline...")
        TASK_CACHE[cache_key] = pipeline(
            task="summarization",
            model="google-t5/t5-base"
        )
    return TASK_CACHE[cache_key]

@router.get("/health", response_class=PlainTextResponse)
async def health() -> str:
    return "healthy"

@router.post("/run", response_model=SummarizationResponse)
async def run_summarization(request: Union[SummarizationRequest, Dict[str, Any]]) -> SummarizationResponse:
    # Update CPU history with a new snapshot
    current_cpu = process.cpu_percent(interval=None)
    CPU_HISTORY.append(current_cpu)
    if len(CPU_HISTORY) > MAX_HISTORY:
        CPU_HISTORY.pop(0)
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
        request = SummarizationRequest(**request)
    input_data = request.input_data
    if not input_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Input data cannot be empty"
        )
    if isinstance(input_data, str):
        input_data = [input_data]
    try:
        model = load_summarization_pipeline()
        result = model(input_data)
        processed_result = process_item(result)
        return SummarizationResponse(result=processed_result)
    except Exception as e:
        logger.error(f"Error processing summarization: {str(e)}", exc_info=True)
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

    parser = argparse.ArgumentParser(description="Summarization service utility")
    parser.add_argument("--load-pipe", action="store_true", help="Load the summarization pipeline and exit")
    args = parser.parse_args()
    
    if args.load_pipe:
        try:
            load_summarization_pipeline()
            print("Pipeline loaded successfully.")
            sys.exit(0)
        except Exception as e:
            print(f"Failed to load pipeline: {str(e)}")
            sys.exit(1)
