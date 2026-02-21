"""Voice input correction endpoint.

Receives raw STT transcript, corrects it using Grok LLM,
returns cleaned text for the chat input.
"""

import logging
import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import OpenAI

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/voice", tags=["voice"])


class CorrectionRequest(BaseModel):
    transcript: str


class CorrectionResponse(BaseModel):
    corrected: str


CORRECTION_PROMPT = """You are a speech-to-text correction assistant.

The user spoke in Vietnamese or English (or mixed). The STT system may have made errors with:
- Vietnamese diacritics and tone marks
- Technical terms (programming, software)
- Proper nouns
- Punctuation

Your job:
1. Fix obvious STT transcription errors
2. Add proper punctuation
3. Keep the original meaning exactly — do NOT rephrase or summarize
4. If the text is already correct, return it as-is
5. Output ONLY the corrected text, nothing else"""


@router.post("/correct", response_model=CorrectionResponse)
async def correct_transcript(request: CorrectionRequest):
    """Correct a raw STT transcript using Grok LLM."""
    api_key = os.environ.get("XAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="XAI_API_KEY not configured")

    if not request.transcript.strip():
        return CorrectionResponse(corrected="")

    logger.info(f"[VOICE] Correcting: '{request.transcript[:80]}...'")

    try:
        client = OpenAI(api_key=api_key, base_url="https://api.x.ai/v1")
        response = client.chat.completions.create(
            model="grok-4-fast-non-reasoning",
            messages=[
                {"role": "system", "content": CORRECTION_PROMPT},
                {"role": "user", "content": request.transcript},
            ],
            temperature=0.1,
            max_tokens=1024,
        )
        corrected = response.choices[0].message.content.strip()
        logger.info(f"[VOICE] Corrected: '{corrected[:80]}...'")
        return CorrectionResponse(corrected=corrected)
    except Exception as e:
        logger.error(f"[VOICE] Correction error: {e}")
        # Fallback: return original transcript
        return CorrectionResponse(corrected=request.transcript)
