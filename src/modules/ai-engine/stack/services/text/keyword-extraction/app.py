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
        class KeyphraseExtractionPipeline(TokenClassificationPipeline):
            def __init__(self, model, *args, **kwargs):
                super().__init__(
                    model=AutoModelForTokenClassification.from_pretrained(model),
                    tokenizer=AutoTokenizer.from_pretrained(model),
                    *args, **kwargs
                )
            def postprocess(self, all_outputs):
                results = super().postprocess(
                    all_outputs=all_outputs,
                    aggregation_strategy="simple",
                )
                # Return unique keyphrases as strings
                return list(np.unique([result.get("word").strip() for result in results if result.get("word").strip()]))
        pipe = KeyphraseExtractionPipeline(
            model="ml6team/keyphrase-extraction-kbir-inspec",
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
        model = load_keyword_extraction_pipeline()
        result = []
        for text in input_data:
            keyphrases = model(text)
            result.append(keyphrases[:top_k])
        processed_result = process_item(result)
        return KeywordExtractionResponse(result=processed_result)
    except Exception as e:
        logger.error(f"Error processing keyword extraction: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred"
        )

app.include_router(router)
