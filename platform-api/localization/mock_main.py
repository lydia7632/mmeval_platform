"""极简 mock，仅供前端联调。不加载任何 ML 模型。"""
import shutil
import uuid
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

IMAGES_DIR = Path(__file__).resolve().parent / "images"
IMAGES_DIR.mkdir(exist_ok=True)

MODELS = [
    {"model_id": "clipvitb16", "name": "CLIP (ViT-B/16) [MOCK]"},
    {"model_id": "clipvitl14", "name": "CLIP (ViT-L/14) [MOCK]"},
]
METHODS = [
    {"method_id": "gradcam",      "name": "GradCAM",       "warning": None},
    {"method_id": "gradcam++",    "name": "GradCAM++",     "warning": None},
    {"method_id": "scorecam",     "name": "ScoreCAM",      "warning": "Mock only."},
    {"method_id": "xgradcam",     "name": "XGradCAM",      "warning": None},
    {"method_id": "eigencam",     "name": "EigenCAM",      "warning": None},
    {"method_id": "eigengradcam", "name": "EigenGradCAM",  "warning": None},
    {"method_id": "layercam",     "name": "LayerCAM",      "warning": None},
    {"method_id": "fullgrad",     "name": "FullGrad",      "warning": None},
]
FAKE_RAM_TAGS = ["cat", "dog", "table", "sofa", "tree", "sky", "person", "car"]

current_model_id = "clipvitb16"

app = FastAPI()
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)


class SwitchModelRequest(BaseModel):
    model_id: str

class RAMRequest(BaseModel):
    image_id: str

class ProcessRequest(BaseModel):
    image_id: str
    concept: str
    method_id: str


@app.get("/models")
def get_models():
    return {"models": MODELS}

@app.get("/current_model")
def get_current_model():
    return {"model_id": current_model_id}

@app.post("/current_model")
def switch_model(req: SwitchModelRequest):
    global current_model_id
    if req.model_id not in {m["model_id"] for m in MODELS}:
        raise HTTPException(status_code=400, detail="invalid model id.")
    current_model_id = req.model_id
    return {"model_id": current_model_id}

@app.get("/methods")
def get_methods():
    return {"methods": METHODS}

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    image_id = str(uuid.uuid4())
    dest = IMAGES_DIR / f"{image_id}.jpg"
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)
    return {"image_id": image_id}

@app.post("/ram_process")
def ram_process(req: RAMRequest):
    return {"ram_result": FAKE_RAM_TAGS}

@app.post("/process")
def process(req: ProcessRequest):
    src = IMAGES_DIR / f"{req.image_id}.jpg"
    if not src.exists():
        raise HTTPException(status_code=404, detail="image not found.")
    new_id = str(uuid.uuid4())
    shutil.copy(src, IMAGES_DIR / f"{new_id}.jpg")
    return {"image_id": new_id}

@app.get("/image/{image_id}")
def get_image(image_id: str):
    path = IMAGES_DIR / f"{image_id}.jpg"
    if not path.exists():
        raise HTTPException(status_code=404, detail="image not found.")
    return FileResponse(path=str(path), filename=f"{image_id}.jpg", media_type="image/jpeg")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
