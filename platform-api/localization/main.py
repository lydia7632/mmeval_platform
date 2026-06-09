import io
import threading
import uuid

from contextlib import asynccontextmanager
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from PIL import Image

import cv2
import numpy as np
from torch import nn
from transformers import CLIPProcessor, CLIPModel
from pytorch_grad_cam.utils.image import preprocess_image, show_cam_on_image
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget

from ram.models import ram_plus
from ram import get_transform, inference_ram

from utils import MODEL_META, CAM_META

model_id = "clipvitb16"


class SwitchModelRequest(BaseModel):
    model_id: str


class RAMRequest(BaseModel):
    image_id: str


class ProcessRequest(BaseModel):
    image_id: str
    concept: str
    method_id: str


class ImageClassifier(nn.Module):
    def __init__(self, model_id):
        super(ImageClassifier, self).__init__()
        self.clip = CLIPModel.from_pretrained(MODEL_META[model_id]["path"])
        self.processor = CLIPProcessor.from_pretrained(MODEL_META[model_id]["path"])
        self.labels = []

    def set_concept(self, concept):
        self.labels = [concept, "background"]

    def forward(self, x):
        text_inputs = self.processor(
            text=self.labels, return_tensors="pt", padding=True)

        outputs = self.clip(pixel_values=x, input_ids=text_inputs['input_ids'].to(self.clip.device),
                            attention_mask=text_inputs['attention_mask'].to(self.clip.device))

        logits_per_image = outputs.logits_per_image
        probs = logits_per_image.softmax(dim=1)

        for label, prob in zip(self.labels, probs[0]):
            print(f"{label}: {prob:.4f}")
        return probs


def reshape_transform(tensor):
    size = int(tensor.size(1) ** 0.5)
    assert size * size + 1 == tensor.size(1)
    result = tensor[:, 1:, :].reshape(tensor.size(0), size, size, tensor.size(2))
    result = result.transpose(2, 3).transpose(1, 2)
    return result


base_model = None
ramplus_model = None
ramplus_transform = None
base_model_lock = threading.Lock()
ramplus_model_lock = threading.Lock()


@asynccontextmanager
async def lifespan(app):
    global base_model, ramplus_model, ramplus_transform
    with base_model_lock:
        print(">> loading base model...")
        base_model = ImageClassifier(model_id).eval()
        print(">> base model loaded.")

    with ramplus_model_lock:
        print(">> loading RAM+ model...")
        ramplus_model = ram_plus(
            pretrained="./models/ram_plus_swin_large_14m.pth",
            image_size=384,
            vit="swin_l",
        ).eval()
        ramplus_transform = get_transform(image_size=384)
        print(">> RAM+ model loaded.")

    yield
    base_model = None
    ramplus_model = None
    ramplus_transform = None


# app = FastAPI()
app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/models")
def get_models():
    return {"models": list(map(
        lambda x: { "model_id": x[0], "name": x[1]["name"] },
        MODEL_META.items(),
    ))}


@app.get("/current_model")
def get_current_model():
    return {"model_id": model_id}


@app.post("/current_model")
def switch_model(request_data: SwitchModelRequest):
    global base_model, model_id
    new_model_id = request_data.model_id
    if new_model_id not in MODEL_META:
        raise HTTPException(status_code=400, detail="invalid model id.")
    with base_model_lock:
        print(f">> switching to model {new_model_id}...")
        base_model = ImageClassifier(new_model_id).eval()
        model_id = new_model_id
        print(f">> switched to model {new_model_id}.")
    return {"model_id": model_id}


@app.get("/methods")
def get_methods():
    return {"methods": list(map(
        lambda x: { "method_id": x[0], "name": x[1]["name"], "warning": x[1].get("warning", None) },
        CAM_META.items(),
    ))}


@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        image_id = str(uuid.uuid4())
        image_stream = io.BytesIO(contents)
        img = Image.open(image_stream).convert("RGB")
        img.save(f"images/{image_id}.jpg", "JPEG")
        return {"image_id": image_id}

    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail="error uploading image.")


@app.post("/ram_process")
def ram_process(request_data: RAMRequest):
    image_id = request_data.image_id
    try:
        image = ramplus_transform(Image.open(f"images/{image_id}.jpg")).unsqueeze(0)
        with ramplus_model_lock:
            res = inference_ram(image, ramplus_model)
        ram_result = res[0].strip().split(" | ")
        return { "ram_result": ram_result }
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail="error processing image with RAM+.")


@app.post("/process")
def process(request_data: ProcessRequest):
    image_id = request_data.image_id
    concept = request_data.concept
    method_id = request_data.method_id
    if method_id not in CAM_META:
        raise HTTPException(status_code=400, detail="invalid CAM method.")
    try:
        base_model.set_concept(concept)
        target_layers = [base_model.clip.vision_model.encoder.layers[-1].layer_norm1]
        input_image = cv2.imread(f"images/{image_id}.jpg", 1)[:, :, ::-1]
        original_size = (input_image.shape[1], input_image.shape[0])
        rgb_image = cv2.resize(input_image, (224, 224))
        rgb_image = np.float32(rgb_image) / 255
        input_tensor = preprocess_image(rgb_image, mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5])
        with base_model_lock:
            cam = CAM_META[method_id]["class"](model=base_model, target_layers=target_layers, reshape_transform=reshape_transform)
            grayscale_cam = cam(input_tensor=input_tensor, targets=[ClassifierOutputTarget(0)])
        grayscale_cam = grayscale_cam[0, :]
        grayscale_cam = cv2.resize(grayscale_cam, original_size)
        result_image = show_cam_on_image(np.float32(input_image) / 255, grayscale_cam)
        result_image_id = str(uuid.uuid4())
        cv2.imwrite(f"images/{result_image_id}.jpg", result_image)
        return {"image_id": result_image_id}

    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail="error processing image.")


@app.get("/image/{image_id}")
def get_image(image_id: str):
    try:
        return FileResponse(
            path=f"images/{image_id}.jpg",
            filename=f"{image_id}.jpg",
            media_type="image/jpeg"
        )
    except Exception as e:
        print(e)
        raise HTTPException(status_code=404, detail="image not found.")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
