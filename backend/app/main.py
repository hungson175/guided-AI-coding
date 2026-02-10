from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.commands import router as commands_router
from app.api.chat import router as chat_router
from app.config import settings

app = FastAPI(title="AI Software Advisor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(commands_router)
app.include_router(chat_router)


@app.get("/health")
def health():
    return {"status": "healthy"}
