# Graph Report - frontend  (2026-06-05)

## Corpus Check
- 22 files · ~10,782 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 102 nodes · 157 edges · 13 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d1be2656`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 18 edges
2. `useAnalyticsStore` - 13 edges
3. `useEmailStore` - 13 edges
4. `useTaskStore` - 11 edges
5. `DashboardLayout()` - 7 edges
6. `scripts` - 5 edges
7. `Settings()` - 5 edges
8. `useAuthStore` - 5 edges
9. `Dashboard()` - 4 edges
10. `EmailDetails()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `Inbox()` --calls--> `useEmailStore`  [EXTRACTED]
  src/pages/Inbox.tsx → src/store/emailStore.ts
- `DashboardLayout()` --calls--> `useAnalyticsStore`  [EXTRACTED]
  src/layouts/DashboardLayout.tsx → src/store/analyticsStore.ts
- `DashboardLayout()` --calls--> `useAuthStore`  [EXTRACTED]
  src/layouts/DashboardLayout.tsx → src/store/authStore.ts
- `DashboardLayout()` --calls--> `useEmailStore`  [EXTRACTED]
  src/layouts/DashboardLayout.tsx → src/store/emailStore.ts
- `DashboardLayout()` --calls--> `useTaskStore`  [EXTRACTED]
  src/layouts/DashboardLayout.tsx → src/store/taskStore.ts

## Import Cycles
- None detected.

## Communities (13 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+12 more)

### Community 1 - "Community 1"
Cohesion: 0.25
Nodes (12): Analytics(), Dashboard(), EmailDetails(), COLUMNS, TaskManagement(), AnalyticsData, AnalyticsState, useAnalyticsStore (+4 more)

### Community 2 - "Community 2"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, lint, preview, type (+1 more)

### Community 3 - "Community 3"
Cohesion: 0.20
Nodes (10): devDependencies, autoprefixer, postcss, tailwindcss, @types/node, @types/react, @types/react-dom, typescript (+2 more)

### Community 4 - "Community 4"
Cohesion: 0.22
Nodes (9): dependencies, axios, framer-motion, react, react-dom, react-icons, react-router-dom, recharts (+1 more)

### Community 5 - "Community 5"
Cohesion: 0.39
Nodes (5): useTheme(), DashboardLayout(), NotificationItem, NotificationState, useNotificationStore

### Community 6 - "Community 6"
Cohesion: 0.25
Nodes (6): api, Email, EmailRecipient, EmailSender, EmailState, SelectedEmailDetails

### Community 7 - "Community 7"
Cohesion: 0.29
Nodes (3): CATEGORIES, Inbox(), PRIORITIES

### Community 8 - "Community 8"
Cohesion: 0.47
Nodes (4): Settings(), AuthConfig, AuthState, useAuthStore

## Knowledge Gaps
- **59 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+54 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Community 3` to `Community 2`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Community 4` to `Community 2`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _59 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._