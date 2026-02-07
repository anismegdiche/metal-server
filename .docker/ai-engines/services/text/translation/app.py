"""
HuggingFace Translation Service

This module provides a FastAPI-based service for running HuggingFace translation.
"""

from fastapi import FastAPI, HTTPException, status, APIRouter
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any, Union, List, Optional
import logging
import os
import psutil
from transformers import pipeline, AutoModelForSeq2SeqLM, AutoTokenizer

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
    title="HuggingFace Translation Service",
    description="API for HuggingFace translation",
    version="1.0.0"
)
# CORS configuration - restrict origins for better security
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS if origin.strip()]

ALLOWED_METHODS = os.getenv("ALLOWED_METHODS", "*").split(",")
ALLOWED_METHODS = [method.strip() for method in ALLOWED_METHODS if method.strip()]

ALLOWED_HEADERS = os.getenv("ALLOWED_HEADERS", "*").split(",")
ALLOWED_HEADERS = [header.strip() for header in ALLOWED_HEADERS if header.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=ALLOWED_METHODS,
    allow_headers=ALLOWED_HEADERS,
)

router = APIRouter(prefix="/text-translation")
TASK_CACHE: Dict[str, Any] = {}

# Model configuration
model_name = "facebook/mbart-large-50-many-to-many-mmt"
model = None
tokenizer = None

class TranslationParams(BaseModel):
    src_lang: str = Field(..., description="Source language code (e.g., 'en_XX')")
    tgt_lang: str = Field(..., description="Target language code (e.g., 'ar_AR')")

class TranslationRequest(BaseModel):
    input_data: Union[str, List[str]] = Field(..., description="Input text or list of texts to translate")
    params: TranslationParams = Field(..., description="Translation parameters")

class TranslationResponse(BaseModel):
    result: Any = Field(..., description="The translation result")

def process_item(item: Any) -> Any:
    if isinstance(item, dict):
        return {str(k): process_item(v) for k, v in item.items()}
    if isinstance(item, list):
        return [process_item(i) for i in item]
    return item

def initialize_model() -> None:
    """Initialize the global model and tokenizer if they haven't been loaded yet."""
    global model, tokenizer
    if model is None or tokenizer is None:
        logger.info("Initializing model and tokenizer...")
        model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        logger.info("Model and tokenizer initialized successfully.")

def load_translation_pipeline() -> Any:
    """Load the translation pipeline using the global model and tokenizer."""
    global model, tokenizer
    cache_key = "translation"
    
    if cache_key not in TASK_CACHE:
        # Ensure model and tokenizer are initialized
        if model is None or tokenizer is None:
            initialize_model()
            
        logger.info("Creating translation pipeline...")
        TASK_CACHE[cache_key] = pipeline(
            task="translation",
            model=model,
            tokenizer=tokenizer,
            src_lang=None,  # Will be set per-request
            tgt_lang=None   # Will be set per-request
        )
        logger.info("Translation pipeline loaded successfully.")
    return TASK_CACHE[cache_key]

@router.get("/health", response_class=PlainTextResponse)
async def health() -> str:
    return "healthy"

@router.post("/run", response_model=TranslationResponse)
async def run_translation(request: Union[TranslationRequest, Dict[str, Any]]) -> TranslationResponse:
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
        request = TranslationRequest(**request)
    input_data = request.input_data
    params = request.params
    src_lang = params.src_lang
    tgt_lang = params.tgt_lang
    
    if not input_data or not params or not src_lang or not tgt_lang:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Input data, src_lang, and tgt_lang are required"
        )
    if isinstance(input_data, str):
        input_data = [input_data]
    try:
        model = load_translation_pipeline()
        # mbart requires forced_bos_token_id for target language
        # Set the source and target languages for the model
        model.model.config.forced_bos_token_id = model.tokenizer.lang_code_to_id[tgt_lang]
        model.tokenizer.src_lang = src_lang
        
        # Perform the translation
        result = model(
            input_data,
            src_lang=src_lang,
            tgt_lang=tgt_lang,
            max_length=400  # Add reasonable max length
        )
        processed_result = process_item(result)
        # Add language information to the result
        if isinstance(processed_result, dict):
            processed_result['src_lang'] = src_lang
            processed_result['tgt_lang'] = tgt_lang
        elif isinstance(processed_result, list):
            processed_result = [
                {**item, 'src_lang': src_lang, 'tgt_lang': tgt_lang}
                if isinstance(item, dict) else item
                for item in processed_result
            ]
        return TranslationResponse(result=processed_result)
    except Exception as e:
        logger.error(f"Error processing translation: {str(e)}", exc_info=True)
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

    parser = argparse.ArgumentParser(description="Translation service utility")
    parser.add_argument("--load-pipe", action="store_true", help="Load the translation pipeline and exit")
    args = parser.parse_args()
    initialize_model()

    if args.load_pipe:
        print("Pipeline loaded successfully.")
        sys.exit(0)
