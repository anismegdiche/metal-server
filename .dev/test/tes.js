const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const IMAGE_PATH = path.join(__dirname, '../data/ocr-2.png');  // Update path as needed
const API_URL = 'http://localhost:5000/myocr/image-to-string';
const LANG = 'fra';  // Change to desired language code (e.g., 'fra', 'spa', 'deu')

async function testOCR() {
    try {
        // Read image file
        const fileBuffer = fs.readFileSync(IMAGE_PATH);
        
        const _url = `${API_URL}?lang=${LANG}`;
        console.log(_url);
        // Make the request
        const response = await axios.post(
            _url,
            fileBuffer,
            {
                headers: {
                    'Content-Type': 'application/octet-stream'
                }
            }
        );

        // Log results
        console.log('=== OCR Results ===');
        console.log(response.data);
        console.log('---------------------');
        
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

// List available languages
async function listLanguages() {
    try {
        const response = await axios.get('http://localhost:5000/myocr/languages');
        console.log('=== Supported Languages ===');
        console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error fetching languages:', error.message);
    }
}

// Run the test
async function main() {
    // await listLanguages();
    // console.log('\n');
    await testOCR();
}

main();