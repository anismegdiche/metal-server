"""
HuggingFace Keyword Extraction Service

This module provides a FastAPI-based service for running HuggingFace keyword extraction.
"""

from fastapi import FastAPI, HTTPException, status, APIRouter
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any, Union, List
import logging
from transformers import pipeline, TokenClassificationPipeline, AutoModelForTokenClassification, AutoTokenizer
import numpy as np

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    force=True,
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="HuggingFace Keyword Extraction Service",
    description="API for HuggingFace keyword extraction",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter(prefix="/text-keyword-extraction")
TASK_CACHE: Dict[str, Any] = {}

class KeywordExtractionRequest(BaseModel):
    input_data: Union[str, List[str]] = Field(..., description="Input text or list of texts")
    top_k: int = Field(5, description="Number of top keywords to return")

class KeywordExtractionResponse(BaseModel):
    result: Any = Field(..., description="The extracted keywords")

def process_item(item: Any) -> Any:
    if isinstance(item, dict):
        return {str(k): process_item(v) for k, v in item.items()}
    if isinstance(item, list):
        return [process_item(i) for i in item]
    return item

def load_keyword_extraction_pipeline() -> Any:
    cache_key = "keyword-extraction"
    if cache_key not in TASK_CACHE:
        logger.info("Loading keyword-extraction pipeline...")
        pipe = pipeline(
            "summarization",
            model="transformer3/H2-keywordextractor",
            device=-1  # CPU
        )
        TASK_CACHE[cache_key] = pipe
    return TASK_CACHE[cache_key]

@router.get("/health", response_class=PlainTextResponse)
async def health() -> str:
    return "healthy"

@router.post("/run", response_model=KeywordExtractionResponse)
async def run_keyword_extraction(request: Union[KeywordExtractionRequest, Dict[str, Any]]) -> KeywordExtractionResponse:
    if isinstance(request, dict):
        request = KeywordExtractionRequest(**request)
    input_data = request.input_data
    top_k = request.top_k
    if not input_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Input data cannot be empty"
        )
    if isinstance(input_data, str):
        input_data = [input_data]
    try:
        pipe = load_keyword_extraction_pipeline()
        result = []
        for text in input_data:
            summary = pipe(text, max_length=100, min_length=10, do_sample=False)
            if summary and isinstance(summary, list) and len(summary) > 0:
                # Extract keywords from the summary text
                keywords = [kw.strip() for kw in summary[0]['summary_text'].split(',')]
                result.append(keywords[:top_k])
        processed_result = process_item(result)
        return KeywordExtractionResponse(result=processed_result)
    except Exception as e:
        logger.error(f"Error processing keyword extraction: {str(e)}", exc_info=True)
        raise HTTPException(
            detail="An unexpected error occurred"
        )

app.include_router(router)

# ------------------------
# CLI Entry Point
# ------------------------

if __name__ == "__main__":
    import argparse
    import sys

    parser = argparse.ArgumentParser(description="Keyword extraction service utility")
    parser.add_argument("--load-pipe", action="store_true", help="Load the keyword extraction pipeline and exit")
    args = parser.parse_args()
    
    if args.load_pipe:
        try:
            load_keyword_extraction_pipeline()
            print("Pipeline loaded successfully.")
            sys.exit(0)
        except Exception as e:
            print(f"Failed to load pipeline: {str(e)}")
            sys.exit(1)
