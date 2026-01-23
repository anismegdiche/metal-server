"""
HuggingFace Text2Text Generation Service

This module provides a FastAPI-based service for running HuggingFace text2text-generation tasks.
"""

from fastapi import FastAPI, HTTPException, status, APIRouter
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any, Union, List, Optional
import logging
import os
import psutil
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

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
    title="HuggingFace Text2Text Generation Service",
    description="API for HuggingFace text2text-generation",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter(prefix="/text-text2text-generation")
TASK_CACHE: Dict[str, Any] = {}

class Text2TextParams(BaseModel):
    role: Optional[str] = Field("You are a helpful assistant.", description="System role for the model")
    max_new_tokens: Optional[int] = Field(512, description="Maximum number of tokens to generate")

class Text2TextRequest(BaseModel):
    input_data: str = Field(..., description="Input text to transform")
    params: Optional[Text2TextParams] = Field(None, description="Generation parameters")

class Text2TextResponse(BaseModel):
    result: Any = Field(..., description="The text2text-generation result")

def process_item(item: Any) -> Any:
    if isinstance(item, dict):
        return {str(k): process_item(v) for k, v in item.items()}
    if isinstance(item, list):
        return [process_item(i) for i in item]
    return item

def load_text2text_pipeline() -> Dict[str, Any]:
    cache_key = "text2text-generation"
    if cache_key not in TASK_CACHE:
        logger.info("Loading model and tokenizer...")
        
        # Set device and dtype based on availability
        device = "cuda" if torch.cuda.is_available() else "cpu"
        dtype = torch.float16 if torch.cuda.is_available() else torch.float32
        
        try:
            # Use smaller model for CPU environments
            model_name = "Qwen/Qwen2-1.5B-Instruct"
            logger.info(f"Loading model: {model_name}")
            
            # Load model with device_map and proper dtype
            model = AutoModelForCausalLM.from_pretrained(
                model_name,
                device_map="auto" if torch.cuda.is_available() else None,
                dtype=dtype,
                low_cpu_mem_usage=True
            )
            
            # Load tokenizer
            tokenizer = AutoTokenizer.from_pretrained(
                model_name,
                padding_side="left",
                trust_remote_code=True
            )
            
            # Set pad token if not set
            if tokenizer.pad_token is None:
                tokenizer.pad_token = tokenizer.eos_token
            
            TASK_CACHE[cache_key] = {
                "model": model,
                "tokenizer": tokenizer,
                "device": device
            }
            logger.info("Model and tokenizer loaded successfully")
            
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            raise
            
    return TASK_CACHE[cache_key]

@router.get("/health", response_class=PlainTextResponse)
async def health() -> str:
    return "healthy"

@router.post("/run", response_model=Text2TextResponse)
async def run_text2text(request: Union[Text2TextRequest, Dict[str, Any]]) -> Text2TextResponse:
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
        request = Text2TextRequest(**request)
    
    if not request.input_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Input data cannot be empty"
        )
    
    try:
        # Load model and tokenizer
        pipeline = load_text2text_pipeline()
        model = pipeline["model"]
        tokenizer = pipeline["tokenizer"]
        device = pipeline["device"]
        
        # Get params with defaults
        role = "You are a helpful assistant."
        max_new_tokens = 512
        
        if request.params:
            if request.params.role:
                role = request.params.role
            if request.params.max_new_tokens:
                max_new_tokens = request.params.max_new_tokens
        
        # Prepare messages with chat template
        messages = [
            {"role": "system", "content": role},
            {"role": "user", "content": request.input_data}
        ]
        
        # Apply chat template
        text = tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True
        )
        
        # Tokenize and generate
        model_inputs = tokenizer([text], return_tensors="pt").to(device)
        generated_ids = model.generate(
            model_inputs.input_ids,
            max_new_tokens=max_new_tokens,
            pad_token_id=tokenizer.eos_token_id
        )
        
        # Decode the generated text
        generated_ids = [
            output_ids[len(input_ids):] for input_ids, output_ids 
            in zip(model_inputs.input_ids, generated_ids)
        ]
        response = tokenizer.batch_decode(generated_ids, skip_special_tokens=True)[0]
        
        return Text2TextResponse(result={"generated_text": response})
        
    except Exception as e:
        logger.error(f"Error processing text generation: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating text: {str(e)}"
        )

app.include_router(router)

# ------------------------
# CLI Entry Point
# ------------------------

if __name__ == "__main__":
    import argparse
    import sys

    parser = argparse.ArgumentParser(description="Text2Text generation service utility")
    parser.add_argument("--load-pipe", action="store_true", help="Load the text2text-generation pipeline and exit")
    args = parser.parse_args()
    
    if args.load_pipe:
        try:
            load_text2text_pipeline()
            print("Pipeline loaded successfully.")
            sys.exit(0)
        except Exception as e:
            print(f"Failed to load pipeline: {str(e)}")
            sys.exit(1)
