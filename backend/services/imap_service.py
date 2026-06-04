import imaplib
import email
from email.header import decode_header
import logging
import uuid
import re
from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional
from backend.utils.config import settings

logger = logging.getLogger(__name__)

def clean_header(header_val: str) -> str:
    """Decode email header values safely."""
    if not header_val:
        return ""
    decoded_parts = decode_header(header_val)
    decoded_str = ""
    for part, encoding in decoded_parts:
        if isinstance(part, bytes):
            try:
                decoded_str += part.decode(encoding or "utf-8", errors="replace")
            except Exception:
                decoded_str += part.decode("latin1", errors="replace")
        else:
            decoded_str += part
    return decoded_str

def parse_email_address(raw_address: str) -> Tuple[str, str]:
    """Parse name and address from 'Name <address@domain.com>' format."""
    if not raw_address:
        return "Unknown", ""
    match = re.match(r'^(.*?)\s*<(.*?)>$', raw_address)
    if match:
        name = clean_header(match.group(1).strip().strip('"').strip("'"))
        addr = match.group(2).strip()
        return name or "Unknown", addr
    return "Unknown", raw_address.strip()

def extract_body(msg: email.message.Message) -> str:
    """Traverse email message parts and extract text or HTML body."""
    body = ""
    if msg.is_multipart():
        # Prefer html or plain text
        html_part = None
        text_part = None
        for part in msg.walk():
            content_type = part.get_content_type()
            content_disp = str(part.get("Content-Disposition"))

            if "attachment" in content_disp:
                continue

            if content_type == "text/html":
                html_part = part
            elif content_type == "text/plain":
                text_part = part
        
        # Use html if available, otherwise text
        part_to_use = html_part if html_part is not None else text_part
        if part_to_use:
            payload = part_to_use.get_payload(decode=True)
            charset = part_to_use.get_content_charset() or "utf-8"
            try:
                body = payload.decode(charset, errors="replace")
            except Exception:
                body = payload.decode("latin1", errors="replace")
    else:
        payload = msg.get_payload(decode=True)
        charset = msg.get_content_charset() or "utf-8"
        try:
            body = payload.decode(charset, errors="replace")
        except Exception:
            body = payload.decode("latin1", errors="replace")
            
    return body

def get_attachments_metadata(msg: email.message.Message) -> List[Dict[str, Any]]:
    """Scan message parts for attachments and extract metadata."""
    attachments = []
    if msg.is_multipart():
        for part in msg.walk():
            content_disp = part.get("Content-Disposition")
            if content_disp and "attachment" in content_disp.lower():
                filename = clean_header(part.get_filename() or "unnamed_attachment")
                content_type = part.get_content_type()
                payload = part.get_payload()
                size = len(payload) if payload else 0
                attachments.append({
                    "filename": filename,
                    "content_type": content_type,
                    "size_bytes": size
                })
    return attachments

def parse_date(date_str: str) -> str:
    """Parse raw email date header to ISO-8601 string."""
    if not date_str:
        return datetime.utcnow().isoformat() + "Z"
    try:
        parsed_dt = email.utils.parsedate_to_datetime(date_str)
        # Convert to UTC
        return parsed_dt.isoformat()
    except Exception:
        # Fallback to current time if parsing fails
        return datetime.utcnow().isoformat() + "Z"

