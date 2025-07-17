#['audio-classification', 'automatic-speech-recognition', 'depth-estimation', 'document-question-answering', 'feature-extraction', 'fill-mask', 'image-classification', 'image-feature-extraction', 'image-segmentation', 'image-text-to-text', 'image-to-image', 'image-to-text', 'mask-generation', 'ner', 'object-detection', 'question-answering', 'sentiment-analysis', 'summarization', 'table-question-answering', 'text-classification', 'text-generation', 'text-to-audio', 'text-to-speech', 'text2text-generation', 'token-classification', 'translation', 'video-classification', 'visual-question-answering', 'vqa', 'zero-shot-audio-classification', 'zero-shot-classification', 'zero-shot-image-classification', 'zero-shot-object-detection', 'translation_XX_to_YY']"

from fastapi import FastAPI, UploadFile, File, HTTPException, status, Body
from fastapi.responses import JSONResponse, PlainTextResponse
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from typing import Optional, Dict, Any, Union, List
import logging
import os
import io
import tempfile
import time
import json
import numpy as np

# --- Securely add Zscaler root CA to certifi bundle if present ---
try:
    import certifi
    ZSCALER_CA_PATH = os.environ.get('ZSCALER_CA_PATH', '/etc/ssl/certs/zscaler-root-ca.pem')
    if os.path.exists(ZSCALER_CA_PATH):
        cafile = certifi.where()
        with open(ZSCALER_CA_PATH, 'rb') as infile:
            custom_ca = infile.read()
        with open(cafile, 'ab') as outfile:
            outfile.write(custom_ca)
        logging.info(f"Appended Zscaler root CA to certifi bundle: {ZSCALER_CA_PATH}")
except Exception as e:
    logging.warning(f"Could not append Zscaler CA: {e}")

# Do NOT disable SSL verification globally!
# ssl._create_default_https_context = ssl._create_unverified_context  # REMOVE THIS
# os.environ['PYTHONHTTPSVERIFY'] = '0'  # REMOVE THIS

# Custom JSON encoder to handle NumPy types
class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (np.integer, np.int32, np.int64)):
            return int(obj)
        elif isinstance(obj, (np.floating, np.float32, np.float64)):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        return super().default(obj)

def convert_tensor(value):
    """Convert tensors and NumPy types to native Python types for JSON serialization."""
    # Handle PyTorch tensors
    if hasattr(value, 'cpu'):  # Check if it's a PyTorch tensor
        value = value.cpu()
    if hasattr(value, 'detach'):  # Detach from computation graph
        value = value.detach()
    if hasattr(value, 'numpy'):  # Convert to NumPy if possible
        value = value.numpy()
    
    # Handle both single values and arrays
    if hasattr(value, 'item') and callable(getattr(value, 'item')):
        try:
            return float(value.item())
        except ValueError:
            # If item() fails, convert to list
            return value.tolist()
    
    if isinstance(value, (np.integer, np.int32, np.int64)):
        return int(value)
    if isinstance(value, (np.floating, np.float32, np.float64)):
        return float(value)
    if isinstance(value, np.ndarray):
        return value.tolist()
    return value

def jsonable_numpy_encoder(obj: Any) -> Any:
    """Legacy function for backward compatibility."""
    if isinstance(obj, (np.integer, np.int32, np.int64, np.floating, np.float32, np.float64)):
        return float(obj) if isinstance(obj, (np.floating, np.float32, np.float64)) else int(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif hasattr(obj, 'tolist'):
        return obj.tolist()
    return obj

def process_item(item: Any) -> Any:
    """Recursively process items to ensure JSON serialization."""
    if isinstance(item, dict):
        return {k: process_item(v) for k, v in item.items()}
    elif isinstance(item, (list, tuple)):
        return [process_item(i) for i in item]
    else:
        return convert_tensor(item)

# Try to import transformers, fail gracefully if not installed
try:
    import transformers
    from transformers import pipeline
except ImportError:
    transformers = None

# Configure root logger to ensure all logs are captured
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    force=True  # Force reconfiguration of root logger
)

