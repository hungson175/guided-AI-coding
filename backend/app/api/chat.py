from fastapi import APIRouter
from pydantic import BaseModel

from app.services.tmux_service import send_keys, TUTOR_PANE, session_exists

router = APIRouter()


class ChatRequest(BaseModel):
    message: str


class ChatResponseModel(BaseModel):
    text: str
    sent: bool


@router.post("/api/chat", response_model=ChatResponseModel)
def chat(req: ChatRequest):
    if not session_exists():
        return ChatResponseModel(text="Tmux session not running. Start it with scripts/setup-tutor.sh", sent=False)
    send_keys(TUTOR_PANE, req.message)
    return ChatResponseModel(text="Message sent to tutor", sent=True)
