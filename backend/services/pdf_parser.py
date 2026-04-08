import pdfplumber
import pytesseract
from pdf2image import convert_from_path
from PIL import Image
from groq import Groq
import os
import json
import logging
import random

logger = logging.getLogger(__name__)

# API Key handling
GROQ_API_KEY = os.getenv("GROQ_API_KEY") or os.getenv("VITE_GROQ_API_KEY")
if not GROQ_API_KEY or GROQ_API_KEY == "your-groq-api-key":
    logger.warning("GROQ_API_KEY is missing. Groq AI requests will fail.")

client = Groq(api_key=GROQ_API_KEY)

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extracts raw text from a PDF file using pdfplumber, with OCR fallback."""
    logger.info(f"📄 Starting extraction for: {pdf_path}")
    text = ""
    
    # 1. Try standard text extraction
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for i, page in enumerate(pdf.pages):
                page_text = page.extract_text()
                if page_text:
                    text += f"--- Page {i+1} ---\n{page_text}\n"
    except Exception as e:
        logger.error(f"❌ Standard extraction failed: {e}")

    # 2. OCR Fallback (If text is empty or too short)
    if len(text.strip()) < 50:
        logger.info("⚠️ Normal extraction yielded little text. Attempting OCR...")
        try:
            images = convert_from_path(pdf_path)
            for i, image in enumerate(images):
                ocr_text = pytesseract.image_to_string(image)
                if ocr_text:
                    text += f"--- Page {i+1} (OCR) ---\n{ocr_text}\n"
        except Exception as e:
            logger.error(f"❌ OCR extraction failed: {e}")

    # Log debug info
    if text:
        logger.info(f"✅ Extracted {len(text)} characters.")
        print("DEBUG TEXT SNIPPET:", text[:500])
    else:
        logger.error("❌ No text could be extracted from the PDF.")

    return text

def parse_network_with_ai(text: str):
    """Generates a dynamic, input-dependent network topology using Groq."""
    clean_text = text.strip()
    
    # Validation
    if not clean_text or len(clean_text) < 20:
        return {"error": "The PDF content is either empty or not readable."}

    # Enable Variation via topology styles
    styles = ["Hierarchical Tree", "Redundant Mesh", "Star-Bus Hybrid", "Spine-Leaf Core"]
    topology_type = random.choice(styles)

    prompt = f"""
You are a senior network engineer and infrastructure architect.

TASK:
Analyze the provided network documentation/text and generate a detailed Digital Twin topology.

INPUT DATA:
{clean_text[:8000]}

STRICT RULES:
1. DO NOT return a generic or default topology.
2. USE ONLY information found in the input. If it says 5 routers, create 5 routers.
3. If rooms, floors, or departments are mentioned, use them as 'campus_zone' and 'vlan_id'.
4. Ensure each node has a unique 'id' and a descriptive 'label'.
5. Reflect logical connections mentioned (e.g., 'Router A connects to Switch B via Fiber').
6. Run Suggestion: Consider a {topology_type} layout style if the data permits.

OUTPUT FORMAT (STRICT VALID JSON ONLY):
{{
  "nodes": [
    {{"id": "GW-01", "type": "router", "label": "Edge Gateway", "vlan_id": 1, "campus_zone": "MDF"}},
    {{"id": "SW-ACC-01", "type": "switch", "label": "Access Switch 1", "vlan_id": 10, "campus_zone": "Building A"}}
  ],
  "edges": [
    {{"id": "E1", "source": "GW-01", "target": "SW-ACC-01", "label": "Gigabit Uplink"}}
  ]
}}
"""

    try:
        logger.info("🤖 Requesting Groq AI network generation...")
        response = client.chat.completions.create(
            model="llama-3.1-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7, # Required for variation
            top_p=0.9
        )
        
        raw_content = response.choices[0].message.content.strip()
        
        # Clean potential markdown fences
        if "```" in raw_content:
            raw_content = raw_content.split("```")[1]
            if raw_content.startswith("json"):
                raw_content = raw_content[4:].strip()
            raw_content = raw_content.strip()
            
        return json.loads(raw_content)

    except Exception as e:
        logger.error(f"❌ AI Generation error: {e}")
        return {
            "error": "AI failed to generate a valid network topology",
            "details": str(e)
        }
