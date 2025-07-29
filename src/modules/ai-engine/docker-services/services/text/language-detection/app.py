"""
HuggingFace Language Detection Service

This module provides a FastAPI-based service for running HuggingFace language detection.
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
    title="HuggingFace Language Detection Service",
    description="API for HuggingFace language detection",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter(prefix="/text-language-detection")

TASK_CACHE: Dict[str, Any] = {}

class LanguageDetectionRequest(BaseModel):
    input_data: Union[str, List[str]] = Field(..., description="Input text or list of texts")

class LanguageDetectionResponse(BaseModel):
    result: Any = Field(..., description="The detected language(s)")

def process_item(item: Any) -> Any:
    if isinstance(item, dict):
        return {str(k): process_item(v) for k, v in item.items()}
    if isinstance(item, list):
        return [process_item(i) for i in item]
    return item

def load_language_detection_model() -> Any:
    cache_key = "language-detection"
    if cache_key not in TASK_CACHE:
        try:
            logger.info("Loading language-detection model...")
            TASK_CACHE[cache_key] = pipeline(
                task="text-classification",
                model="papluca/xlm-roberta-base-language-detection"
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

@router.post("/run", response_model=LanguageDetectionResponse)
async def run_language_detection(request: Union[LanguageDetectionRequest, Dict[str, Any]]) -> LanguageDetectionResponse:
    if isinstance(request, dict):
        request = LanguageDetectionRequest(**request)
    input_data = request.input_data
    if not input_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Input data cannot be empty"
        )
    if isinstance(input_data, str):
        input_data = [input_data]
    try:
        model = load_language_detection_model()
        result = model(input_data)
        processed_result = process_item(result)
        return LanguageDetectionResponse(result=processed_result)
    except Exception as e:
        logger.error(f"Error processing language detection: {str(e)}", exc_info=True)
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

    parser = argparse.ArgumentParser(description="Language detection service utility")
    parser.add_argument("--load-pipe", action="store_true", help="Load the language detection pipeline and exit")
    args = parser.parse_args()
    
    if args.load_pipe:
        try:
            load_language_detection_model()
            print("Pipeline loaded successfully.")
            sys.exit(0)
        except Exception as e:
            print(f"Failed to load pipeline: {str(e)}")
            sys.exit(1)