# Set transformers logging to INFO level
logging.getLogger('transformers').setLevel(logging.INFO)
logging.getLogger('filelock').setLevel(logging.INFO)
logging.getLogger('urllib3').setLevel(logging.INFO)

# Get logger for this module
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Create console handler with a higher log level
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
console_handler.setFormatter(formatter)
logger.addHandler(console_handler)

app = FastAPI()

# Override the default JSON encoder to handle NumPy types
app.json_encoder = NumpyEncoder

# List of known HuggingFace pipeline tasks grouped by type
PIPELINES = {
    "text": {
        "sentiment-analysis": {
            "desc": "Classify sentiment of text",
            "model": "distilbert/distilbert-base-uncased-finetuned-sst-2-english"
        },
        "text-generation": {
            "desc": "Generate text from a prompt",
            "model": "gpt2"
        },
        # "ner": { # XXX: double to remove
        #     "desc": "Named Entity Recognition",
        #     "model": "dbmdz/bert-large-cased-finetuned-conll03-english"
        # },
        "question-answering": {
            "desc": "Answer questions based on context",
            "model": "distilbert-base-cased-distilled-squad"
        },
        "summarization": {
            "desc": "Summarize long text",
            "model": "google-t5/t5-base"  #"facebook/bart-large-cnn"
        },
        "fill-mask": {
            "desc": "Fill masked tokens in a sentence",
            "model": "bert-base-uncased"
        },
        "translation": {
            "desc": "Translate text between languages",
            "model": "facebook/mbart-large-50-many-to-many-mmt"
        },
        "feature-extraction": {
            "desc": "Extract features from text (embeddings)",
            "model": "sentence-transformers/all-MiniLM-L6-v2"
        },
        "zero-shot-classification": {
            "desc": "Classify text with labels not seen during training",
            "model": "facebook/bart-large-mnli"
        },
        "token-classification": {
            "desc": "Classify tokens in text (e.g., NER, POS)",
            "model": "dbmdz/bert-large-cased-finetuned-conll03-english"
        },
        "text2text-generation": {
            "desc": "General text-to-text tasks (e.g., translation, summarization)",
            "model": "google/flan-t5-base"
        }
    },
    "image": {
        "image-classification": {
            "desc": "Classify objects in images",
            "model": "google/vit-base-patch16-224"
        },
        "object-detection": {
            "desc": "Detect objects in images",
            "model": "facebook/detr-resnet-50"
        }#,
        # "depth-estimation": {
        #     "desc": "Estimate depth from images",
        #     "model": "Intel/dpt-large"
        # },
        # "image-to-image": {
        #     "desc": "Transform images (e.g., style transfer)",
        #     "model": "CompVis/stable-diffusion-v1-4"
        # }
    },
    "audio": {
        "audio-classification": {
            "desc": "Classify audio clips",
            "model": "superb/hubert-large-superb-er"
        },
        "automatic-speech-recognition": {
            "desc": "Automatic Speech Recognition (transcribe speech to text)",
            "model": "openai/whisper-base"
        }
    },
    "video": {
        "video-classification": {
            "desc": "Classify video clips",
            "model": "MCG-NJU/videomae-base"
        }
    },
    "multimodal": {
        "image-to-text": {
            "desc": "Generate text from images (captioning)",
            "model": "nlpconnect/vit-gpt2-image-captioning"
        },
        "visual-question-answering": {
            "desc": "Answer questions about images",
            "model": "dandelin/vilt-b32-finetuned-vqa"
        },
        "automatic-speech-recognition": {
            "desc": "Transcribe speech to text",
            "model": "openai/whisper-base"
        },
        "text-to-speech": {
            "desc": "Generate speech from text",
            "model": "espnet/kan-bayashi_ljspeech_vits"
        },
        "audio-to-text": {
            "desc": "Convert audio to text (ASR)",
            "model": "openai/whisper-base"
        },
        "document-question-answering": {
            "desc": "Answer questions about documents (PDFs, scans)",
            "model": "impira/layoutlm-document-qa"
        }
    },
    "structured": {
        "table-question-answering": {
            "desc": "Answer questions about tables",
            "model": "google/tapas-large-finetuned-wtq"
        }
    }
}

