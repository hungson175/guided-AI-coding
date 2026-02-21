# -*- coding: utf-8 -*-
"""Voice command processing routes.

Contains endpoints for:
- POST /command/{team_id}/{role_id} - Process voice command with LLM correction
- POST /transcribe - Audio transcription via Soniox

Sprint R1 Refactoring:
- CommandProcessor extracted to app.services.commands.processor
- Functions delegated for backward compatibility
"""

import logging
import os
from typing import Optional

import httpx
from fastapi import APIRouter, File, HTTPException, UploadFile

from app.models.voice_schemas import (
    TranscriptionResponse,
    VoiceCommandRequest,
    VoiceCommandResponse,
)
from app.services.commands import CommandProcessor, RoutedCommand
from app.services.task_done_listener import get_task_done_listener

logger = logging.getLogger(__name__)

router = APIRouter()

# Create processor instance
_command_processor = CommandProcessor()


# ============================================================
# Helper Functions (Backward Compatibility via Delegation)
# ============================================================


def get_pane_id(team_id: str, role_id: str) -> Optional[str]:
    """Look up actual tmux pane_id from role_id.

    Delegates to CommandProcessor (Sprint R1 refactor).
    """
    return _command_processor.get_pane_id(team_id, role_id)


def get_tmux_pane_content(team_id: str, role_id: str, lines: int = 50) -> str:
    """Get content from a tmux pane for LLM context.

    Delegates to CommandProcessor (Sprint R1 refactor).
    """
    return _command_processor.get_tmux_pane_content(team_id, role_id, lines)


def send_to_tmux_pane(team_id: str, role_id: str, command: str) -> bool:
    """Send command to tmux pane.

    Delegates to CommandProcessor (Sprint R1 refactor).
    """
    return _command_processor.send_to_tmux_pane(team_id, role_id, command)


def get_bl_pane_id(team_id: str) -> Optional[str]:
    """Get the BL (Backlog Organizer) pane ID for a team.

    Delegates to CommandProcessor (Sprint R1 refactor).
    """
    return _command_processor.get_bl_pane_id(team_id)


def correct_voice_command(voice_transcript: str, tmux_context: str) -> RoutedCommand:
    """Use LLM to correct pronunciation errors and determine routing.

    Delegates to CommandProcessor (Sprint R1 refactor).
    """
    return _command_processor.correct_voice_command(voice_transcript, tmux_context)


# ============================================================
# Voice Command Processing
# ============================================================


@router.post("/command/{team_id}/{role_id}", response_model=VoiceCommandResponse)
async def process_voice_command(
    team_id: str,
    role_id: str,
    request: VoiceCommandRequest,
):
    """Process voice command: correct with LLM and send to tmux.

    Called by frontend after detecting stop word ("go go").

    Args:
        team_id: tmux session name
        role_id: pane index
        request: Contains raw_command and transcript

    Returns:
        VoiceCommandResponse with corrected command
    """
    logger.info(
        f"[VOICE] Processing command for {team_id}/{role_id}: "
        f"'{request.transcript[:50]}...'"
    )

    try:
        # Get tmux pane context for LLM
        tmux_context = get_tmux_pane_content(team_id, role_id)

        # Correct command with LLM and get routing decision
        result = correct_voice_command(request.transcript, tmux_context)
        logger.info(
            f"[VOICE] Corrected: '{result.corrected_command[:50]}...' "
            f"(is_backlog_task={result.is_backlog_task})"
        )

        # Route to BL pane if this is a backlog WRITE task, otherwise use selected pane
        if result.is_backlog_task:
            bl_pane_id = get_bl_pane_id(team_id)
            if bl_pane_id:
                target_role_id = bl_pane_id
                logger.info(f"[VOICE] Routing to BL pane: {bl_pane_id}")
            else:
                # BL pane not found, fall back to selected pane
                logger.warning(f"[VOICE] BL pane not found in {team_id}, using selected pane")
                target_role_id = role_id
        else:
            target_role_id = role_id

        # Send to tmux pane
        success = send_to_tmux_pane(team_id, target_role_id, result.corrected_command)

        if not success:
            return VoiceCommandResponse(
                success=False,
                corrected_command=result.corrected_command,
                error="Failed to send command to tmux pane",
            )

        # Store pending command for Stop hook correlation (Sprint 4)
        listener = get_task_done_listener()
        listener.command_sent(
            team_id=team_id,
            role_id=target_role_id,
            raw_command=request.raw_command,
            corrected_command=result.corrected_command,
            speed=request.speed,  # Pass speed from request
        )

        return VoiceCommandResponse(
            success=True,
            corrected_command=result.corrected_command,
        )

    except Exception as e:
        logger.error(f"[VOICE] Command processing error: {e}")
        return VoiceCommandResponse(
            success=False,
            error=str(e)[:200],
        )


