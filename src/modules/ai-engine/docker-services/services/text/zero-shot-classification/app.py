"""
HuggingFace Zero-Shot Classification Service

This module provides a FastAPI-based service for running HuggingFace zero-shot classification.
"""

from fastapi import FastAPI, HTTPException, status, APIRouter
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any, Union, List
import logging
from transformers import pipeline

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    force=True,
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="HuggingFace Zero-Shot Classification Service",
    description="API for HuggingFace zero-shot classification",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter(prefix="/text-zero-shot-classification")
TASK_CACHE: Dict[str, Any] = {}

class ZeroShotParams(BaseModel):
    candidate_labels: Union[str, List[str]] = Field(..., description="Candidate labels (comma-separated or list)")
    hypothesis_template: str = Field("This example is about {}.", description="Hypothesis template for classification")

class ZeroShotRequest(BaseModel):
    input_data: Union[str, List[str]] = Field(..., description="Input text or list of texts to classify")
    params: ZeroShotParams

class ZeroShotResponse(BaseModel):
    result: Any = Field(..., description="The zero-shot classification result")

def process_item(item: Any) -> Any:
    if isinstance(item, dict):
        return {str(k): process_item(v) for k, v in item.items()}
    if isinstance(item, list):
        return [process_item(i) for i in item]
    return item

def load_zero_shot_pipeline() -> Any:
    cache_key = "zero-shot-classification"
    if cache_key not in TASK_CACHE:
        logger.info("Loading zero-shot-classification pipeline...")
        TASK_CACHE[cache_key] = pipeline(
            task="zero-shot-classification",
            model="facebook/bart-large-mnli"
        )
    return TASK_CACHE[cache_key]

@router.get("/health", response_class=PlainTextResponse)
async def health() -> str:
    return "healthy"

@router.post("/run", response_model=ZeroShotResponse)
async def run_zero_shot(request: Union[ZeroShotRequest, Dict[str, Any]]) -> ZeroShotResponse:
    if isinstance(request, dict):
        request = ZeroShotRequest(**request)
    input_data = request.input_data
    params = request.params
    candidate_labels = params.candidate_labels
    hypothesis_template = params.hypothesis_template
    
    if not input_data or not candidate_labels:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both input_data and params.candidate_labels are required"
        )
    if isinstance(input_data, str):
        input_data = [input_data]
    if isinstance(candidate_labels, str):
        candidate_labels = [label.strip() for label in candidate_labels.split(",") if label.strip()]
    try:
        model = load_zero_shot_pipeline()
        result = model(
            input_data,
            candidate_labels,
            hypothesis_template=hypothesis_template
        )
        processed_result = process_item(result)
        return ZeroShotResponse(result=processed_result)
    except Exception as e:
        logger.error(f"Error processing zero-shot classification: {str(e)}", exc_info=True)
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

    parser = argparse.ArgumentParser(description="Zero-shot classification service utility")
    parser.add_argument("--load-pipe", action="store_true", help="Load the zero-shot-classification pipeline and exit")
    args = parser.parse_args()
    
    if args.load_pipe:
        try:
            load_zero_shot_pipeline()
            print("Pipeline loaded successfully.")
            sys.exit(0)
        except Exception as e:
            print(f"Failed to load pipeline: {str(e)}")
            sys.exit(1)