# Helper functions
def get_all_pipeline_tasks():
    """Returns a flat dictionary of all pipeline tasks for backward compatibility"""
    all_tasks = {}
    for task_type, tasks in PIPELINES.items():
        all_tasks.update(tasks)
    return all_tasks

def get_pipeline_type(task_name):
    """Returns the type category for a given task name"""
    for task_type, tasks in PIPELINES.items():
        if task_name in tasks:
            return task_type
    return None

def get_pipeline_info(task_name):
    """Returns the pipeline info for a given task name"""
    for task_type, tasks in PIPELINES.items():
        if task_name in tasks:
            return tasks[task_name]
    return None

# Cache for loaded pipelines
PIPELINE_CACHE: Dict[str, Any] = {}

# Request models - Updated to support model parameter at top level
class TextPipelineRequest(BaseModel):
    input_data: Union[str, Dict[str, str]]
    model: Optional[str] = None
    params: Optional[Dict[str, Any]] = None

class ImagePipelineRequest(BaseModel):
    model: Optional[str] = None
    params: Optional[Dict[str, Any]] = None

class AudioPipelineRequest(BaseModel):
    model: Optional[str] = None
    params: Optional[Dict[str, Any]] = None

class VideoPipelineRequest(BaseModel):
    model: Optional[str] = None
    params: Optional[Dict[str, Any]] = None

class MultimodalPipelineRequest(BaseModel):
    input_data: Optional[str] = None
    model: Optional[str] = None
    params: Optional[Dict[str, Any]] = None

class StructuredPipelineRequest(BaseModel):
    input_data: Any
    model: Optional[str] = None
    params: Optional[Dict[str, Any]] = None

# Response model
class PipelineResponse(BaseModel):
    result: Any

# Common pipeline loading function
def load_pipeline(task: str, params: Optional[Dict[str, Any]] = None):
    """Load and cache a pipeline for the given task
    
    Args:
        task: The pipeline task to load
        params: Optional parameters including 'model' to override the default model
    """
    if transformers is None:
        raise HTTPException(status_code=503, detail="transformers library is not installed.")
    
    # Use model from params if provided, otherwise use default
    model_override = params.get('model') if params else None
    cache_key = f"{task}:{model_override}" if model_override else task
    
    if cache_key not in PIPELINE_CACHE:
        pipeline_info = get_pipeline_info(task)
        if not pipeline_info:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown pipeline task: {task}"
            )
        
        try:
            # Use model from params if provided, otherwise use default from pipeline_info
            model_name = model_override or pipeline_info['model']
            logger.info(f"Loading model: {model_name} for task: {task}")
            start_time = time.time()
            
            # Remove model from params to avoid passing it twice to pipeline
            if params:
                params = {k: v for k, v in params.items() if k != 'model'}
            
            # Log model download start with more context
            logger.info(f"🚀 [Model Loader] Starting download of model: {model_name}")
            logger.info(f"📁 Task: {task}")
            if model_override:
                logger.info(f"🔧 Using model override: {model_override}")
            
            # Enable detailed logging for transformers
            import transformers.utils.logging as transformers_logging
            transformers_logging.set_verbosity_info()
            transformers_logging.enable_default_handler()
            transformers_logging.enable_explicit_format()
            
            try:
                # Load the pipeline with progress tracking
                logger.info(f"🔍 Loading pipeline for task: {task}")
                if params:
                    logger.info(f"⚙️  With parameters: {json.dumps(params, indent=2, default=str)}")
                
                # Load the pipeline
                pipe = pipeline(task=task, model=model_name, **params) if params else pipeline(task=task, model=model_name)
                
                # Log successful download and loading
                load_time = time.time() - start_time
                logger.info(f"✅ [Model Loader] Successfully loaded model: {model_name}")
                logger.info(f"⏱️  Loading took: {load_time:.2f} seconds")
                logger.info(f"💾 Cached pipeline with key: {cache_key}")
                
                # Log model configuration if available
                if hasattr(pipe, 'model') and hasattr(pipe.model, 'config'):
                    config = pipe.model.config.to_dict()
                    logger.info(f"🔧 Model configuration: {json.dumps({k: str(v) for k, v in config.items()}, indent=2)}")
                
            except Exception as e:
                logger.error(f"❌ [Model Loader] Error loading model {model_name}", exc_info=True)
                raise
            
            PIPELINE_CACHE[cache_key] = pipe
        except Exception as e:
            logger.error(f"Failed to load pipeline for {task} (model: {model_name if 'model_name' in locals() else 'N/A'}): {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to load pipeline: {e}"
            )
    
    return PIPELINE_CACHE[cache_key]

