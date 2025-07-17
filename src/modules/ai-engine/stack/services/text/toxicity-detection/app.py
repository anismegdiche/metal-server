"""
HuggingFace Toxicity Detection Service

This module provides a FastAPI-based service for running HuggingFace toxicity detection.
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
    title="HuggingFace Toxicity Detection Service",
    description="API for HuggingFace toxicity detection",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter(prefix="/text-toxicity-detection")
TASK_CACHE: Dict[str, Any] = {}

class ToxicityRequest(BaseModel):
    input_data: Union[str, List[str]] = Field(..., description="Input text or list of texts to check for toxicity")

class ToxicityResponse(BaseModel):
    result: Any = Field(..., description="The toxicity detection result")

def process_item(item: Any) -> Any:
    if isinstance(item, dict):
        return {str(k): process_item(v) for k, v in item.items()}
    if isinstance(item, list):
        return [process_item(i) for i in item]
    return item

def load_toxicity_pipeline() -> Any:
    cache_key = "toxicity-detection"
    if cache_key not in TASK_CACHE:
        logger.info("Loading toxicity-detection pipeline...")
        TASK_CACHE[cache_key] = pipeline(
            task="text-classification",
            model="unitary/toxic-bert"
        )
    return TASK_CACHE[cache_key]

@router.get("/health", response_class=PlainTextResponse)
async def health() -> str:
    return "healthy"

@router.post("/run", response_model=ToxicityResponse)
async def run_toxicity_detection(request: Union[ToxicityRequest, Dict[str, Any]]) -> ToxicityResponse:
    if isinstance(request, dict):
        request = ToxicityRequest(**request)
    input_data = request.input_data
    if not input_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Input data cannot be empty"
        )
    if isinstance(input_data, str):
        input_data = [input_data]
    try:
        model = load_toxicity_pipeline()
        result = model(input_data)
        processed_result = process_item(result)
        return ToxicityResponse(result=processed_result)
    except Exception as e:
        logger.error(f"Error processing toxicity detection: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred"
        )

app.include_router(router)
