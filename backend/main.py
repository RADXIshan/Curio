import os
from dotenv import load_dotenv
import uvicorn
from app.app import app

load_dotenv()

PORT = int(os.getenv("PORT", 8000))

if __name__ == "__main__":
    print("Starting Curio...", flush=True)
    uvicorn.run("app.app:app", host="127.0.0.1", port=PORT, reload=True)