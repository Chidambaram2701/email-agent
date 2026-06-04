import re
import logging
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# Common signature patterns in corporate emails
SIGNATURE_PATTERNS = [
    r'(?i)\b(best\s+regards|regards|kind\s+regards|warm\s+regards|thanks\s+and\s+regards|thanks\b|sincerely|cheers|best|thank\s+you|respectfully|yours\s+truly)\b',
    r'^--\s*$',  # Standard email signature separator
    r'^__+\s*$',  # Underscores separator
    r'^==+\s*$',  # Equals separator
    r'^(Sent\s+from\s+my|Sent\s+via|Get\s+Outlook\s+for|Get\s+Mail\s+for)\b'  # Mobile signatures
]

class EmailPreprocessor:
    """Preprocesses raw email content to prepare it for AI analysis."""
    
    @staticmethod
    def remove_html(text: str) -> str:
        """Strip HTML tags using BeautifulSoup4 and return clean text."""
        if not text:
            return ""
        try:
            # Check if there are any HTML-like brackets before parsing
            if '<' in text and '>' in text:
                soup = BeautifulSoup(text, "html.parser")
                if soup.find() is not None:
                    # Remove script and style elements
                    for script in soup(["script", "style"]):
                        script.extract()
                    return soup.get_text(separator="\n")
        except Exception as e:
            logger.error(f"HTML parsing failed: {e}")
            # Simple fallback regex-based strip
            return re.sub(r'<[^>]*>', '', text)
        return text

    @staticmethod
    def remove_urls(text: str) -> str:
        """Remove URLs from text to simplify content for AI models."""
        if not text:
            return ""
        # Match standard URLs
        url_pattern = r'https?://\S+|www\.\S+'
        return re.sub(url_pattern, '[URL]', text)

    @staticmethod
    def remove_signature(text: str) -> str:
        """
        Attempt to remove signature blocks by finding common boundary patterns.
        Splits the text into lines and truncates from the match point.
        """
        if not text:
            return ""
        
        lines = text.split('\n')
        signature_index = -1
        
        # Check from bottom up (excluding very top text)
        max_search_depth = max(1, len(lines) - 15)  # Don't cut off everything if it's very long
        
        for idx in range(len(lines) - 1, max_search_depth - 1, -1):
            line = lines[idx].strip()
            if not line:
                continue
            
            # Check against signature regexes
            match_found = False
            for pattern in SIGNATURE_PATTERNS:
                if re.search(pattern, line):
                    match_found = True
                    break
            
            if match_found:
                signature_index = idx
                break
                
        if signature_index != -1:
            # Reconstruct up to signature index
            cleaned_lines = lines[:signature_index]
            # Strip trailing blank lines
            while cleaned_lines and not cleaned_lines[-1].strip():
                cleaned_lines.pop()
            return '\n'.join(cleaned_lines)
            
        return text

    @staticmethod
    def normalize_text(text: str) -> str:
        """Standardize whitespace, double newlines, and decode anomalies."""
        if not text:
            return ""
        # Normalize double newlines and collapse excess spacing
        text = re.sub(r'\r\n', '\n', text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        text = re.sub(r'[ \t]+', ' ', text)
        return text.strip()

    def preprocess(self, raw_body: str) -> str:
        """Execute the full cleaning pipeline on the raw email body."""
        if not raw_body:
            return ""
        
        # Pipeline: Raw Email -> Clean HTML -> Remove Signatures -> Remove URLs -> Normalize Text -> Processed Text
        cleaned = self.remove_html(raw_body)
        cleaned = self.remove_signature(cleaned)
        cleaned = self.remove_urls(cleaned)
        cleaned = self.normalize_text(cleaned)
        
        return cleaned
