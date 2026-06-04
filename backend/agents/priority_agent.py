import re
import logging
from typing import Dict, Any
from backend.utils.config import settings

logger = logging.getLogger(__name__)

# Keyword Weights for Heuristics
HIGH_KEYWORDS = {
    r'\burgent\b': 0.4,
    r'\bcritical\b': 0.4,
    r'\basap\b': 0.35,
    r'\bdeadline\b': 0.35,
    r'\bimportant\b': 0.25,
    r'\baction\s+required\b': 0.4,
    r'\bimmediately\b': 0.3,
    r'\bdue\s+today\b': 0.4,
    r'\bemergency\b': 0.5,
    r'\bsooner\s+than\b': 0.25
}

MEDIUM_KEYWORDS = {
    r'\bsoon\b': 0.15,
    r'\breview\b': 0.15,
    r'\bupdate\b': 0.1,
    r'\brequest\b': 0.1,
    r'\bplease\b': 0.05,
    r'\bnext\s+week\b': 0.1,
    r'\btrack\b': 0.1
}

class PriorityAgent:
    """Detects email urgency and priority score."""
    
    def __init__(self):
        self.mode = settings.AI_MODE.upper()
        self.pipeline = None

    def detect_priority(self, text: str) -> Dict[str, Any]:
        """
        Calculates priority score (0.0 to 1.0) and determines priority level.
        Combines rule-based keyword scanning with zero-shot AI classification when available.
        """
        if not text:
            return {"priority": "Low", "priority_score": 0.0}

        # 1. Calculate Rule-Based Score
        rule_score = 0.0
        # Check High Keywords
        for pattern, weight in HIGH_KEYWORDS.items():
            if re.search(pattern, text, re.IGNORECASE):
                rule_score += weight
        # Check Medium Keywords
        for pattern, weight in MEDIUM_KEYWORDS.items():
            if re.search(pattern, text, re.IGNORECASE):
                rule_score += weight
                
        # Limit rule score to a max of 0.90
        rule_score = min(0.90, rule_score)

        # 2. Calculate AI model score (if production mode)
        ai_score = 0.0
        if self.mode == "PRODUCTION":
            if self.pipeline is None:
                try:
                    from backend.agents.model_loader import get_pipeline
                    logger.info("Priority Agent: Loading facebook/bart-large-mnli zero-shot model for priority scoring...")
                    self.pipeline = get_pipeline(
                        "zero-shot-classification",
                        model="facebook/bart-large-mnli",
                        device=-1
                    )
                    logger.info("Priority Agent: Model loaded successfully.")
                except Exception as e:
                    logger.error(f"Priority Agent: Failed to load model: {e}. Falling back to rule-based.")
                    self.mode = "FALLBACK"

            if self.pipeline:
                try:
                    truncated_text = text[:1500]
                    labels = ["urgent action required", "normal email communication"]
                    result = self.pipeline(truncated_text, candidate_labels=labels)
                    # Use the confidence score of the "urgent action required" label
                    urgent_idx = result["labels"].index("urgent action required")
                    ai_score = result["scores"][urgent_idx]
                except Exception as e:
                    logger.error(f"Priority Agent model scoring failed: {e}")
                    ai_score = rule_score  # Fallback to rule score
            else:
                ai_score = rule_score
        else:
            ai_score = rule_score

        # 3. Combine scores (weighted average)
        # Rule score is highly reliable for explicit signals (ASAP, deadline), AI is good for semantics
        if self.mode == "PRODUCTION":
            combined_score = (rule_score * 0.4) + (ai_score * 0.6)
        else:
            combined_score = rule_score

        # Cap combined score
        combined_score = round(max(0.0, min(1.0, combined_score)), 2)

        # 4. Map score to High, Medium, Low (with manual overrides for critical phrases)
        priority = "Low"
        if combined_score >= 0.50:
            priority = "High"
        elif combined_score >= 0.20:
            priority = "Medium"
            
        # Hard override: If explicit keywords like "urgent" or "emergency" are found, guarantee at least Medium
        if priority == "Low" and any(re.search(pat, text, re.IGNORECASE) for pat in [r'\burgent\b', r'\bemergency\b', r'\bcritical\b']):
            priority = "Medium"
            combined_score = max(0.25, combined_score)

        return {
            "priority": priority,
            "priority_score": combined_score
        }
