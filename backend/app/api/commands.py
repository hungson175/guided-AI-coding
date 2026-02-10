from fastapi import APIRouter
from pydantic import BaseModel

from app.services.mock_commands import execute_command

router = APIRouter()


class CommandRequest(BaseModel):
    command: str


class CommandResponseModel(BaseModel):
    output: str
    secondary: str | None = None
    appContent: str | None = None  # camelCase for frontend compatibility


@router.post("/api/commands", response_model=CommandResponseModel)
def run_command(req: CommandRequest):
    result = execute_command(req.command)
    return CommandResponseModel(
        output=result.output,
        secondary=result.secondary,
        appContent=result.app_content,
    )
