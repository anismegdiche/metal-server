"""
HuggingFace Sentence Similarity Service

This module provides a FastAPI-based service for running HuggingFace sentence similarity tasks.
"""

from fastapi import FastAPI, HTTPException, status, APIRouter
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Union
import logging
from sentence_transformers import SentenceTransformer, util

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    force=True,
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="HuggingFace Sentence Similarity Service",
    description="API for HuggingFace sentence similarity",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter(prefix="/text-sentence-similarity")
TASK_CACHE: Dict[str, Any] = {}

class SentenceSimilarityInput(BaseModel):
    source_sentence: str = Field(..., description="The source sentence to compare against")
    sentences: List[str] = Field(..., description="List of sentences to compare with the source sentence")

class SentenceSimilarityRequest(BaseModel):
    input_data: Union[SentenceSimilarityInput, Dict[str, Any]]

class SentenceSimilarityResponse(BaseModel):
    result: Any = Field(..., description="The similarity scores")

def load_sentence_similarity_model() -> Any:
    cache_key = "sentence-similarity"
    if cache_key not in TASK_CACHE:
        logger.info("Loading sentence-transformers model for similarity...")
        TASK_CACHE[cache_key] = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    return TASK_CACHE[cache_key]

@router.get("/health", response_class=PlainTextResponse)
async def health() -> str:
    return "healthy"

@router.post("/run", response_model=SentenceSimilarityResponse)
async def run_sentence_similarity(request: Union[SentenceSimilarityRequest, Dict[str, Any]]) -> SentenceSimilarityResponse:
    if isinstance(request, dict):
        request = SentenceSimilarityRequest(**request)
    input_data = request.input_data
    # Accept both dict and SentenceSimilarityInput
    if isinstance(input_data, dict):
        input_data = SentenceSimilarityInput(**input_data)
    if not input_data.source_sentence or not input_data.sentences:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both 'source_sentence' and 'sentences' are required"
        )
    try:
        model = load_sentence_similarity_model()
        all_sentences = [input_data.source_sentence] + input_data.sentences
        embeddings = model.encode(all_sentences, convert_to_tensor=True)
        source_embedding = embeddings[0]
        results = []
        for i, sentence in enumerate(input_data.sentences, 1):
            similarity = float(util.pytorch_cos_sim(source_embedding, embeddings[i])[0][0])
            results.append({
                "sentence1": input_data.source_sentence,
                "sentence2": sentence,
                "similarity": similarity,
                "rank": i
            })
        # Sort results by similarity in descending order
        results.sort(key=lambda x: x["similarity"], reverse=True)
        # Update ranks after sorting
        for i, result in enumerate(results, 1):
            result["rank"] = i
        return SentenceSimilarityResponse(result=results)
    except Exception as e:
        logger.error(f"Error processing sentence similarity: {str(e)}", exc_info=True)
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

    parser = argparse.ArgumentParser(description="Sentence similarity service utility")
    parser.add_argument("--load-pipe", action="store_true", help="Load the sentence-similarity pipeline and exit")
    args = parser.parse_args()
    
    if args.load_pipe:
        try:
            load_sentence_similarity_model()
            print("Pipeline loaded successfully.")
            sys.exit(0)
        except Exception as e:
            print(f"Failed to load pipeline: {str(e)}")
            sys.exit(1)
