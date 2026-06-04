import re
import logging
import json
from typing import List, Dict, Any
from backend.utils.config import settings

logger = logging.getLogger(__name__)

# Heuristic task action indicators
TASK_VERB_INDICATORS = [
    r'\bplease\b', r'\bneed\s+to\b', r'\bwant\s+you\s+to\b', r'\bmake\s+sure\s+to\b', 
    r'\bshould\b', r'\bhave\s+to\b', r'\baction\s+item:?\b', r'\brequired\s+to\b',
    r'\bcan\s+you\b', r'\bcould\s+you\b', r'\byou\s+are\s+to\b'
]

# Common action verbs starting a sentence or clause
ACTION_VERBS = [
    'compile', 'submit', 'verify', 'schedule', 'create', 'write', 'update', 
    'send', 'check', 'review', 'prepare', 'setup', 'deliver', 'notify', 'test',
    'deploy', 'draft'
]

# Regex to find days of the week or common deadline terms
DEADLINE_REGEX = r'(?i)\b(by|before|on|due|until)\b\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today|next\s+week|next\s+friday|end\s+of\s+day|[\d]{1,2}(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*|\d{1,2}/\d{1,2}/\d{2,4})'

class TaskExtractorAgent:
    """Extracts actionable tasks, due dates, and owners from emails."""
    
    def __init__(self):
        self.mode = settings.AI_MODE.upper()
        self.tokenizer = None
        self.model = None

    def extract_tasks(self, text: str) -> List[Dict[str, Any]]:
        """Extracts list of tasks with due date and owner."""
        if not text:
            return []

        if self.mode == "PRODUCTION":
            if self.model is None or self.tokenizer is None:
                try:
                    from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
                    logger.info("Task Extractor Agent: Loading google/flan-t5-base seq2seq model...")
                    self.tokenizer = AutoTokenizer.from_pretrained("google/flan-t5-base")
                    self.model = AutoModelForSeq2SeqLM.from_pretrained("google/flan-t5-base")
                    logger.info("Task Extractor Agent: Model loaded successfully.")
                except Exception as e:
                    logger.error(f"Task Extractor Agent: Failed to load model: {e}. Falling back to heuristics.")
                    self.mode = "FALLBACK"

            if self.model:
                try:
                    prompt = (
                        "Extract the tasks from the following email. For each task, identify: "
                        "1. The task description (what needs to be done)\n"
                        "2. The due date (deadline, or 'No Deadline' if unspecified)\n"
                        "3. The owner (who is assigned, or 'Me' if unspecified)\n\n"
                        "Format the output strictly as a JSON list of objects with the keys: 'task', 'due_date', 'owner'.\n"
                        f"Email:\n{text}\n\n"
                        "JSON Output:"
                    )
                    
                    inputs = self.tokenizer(prompt, return_tensors="pt", max_length=1024, truncation=True)
                    outputs = self.model.generate(**inputs, max_length=256, num_beams=4, early_stopping=True)
                    response = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
                    
                    # Attempt to parse response as JSON
                    try:
                        # Clean up response to find json array
                        json_start = response.find('[')
                        json_end = response.rfind(']') + 1
                        if json_start != -1 and json_end != -1:
                            data = json.loads(response[json_start:json_end])
                            if isinstance(data, list):
                                return data
                    except json.JSONDecodeError:
                        logger.warning("Failed parsing FLAN-T5 response as JSON. Falling back to heuristic text parser.")
                    
                    # If json parsing fails, use line-by-line heuristic parsing of the LLM response
                    return self._parse_llm_text_lines(response)
                except Exception as e:
                    logger.error(f"Task Extractor Agent inference failed: {e}. Using heuristics.")
                    return self._extract_heuristics(text)
            else:
                return self._extract_heuristics(text)
        else:
            return self._extract_heuristics(text)

    def _parse_llm_text_lines(self, response: str) -> List[Dict[str, Any]]:
        """Parses lines like 'Task: submit report, Due: Friday, Owner: Alice'."""
        tasks = []
        lines = response.split('\n')
        for line in lines:
            line = line.strip().strip('-*• ')
            if not line:
                continue
            
            # Use regex to extract details from textual list
            task_match = re.search(r'(?i)task:\s*(.*?)(?=\s*,\s*(due|owner):|$)', line)
            due_match = re.search(r'(?i)due\s*(date)?:\s*(.*?)(?=\s*,\s*(task|owner):|$)', line)
            owner_match = re.search(r'(?i)owner:\s*(.*?)(?=\s*,\s*(task|due):|$)', line)
            
            if task_match:
                tasks.append({
                    "task": task_match.group(1).strip().strip('"\''),
                    "due_date": due_match.group(2).strip().strip('"\'') if due_match else "No Deadline",
                    "owner": owner_match.group(1).strip().strip('"\'') if owner_match else "Me"
                })
        
        # If still empty, run heuristics
        return tasks if tasks else self._extract_heuristics(response)

    def _extract_heuristics(self, text: str) -> List[Dict[str, Any]]:
        """Clever sentence-level heuristic task extraction."""
        extracted_tasks = []
        # Split text into sentences
        sentences = re.split(r'(?<=[.!?])\s+', text)
        
        for sentence in sentences:
            sentence = sentence.strip()
            if len(sentence) < 10:
                continue
            
            is_task = False
            # Check for task indicators (please, need to)
            for indicator in TASK_VERB_INDICATORS:
                if re.search(indicator, sentence, re.IGNORECASE):
                    is_task = True
                    break
            
            # Check if sentence starts with an action verb (after initial greetings)
            if not is_task:
                clean_start_sentence = re.sub(r'^(hi\s+\w+|hey|team|hello),?\s*', '', sentence, flags=re.IGNORECASE)
                words = clean_start_sentence.split()
                if words and words[0].lower() in ACTION_VERBS:
                    is_task = True

            if is_task:
                # 1. Extract Deadline/Due Date
                due_date = "No Deadline"
                deadline_match = re.search(DEADLINE_REGEX, sentence)
                if deadline_match:
                    due_date = deadline_match.group(0).strip()
                    # Clean up prefix in deadline (e.g., "by Friday" -> "Friday")
                    due_date = re.sub(r'^(by|before|on|due|until)\s+', '', due_date, flags=re.IGNORECASE)
                
                # 2. Extract Owner (Heuristic check for named assignees)
                owner = "Me"
                # Look for patterns like "David - please verify..." or "Alice will compile..."
                owner_match_1 = re.match(r'^([A-Z][a-z]+)\b\s*-\s*please', sentence)
                owner_match_2 = re.search(r'([A-Z][a-z]+)\s+(will|is\s+going\s+to|should)\s+(\w+)', sentence)
                
                if owner_match_1:
                    owner = owner_match_1.group(1)
                elif owner_match_2:
                    # Make sure the verb matches our action verbs or standard tasks
                    verb = owner_match_2.group(3).lower()
                    if verb in ACTION_VERBS or verb in ['verify', 'compile', 'take', 'do', 'work', 'manage', 'handle']:
                        owner = owner_match_2.group(1)

                # 3. Clean up the task description
                # Remove prefixes (names, "please verify") to leave just the core action
                task_desc = sentence
                # Remove names at the beginning
                task_desc = re.sub(r'^([A-Z][a-z]+)\s*-\s*', '', task_desc)
                # Remove introductory verbs/indicators
                for indicator in TASK_VERB_INDICATORS:
                    task_desc = re.sub(indicator, '', task_desc, flags=re.IGNORECASE)
                
                # Remove deadline phrase from the task description
                if deadline_match:
                    task_desc = task_desc.replace(deadline_match.group(0), '')
                
                # Final formatting and cleanup
                task_desc = re.sub(r'[.,!?;\s]+$', '', task_desc).strip()
                # Capitalize first letter
                if task_desc:
                    task_desc = task_desc[0].upper() + task_desc[1:]
                    
                # Filter out sentences that became too short or noisy after cleaning
                if len(task_desc) > 8:
                    extracted_tasks.append({
                        "task": task_desc,
                        "due_date": due_date,
                        "owner": owner
                    })
                    
        return extracted_tasks
