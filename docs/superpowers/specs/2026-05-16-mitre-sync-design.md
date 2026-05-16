# MITRE ATT&CK Sync Pipeline — Design Spec

**Date:** 2026-05-16  
**Status:** Approved

---

## Overview

A Node.js script that fetches the MITRE ATT&CK enterprise bundle from the MITRE CTI GitHub repo and syncs Groups (APTs) and Software (malware/tools) into the threat-dashboard2 knowledge base JSON files. A GitHub Actions workflow calls the same script on a weekly cron and opens a PR when changes are detected.

---

## Scope

| MITRE object type | → KB schema | Included |
|---|---|---|
| `intrusion-set` (Groups) | `src/data/threat-actors/` | Yes |
| `malware` / `tool` (Software) | `src/data/capabilities/` | Yes — only software linked to synced groups |
| `attack-pattern` (Techniques) | `public/mitre-techniques.json` | No — already handled by `generate-mitre.js` |
| `campaign` (Operations) | `src/data/operations/` | No — MITRE campaigns are sparse; existing data is richer |
| Organization structure | `src/data/organizations/` | No — not in MITRE ATT&CK |

---

## New Files

```
scripts/
  sync-mitre.js             ← main script
  mitre-country-map.json    ← static map: MITRE Group ID → country slug
.github/
  workflows/
    sync-mitre.yml          ← weekly cron + manual trigger
docs/superpowers/specs/
  2026-05-16-mitre-sync-design.md   ← this file
```

No new npm dependencies required.

`package.json` gains one new script:
```json
"sync": "node scripts/sync-mitre.js"
```

---

## Data Source

```
https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json
```

Same URL already used by `scripts/generate-mitre.js`. The bundle (~50MB) contains all STIX objects: groups, software, techniques, relationships.

---

## Data Mapping

### MITRE Group → `src/data/threat-actors/{id}.json`

| MITRE field | → Actor field | Rule |
|---|---|---|
| `name` | `name` | Direct copy |
| `name` slugified | `id` | "APT28" → `"apt28"`, "Lazarus Group" → `"lazarus-group"` |
| `aliases` | `aliases` | Union-merged with existing |
| `description` (≤300 chars) | `description` | Written only if field is empty in existing file |
| `external_references[mitre-attack].url` | `sources` | Union-merged with existing |
| `mitre-country-map.json` lookup by Group ID | `countryId` | Static lookup; `null` + warning if not found |
| `uses` relationships → software IDs | `capabilityIds` | Derived, union-merged with existing |
| *(not in MITRE)* | `orgId`, `operationIds`, `opTypes`, `confidence` | **Always preserved from existing file; never overwritten** |

### MITRE Software → `src/data/capabilities/cap-{id}.json`

Only software objects linked via `uses` relationships to synced groups are written.

Before generating an ID, the script checks if any existing capability has a matching `name` (case-insensitive). If found, that existing capability is enriched in-place rather than creating a duplicate. This handles hand-set IDs like `cap-xagent` that would slug differently from the MITRE name "X-Agent".

| MITRE field | → Capability field | Rule |
|---|---|---|
| `name` slugified | `id` | "RATANKBA" → `"cap-ratankba"` (only if no name match found) |
| `name` | `name` | Direct copy |
| `type` | `type` | `"malware"` → `"implant"`, `"tool"` → `"tool"` |
| `description` (≤300 chars) | `description` | Written only if empty in existing file |
| `uses` relationships → technique IDs | `mitreAttackIds` | Union-merged with existing |
| `uses` relationships → group slugs | `actorIds` | Union-merged with existing |

### Country Attribution

`scripts/mitre-country-map.json` is a static lookup table mapping MITRE Group external IDs to country slugs:

```json
{
  "G0007": "russia",
  "G0016": "russia",
  "G0034": "russia",
  "G0010": "russia",
  "G0096": "china",
  "G0032": "north-korea",
  "G0082": "north-korea",
  "G0035": "iran"
}
```

Pre-populated with all known nation-state groups. Groups not in the map get `countryId: null` with a logged warning.

When a `countryId` resolved from the map has no corresponding file in `src/data/countries/`, a stub is auto-created:

```json
{
  "id": "vietnam",
  "name": "Vietnam",
  "aliases": [],
  "orgIds": []
}
```

Country name is derived from the slug (capitalized, hyphens → spaces).

### `src/data/meta.json` Updates

Two fields are written/updated on every sync run:

```json
{
  "lastSynced": "2026-05-16T06:00:00.000Z",
  "recentAdditions": [
    { "type": "actor", "id": "apt32", "name": "APT32", "addedAt": "2026-05-16" }
  ]
}
```

`recentAdditions` is prepended with newly added actors and capabilities (not enrichment updates to existing entries).

---

## Script Interface

```bash
# Normal run — writes files
node scripts/sync-mitre.js
npm run sync

# Dry run — prints diff, writes nothing
node scripts/sync-mitre.js --dry-run
npm run sync -- --dry-run
```

**Console output (both modes):**

```
Fetching MITRE ATT&CK enterprise bundle...
Parsed 130 groups, 680 software objects, 11000 relationships

NEW actors (3):   apt32, sidewinder, apt36
ENRICHED actors (2):  apt28 (+2 aliases, +4 capabilityIds), lazarus (+1 source)
NEW capabilities (5): cap-kerrdown, cap-ratankba, ...
NEW countries (1): vietnam

[dry-run] No files written.
```

Exit code 0 on success, non-zero on unrecoverable error.

---

## GitHub Actions Workflow

**File:** `.github/workflows/sync-mitre.yml`

- **Triggers:** `schedule` (cron `0 6 * * 1` — Monday 06:00 UTC) + `workflow_dispatch` (manual)
- **Runner:** `ubuntu-latest`, Node 20
- **Steps:**
  1. `actions/checkout@v4`
  2. `actions/setup-node@v4` (Node 20)
  3. `node scripts/sync-mitre.js`
  4. `peter-evans/create-pull-request@v6` — opens PR only if files changed
- **PR title:** `chore: sync MITRE ATT&CK – {date}`
- **PR body:** script stdout (new/enriched actors, new capabilities, new countries)
- **Branch:** `mitre-sync/auto` (force-pushed each run)
- If no files changed, `create-pull-request` is a no-op — no PR opened

---

## Error Handling

| Failure | Behavior |
|---|---|
| Network error fetching bundle | Retry once after 5s; exit non-zero if still failing |
| STIX object parse error | Log warning + skip that object; continue sync |
| File write error | Log error + exit non-zero immediately |
| Group with no country map entry | Log warning, set `countryId: null`, continue |
| Group resolves to country not in KB | Auto-create country stub, continue |

---

## Out of Scope

- Syncing MITRE Campaigns → `operations/` (too sparse)
- Syncing organization hierarchy → `organizations/` (not in MITRE)
- Syncing technique details → already handled by `generate-mitre.js`
- Any UI changes — the existing `dataLoader.js` picks up new JSON files automatically via `import.meta.glob`
