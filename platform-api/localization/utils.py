from pytorch_grad_cam import GradCAM, \
    ScoreCAM, \
    GradCAMPlusPlus, \
    XGradCAM, \
    EigenCAM, \
    EigenGradCAM, \
    LayerCAM, \
    FullGrad

MODEL_META = {
    "clipvitb16": {
        "name": "CLIP (ViT-B/16)",
        "repo": "openai/clip-vit-base-patch16",
        "path": "models/clip-vit-base-patch16",
        "reshape_size": 14,
    },
    "clipvitl14": {
        "name": "CLIP (ViT-L/14)",
        "repo": "openai/clip-vit-large-patch14",
        "path": "models/clip-vit-large-patch14",
        "reshape_size": 16,
    },
}

CAM_META = {
    "gradcam": {
        "name": "GradCAM",
        "class": GradCAM,
    },
    "scorecam": {
        "name": "ScoreCAM",
        "class": ScoreCAM,
        "warning": "ScoreCAM may be extremely slow because it requires multiple forward passes.",
    },
    "gradcam++": {
        "name": "GradCAM++",
        "class": GradCAMPlusPlus,
    },
    "xgradcam": {
        "name": "XGradCAM",
        "class": XGradCAM,
    },
    "eigencam": {
        "name": "EigenCAM",
        "class": EigenCAM,
    },
    "eigengradcam": {
        "name": "EigenGradCAM",
        "class": EigenGradCAM,
    },
    "layercam": {
        "name": "LayerCAM",
        "class": LayerCAM,
    },
    "fullgrad": {
        "name": "FullGrad",
        "class": FullGrad,
    },
}
