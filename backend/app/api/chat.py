from fastapi import APIRouter
from pydantic import BaseModel

from app.services.advisor_responses import get_advisor_response

router = APIRouter()


class ChatRequest(BaseModel):
    message: str


class ChatResponseModel(BaseModel):
    text: str


@router.post("/api/chat", response_model=ChatResponseModel)
def chat(req: ChatRequest):
    result = get_advisor_response(req.message)
    return ChatResponseModel(text=result.text)