# Health check
@app.get("/huggingface/health")
async def health():
    return PlainTextResponse("healthy", status_code=200)

# List all pipelines
@app.get("/huggingface/pipelines")
async def list_pipelines():
    return {"pipelines": PIPELINES}

# List pipelines by category
@app.get("/huggingface/pipelines/{category}")
async def list_pipelines_by_category(category: str):
    if category not in PIPELINES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown category. Available categories: {list(PIPELINES.keys())}"
        )
    return {"category": category, "pipelines": PIPELINES[category]}

# TEXT PIPELINES
@app.post("/huggingface/text/{task}", response_model=PipelineResponse)
async def run_text_pipeline(task: str, request: TextPipelineRequest):
    if task not in PIPELINES["text"]:
        available_tasks = list(PIPELINES["text"].keys())
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown text task. Available text tasks: {available_tasks}"
        )
    
    # Merge model parameter into params if provided
    params = request.params or {}
    if request.model:
        params['model'] = request.model
    
    pipe = load_pipeline(task, params)
    
    try:
        input_data = request.input_data
        
        # Special handling for question-answering
        if task == "question-answering":
            if isinstance(input_data, str):
                input_data = {"question": input_data, "context": ""}
            elif not isinstance(input_data, dict) or "question" not in input_data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="For question-answering, input_data must be a string (question) or a dict with 'question' and 'context' keys"
                )
        
        # Remove model from params before passing to pipeline to avoid double-passing
        pipeline_params = {k: v for k, v in params.items() if k != 'model'}
        
        result = pipe(input_data, **pipeline_params)
        
        # Convert NumPy types to native Python types for JSON serialization
        if isinstance(result, (list, tuple)):
            result = [
                {k: float(v) if hasattr(v, 'item') and callable(getattr(v, 'item')) else v 
                 for k, v in item.items()} if isinstance(item, dict) 
                else float(item) if hasattr(item, 'item') and callable(getattr(item, 'item'))
                else item 
                for item in result
            ]
        elif isinstance(result, dict):
            result = {
                k: float(v) if hasattr(v, 'item') and callable(getattr(v, 'item')) else v 
                for k, v in result.items()
            }
        elif hasattr(result, 'item') and callable(getattr(result, 'item')):
            result = float(result)
            
        return {"result": result}
    
    except Exception as e:
        logger.error(f"Error running text pipeline {task}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# IMAGE PIPELINES
@app.post("/huggingface/image/{task}", response_model=PipelineResponse)
async def run_image_pipeline(
    task: str, 
    file: UploadFile = File(...), 
    model: Optional[str] = None,
    params: Optional[str] = None
):
    if task not in PIPELINES["image"]:
        available_tasks = list(PIPELINES["image"].keys())
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown image task. Available image tasks: {available_tasks}"
        )
    
    # Parse params if provided
    parsed_params = {}
    if params:
        try:
            import json
            parsed_params = json.loads(params)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON in params field"
            )
    
    # Add model to params if provided
    if model:
        parsed_params['model'] = model
    
    pipe = load_pipeline(task, parsed_params)
    
    try:
        from PIL import Image
        image = Image.open(io.BytesIO(await file.read()))
        
        # Remove model from params before passing to pipeline
        pipeline_params = {k: v for k, v in parsed_params.items() if k != 'model'}
        
        # Process the image
        result = pipe(image, **pipeline_params)
        
        # Ensure result is JSON serializable
        result = process_item(result)
        return {"result": result}
    
    except Exception as e:
        logger.error(f"Error running image pipeline {task}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# AUDIO PIPELINES
@app.post("/huggingface/audio/{task}", response_model=PipelineResponse)
async def run_audio_pipeline(
    task: str, 
    file: UploadFile = File(...), 
    model: Optional[str] = None,
    params: Optional[str] = None
):
    if task not in PIPELINES["audio"]:
        available_tasks = list(PIPELINES["audio"].keys())
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown audio task. Available audio tasks: {available_tasks}"
        )
    
    # Parse params if provided
    parsed_params = {}
    if params:
        try:
            import json
            parsed_params = json.loads(params)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON in params field"
            )
    
    # Add model to params if provided
    if model:
        parsed_params['model'] = model
    
    pipe = load_pipeline(task, parsed_params)
    
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            tmp.write(await file.read())
            tmp.flush()
            
            # Remove model from params before passing to pipeline
            pipeline_params = {k: v for k, v in parsed_params.items() if k != 'model'}
            
            # Process the audio and ensure result is JSON serializable
            result = process_item(pipe(tmp.name, **pipeline_params))
        os.unlink(tmp.name)
        return {"result": result}
    
    except Exception as e:
        logger.error(f"Error running audio pipeline {task}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# VIDEO PIPELINES
@app.post("/huggingface/video/{task}", response_model=PipelineResponse)
async def run_video_pipeline(
    task: str, 
    file: UploadFile = File(...), 
    model: Optional[str] = None,
    params: Optional[str] = None
):
    if task not in PIPELINES["video"]:
        available_tasks = list(PIPELINES["video"].keys())
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown video task. Available video tasks: {available_tasks}"
        )
    
    # Parse params if provided
    parsed_params = {}
    if params:
        try:
            import json
            parsed_params = json.loads(params)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON in params field"
            )
    
    # Add model to params if provided
    if model:
        parsed_params['model'] = model
    
    pipe = load_pipeline(task, parsed_params)
    
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
            tmp.write(await file.read())
            tmp.flush()
            
            # Remove model from params before passing to pipeline
            pipeline_params = {k: v for k, v in parsed_params.items() if k != 'model'}
            
            # Process the video and ensure result is JSON serializable
            result = process_item(pipe(tmp.name, **pipeline_params))
        os.unlink(tmp.name)
        return {"result": result}
    
    except Exception as e:
        logger.error(f"Error running video pipeline {task}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# MULTIMODAL PIPELINES
@app.post("/huggingface/multimodal/{task}", response_model=PipelineResponse)
async def run_multimodal_pipeline(
    task: str, 
    question: Optional[str] = None,
    input_data: Optional[str] = None,  # Keeping for backward compatibility
    model: Optional[str] = None,
    params: Optional[str] = None,
    file: UploadFile = File(None)
):
    if task not in PIPELINES["multimodal"]:
        available_tasks = list(PIPELINES["multimodal"].keys())
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown multimodal task. Available multimodal tasks: {available_tasks}"
        )
    
    # Parse params if provided
    parsed_params = {}
    if params:
        try:
            import json
            parsed_params = json.loads(params)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON in params field"
            )
    
    # Add model to params if provided
    if model:
        parsed_params['model'] = model
    
    pipe = load_pipeline(task, parsed_params)
    
    try:
        # Remove model from params before passing to pipeline
        pipeline_params = {k: v for k, v in parsed_params.items() if k != 'model'}
        
        # Image-based multimodal tasks
        if task in ["image-to-text", "visual-question-answering", "document-question-answering"]:
            if not file:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="File upload required for this task."
                )
            
            if task == "visual-question-answering":
                if not question and not input_data:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Question text required for visual-question-answering. Provide either 'question' query parameter or 'input_data' form field."
                    )
                from PIL import Image
                image = Image.open(io.BytesIO(await file.read()))
                # Use question from query param if provided, otherwise fall back to input_data
                question_text = question if question is not None else input_data
                result = pipe(question=question_text, image=image, **pipeline_params)
            else:
                from PIL import Image
                image = Image.open(io.BytesIO(await file.read()))
                result = pipe(image, **pipeline_params)
        
        # Audio-based multimodal tasks
        elif task in ["automatic-speech-recognition", "audio-to-text"]:
            if not file:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Audio file upload required for this task."
                )
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
                tmp.write(await file.read())
                tmp.flush()
                result = pipe(tmp.name, **pipeline_params)
            os.unlink(tmp.name)
        
        # Text-to-speech
        elif task == "text-to-speech":
            if not input_data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Text input required for text-to-speech."
                )
            result = pipe(input_data, **pipeline_params)
        
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Handler not implemented for task: {task}"
            )
        
        # Ensure result is JSON serializable
        result = process_item(result)
        return {"result": result}
    
    except Exception as e:
        logger.error(f"Error running multimodal pipeline {task}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# STRUCTURED PIPELINES
@app.post("/huggingface/structured/{task}", response_model=PipelineResponse)
async def run_structured_pipeline(task: str, request: StructuredPipelineRequest):
    if task not in PIPELINES["structured"]:
        available_tasks = list(PIPELINES["structured"].keys())
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown structured task. Available structured tasks: {available_tasks}"
        )
    
    # Merge model parameter into params if provided
    params = request.params or {}
    if request.model:
        params['model'] = request.model
    
    pipe = load_pipeline(task, params)
    
    try:
        # Remove model from params before passing to pipeline
        pipeline_params = {k: v for k, v in params.items() if k != 'model'}
        
        result = pipe(request.input_data, **pipeline_params)
        
        # Ensure result is JSON serializable
        result = process_item(result)
        return {"result": result}
    
    except Exception as e:
        logger.error(f"Error running structured pipeline {task}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# Backward compatibility - keep the original endpoint
@app.post("/huggingface/run/{task}", response_model=PipelineResponse)
async def run_pipeline_legacy(task: str, request: dict = Body(...), file: UploadFile = File(None)):
    """Legacy endpoint for backward compatibility"""
    task_type = get_pipeline_type(task)
    if not task_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown pipeline task: {task}"
        )
    
    # Redirect to appropriate category endpoint based on task type
    if task_type == "text":
        text_request = TextPipelineRequest(**request)
        return await run_text_pipeline(task, text_request)
    elif task_type == "image":
        image_request = ImagePipelineRequest(**request)
        return await run_image_pipeline(task, file, image_request.model, json.dumps(image_request.params) if image_request.params else None)
    elif task_type == "audio":
        audio_request = AudioPipelineRequest(**request)
        return await run_audio_pipeline(task, file, audio_request.model, json.dumps(audio_request.params) if audio_request.params else None)
    elif task_type == "video":
        video_request = VideoPipelineRequest(**request)
        return await run_video_pipeline(task, file, video_request.model, json.dumps(video_request.params) if video_request.params else None)
    elif task_type == "multimodal":
        multimodal_request = MultimodalPipelineRequest(**request)
        return await run_multimodal_pipeline(task, multimodal_request.input_data, multimodal_request.model, json.dumps(multimodal_request.params) if multimodal_request.params else None, file)
    elif task_type == "structured":
        structured_request = StructuredPipelineRequest(**request)
        return await run_structured_pipeline(task, structured_request)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported task type: {task_type}"
        )