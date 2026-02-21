import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.tmux_service import capture_pane_async, TUTOR_PANE

router = APIRouter()

POLL_INTERVAL = 0.5


@router.websocket("/api/ws/tutor")
async def tutor_stream(ws: WebSocket):
    await ws.accept()
    last_content = ""
    try:
        while True:
            content = await capture_pane_async(TUTOR_PANE)
            if content != last_content:
                last_content = content
                await ws.send_text(content)
            await asyncio.sleep(POLL_INTERVAL)
    except WebSocketDisconnect:
        pass
    except Exception:
        try:
            await ws.close()
        except Exception:
            pass
