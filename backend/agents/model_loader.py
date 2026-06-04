import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# Global cache for loaded transformers pipelines
_pipeline_cache: Dict[tuple, Any] = {}

def get_pipeline(task: str, model: str, device: int = -1) -> Any:
    """
    Load a Hugging Face pipeline and cache it to prevent redundant duplicate loading in memory.
    This saves memory and CPU startup/inference time.
    """
    from transformers import pipeline
    
    cache_key = (task, model, device)
    if cache_key not in _pipeline_cache:
        logger.info(f"Model Loader: Initializing pipeline for task='{task}' with model='{model}' on device={device}...")
        _pipeline_cache[cache_key] = pipeline(task, model=model, device=device)
        logger.info(f"Model Loader: Pipeline for model='{model}' loaded successfully.")
    else:
        logger.info(f"Model Loader: Returning cached pipeline for model='{model}'.")
    return _pipeline_cache[cache_key]
