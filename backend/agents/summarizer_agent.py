import re
import logging
from typing import List
from backend.utils.config import settings

logger = logging.getLogger(__name__)

# Business terms to score sentences higher in fallback mode
KEY_SUMMARY_WORDS = [
    'deadline', 'submit', 'verify', 'update', 'schedule', 'meeting', 'project',
    'security', 'report', 'client', 'audit', 'agree', 'decide', 'important',
    'status', 'action', 'review', 'approved', 'policy'
]

class SummarizerAgent:
    """Summarizes long email text into concise TL;DR sentences."""
    
    def __init__(self):
        self.mode = settings.AI_MODE.upper()
        self.pipeline = None

    def summarize(self, text: str) -> str:
        """Generates a concise text summary of the email content."""
        if not text:
            return ""

        # If text is already very short, just return it
        if len(text.split()) <= 20:
            return text

        if self.mode == "PRODUCTION":
            if self.pipeline is None:
                try:
                    from transformers import pipeline
                    logger.info("Summarizer Agent: Loading facebook/bart-large-cnn model...")
                    try:
                        self.pipeline = pipeline(
                            "summarization",
                            model="facebook/bart-large-cnn",
                            device=-1
                        )
                    except Exception as e:
                        logger.info(f"Summarizer Agent: Legacy 'summarization' task failed ({e}). Loading model directly...")
                        self.pipeline = pipeline(
                            model="facebook/bart-large-cnn",
                            device=-1
                        )
                    logger.info("Summarizer Agent: Model loaded successfully.")
                except Exception as e:
                    logger.error(f"Summarizer Agent: Failed to load model: {e}. Falling back to extractive scoring.")
                    self.mode = "FALLBACK"

            if self.pipeline:
                try:
                    # BART expects at least some length, truncate if overly long
                    truncated_text = text[:3000]
                    word_count = len(truncated_text.split())
                    
                    # Dynamic max/min length based on input size
                    max_len = min(60, int(word_count * 0.5))
                    min_len = min(20, int(word_count * 0.2))
                    
                    if max_len <= min_len:
                        max_len = min_len + 15

                    result = self.pipeline(
                        truncated_text,
                        max_length=max_len,
                        min_length=min_len,
                        do_sample=False
                    )
                    out_key = "summary_text" if "summary_text" in result[0] else "generated_text"
                    return result[0][out_key].strip()
                except Exception as e:
                    logger.error(f"Summarizer Agent model inference failed: {e}. Using heuristics.")
                    return self._summarize_heuristics(text)
            else:
                return self._summarize_heuristics(text)
        else:
            return self._summarize_heuristics(text)

    def _summarize_heuristics(self, text: str) -> str:
        """
        Extractive summarization fallback.
        Scores sentences based on position and key corporate keywords,
        then joins the top sentences in chronological order.
        """
        # Split into sentences
        sentences = re.split(r'(?<=[.!?])\s+', text)
        if len(sentences) <= 2:
            return text

        scored_sentences = []
        for idx, sentence in enumerate(sentences):
            sentence = sentence.strip()
            if not sentence or len(sentence) < 8:
                continue

            score = 0.0

            # 1. Position weight (first and last sentences are highly informational)
            if idx == 0:
                score += 3.0  # Opening statement
            elif idx == 1:
                score += 1.5
            elif idx == len(sentences) - 1:
                score += 2.5  # Call to action / closing
            elif idx == len(sentences) - 2:
                score += 1.0

            # 2. Keyword matching weight
            for word in KEY_SUMMARY_WORDS:
                if re.search(r'\b' + re.escape(word) + r'\b', sentence, re.IGNORECASE):
                    score += 1.0

            # 3. Length penalty/reward (prefer medium-length sentences, reject very short or very long)
            words = sentence.split()
            if 8 <= len(words) <= 20:
                score += 1.0
            elif len(words) > 30:
                score -= 1.0  # Too verbose for summary

            scored_sentences.append((idx, sentence, score))

        # Sort by score descending and take top 2 or 3 sentences
        top_sentences = sorted(scored_sentences, key=lambda x: x[2], reverse=True)[:3]
        
        # Sort top sentences back into their original chronological order
        ordered_sentences = sorted(top_sentences, key=lambda x: x[0])
        
        summary = " ".join([s[1] for s in ordered_sentences])
        return summary
