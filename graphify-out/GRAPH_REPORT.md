# Graph Report - email restart  (2026-06-05)

## Corpus Check
- 45 files · ~20,645 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 356 nodes · 633 edges · 23 communities (21 shown, 2 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 57 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d1be2656`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 176|Community 176]]
- [[_COMMUNITY_Community 179|Community 179]]
- [[_COMMUNITY_Community 180|Community 180]]
- [[_COMMUNITY_Community 181|Community 181]]
- [[_COMMUNITY_Community 185|Community 185]]
- [[_COMMUNITY_Community 198|Community 198]]
- [[_COMMUNITY_Community 199|Community 199]]
- [[_COMMUNITY_Community 206|Community 206]]
- [[_COMMUNITY_Community 207|Community 207]]

## God Nodes (most connected - your core abstractions)
1. `str` - 25 edges
2. `Any` - 23 edges
3. `LocalJsonDatabase` - 19 edges
4. `compilerOptions` - 18 edges
5. `DynamoDbDatabase` - 16 edges
6. `EmailPreprocessor` - 14 edges
7. `TaskExtractorAgent` - 14 edges
8. `ImapEmailFetcher` - 14 edges
9. `ClassifierAgent` - 13 edges
10. `SummarizerAgent` - 13 edges

## Surprising Connections (you probably didn't know these)
- `WebSocket` --uses--> `ImapEmailFetcher`  [INFERRED]
  backend/main.py → backend/services/imap_service.py
- `Any` --uses--> `ClassifierAgent`  [INFERRED]
  backend/api/routes/emails.py → backend/agents/classifier_agent.py
- `BackgroundTasks` --uses--> `ClassifierAgent`  [INFERRED]
  backend/api/routes/emails.py → backend/agents/classifier_agent.py
- `int` --uses--> `ClassifierAgent`  [INFERRED]
  backend/api/routes/emails.py → backend/agents/classifier_agent.py
- `str` --uses--> `ClassifierAgent`  [INFERRED]
  backend/api/routes/emails.py → backend/agents/classifier_agent.py

## Import Cycles
- None detected.

## Communities (23 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.25
Nodes (13): BackgroundTasks, str, TaskBase, TaskCreate, TaskResponse, TaskUpdate, delete_task(), list_tasks() (+5 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (30): useTheme(), DashboardLayout(), Analytics(), Dashboard(), EmailDetails(), CATEGORIES, Inbox(), PRIORITIES (+22 more)

### Community 4 - "Community 4"
Cohesion: 0.14
Nodes (11): Any, bool, str, DynamoDbDatabase, float_to_decimal(), LocalJsonDatabase, Recursively convert float values to Decimal for DynamoDB serialization., Production DynamoDB database manager. (+3 more)

### Community 5 - "Community 5"
Cohesion: 0.10
Nodes (22): BaseModel, AnalyticsResponse, PriorityStats, EmailBase, EmailCreate, EmailRecipient, EmailSender, get_analytics() (+14 more)

### Community 11 - "Community 11"
Cohesion: 0.07
Nodes (28): dependencies, axios, framer-motion, react, react-dom, react-icons, react-router-dom, recharts (+20 more)

### Community 15 - "Community 15"
Cohesion: 0.08
Nodes (43): ClassifierAgent, Classifies email content into predefined business domains., DraftGeneratorAgent, Generates context-aware, professional email drafts for auto-replies., EmailPreprocessor, Preprocesses raw email content to prepare it for AI analysis., PriorityAgent, Detects email urgency and priority score. (+35 more)

### Community 23 - "Community 23"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+12 more)

### Community 27 - "Community 27"
Cohesion: 0.20
Nodes (16): Any, int, str, Message, clean_header(), extract_body(), get_attachments_metadata(), parse_date() (+8 more)

### Community 41 - "Community 41"
Cohesion: 0.11
Nodes (17): 1. Setup Backend, 2. Setup Frontend, Analytics, Authentication / Config, Codebase Knowledge Graph, Core API Endpoints, Deployment Instructions, Emails (+9 more)

### Community 44 - "Community 44"
Cohesion: 0.12
Nodes (12): Classifies text and returns category and confidence score., Rule-based text categorization fallback., get_pipeline(), Load a Hugging Face pipeline and cache it to prevent redundant duplicate loading, Calculates priority score (0.0 to 1.0) and determines priority level.         Co, Any, str, Any (+4 more)

### Community 176 - "Community 176"
Cohesion: 0.25
Nodes (6): Execute the full cleaning pipeline on the raw email body., Strip HTML tags using BeautifulSoup4 and return clean text., Remove URLs from text to simplify content for AI models., Attempt to remove signature blocks by finding common boundary patterns., Standardize whitespace, double newlines, and decode anomalies., str

### Community 179 - "Community 179"
Cohesion: 0.43
Nodes (5): Clever sentence-level heuristic task extraction., Extracts list of tasks with due date and owner., Parses lines like 'Task: submit report, Due: Friday, Owner: Alice'., Any, str

### Community 180 - "Community 180"
Cohesion: 0.21
Nodes (7): WebSocket, ConnectionManager, Accept connection and add to active client list., Remove connection from active list., Send message directly to a single socket client., Broadcast event notification to all connected socket clients., Manages active WebSocket connections for real-time notifications.

### Community 181 - "Community 181"
Cohesion: 0.50
Nodes (3): Generates a concise text summary of the email content., Extractive summarization fallback.         Scores sentences based on position an, str

### Community 185 - "Community 185"
Cohesion: 0.29
Nodes (5): bool, BaseSettings, Determines whether to fall back to a local JSON file-based database.         If, Determines whether to use synthetic mock email fetching., Settings

### Community 198 - "Community 198"
Cohesion: 0.50
Nodes (3): Constructs an email reply draft tailored to category, tasks, and sentiment., Any, str

### Community 199 - "Community 199"
Cohesion: 0.50
Nodes (3): Determines sentiment class (Positive, Neutral, Negative) and score.         Scor, Any, str

## Knowledge Gaps
- **83 isolated node(s):** `str`, `Any`, `str`, `int`, `Any` (+78 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `EmailProcessRequest` connect `Community 15` to `Community 5`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Why does `ImapEmailFetcher` connect `Community 15` to `Community 27`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `EmailPreprocessor` connect `Community 15` to `Community 176`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `Classifies email content into predefined business domains.`, `Classifies text and returns category and confidence score.`, `Rule-based text categorization fallback.` to the rest of the system?**
  _141 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.09990749306197964 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.10153846153846154 - nodes in this community are weakly interconnected._