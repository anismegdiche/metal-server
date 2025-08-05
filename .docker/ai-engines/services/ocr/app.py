from fastapi import FastAPI, Request, UploadFile, File, HTTPException, status
from fastapi.responses import JSONResponse, PlainTextResponse
import pytesseract
from PIL import Image, ImageFile
import io
import os
import logging
import subprocess
from typing import Tuple

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ImageFile.LOAD_TRUNCATED_IMAGES = True

TESSDATA_PREFIX = os.environ.get('TESSDATA_PREFIX', '/usr/share/tesseract-ocr/5/tessdata')
os.environ['TESSDATA_PREFIX'] = TESSDATA_PREFIX
os.makedirs(TESSDATA_PREFIX, exist_ok=True)

def download_language_data(lang: str) -> Tuple[bool, str]:
    """Download Tesseract language data if not already present."""
    tessdata_file = os.path.join(TESSDATA_PREFIX, f'{lang}.traineddata')
    
    # Check if file already exists
    if os.path.exists(tessdata_file):
        return True, f"Language file for '{lang}' already exists."
    
    try:
        import urllib.request
        import shutil
        import tempfile
        
        # Try multiple mirrors in case one fails
        mirrors = [
            f"https://github.com/tesseract-ocr/tessdata_best/raw/main/{lang}.traineddata",
            f"https://github.com/tesseract-ocr/tessdata/raw/main/{lang}.traineddata",
            f"https://raw.githubusercontent.com/tesseract-ocr/tessdata_best/main/{lang}.traineddata"
        ]
        
        # Create a temporary file
        temp_fd, temp_path = tempfile.mkstemp()
        os.close(temp_fd)
        
        success = False
        last_error = None
        
        for url in mirrors:
            try:
                logger.info(f"Attempting to download {lang} from {url}")
                with urllib.request.urlopen(url) as response, open(temp_path, 'wb') as out_file:
                    shutil.copyfileobj(response, out_file)
                
                # Verify the downloaded file is not an HTML error page
                with open(temp_path, 'rb') as f:
                    content = f.read(1024).decode('utf-8', 'ignore').lower()
                    if 'html' in content or 'not found' in content or '404' in content:
                        logger.warning(f"Received HTML response from {url}, trying next mirror...")
                        continue
                
                # Move to tessdata directory
                shutil.move(temp_path, tessdata_file)
                success = True
                logger.info(f"Successfully downloaded and installed '{lang}' language data.")
                break
                
            except Exception as e:
                last_error = str(e)
                logger.warning(f"Failed to download from {url}: {last_error}")
                continue
        
        # Clean up temp file if it still exists
        if os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except:
                pass
        
        if not success:
            return False, f"All download attempts failed. Last error: {last_error}"
            
        return True, f"Successfully downloaded and installed '{lang}' language data."
        
    except Exception as e:
        error_msg = f"Failed to download language data for '{lang}': {str(e)}"
        logger.error(error_msg)
        return False, error_msg

def ensure_language_available(lang: str) -> Tuple[bool, str]:
    """Ensure the specified language is available, download if necessary."""
    # Check if tesseract is installed
    try:
        subprocess.run(['tesseract', '--version'], 
                      check=True, 
                      stdout=subprocess.PIPE, 
                      stderr=subprocess.PIPE)
    except (subprocess.SubprocessError, FileNotFoundError):
        return False, "Tesseract OCR is not installed. Please install it first."
    
    # Try to use the language to see if it's available
    try:
        test_cmd = ['tesseract', '--list-langs']
        result = subprocess.run(test_cmd, 
                              stdout=subprocess.PIPE, 
                              stderr=subprocess.PIPE,
                              text=True)
        
        if result.returncode == 0 and lang in result.stdout.split('\n'):
            return True, f"Language '{lang}' is available."
    except Exception:
        pass  # We'll try to download the language anyway
    
    # If we get here, try to download the language
    return download_language_data(lang)

# Initialize required languages on startup
REQUIRED_LANGUAGES = ['eng']  # English is required by default

for lang in REQUIRED_LANGUAGES:
    success, message = ensure_language_available(lang)
    if success:
        logger.info(message)
    else:
        logger.warning(message)

app = FastAPI()

# List of supported languages and their download status
SUPPORTED_LANGUAGES = {
    'eng': {'name': 'English', 'downloaded': False},
    'fra': {'name': 'French', 'downloaded': False},
    'spa': {'name': 'Spanish', 'downloaded': False},
    'deu': {'name': 'German', 'downloaded': False},
    'ita': {'name': 'Italian', 'downloaded': False},
    'por': {'name': 'Portuguese', 'downloaded': False},
    'ara': {'name': 'Arabic', 'downloaded': False},
    'chi_sim': {'name': 'Chinese (Simplified)', 'downloaded': False},
    'chi_tra': {'name': 'Chinese (Traditional)', 'downloaded': False},
    'jpn': {'name': 'Japanese', 'downloaded': False},
    'kor': {'name': 'Korean', 'downloaded': False},
    'rus': {'name': 'Russian', 'downloaded': False}
}

# Update download status for available languages
try:
    result = subprocess.run(['tesseract', '--list-langs'], 
                          stdout=subprocess.PIPE, 
                          stderr=subprocess.PIPE,
                          text=True)
    if result.returncode == 0:
        available_langs = set(line.strip() for line in result.stdout.split('\n') if line.strip())
        for lang in available_langs:
            if lang in SUPPORTED_LANGUAGES:
                SUPPORTED_LANGUAGES[lang]['downloaded'] = True
except Exception as e:
    logger.warning(f"Could not check installed languages: {str(e)}")


@app.get("/ocr/health")
async def health():
    return PlainTextResponse('healthy', status_code=200)

@app.get("/ocr/languages")
async def get_languages():
    """Return the list of supported languages"""
    return {
        'languages': SUPPORTED_LANGUAGES,
        'default': 'eng'
    }

@app.post("/ocr/image-to-string")
async def ocr(
    request: Request,
    lang: str = 'eng',
    image: UploadFile = File(None)
):
    # Validate language
    if lang not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported language. Supported languages are: {list(SUPPORTED_LANGUAGES.keys())}"
        )

    # Ensure language is downloaded
    if not SUPPORTED_LANGUAGES[lang]['downloaded']:
        success, message = ensure_language_available(lang)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Failed to download language data for {lang}: {message}"
            )
        SUPPORTED_LANGUAGES[lang]['downloaded'] = True
        logger.info(f"Successfully downloaded language data for {lang}")

    # Handle both file upload and raw binary data
    img_bytes = None
    if image is not None:
        img_bytes = await image.read()
    else:
        body = await request.body()
        if body:
            img_bytes = body

    if not img_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No image data provided"
        )

    try:
        img = Image.open(io.BytesIO(img_bytes))
        custom_config = r'--oem 3 --psm 6'
        text = pytesseract.image_to_string(img, lang=lang, config=custom_config, timeout=60)
        return {
            'text': text,
            'language': lang,
            'language_name': SUPPORTED_LANGUAGES.get(lang, 'Unknown')
        }
    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process image: {str(e)}"
        )
        