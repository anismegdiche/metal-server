"""
HuggingFace Audio Processing Service

This module provides a FastAPI-based service for running HuggingFace audio processing tasks.
"""

from fastapi import FastAPI, HTTPException, status, UploadFile, File
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
import logging
import json
import numpy as np
from transformers import pipeline
import time
import sys
import io
import tempfile
import os

# Logging setup

def configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S',
        force=True,
        handlers=[logging.StreamHandler(sys.stdout)]
    )

configure_logging()
logger = logging.getLogger(__name__)

# FastAPI app and CORS
app = FastAPI(
    title="HuggingFace Audio Processing Service",
    description="API for running HuggingFace audio processing tasks",
    version="1.0.0",
    openapi_prefix=""
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import APIRouter
router = APIRouter(prefix="/huggingface/audio")

# Audio task config (flat)
TASKS = {
    "audio-classification": {
        "desc": "Classify audio clips into categories",
        "model": "superb/hubert-large-superb-er"
    },
    "automatic-speech-recognition": {
        "desc": "Transcribe speech to text",
        "model": "openai/whisper-base"
    },
    "text-to-speech": {
        "desc": "Convert text to natural sounding speech",
        "model": "suno/bark-small"
    },
    "audio-source-separation": {
        "desc": "Separate different audio sources in a mixture",
        "model": "speechbrain/sepformer-wham"
    },
    "speech-enhancement": {
        "desc": "Enhance speech quality and reduce noise",
        "model": "speechbrain/mtl-mimic-voicebank"
    },
    "audio-super-resolution": {
        "desc": "Upsample low-quality audio to higher quality",
        "model": "tuanh123789/rdm_audio_super_res"
    }
}

def get_task_info(task_name: str) -> Optional[Dict[str, Any]]:
    return TASKS.get(task_name)

TASK_CACHE: Dict[str, Any] = {}

def process_item(item: Any) -> Any:
    try:
        if item is None:
            return None
        if isinstance(item, dict):
            return {str(k): process_item(v) for k, v in item.items()}
        if isinstance(item, (list, tuple)):
            return [process_item(i) for i in item]
        if hasattr(item, 'tolist') and callable(item.tolist):
            return process_item(item.tolist())
        if hasattr(item, 'item') and callable(item.item):
            return process_item(item.item())
        if isinstance(item, (np.integer, np.int8, np.int16, np.int32, np.int64, np.uint8, np.uint16, np.uint32, np.uint64)):
            return int(item)
        if isinstance(item, (np.floating, np.float16, np.float32, np.float64)):
            return float(item)
        if isinstance(item, (bool, np.bool_)):
            return bool(item)
        if isinstance(item, (str, bytes, bytearray)):
            return str(item)
        if hasattr(item, '__dict__'):
            return process_item({k: getattr(item, k) for k in dir(item) if not k.startswith('_') and not callable(getattr(item, k))})
        return str(item)
    except Exception as e:
        logger.warning(f"Error processing item of type {type(item).__name__}: {e}")
        return str(item)

class TaskResponse(BaseModel):
    result: Any

def load_task(task: str, model: Optional[str] = None, params: Optional[Dict[str, Any]] = None) -> Any:
    task_info = get_task_info(task)
    if not task_info:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown task: {task}"
        )
    model_name = model or (params.get('model') if params else None) or task_info['model']
    cache_key = f"{task}:{model_name}"
    if cache_key not in TASK_CACHE:
        try:
            logger.info(f"Loading model: {model_name} for task: {task}")
            start_time = time.time()
            pipeline_params = {k: v for k, v in (params or {}).items() if k != 'model'}
            pipe = pipeline(task=task, model=model_name, **pipeline_params)
            load_time = time.time() - start_time
            logger.info(f"Successfully loaded model {model_name} in {load_time:.2f} seconds")
            TASK_CACHE[cache_key] = pipe
        except Exception as e:
            logger.error(f"Failed to load task: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to load task: {str(e)}"
            )
    return TASK_CACHE[cache_key]

@router.get(
    "/health",
    response_class=PlainTextResponse,
    summary="Health Check",
    description="Check if the service is running"
)
async def health() -> str:
    return "healthy"