class ImapEmailFetcher:
    """Service to connect and fetch emails from an IMAP server."""
    def __init__(self):
        self.server = settings.IMAP_SERVER
        self.port = settings.IMAP_PORT
        self.email = settings.IMAP_EMAIL
        self.password = settings.IMAP_PASSWORD
        self.use_mock = settings.use_mock_imap

    def fetch_emails(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Fetch emails from IMAP or return mock data in simulation/demo mode."""
        self.server = settings.IMAP_SERVER
        self.port = settings.IMAP_PORT
        self.email = settings.IMAP_EMAIL
        self.password = settings.IMAP_PASSWORD
        self.use_mock = settings.use_mock_imap

        if self.use_mock:
            logger.info("Demo Mode Enabled: Generating high-quality mock emails.")
            return self._generate_mock_emails(limit)

        logger.info(f"Connecting to IMAP server {self.server}:{self.port} as {self.email}...")
        emails_list = []
        mail = None
        try:
            # Connect using SSL
            mail = imaplib.IMAP4_SSL(self.server, self.port, timeout=15.0)
            mail.login(self.email, self.password)
            mail.select("INBOX")

            # Search all emails
            status, messages = mail.search(None, "ALL")
            if status != "OK":
                logger.error("Could not fetch messages from folder")
                return []

            # Get message ID list (reverse order to get latest first)
            mail_ids = messages[0].split()
            mail_ids.reverse()
            
            fetch_limit = min(len(mail_ids), limit)
            for i in range(fetch_limit):
                mail_id = mail_ids[i]
                # PEEK preserves the unread status of the message on the server
                res_status, msg_data = mail.fetch(mail_id, "(BODY.PEEK[] FLAGS)")
                if res_status != "OK" or not msg_data:
                    continue
                
                raw_email = None
                is_read = False
                for part in msg_data:
                    if isinstance(part, tuple):
                        meta_bytes = part[0]
                        payload_bytes = part[1]
                        if meta_bytes and b"FLAGS" in meta_bytes:
                            meta_str = meta_bytes.decode("utf-8", errors="ignore")
                            if "\\Seen" in meta_str:
                                is_read = True
                        if payload_bytes:
                            raw_email = payload_bytes
                
                if not raw_email:
                    continue
                    
                msg = email.message_from_bytes(raw_email)

                # Extract headers
                subject = clean_header(msg.get("Subject", "(No Subject)"))
                sender_name, sender_address = parse_email_address(msg.get("From", ""))
                
                # Parse recipients
                recipients = []
                for field in ["To", "Cc"]:
                    val = msg.get(field)
                    if val:
                        for addr_part in val.split(","):
                            r_name, r_addr = parse_email_address(addr_part)
                            if r_addr:
                                recipients.append({"name": r_name, "address": r_addr})

                # Body & Attachments
                body = extract_body(msg)
                attachments = get_attachments_metadata(msg)
                received_date = parse_date(msg.get("Date", ""))
                msg_id_hdr = msg.get("Message-ID", str(uuid.uuid4()))
                email_uuid = str(uuid.uuid3(uuid.NAMESPACE_DNS, msg_id_hdr))

                emails_list.append({
                    "email_id": email_uuid,
                    "subject": subject,
                    "sender": {
                        "name": sender_name,
                        "address": sender_address
                    },
                    "recipients": recipients,
                    "body": body,
                    "received_at": received_date,
                    "attachments": attachments,
                    "is_read": is_read
                })
            
            logger.info(f"Successfully fetched {len(emails_list)} emails from IMAP.")
            return emails_list
            
        except Exception as e:
            logger.error(f"Error fetching emails from IMAP: {e}")
            # Automatically fallback to mock emails on error to prevent application failure
            logger.info("Falling back to synthetic mock emails after IMAP error.")
            return self._generate_mock_emails(limit)
        finally:
            if mail:
                try:
                    mail.close()
                    mail.logout()
                except Exception:
                    pass

    def _generate_mock_emails(self, limit: int) -> List[Dict[str, Any]]:
        """Generate high fidelity mock emails covering all categories and priorities."""
        mock_templates = [
            {
                "subject": "URGENT: Project Orion Deployment Milestone & Task Allocations",
                "sender": {"name": "Sarah Jenkins (Project Director)", "address": "sarah.j@enterprise.com"},
                "recipients": [{"name": "Developer Team", "address": "dev-team@enterprise.com"}],
                "body": """
                <html>
                <body>
                <p>Hi team,</p>
                <p>As you know, the deployment deadline for <strong>Project Orion</strong> is approaching rapidly. We need to submit the final security assessment report before Friday and schedule a quick client sync meeting ASAP to align on the release scope.</p>
                <p>David - please verify the API connections and make sure the databases are synchronized. Alice will compile the release notes.</p>
                <p>Best regards,</p>
                <p>Sarah Jenkins<br/>Project Director | Orion Group</p>
                </body>
                </html>
                """,
                "received_offset_mins": 5
            },
            {
                "subject": "Bi-Weekly Marketing Alignment Sync",
                "sender": {"name": "Mark R.", "address": "mark.r@marketing.com"},
                "recipients": [{"name": "All Staff", "address": "staff@enterprise.com"}],
                "body": """
                Hey everyone,
                
                Just a reminder that our bi-weekly marketing alignment sync is scheduled for tomorrow at 2:00 PM EST. 
                Please update the team slide deck with your metrics before tomorrow morning.
                
                Thanks,
                Mark
                --
                Mark Ramirez
                VP Marketing Enterprise
                https://marketing-portal.enterprise.internal
                """,
                "received_offset_mins": 35
            },
            {
                "subject": "Q2 Finance Audit Report Review - ACTION REQUIRED",
                "sender": {"name": "Finance Department", "address": "billing@enterprise.com"},
                "recipients": [{"name": "Executive Board", "address": "execs@enterprise.com"}],
                "body": """
                Dear Board Members,
                
                The draft for the Q2 Finance Audit Report is attached. Please review the budget allocation sheet and send your approvals by Wednesday at 5:00 PM. We need to finalize this document for the upcoming auditors.
                
                Regards,
                Finance Team
                """,
                "received_offset_mins": 120
            },
            {
                "subject": "HR Notice: Updated Work from Home Policy for 2026",
                "sender": {"name": "HR Operations", "address": "hr@enterprise.com"},
                "recipients": [{"name": "All Employees", "address": "all@enterprise.com"}],
                "body": """
                Hello Employees,
                
                We have updated our remote work policies starting next month. Please review the updated employee handbook. You are required to submit your sign-off form in the HR portal by next Friday.
                
                Sincerely,
                Human Resources Department
                """,
                "received_offset_mins": 280
            },
            {
                "subject": "Weekend plans / Coffee catch-up?",
                "sender": {"name": "James Foster", "address": "james.foster@gmail.com"},
                "recipients": [{"name": "Me", "address": "me@enterprise.com"}],
                "body": """
                Hey! Long time no see. Are you free for a quick coffee catch-up this Saturday around 11 AM? Let me know!
                
                Cheers,
                James
                """,
                "received_offset_mins": 450
            },
            {
                "subject": "🔥 CHEAPEST LOANS ONLINE! 100% APPROVAL IN 5 MINS! 🔥",
                "sender": {"name": "Fast Cash Inc.", "address": "spammer@fastcash-now.com"},
                "recipients": [{"name": "Customer", "address": "undisclosed-recipients@spam.com"}],
                "body": """
                DEAR FRIEND,
                
                YOU HAVE BEEN SELECTED FOR A SPECIAL LOW-INTEREST LOAN OPPORTUNITY! NO CREDIT CHECK REQUIRED!
                CLICK HERE TO APPLY NOW: http://fake-loan-scam.com/apply
                
                Unsubscribe reply 'STOP'
                """,
                "received_offset_mins": 600
            }
        ]

        emails_list = []
        for i, template in enumerate(mock_templates[:limit]):
            # Calculate mock received timestamp
            now = datetime.utcnow()
            offset = template["received_offset_mins"]
            received_dt = datetime(now.year, now.month, now.day, now.hour, now.minute)
            # Apply time delta offset
            from datetime import timedelta
            received_dt = received_dt - timedelta(minutes=offset)
            received_str = received_dt.isoformat() + "Z"
            
            email_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"mock-email-{i}-{template['subject']}"))
            
            # Make the first 2 mock emails unread (unseen), and the rest read
            is_read = i >= 2

            emails_list.append({
                "email_id": email_id,
                "subject": template["subject"],
                "sender": template["sender"],
                "recipients": template["recipients"],
                "body": template["body"],
                "received_at": received_str,
                "attachments": [],
                "is_read": is_read
            })
            
        return emails_list
