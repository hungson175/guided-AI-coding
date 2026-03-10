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


CORRECTION_PROMPT = """You are a voice transcription corrector. Fix misheard words and translate to natural English.

## User Speech Pattern
User speaks mixed Vietnamese/English. Main language is Vietnamese, but technical terms (components, UI, API, functions, etc.) are in English.

## CRITICAL RULES
1. **Translate MEANING, not word-by-word** - output natural, fluent English
2. **Preserve all IDEAS and POINTS** - don't drop any information the user intended to convey
3. **Merge repetitions** - if user repeats the same idea multiple times, say it once clearly
4. **Remove fillers** - drop "uh", "um", "à", "ờ", "ừ", false starts, and self-corrections
5. **Clean up rambling** - if user circles back to restate something, keep the clearest version

## Fix These STT Errors
- "cross code" / "cloud code" / "cloth code" → "Claude Code"
- "tea mux" / "tee mux" / "T mux" / "TMAX" → "tmux"
- "tm send" / "T M send" / "team send" → "tm-send"
- "L M" / "L.M." / "elem" → "LLM"
- "A.P.I" / "a p i" → "API"
- "get hub" / "git hub" → "GitHub"
- "pie test" / "pi test" → "pytest"
- "you v" / "UV" → "uv"
- "pee npm" / "P NPM" → "pnpm"

## Examples
Input: "cross code help me fix this bug in the backend folder please"
Output: Claude Code help me fix this bug in the backend folder please

Input: "chạy pie test cho folder backend đi, rồi check xem có lỗi gì không"
Output: Run pytest for the backend folder, then check if there are any errors

## Output
Return ONLY the corrected English text. No explanations, no quotes, no formatting."""


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
