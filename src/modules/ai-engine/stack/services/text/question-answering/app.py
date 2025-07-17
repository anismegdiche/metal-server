"""
HuggingFace Question Answering Service

This module provides a FastAPI-based service for HuggingFace question answering.
"""

from fastapi import FastAPI, HTTPException, status, APIRouter
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any, Union
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
    title="HuggingFace Question Answering Service",
    description="API for HuggingFace question answering",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter(prefix="/text-question-answering")

TASK_CACHE: Dict[str, Any] = {}

class QuestionAnsweringInput(BaseModel):
    question: str = Field(..., description="The question to answer")
    context: str = Field(..., description="The context to answer from")

class QuestionAnsweringRequest(BaseModel):
    input_data: Union[QuestionAnsweringInput, Dict[str, Any]]

class QuestionAnsweringResponse(BaseModel):
    result: Any = Field(..., description="The answer and details")

def process_item(item: Any) -> Any:
    if isinstance(item, dict):
        return {str(k): process_item(v) for k, v in item.items()}
    if isinstance(item, list):
        return [process_item(i) for i in item]
    return item

def load_qa_pipeline() -> Any:
    cache_key = "question-answering"
    if cache_key not in TASK_CACHE:
        logger.info("Loading question-answering pipeline...")
        TASK_CACHE[cache_key] = pipeline(
            task="question-answering",
            model="distilbert-base-cased-distilled-squad"
        )
    return TASK_CACHE[cache_key]

@router.get("/health", response_class=PlainTextResponse)
async def health() -> str:
    return "healthy"

@router.post("/run", response_model=QuestionAnsweringResponse)
async def run_qa(request: Union[QuestionAnsweringRequest, Dict[str, Any]]) -> QuestionAnsweringResponse:
    if isinstance(request, dict):
        request = QuestionAnsweringRequest(**request)
    input_data = request.input_data
    # Accept both dict and QuestionAnsweringInput
    if isinstance(input_data, dict):
        input_data = QuestionAnsweringInput(**input_data)
    if not input_data.question or not input_data.context:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both 'question' and 'context' are required"
        )
    try:
        qa_model = load_qa_pipeline()
        result = qa_model({
            "question": input_data.question,
            "context": input_data.context
        })
        processed_result = process_item(result)
        return QuestionAnsweringResponse(result=processed_result)
    except Exception as e:
        logger.error(f"Error processing question answering: {str(e)}", exc_info=True)
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

    parser = argparse.ArgumentParser(description="Question answering service utility")
    parser.add_argument("--load-pipe", action="store_true", help="Load the question-answering pipeline and exit")
    args = parser.parse_args()
    
    if args.load_pipe:
        try:
            load_qa_pipeline()
            print("Pipeline loaded successfully.")
            sys.exit(0)
        except Exception as e:
            print(f"Failed to load pipeline: {str(e)}")
            sys.exit(1)