@router.get(
    "/tasks",
    response_model=Dict[str, Dict[str, Any]],
    summary="List Tasks",
    description="List all available audio processing tasks"
)
async def list_tasks() -> Dict[str, Dict[str, Any]]:
    return TASKS

class TextToSpeechRequest(BaseModel):
    text: str = Field(..., description="Text to convert to speech")
    voice_preset: Optional[str] = Field(
        None,
        description="Voice preset to use (e.g., 'v2/en_speaker_6' for Bark)"
    )

@router.post(
    "/{task}",
    response_model=TaskResponse,
    summary="Process Audio",
    description="Process an audio file or text using the specified HuggingFace task"
)
async def run_audio_task(
    task: str,
    file: UploadFile = File(None),
    text_request: Optional[str] = None,
    model: Optional[str] = None,
    params: Optional[str] = None
) -> TaskResponse:
    logger.info(f"Received request for task: {task}")
    if task not in TASKS:
        error_msg = f"Task '{task}' is not supported. Available tasks: {', '.join(TASKS.keys())}"
        logger.error(error_msg)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": error_msg, "available_tasks": list(TASKS.keys())}
        )
    
    # Validate input based on task type
    if task == "text-to-speech" and not text_request and not file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text input is required for text-to-speech task"
        )
    elif task != "text-to-speech" and not file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Audio file is required for this task"
        )
    
    try:
        # Parse params if provided
        task_params = {}
        if params:
            try:
                task_params = json.loads(params)
            except json.JSONDecodeError as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid JSON in params: {str(e)}"
                )
        
        # Load the task pipeline
        pipe = load_task(task=task, model=model, params=task_params)
        
        # Handle text-to-speech specially
        if task == "text-to-speech":
            logger.info(f"Generating speech for text: {text_request[:100]}...")
            start_time = time.time()
            try:
                # For Bark TTS
                if model and "bark" in model.lower():
                    voice_preset = task_params.get("voice_preset")
                    kwargs = {}
                    if voice_preset:
                        kwargs["voice_preset"] = voice_preset
                    
                    # Generate audio array
                    audio_array = pipe(text_request, **kwargs)
                    
                    # Convert to bytes
                    import soundfile as sf
                    with io.BytesIO() as buf:
                        sf.write(buf, audio_array["audio"], audio_array["sampling_rate"], format='wav')
                        audio_bytes = buf.getvalue()
                    
                    processing_time = time.time() - start_time
                    logger.info(f"TTS generation completed in {processing_time:.2f} seconds")
                    
                    # Return as base64 encoded string
                    import base64
                    return {
                        "result": {
                            "audio": base64.b64encode(audio_bytes).decode('utf-8'),
                            "sampling_rate": audio_array["sampling_rate"],
                            "format": "wav"
                        }
                    }
                else:
                    # For other TTS models
                    result = pipe(text_request, **{k: v for k, v in task_params.items() if k != 'model'})
                    return {"result": process_item(result)}
                    
            except Exception as e:
                logger.error(f"Error in TTS generation: {str(e)}", exc_info=True)
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error in TTS generation: {str(e)}"
                )
        
        # For all other audio processing tasks
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
                tmp.write(await file.read())
                tmp.flush()
                audio_path = tmp.name
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to process audio: {str(e)}"
            )
            
        # Run the pipeline
        logger.info(f"Running task: {task}")
        start_time = time.time()
        try:
            result = pipe(audio_path, **{k: v for k, v in task_params.items() if k != 'model'})
            processing_time = time.time() - start_time
            logger.info(f"Task completed in {processing_time:.2f} seconds")
            processed_result = process_item(result)
            try:
                json.dumps(processed_result)
                return {"result": processed_result}
            except (TypeError, OverflowError) as e:
                logger.error(f"JSON serialization error: {e}")
                return {"result": str(processed_result)}
        except Exception as e:
            logger.error(f"Error in task execution: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "error": "Error processing audio",
                    "message": str(e)
                }
            )
        finally:
            os.unlink(audio_path)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Internal server error",
                "message": str(e)
            }
        )

app.include_router(router)