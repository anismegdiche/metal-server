"""
HuggingFace Visual Question Answering Service

This module provides a FastAPI-based service for running HuggingFace visual question answering.
"""

from fastapi import FastAPI, HTTPException, status, APIRouter, UploadFile, File, Form
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Union, List, Optional
import logging
from transformers import pipeline
from PIL import Image
import io
import json
import torch
import numpy as np

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    force=True,
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="HuggingFace Visual Question Answering Service",
    description="API for HuggingFace visual question answering",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter(prefix="/image-visual-question-answering")

TASK_CACHE: Dict[str, Any] = {}

class VisualQuestionAnsweringRequest(BaseModel):
    """Request model for visual question answering.
    
    Attributes:
        question: The question to ask about the image
        model: Optional model name to override the default model
        parameters: Optional dictionary of task-specific parameters
    """
    question: str
    model: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None

class VisualQuestionAnsweringResponse(BaseModel):
    """Response model for visual question answering results.
    
    Attributes:
        result: The answer to the question about the image
    """
    result: Any

def process_item(item: Any) -> Any:
    """Convert tensors and NumPy types to native Python types for JSON serialization."""
    if isinstance(item, dict):
        return {str(k): process_item(v) for k, v in item.items()}
    if isinstance(item, list):
        return [process_item(i) for i in item]
    return item

def load_pipeline() -> Any:
    """Load and cache the visual question answering pipeline."""
    cache_key = "visual-question-answering"
    if cache_key not in TASK_CACHE:
        logger.info("Loading visual question answering pipeline...")
        TASK_CACHE[cache_key] = pipeline(
            task="visual-question-answering",
            model="dandelin/vilt-b32-finetuned-vqa"
        )
    return TASK_CACHE[cache_key]

@router.get("/health", response_class=PlainTextResponse)
async def health() -> str:
    """Health check endpoint."""
    return "healthy"

@router.post("/run", response_model=VisualQuestionAnsweringResponse)
async def run(
    file: UploadFile = File(..., description="Image file to process"),
    request: str = Form(..., description="JSON string containing question and parameters")
) -> VisualQuestionAnsweringResponse:
    """Run visual question answering on the uploaded image.
    
    Args:
        file: The image file to process
        request: JSON string containing the question and optional parameters
    """
    try:
        # Parse the request JSON
        request_data = json.loads(request)
        question = request_data.get("question")
        if not question:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Question is required in the request"
            )
            
        # Read and validate the image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # Load the pipeline
        qa_pipeline = load_pipeline()
        
        # Run the visual question answering
        result = qa_pipeline(
            image=image,
            question=question,
            **(request_data.get("parameters") or {})
        )
        
        # Convert any non-serializable types
        result = process_item(result)
        
        return VisualQuestionAnsweringResponse(result=result)
        
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON in request"
        )
    except Exception as e:
        logger.error(f"Error processing visual question answering: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

app.include_router(router)

# ------------------------
# CLI Entry Point
# ------------------------

if __name__ == "__main__":
    import argparse
    import uvicorn
    
    parser = argparse.ArgumentParser()
    parser.add_argument('--load-pipe', action='store_true', help='Load pipeline and exit')
    args = parser.parse_args()
    
    if args.load_pipe:
        load_pipeline()
        exit(0)
    
    uvicorn.run(app, host="0.0.0.0", port=5000)
