from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from typing import Optional
import os
from PIL import Image
from io import BytesIO
import torch
from pydantic import BaseModel
from imaginairy import generate_image
from imaginairy.schema import ImageGenerationResult, ImaginePrompt, LazyLoadingImage

app = FastAPI(title="Imaginairy API")

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Image generation endpoint
class ImageGenerationRequest(BaseModel):
    prompt: str
    negative_prompt: str = ""
    width: int = 512
    height: int = 512
    steps: int = 30
    cfg_scale: float = 7.5
    sampler_type: str = "k_lms"
    seed: Optional[int] = None

class ImageGenerationResponse(BaseModel):
    status: str
    image: str
    seed: int
    model: str

@app.post("/generate", response_model=ImageGenerationResponse)
async def generate_image_endpoint(
    request: ImageGenerationRequest = Depends(),
):
    try:
        # Create a generation prompt
        prompt_obj = ImaginePrompt(
            prompt=request.prompt,
            negative_prompt=request.negative_prompt,
            width=request.width,
            height=request.height,
            steps=request.steps,
            cfg_scale=request.cfg_scale,
            sampler_type=request.sampler_type,
            seed=request.seed if request.seed is not None else int.from_bytes(os.urandom(2), "big"),
        )
        
        # Generate the image
        result = next(generate_image(prompt_obj))
        
        # Convert to bytes
        img_byte_arr = BytesIO()
        result.img.save(img_byte_arr, format='PNG')
        img_byte_arr = img_byte_arr.getvalue()
        
        return ImageGenerationResponse(
            status="success",
            image=img_byte_arr.hex(),
            seed=prompt_obj.seed,
            model=getattr(prompt_obj, 'model', 'unknown')
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=5000, reload=True)


# # Build the Docker image
# docker build -t imaginairy-service .

# # Run the container
# docker run -p 5000:5000 --gpus all imaginairy-service