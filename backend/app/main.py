from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.app.api.routes import router


BASE_DIR = Path(__file__).resolve().parents[2]
FRONTEND_DIR = BASE_DIR / "frontend"


app = FastAPI(
    title="Trace-X",
    description="AI-Powered Bitcoin Transaction Traffic Monitoring & Analysis",
    version="1.0.0"
)

app.include_router(router, prefix="/api")

app.mount(
    "/static",
    StaticFiles(directory=FRONTEND_DIR),
    name="static"
)


@app.get("/")
def root():
    return FileResponse(
        FRONTEND_DIR / "index.html"
    )
