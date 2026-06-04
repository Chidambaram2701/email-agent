import os
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from decimal import Decimal
import boto3
from botocore.exceptions import ClientError
from backend.utils.config import settings

logger = logging.getLogger(__name__)

def float_to_decimal(obj: Any) -> Any:
    """Recursively convert float values to Decimal for DynamoDB serialization."""
    if isinstance(obj, float):
        return Decimal(str(obj))
    elif isinstance(obj, dict):
        return {k: float_to_decimal(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [float_to_decimal(x) for x in obj]
    return obj

# File-based database path for mock fallback
LOCAL_DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "local_db.json")

# Initialize default local DB structure
DEFAULT_LOCAL_DB = {
    "emails": {},
    "tasks": {},
    "analytics": {
        "latest": {
            "record_id": "latest",
            "total_emails": 0,
            "priority_counts": {"High": 0, "Medium": 0, "Low": 0},
            "category_counts": {"Work": 0, "Meeting": 0, "HR": 0, "Finance": 0, "Personal": 0, "Spam": 0},
            "sentiment_counts": {"Positive": 0, "Neutral": 0, "Negative": 0},
            "task_statistics": {"total": 0, "Pending": 0, "In Progress": 0, "Completed": 0},
            "task_completion_rate": 0.0,
            "updated_at": datetime.utcnow().isoformat() + "Z"
        }
    }
}

class LocalJsonDatabase:
    """Thread-safe file-based JSON database fallback."""
    def __init__(self, file_path: str):
        self.file_path = file_path
        if not os.path.exists(self.file_path):
            self._write_db(DEFAULT_LOCAL_DB)

    def _read_db(self) -> Dict[str, Any]:
        try:
            with open(self.file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error reading local JSON DB: {e}")
            return DEFAULT_LOCAL_DB

    def _write_db(self, data: Dict[str, Any]):
        try:
            with open(self.file_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Error writing local JSON DB: {e}")

    # Email operations
    def save_email(self, email_item: Dict[str, Any]) -> Dict[str, Any]:
        db = self._read_db()
        email_id = email_item["email_id"]
        if "is_read" not in email_item:
            email_item["is_read"] = False
        db["emails"][email_id] = email_item
        self._write_db(db)
        self.update_analytics()
        return email_item

    def update_email_read_status(self, email_id: str, is_read: bool) -> Optional[Dict[str, Any]]:
        db = self._read_db()
        if email_id not in db["emails"]:
            return None
        db["emails"][email_id]["is_read"] = is_read
        self._write_db(db)
        self.update_analytics()
        return db["emails"][email_id]

    def get_email(self, email_id: str) -> Optional[Dict[str, Any]]:
        db = self._read_db()
        return db["emails"].get(email_id)

    def list_emails(self) -> List[Dict[str, Any]]:
        db = self._read_db()
        emails = list(db["emails"].values())
        # Sort by received_at descending
        return sorted(emails, key=lambda x: x.get("received_at", ""), reverse=True)

    # Task operations
    def save_task(self, task_item: Dict[str, Any]) -> Dict[str, Any]:
        db = self._read_db()
        task_id = task_item["task_id"]
        db["tasks"][task_id] = task_item
        self._write_db(db)
        self.update_analytics()
        return task_item

    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        db = self._read_db()
        return db["tasks"].get(task_id)

    def list_tasks(self, email_id: Optional[str] = None) -> List[Dict[str, Any]]:
        db = self._read_db()
        tasks = list(db["tasks"].values())
        if email_id:
            tasks = [t for t in tasks if t.get("email_id") == email_id]
        return sorted(tasks, key=lambda x: x.get("created_at", ""), reverse=True)

    def update_task(self, task_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        db = self._read_db()
        if task_id not in db["tasks"]:
            return None
        db["tasks"][task_id].update(updates)
        self._write_db(db)
        self.update_analytics()
        return db["tasks"][task_id]

    def delete_task(self, task_id: str) -> bool:
        db = self._read_db()
        if task_id in db["tasks"]:
            del db["tasks"][task_id]
            self._write_db(db)
            self.update_analytics()
            return True
        return False

    # Analytics operations
    def get_analytics(self) -> Dict[str, Any]:
        db = self._read_db()
        return db["analytics"]["latest"]

    def save_analytics(self, analytics_item: Dict[str, Any]):
        db = self._read_db()
        db["analytics"]["latest"] = analytics_item
        self._write_db(db)

    def update_analytics(self):
        db = self._read_db()
        emails = list(db["emails"].values())
        tasks = list(db["tasks"].values())

        total_emails = len(emails)
        priority_counts = {"High": 0, "Medium": 0, "Low": 0}
        category_counts = {"Work": 0, "Meeting": 0, "HR": 0, "Finance": 0, "Personal": 0, "Spam": 0}
        sentiment_counts = {"Positive": 0, "Neutral": 0, "Negative": 0}
        task_statistics = {"total": len(tasks), "Pending": 0, "In Progress": 0, "Completed": 0}

        for email in emails:
            p = email.get("priority", "Low")
            if p in priority_counts:
                priority_counts[p] += 1
            
            c = email.get("category", "Work")
            if c in category_counts:
                category_counts[c] += 1

            s = email.get("sentiment", "Neutral")
            if s in sentiment_counts:
                sentiment_counts[s] += 1

        for task in tasks:
            status = task.get("status", "Pending")
            if status in task_statistics:
                task_statistics[status] += 1

        task_completion_rate = 0.0
        if task_statistics["total"] > 0:
            task_completion_rate = round(task_statistics["Completed"] / task_statistics["total"] * 100, 2)

        analytics_item = {
            "record_id": "latest",
            "total_emails": total_emails,
            "priority_counts": priority_counts,
            "category_counts": category_counts,
            "sentiment_counts": sentiment_counts,
            "task_statistics": task_statistics,
            "task_completion_rate": task_completion_rate,
            "updated_at": datetime.utcnow().isoformat() + "Z"
        }
        db["analytics"]["latest"] = analytics_item
        self._write_db(db)


class DynamoDbDatabase:
    """Production DynamoDB database manager."""
    def __init__(self):
        # Configure boto3 client options
        boto_args = {}
        if settings.DYNAMODB_ENDPOINT_URL:
            boto_args["endpoint_url"] = settings.DYNAMODB_ENDPOINT_URL
        if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
            boto_args["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
            boto_args["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY
            boto_args["region_name"] = settings.AWS_DEFAULT_REGION
        else:
            # Fallback configuration
            boto_args["region_name"] = settings.AWS_DEFAULT_REGION

        self.dynamodb = boto3.resource("dynamodb", **boto_args)
        self.emails_table = self.dynamodb.Table(settings.EMAILS_TABLE_NAME)
        self.tasks_table = self.dynamodb.Table(settings.TASKS_TABLE_NAME)
        self.analytics_table = self.dynamodb.Table(settings.ANALYTICS_TABLE_NAME)

    def init_tables(self):
        """Create tables if they don't exist (primarily for DynamoDB Local)."""
        existing_tables = []
        try:
            # Listing tables using client
            client = self.dynamodb.meta.client
            existing_tables = client.list_tables().get("TableNames", [])
        except Exception as e:
            logger.error(f"Failed listing DynamoDB tables: {e}")
            return

        # Helper to create tables
        def create_table_safely(name, key_schema, attr_defs, gsi=None):
            if name in existing_tables:
                return
            try:
                params = {
                    "TableName": name,
                    "KeySchema": key_schema,
                    "AttributeDefinitions": attr_defs,
                    "BillingMode": "PAY_PER_REQUEST"
                }
                if gsi:
                    params["GlobalSecondaryIndexes"] = gsi
                logger.info(f"Creating DynamoDB table: {name}")
                self.dynamodb.create_table(**params)
            except Exception as e:
                logger.error(f"Error creating table {name}: {e}")

        # Emails Table
        create_table_safely(
            settings.EMAILS_TABLE_NAME,
            [{"AttributeName": "email_id", "KeyType": "HASH"}],
            [{"AttributeName": "email_id", "AttributeType": "S"}]
        )

        # Tasks Table with GSI on email_id
        tasks_gsi = [
            {
                "IndexName": "email_id-index",
                "KeySchema": [{"AttributeName": "email_id", "KeyType": "HASH"}],
                "Projection": {"ProjectionType": "ALL"}
            }
        ]
        create_table_safely(
            settings.TASKS_TABLE_NAME,
            [{"AttributeName": "task_id", "KeyType": "HASH"}],
            [
                {"AttributeName": "task_id", "AttributeType": "S"},
                {"AttributeName": "email_id", "AttributeType": "S"}
            ],
            gsi=tasks_gsi
        )

        # Analytics Table
        create_table_safely(
            settings.ANALYTICS_TABLE_NAME,
            [{"AttributeName": "record_id", "KeyType": "HASH"}],
            [{"AttributeName": "record_id", "AttributeType": "S"}]
        )

    # Email operations
    def save_email(self, email_item: Dict[str, Any]) -> Dict[str, Any]:
        if "is_read" not in email_item:
            email_item["is_read"] = False
        try:
            item_decimal = float_to_decimal(email_item)
            self.emails_table.put_item(Item=item_decimal)
            self.update_analytics()
        except Exception as e:
            logger.error(f"DynamoDB save_email error: {e}")
        return email_item

    def update_email_read_status(self, email_id: str, is_read: bool) -> Optional[Dict[str, Any]]:
        try:
            response = self.emails_table.update_item(
                Key={"email_id": email_id},
                UpdateExpression="SET is_read = :r",
                ExpressionAttributeValues={":r": is_read},
                ReturnValues="ALL_NEW"
            )
            self.update_analytics()
            return response.get("Attributes")
        except ClientError as e:
            logger.error(f"DynamoDB update_email_read_status error: {e}")
            return None

    def get_email(self, email_id: str) -> Optional[Dict[str, Any]]:
        try:
            response = self.emails_table.get_item(Key={"email_id": email_id})
            return response.get("Item")
        except ClientError as e:
            logger.error(f"DynamoDB get_email error: {e}")
            return None

    def list_emails(self) -> List[Dict[str, Any]]:
        try:
            response = self.emails_table.scan()
            emails = response.get("Items", [])
            return sorted(emails, key=lambda x: x.get("received_at", ""), reverse=True)
        except ClientError as e:
            logger.error(f"DynamoDB list_emails error: {e}")
            return []

    # Task operations
    def save_task(self, task_item: Dict[str, Any]) -> Dict[str, Any]:
        try:
            item_decimal = float_to_decimal(task_item)
            self.tasks_table.put_item(Item=item_decimal)
            self.update_analytics()
        except Exception as e:
            logger.error(f"DynamoDB save_task error: {e}")
        return task_item

    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        try:
            response = self.tasks_table.get_item(Key={"task_id": task_id})
            return response.get("Item")
        except ClientError as e:
            logger.error(f"DynamoDB get_task error: {e}")
            return None

    def list_tasks(self, email_id: Optional[str] = None) -> List[Dict[str, Any]]:
        try:
            if email_id:
                response = self.tasks_table.query(
                    IndexName="email_id-index",
                    KeyConditionExpression=boto3.dynamodb.conditions.Key("email_id").eq(email_id)
                )
            else:
                response = self.tasks_table.scan()
            tasks = response.get("Items", [])
            return sorted(tasks, key=lambda x: x.get("created_at", ""), reverse=True)
        except ClientError as e:
            logger.error(f"DynamoDB list_tasks error: {e}")
            return []

    def update_task(self, task_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        try:
            # Build update expression dynamically
            update_expr = "SET "
            expr_attrs = {}
            expr_names = {}
            updates_decimal = float_to_decimal(updates)
            for k, v in updates_decimal.items():
                # Avoid keyword issues in DynamoDB using ExpressionAttributeNames
                clean_key = f"#{k}"
                clean_val = f":{k}"
                update_expr += f"{clean_key} = {clean_val}, "
                expr_attrs[clean_val] = v
                expr_names[clean_key] = k
            
            update_expr = update_expr.rstrip(", ")

            response = self.tasks_table.update_item(
                Key={"task_id": task_id},
                UpdateExpression=update_expr,
                ExpressionAttributeValues=expr_attrs,
                ExpressionAttributeNames=expr_names,
                ReturnValues="ALL_NEW"
            )
            self.update_analytics()
            return response.get("Attributes")
        except ClientError as e:
            logger.error(f"DynamoDB update_task error: {e}")
            return None

    def delete_task(self, task_id: str) -> bool:
        try:
            self.tasks_table.delete_item(Key={"task_id": task_id})
            self.update_analytics()
            return True
        except ClientError as e:
            logger.error(f"DynamoDB delete_task error: {e}")
            return False

    # Analytics operations
    def get_analytics(self) -> Dict[str, Any]:
        try:
            response = self.analytics_table.get_item(Key={"record_id": "latest"})
            if "Item" in response:
                return response["Item"]
        except ClientError as e:
            logger.error(f"DynamoDB get_analytics error: {e}")
        
        # Default empty structure if table item not created
        return DEFAULT_LOCAL_DB["analytics"]["latest"]

    def save_analytics(self, analytics_item: Dict[str, Any]):
        try:
            item_decimal = float_to_decimal(analytics_item)
            self.analytics_table.put_item(Item=item_decimal)
        except ClientError as e:
            logger.error(f"DynamoDB save_analytics error: {e}")

    def update_analytics(self):
        try:
            # Scan tables to compute aggregations
            emails = self.list_emails()
            tasks = self.list_tasks()

            total_emails = len(emails)
            priority_counts = {"High": 0, "Medium": 0, "Low": 0}
            category_counts = {"Work": 0, "Meeting": 0, "HR": 0, "Finance": 0, "Personal": 0, "Spam": 0}
            sentiment_counts = {"Positive": 0, "Neutral": 0, "Negative": 0}
            task_statistics = {"total": len(tasks), "Pending": 0, "In Progress": 0, "Completed": 0}

            for email in emails:
                p = email.get("priority", "Low")
                if p in priority_counts:
                    priority_counts[p] += 1
                
                c = email.get("category", "Work")
                if c in category_counts:
                    category_counts[c] += 1

                s = email.get("sentiment", "Neutral")
                if s in sentiment_counts:
                    sentiment_counts[s] += 1

            for task in tasks:
                status = task.get("status", "Pending")
                if status in task_statistics:
                    task_statistics[status] += 1

            task_completion_rate = 0.0
            if task_statistics["total"] > 0:
                task_completion_rate = round(task_statistics["Completed"] / task_statistics["total"] * 100, 2)

            analytics_item = {
                "record_id": "latest",
                "total_emails": total_emails,
                "priority_counts": priority_counts,
                "category_counts": category_counts,
                "sentiment_counts": sentiment_counts,
                "task_statistics": task_statistics,
                "task_completion_rate": task_completion_rate,
                "updated_at": datetime.utcnow().isoformat() + "Z"
            }
            self.save_analytics(analytics_item)
        except Exception as e:
            logger.error(f"Error calculating DynamoDB analytics: {e}")


# Initialize the database based on settings
if settings.use_mock_db:
    logger.info("Initializing Local JSON File Database Manager")
    db = LocalJsonDatabase(LOCAL_DB_FILE)
else:
    logger.info("Initializing DynamoDB Database Manager")
    db = DynamoDbDatabase()
    # Attempt to initialize tables (if local emulator or AWS permission exists)
    try:
        db.init_tables()
    except Exception as e:
        logger.warning(f"Failed to auto-initialize DynamoDB tables: {e}")
