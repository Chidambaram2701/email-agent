# Enterprise AI Email Intelligence Agent

A production-ready full-stack application designed to parse, classify, summarize, prioritize, and extract actionable checklists from email inboxes (such as Microsoft Outlook) using a zero-dependency **Dual-Mode AI Engine**.

---

## Key Features

1.  **IMAP Inbox Synchronization:** Polls emails securely from Outlook (`outlook.office365.com`) or any other standard mail provider.
2.  **HTML & URL Preprocessing:** Strips HTML code, removes URL clutter, and truncates email signatures to clean inputs.
3.  **Dynamic Category Classifier:** Categorizes messages into *Work*, *Meeting*, *HR*, *Finance*, *Personal*, or *Spam* using zero-shot learning.
4.  **Priority & Urgency Detection:** Rules-based keyword scanning combined with semantic classifier metrics to label urgency (*High*, *Medium*, *Low*).
5.  **Task & Deadline Extraction:** Identifies action items, deadlines (due dates), and owners directly from message text.
6.  **Contextual Sentiment Analysis:** Formulates polarity ratings (-1.0 to +1.0) and tone classifications (Positive, Neutral, Negative).
7.  **Auto-Reply Drafting:** Synthesizes draft responses referencing extracted checklists and sentiment context.
8.  **Real-time Dashboard Notifications:** Feeds statistics, task lists, and alerts to the UI via active WebSockets.
9.  **AWS DynamoDB & Local Fallbacks:** Saves data directly to AWS DynamoDB tables, or automatically falls back to a local thread-safe JSON-based database for zero-config testing.

---

## System Architecture

```
                                  +-------------------+
                                  |   IMAP Server /   |
                                  | Outlook Office365 |
                                  +---------+---------+
                                            | (imaplib)
                                            v
+------------------+     Axios      +-------+---------+     boto3     +-------------------+
|  React 19 + Vite | <------------> | FastAPI Backend | ------------> |   AWS DynamoDB    |
|   Dashboard UI   |                +-------+---------+               | (or Local JSON)   |
+--------+---------+                        |                         +-------------------+
         ^                                  | (transformers / pipelines)
         |                                  v
         | WebSocket (Updates)      +-------+---------+
         +------------------------+ |  AI Agent Core  |
                                    +-----------------+
```

---

## Technology Stack

*   **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v3, Zustand, Axios, Recharts, Framer Motion, React Icons.
*   **Backend:** Python FastAPI, Pydantic, Uvicorn, BeautifulSoup4, Boto3, IMAPlib, Transformers, PyTorch (CPU).

---

## Folder Structure

```
email-agent/
├── docker-compose.yml
├── README.md
├── backend/
│   ├── main.py                 # FastAPI application coordinator
│   ├── requirements.txt        # Backend dependencies
│   ├── api/routes/             # Auth, Email, Task, and Analytics routers
│   ├── agents/                 # Text preprocess, classifiers, and summarizers
│   ├── models/                 # Validation Pydantic schemas
│   ├── services/               # IMAP mail retriever & WebSocket broadcasts
│   └── database/               # AWS DynamoDB client & local JSON database fallback
└── frontend/
    ├── package.json            # Frontend node packages
    ├── index.html              # HTML entry point with premium Google Fonts
    ├── src/
    │   ├── main.tsx            # React mounting hook
    │   ├── App.tsx             # Route paths mapping
    │   ├── layouts/            # Dashboard sidebar, navbar & socket listeners
    │   ├── pages/              # Dashboard, Inbox, Details, Kanban Tasks, Settings
    │   ├── services/           # Axios network configurations
    │   └── store/              # Zustand global states (Emails, Tasks, Notifications)
```

---

## Quick Start Configuration

Copy `backend/.env.example` to `backend/.env` and adjust settings:

```bash
cp backend/.env.example backend/.env
```

Key configuration variables:
*   `AI_MODE`: Set to `"FALLBACK"` (default) to run the application immediately without downloading 2GB+ of Hugging Face models. Set to `"PRODUCTION"` to load local neural models (`facebook/bart-large-mnli`, `facebook/bart-large-cnn`, `google/flan-t5-base`).
*   `DEMO_MODE`: Set to `true` (default) to bypass IMAP connection checks and generate simulated business emails on sync. Set to `false` to pull from your real account.
*   `AWS_ACCESS_KEY_ID`: Leave blank to automatically activate the local file database (`backend/database/local_db.json`). Fill out to bind AWS DynamoDB.

---

## Deployment Instructions

### Method 1: Using Docker Compose (Recommended)

Run the following command at the root directory to download, build, and run the containers:

```bash
docker-compose up --build
```

Access points:
*   **Frontend Dashboard UI:** `http://localhost:3000`
*   **Backend Swagger API Docs:** `http://localhost:8000/docs`

---

### Method 2: Manual Development Build

#### 1. Setup Backend
```bash
# Navigate to backend directory
cd backend

# Create and activate python virtual environment
python -m venv venv
venv\Scripts\activate   # On Windows
source venv/bin/activate # On Unix/macOS

# Install dependencies (Downloads CPU version of PyTorch for fast execution)
pip install -r requirements.txt

# Run server
uvicorn main:app --reload --port 8000
```

#### 2. Setup Frontend
```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install

# Run Vite dev server
npm run dev
```
Open `http://localhost:5173` to view the dashboard workspace.

---

## Core API Endpoints

### Authentication / Config
*   `GET /auth/status`: Check current connection variables, database styles, and active modes.
*   `POST /auth/test-imap`: Validate IMAP logins against a specified server.
*   `POST /auth/config`: Save dynamic credential values to backend memory.
*   `POST /auth/clear-database`: Clear database tables/files.

### Emails
*   `GET /emails`: List all analyzed email records.
*   `GET /emails/{id}`: Detailed telemetry view for a single email (with task checklist).
*   `POST /emails/fetch`: Fetch emails via IMAP, run pipeline, save models, and broadcast socket refreshes.
*   `POST /emails/process-email`: Manually submit custom content to run the analysis pipeline.

### Tasks
*   `GET /tasks`: List task lists (supports filtering by parent email).
*   `PATCH /tasks/{id}`: Edit task descriptions, owners, deadlines, or status flags.
*   `DELETE /tasks/{id}`: Remove task card from board.

### Analytics
*   `GET /analytics`: Dynamic report aggregates for charts.
