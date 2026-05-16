# IW Research App — Tutorial

A research tool for analyzing Information Operations and Cyberspace Operations conducted by China, Russia, Iran, and North Korea, structured around the **Diamond Model** analytical framework.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [The Dashboard](#the-dashboard)
3. [Country Pages](#country-pages)
4. [Actor Profiles](#actor-profiles)
5. [Operation Detail Pages](#operation-detail-pages)
6. [Analytics](#analytics)
7. [AI Research Assistant](#ai-research-assistant)
8. [Saving Research to the Knowledge Base](#saving-research-to-the-knowledge-base)
9. [The Knowledge Base (How Data is Stored)](#the-knowledge-base)

---

## Getting Started

```bash
cd threat-dashboard
npm run dev
```

Open **http://localhost:5173** in your browser.

Before using AI Research, add your Anthropic API key to `.env`:

```
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

Restart the dev server after adding the key.

---

## The Dashboard

The home screen shows the four countries covered by the app. Each card displays the number of **tracked actors** and **documented operations** for that country.

- Click any country card to drill into its organizational structure and threat actors.
- Use the **search bar** in the header to find actors, operations, or capabilities by name across the entire knowledge base.
- The **⚗ AI Research** and **📊 Analytics** buttons in the bottom-left jump directly to those pages.

**Search tip:** Searching for "APT" returns all APT-designated actors. Searching for "telecom" returns operations targeting that sector.

---

## Country Pages

Each country page has two panels:

### Left sidebar — Organization Hierarchy
Shows the intelligence/military org structure as a collapsible tree. Click **▾/▸** to expand or collapse an org. Actor names appear beneath their parent organization as blue links — click any actor name to go directly to their profile.

### Right panel — Actor Grid
Lists all known threat actors for that country. Use the **All / Cyber / IO** filter buttons to narrow by operation type:
- **Cyber** — intrusion, espionage, disruption
- **IO** — influence operations, disinformation, psyops

Each actor card shows their confidence level, aliases, op types, description, and operation count. Click a card to open the full actor profile.

---

## Actor Profiles

The actor profile page is the core analytical view. It contains:

### Header
- **Name** with confidence level (green = high, yellow = medium, red = low)
- **Aliases** — alternative names used by different vendors
- **Country › Organization** breadcrumb
- **Op type tags** — blue for Cyber, purple for IO

### Sample Diamond Diagram
A Diamond Model diagram rendered for the actor's first documented operation, showing the four analytic nodes:
- **Adversary** (top, blue) — the threat actor
- **Capability** (right, purple) — the tool or technique used
- **Infrastructure** (left, amber) — how they delivered the capability
- **Victim** (bottom, red) — who was targeted

The adversary and capability nodes are clickable links.

### Analytics Panel
- **Operation Type Split** — proportion of Cyber vs IO operations as a bar
- **Top Capabilities** — frequency chart of which capabilities appear across operations
- **Victim Sectors** — all sectors targeted across this actor's operations

### Operations List
All documented operations as clickable cards. Each shows op type, confidence, adversary, capability, victim sector, and timeframe.

### Capabilities List
All known tools and techniques attributed to this actor, with MITRE ATT&CK IDs as external links to attack.mitre.org.

---

## Operation Detail Pages

Click any operation card to open the full operation view.

### Diamond Diagram
A full interactive Diamond Model diagram. The **adversary** and **capability** nodes link to their respective profile pages.

### Metadata Cards
Four quadrant cards covering:
- **Adversary** — attributed threat actor
- **Capability** — tool or technique used
- **Infrastructure** — delivery mechanism and indicators
- **Victim** — sector, region, and description

### Sources
Clickable links to government advisories, vendor reports, and academic papers that back the assessment.

### Inline Editing
Click **Edit** in the top-right corner to modify any operation field directly in the browser. Fields include name, op type, confidence, kill chain phase, timeframe, victim details, infrastructure description, and sources. Click **Save** — the change is written immediately to the JSON file on disk and a **✓ Saved** confirmation appears. No server restart needed.

---

## Analytics

The Analytics page (`/analytics`) provides four visualizations across the full knowledge base:

| Chart | What it shows |
|---|---|
| Operations by Country | Stacked bar chart of Cyber vs IO op counts per country |
| Victim Sectors | Pie chart of sectors targeted across all operations |
| Top Capabilities | Horizontal bar chart of most-used tools/techniques |
| Operation Timeline | Bar chart of operation counts by timeframe period |

Charts update automatically as you add new data via AI Research.

---

## AI Research Assistant

The Research page (`/research`) provides a chat interface backed by Claude. The assistant is pre-configured as an IW intelligence analyst with knowledge of your current knowledge base.

### Context Chips
Before sending a message, click one or more country chips (**China / Russia / Iran / North Korea**) to prepend that context to your query. This helps the assistant focus its analysis.

### Asking Good Questions
The assistant structures responses around the Diamond Model and includes:
- MITRE ATT&CK technique IDs
- Source citations with URLs
- Confidence assessments (high/medium/low)
- Distinction between IO and Cyberspace Operations

**Example prompts:**
- *"What are the key differences between Volt Typhoon and Salt Typhoon operations?"*
- *"Research recent Sandworm activity against European infrastructure"*
- *"What IO tactics does Charming Kitten use against diaspora communities?"*
- *"Summarize APT29's known MITRE ATT&CK techniques"*

### Chat History
Conversations persist in your browser's `localStorage` across sessions. Click **Clear History** to start fresh.

---

## Saving Research to the Knowledge Base

When the assistant identifies a discrete operation or actor update, it appends a structured `<KB_ENTITY>` block to its response. The app automatically detects this and prompts you to save it.

### Save Flow
1. A **Save to Knowledge Base** modal appears showing the extracted fields.
2. Review and edit any field before confirming.
3. Click **Confirm Save** — the entry is written to `src/data/` on disk.
4. Vite detects the new file and the dashboard, country pages, and analytics update automatically.
5. A **✓ Saved to KB** confirmation appears in the Research page header.

### What Gets Saved
The entity type determines where it lands:
| Entity type | Saved to |
|---|---|
| `operation` | `src/data/operations/<id>.json` |
| `actor` | `src/data/threat-actors/<id>.json` |
| `capability` | `src/data/capabilities/<id>.json` |

**Important:** After saving a new actor, manually add their `id` to the relevant organization's `actorIds` array in `src/data/organizations/` so they appear in the org tree and country page.

---

## The Knowledge Base

All data lives in `src/data/` as plain JSON files. You can edit them directly in any text editor — Vite will hot-reload the changes.

```
src/data/
  countries/          — china.json, russia.json, iran.json, north-korea.json
  organizations/      — mss.json, gru.json, svr.json, irgc.json, rgb.json, ...
  threat-actors/      — apt28.json, sandworm.json, lazarus.json, ...
  capabilities/       — cap-xagent.json, cap-sunburst.json, ...
  operations/         — op-ru-001.json, op-nk-001.json, ...
  meta.json           — recent additions index
```

### Key ID Relationships
Entities reference each other by ID:
- An **actor** has `operationIds` and `capabilityIds` arrays
- An **operation** has `adversaryId` and `capabilityId` fields
- An **organization** has an `actorIds` array
- An **actor** has `countryId` and `orgId` fields

Keeping these in sync ensures the org tree, actor profiles, and Diamond diagrams all render correctly.
