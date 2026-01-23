"""
HuggingFace Sentiment Analysis Service

This module provides a FastAPI-based service for running HuggingFace sentiment analysis.
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

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    force=True,
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="HuggingFace Sentiment Analysis Service",
    description="API for HuggingFace sentiment analysis",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter(prefix="/text-sentiment-analysis")

TASK_CACHE: Dict[str, Any] = {}

class SentimentRequest(BaseModel):
    input_data: Union[str, List[str]] = Field(..., description="Input text or list of texts")

class SentimentResponse(BaseModel):
    result: Any = Field(..., description="The sentiment analysis result")

def process_item(item: Any) -> Any:
    if isinstance(item, dict):
        return {str(k): process_item(v) for k, v in item.items()}
    if isinstance(item, list):
        return [process_item(i) for i in item]
    return item

def load_sentiment_pipeline() -> Any:
    cache_key = "sentiment-analysis"
    if cache_key not in TASK_CACHE:
        logger.info("Loading text-classification pipeline...")
        TASK_CACHE[cache_key] = pipeline(
            task="text-classification",
            model="tabularisai/multilingual-sentiment-analysis"
        )
    return TASK_CACHE[cache_key]

@router.get("/health", response_class=PlainTextResponse)
async def health() -> str:
    return "healthy"

@router.post("/run", response_model=SentimentResponse)
async def run_sentiment_analysis(request: Union[SentimentRequest, Dict[str, Any]]) -> SentimentResponse:
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
        request = SentimentRequest(**request)
    input_data = request.input_data
    if not input_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Input data cannot be empty"
        )
    if isinstance(input_data, str):
        input_data = [input_data]
    try:
        model = load_sentiment_pipeline()
        result = model(input_data)
        processed_result = process_item(result)
        return SentimentResponse(result=processed_result)
    except Exception as e:
        logger.error(f"Error processing sentiment analysis: {str(e)}", exc_info=True)
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

    parser = argparse.ArgumentParser(description="Sentiment Analysis utility")
    parser.add_argument("--load-pipe", action="store_true", help="Load the pipeline and exit")
    args = parser.parse_args()
    
    if args.load_pipe:
        try:
            load_sentiment_pipeline()
            print("Pipeline loaded successfully.")
            sys.exit(0)
        except Exception as e:
            print(f"Failed to load pipeline: {str(e)}")
            sys.exit(1)
