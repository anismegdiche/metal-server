"""
HuggingFace Feature Extraction Service

This module provides a FastAPI-based service for running HuggingFace feature extraction (embeddings).
"""

from fastapi import FastAPI, HTTPException, status, APIRouter
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any, Union, List
import logging
from transformers import pipeline

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    force=True,
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="HuggingFace Feature Extraction Service",
    description="API for running HuggingFace feature extraction (embeddings)",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter(prefix="/text-feature-extraction")

TASK_CACHE: Dict[str, Any] = {}

class FeatureExtractionRequest(BaseModel):
    input_data: Union[str, List[str]] = Field(..., description="Input text or list of texts")

class FeatureExtractionResponse(BaseModel):
    result: Any = Field(..., description="The extracted features (embeddings)")

def process_item(item: Any) -> Any:
    if isinstance(item, dict):
        return {str(k): process_item(v) for k, v in item.items()}
    if isinstance(item, list):
        return [process_item(i) for i in item]
    return item

def load_feature_extraction_model() -> Any:
    cache_key = "feature-extraction"
    if cache_key not in TASK_CACHE:
        try:
            logger.info("Loading feature-extraction model...")
            TASK_CACHE[cache_key] = pipeline(
                task="feature-extraction",
                model="sentence-transformers/all-MiniLM-L6-v2"
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

@router.post("/run", response_model=FeatureExtractionResponse)
async def run_feature_extraction(request: Union[FeatureExtractionRequest, Dict[str, Any]]) -> FeatureExtractionResponse:
    if isinstance(request, dict):
        request = FeatureExtractionRequest(**request)
    input_data = request.input_data
    if not input_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Input data cannot be empty"
        )
    if isinstance(input_data, str):
        input_data = [input_data]
    try:
        model = load_feature_extraction_model()
        result = model(input_data)
        processed_result = process_item(result)
        return FeatureExtractionResponse(result=processed_result)
    except Exception as e:
        logger.error(f"Error processing feature extraction: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred"
        )

app.include_router(router)
