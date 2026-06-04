from typing import List, Dict, Any

class DraftGeneratorAgent:
    """Generates context-aware, professional email drafts for auto-replies."""
    
    def generate_draft(self, 
                       sender_name: str, 
                       subject: str, 
                       category: str, 
                       sentiment: str, 
                       tasks: List[Dict[str, Any]]) -> str:
        """Constructs an email reply draft tailored to category, tasks, and sentiment."""
        
        # Clean sender name (take first name only)
        first_name = sender_name.split()[0] if sender_name else "there"
        if first_name.lower() == "unknown":
            first_name = "there"

        # Handle Spam directly
        if category == "Spam":
            return "No reply recommended. This email has been flagged as Spam."

        # Base greetings based on sentiment
        if sentiment == "Positive":
            greeting = f"Hi {first_name},\n\nGreat hearing from you! Thanks for the update."
        elif sentiment == "Negative":
            greeting = f"Hi {first_name},\n\nThank you for reaching out. I understand there are some concerns regarding this, and I'd like to help resolve them as quickly as possible."
        else:
            greeting = f"Hi {first_name},\n\nThank you for your email."

        body = ""
        
        # Generate custom body paragraphs based on Category
        if category == "Meeting":
            body = (
                "Regarding your request to schedule a sync, I've checked my calendar. "
                "I am available to meet this week. Please let me know what times work best on your end, "
                "or send over a calendar invitation and I will confirm."
            )
        elif category == "Finance":
            body = (
                "I have received the financial items you sent. I'll review the budget/invoice details "
                "and make sure it is processed with our billing department. I will follow up if we need "
                "any further details."
            )
        elif category == "HR":
            body = (
                "Thanks for sharing the HR update. I have noted the changes in policy/benefits. "
                "I will complete the required updates or portal submissions shortly."
            )
        elif category == "Personal":
            body = (
                "Thanks for reaching out! I'd love to connect. "
                "Let's touch base soon to coordinate the details. Talk to you then!"
            )
        else:
            # Default Work Category
            if tasks:
                task_list_str = ""
                for t in tasks:
                    desc = t.get("task", "")
                    due = t.get("due_date", "No Deadline")
                    owner = t.get("owner", "Me")
                    
                    if owner != "Me" and owner != "Unknown":
                        task_list_str += f"- {desc} (Assigned to: {owner}, Deadline: {due})\n"
                    else:
                        task_list_str += f"- {desc} (Deadline: {due})\n"
                        
                body = (
                    f"I've received your email regarding '{subject}' and have noted down the action items:\n\n"
                    f"{task_list_str}\n"
                    "We are actively tracking these tasks and will make sure they are addressed accordingly. "
                    "I will keep you updated as we make progress."
                )
            else:
                body = (
                    f"I've received your email regarding '{subject}'. "
                    "I will review the details and get back to you with an update shortly."
                )

        closing = "\n\nBest regards,\n[Your Name]"
        
        return f"{greeting}\n\n{body}{closing}"
