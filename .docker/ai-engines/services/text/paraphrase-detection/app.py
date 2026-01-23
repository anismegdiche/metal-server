from fastapi import FastAPI, HTTPException, status, APIRouter
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any, Union, List, Optional
import logging
import os
import psutil
from sentence_transformers import SentenceTransformer, util

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
    title="Paraphrase Detection Service",
    description="API for paraphrase detection using sentence-transformers",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter(prefix="/text-paraphrase-detection")
TASK_CACHE: Dict[str, Any] = {}

class ParaphraseInput(BaseModel):
    source_sentence: str = Field(..., description="First sentence to compare")
    target_sentence: str = Field(..., description="Second sentence to compare")

class ParaphraseDetectionRequest(BaseModel):
    input_data: ParaphraseInput

class ParaphraseDetectionResponse(BaseModel):
    result: Any = Field(..., description="The paraphrase detection result")

def load_sentence_transformer() -> Any:
    cache_key = "sentence-transformer"
    if cache_key not in TASK_CACHE:
        logger.info("Loading sentence-transformer model...")
        TASK_CACHE[cache_key] = SentenceTransformer("all-MiniLM-L6-v2")
    return TASK_CACHE[cache_key]

@router.get("/health", response_class=PlainTextResponse)
async def health() -> str:
    return "healthy"

@router.post("/run", response_model=ParaphraseDetectionResponse)
async def run_paraphrase_detection(request: Union[ParaphraseDetectionRequest, Dict[str, Any]]) -> ParaphraseDetectionResponse:
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
        request = ParaphraseDetectionRequest(**request)
    input_data = request.input_data
    if not input_data or not input_data.source_sentence or not input_data.target_sentence:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both source_sentence and target_sentence are required"
        )
    try:
        model = load_sentence_transformer()
        emb1 = model.encode(input_data.source_sentence, convert_to_tensor=True)
        emb2 = model.encode(input_data.target_sentence, convert_to_tensor=True)
        similarity = float(util.pytorch_cos_sim(emb1, emb2)[0][0])
        result = {
            "source_sentence": input_data.source_sentence,
            "target_sentence": input_data.target_sentence,
            "similarity_score": similarity
        }
        return ParaphraseDetectionResponse(result=result)
    except Exception as e:
        logger.error(f"Error processing paraphrase detection: {str(e)}", exc_info=True)
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

    parser = argparse.ArgumentParser(description="Paraphrase detection service utility")
    parser.add_argument("--load-pipe", action="store_true", help="Load the paraphrase detection pipeline and exit")
    args = parser.parse_args()
    
    if args.load_pipe:
        try:
            load_sentence_transformer()
            print("Pipeline loaded successfully.")
            sys.exit(0)
        except Exception as e:
            print(f"Failed to load pipeline: {str(e)}")
            sys.exit(1)
