from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import ai_router, reels_router, sync_router
from app.services import load_reels


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Automatically ensure reels data is loaded/extracted on startup
    try:
        load_reels()
    except Exception as e:
        print(f"Warning: Auto-loading reels data on startup encountered: {e}")
    yield


app = FastAPI(
    title="Curio API",
    description="Backend API for Curio - Smart Instagram Saved Posts Knowledge Base",
    version="0.2.0",
    lifespan=lifespan,
)

# Enable CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include modular routers
app.include_router(reels_router)
app.include_router(ai_router)
app.include_router(sync_router)



@app.get("/")
def read_root():
    return {"message": "Welcome to Curio API", "version": "0.2.0"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
