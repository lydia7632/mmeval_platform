import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

_DATA_DIR = Path(__file__).resolve().parent
_PAPERS_PATH = _DATA_DIR / "papers.json"

with _PAPERS_PATH.open(encoding="utf-8") as f:
    _papers: list[dict] = json.load(f)

_by_id = {p["id"]: p for p in _papers}

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/papers")
def get_papers():
    return {"papers": _papers}


@app.get("/papers/{paper_id}")
def get_paper(paper_id: str):
    paper = _by_id.get(paper_id)
    if paper is None:
        raise HTTPException(status_code=404, detail="paper not found.")
    return paper


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
