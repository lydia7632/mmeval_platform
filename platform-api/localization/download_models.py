from huggingface_hub import snapshot_download
from utils import MODEL_META


def download_models():
    for model_id, model_info in MODEL_META.items():
        print(f">> downloading model {model_id}...")
        snapshot_download(
            repo_id=model_info["repo"],
            local_dir=model_info["path"],
            local_dir_use_symlinks=False,
            resume_download=True,
        )
        print(f">> model {model_id} downloaded.")


if __name__ == "__main__":
    download_models()
