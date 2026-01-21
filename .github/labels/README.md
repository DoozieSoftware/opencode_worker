# GitHub Labels Configuration

This document describes the labels used in the OpenCode Worker repository.

## Label Categories

### Type Labels

| Label | Color | Description |
|-------|-------|-------------|
| `bug` | 🔴 #d73a4a | Something isn't working |
| `enhancement` | 🟢 #a2eeef | New feature or request |
| `documentation` | 🔵 #0075ca | Improvements or additions to documentation |
| `refactor` | 🟡 #fbca04 | Code refactoring |
| `test` | 🟣 #b602ed | Adding or updating tests |
| `chore` | ⚫ #eeeeee | Maintenance tasks |
| `performance` | 🟠 #f29111 | Performance improvements |
| `security` | 🔴 #b602ed | Security-related changes |

### Priority Labels

| Label | Color | Description |
|-------|-------|-------------|
| `priority: critical` | 🔴 #ff0000 | Critical issue, must be fixed immediately |
| `priority: high` | 🟠 #ff7f00 | High priority, fix soon |
| `priority: medium` | 🟡 #ffcc00 | Medium priority |
| `priority: low` | 🟢 #66ff66 | Low priority, nice to have |

### Status Labels

| Label | Color | Description |
|-------|-------|-------------|
| `triage` | ⚪ #e4e669 | Needs initial review |
| `in progress` | 🟣 #a36ecf | Currently being worked on |
| `review needed` | 🔵 #007bff | Ready for code review |
| `changes requested` | 🟠 #ff9f43 | Changes requested by reviewer |
| `ready to merge` | 🟢 #28a745 | Approved and ready to merge |
| `wontfix` | ⚫ #6e6e6e | Won't be fixed |
| `duplicate` | ⚫ #6e6e6e | Duplicate of another issue |
| `invalid` | ⚫ #6e6e6e | Not a valid issue |

### Component Labels

| Label | Color | Description |
|-------|-------|-------------|
| `component: core` | 🔵 #0366d6 | Core functionality |
| `component: websocket` | 🟣 #6f42c1 | WebSocket streaming |
| `component: config` | 🟢 #28a745 | Configuration system |
| `component: security` | 🔴 #cb2431 | Security features |
| `component: docker` | 🔵 #2496ed | Docker-related |
| `component: documentation` | 🟤 #6a737a | Documentation |
| `component: tests` | 🟢 #28a745 | Test infrastructure |

### Difficulty Labels

| Label | Color | Description |
|-------|-------|-------------|
| `good first issue` | 🟢 #70c238 | Good for newcomers |
| `help wanted` | 🟣 #9b59b6 | Extra attention needed |
| `complexity: low` | 🟢 #2ea44f | Simple change |
| `complexity: medium` | 🟡 #fbca04 | Moderate complexity |
| `complexity: high` | 🟠 #ff7f00 | High complexity |

### GitHub Actions Labels

| Label | Color | Description |
|-------|-------|-------------|
| `CI: passed` | 🟢 #28a745 | All CI checks passed |
| `CI: failed` | 🔴 #cb2431 | CI checks failed |
| `CI: pending` | 🟡 #fbca04 | CI checks pending |

## Creating Labels

Labels can be created manually in GitHub Settings or via API:

```bash
# Example using GitHub CLI
gh label create "bug" --color "d73a4a" --description "Something isn't working"

gh label create "priority: high" --color "ff7f00" --description "High priority"
```

## Label Usage Guidelines

### Issue Triaging

1. Add `triage` label to new issues
2. Add type label (`bug`, `enhancement`, `documentation`)
3. Add priority label
4. Add component label(s)
5. Add difficulty labels if appropriate

### PR Review

1. Remove `in progress` label
2. Add `review needed` label
3. After review: add `changes requested` or `ready to merge`
4. After merge: remove all status labels

### Automation

These labels are used for:
- Sorting issues by priority
- Filtering PRs by component
- Automating release notes
- Managing backports
