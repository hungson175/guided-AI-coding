from fastapi import APIRouter
from pydantic import BaseModel

from app.services.tutor_agent import get_tutor_agent

router = APIRouter()


class ChatRequest(BaseModel):
    message: str


class ChatResponseModel(BaseModel):
    text: str


@router.post("/api/chat", response_model=ChatResponseModel)
def chat(req: ChatRequest):
    agent = get_tutor_agent()
    result = agent.chat(req.message)
    return ChatResponseModel(text=result)