# ============================================================
# Audio Transcription Endpoint
# ============================================================


@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(audio: UploadFile = File(...)):
    """Transcribe audio file using Soniox API.

    Accepts multipart/form-data with audio file and returns transcription.

    Args:
        audio: Audio file (multipart/form-data)

    Returns:
        TranscriptionResponse with transcription text and success status
    """
    api_key = os.environ.get("SONIOX_API_KEY")
    if not api_key:
        logger.error("[VOICE] SONIOX_API_KEY not configured for transcription")
        raise HTTPException(
            status_code=500,
            detail="SONIOX_API_KEY not configured",
        )

    if not audio.filename:
        logger.error("[VOICE] Audio file missing filename")
        raise HTTPException(
            status_code=400,
            detail="Audio file must have a filename",
        )

    # Read audio file content early (outside try block for validation errors)
    try:
        audio_content = await audio.read()
    except Exception as e:
        logger.error(f"[VOICE] Failed to read audio file: {e}")
        raise HTTPException(
            status_code=400,
            detail="Failed to read audio file",
        )

    if not audio_content:
        logger.error("[VOICE] Audio file is empty")
        raise HTTPException(
            status_code=400,
            detail="Audio file is empty",
        )

    logger.info(
        f"[VOICE] Transcribing audio: {audio.filename} "
        f"({len(audio_content)} bytes)"
    )

    try:
        # Call Soniox API for transcription
        async with httpx.AsyncClient() as client:
            files = {"audio": (audio.filename, audio_content, audio.content_type)}
            headers = {
                "Authorization": f"Bearer {api_key}",
            }

            response = await client.post(
                "https://api.soniox.com/v1/transcribe",
                files=files,
                headers=headers,
                timeout=30.0,
            )

            if response.status_code != 200:
                logger.error(
                    f"[VOICE] Soniox transcription failed: {response.status_code} "
                    f"{response.text[:200]}"
                )
                return TranscriptionResponse(
                    transcription="",
                    success=False,
                    error=f"Soniox API error: {response.status_code}",
                )

            # Parse response
            data = response.json()
            transcription = data.get("transcript", "").strip()

            if not transcription:
                logger.warning("[VOICE] Soniox returned empty transcription")
                return TranscriptionResponse(
                    transcription="",
                    success=False,
                    error="No speech detected in audio",
                )

            logger.info(f"[VOICE] Transcription successful: {transcription[:50]}...")
            return TranscriptionResponse(
                transcription=transcription,
                success=True,
            )

    except httpx.TimeoutException:
        logger.error("[VOICE] Soniox transcription timeout")
        return TranscriptionResponse(
            transcription="",
            success=False,
            error="Soniox API timeout",
        )
    except httpx.RequestError as e:
        logger.error(f"[VOICE] Soniox request error: {e}")
        return TranscriptionResponse(
            transcription="",
            success=False,
            error=f"Request error: {str(e)[:100]}",
        )
    except Exception as e:
        logger.error(f"[VOICE] Transcription processing error: {e}")
        return TranscriptionResponse(
            transcription="",
            success=False,
            error=str(e)[:200],
        )
