# OpenCode Worker - PR Review Automation Plan

This document outlines the plan to integrate free PR review automation tools for the OpenCode Worker project.

## Overview

Integrate automated code review and quality assurance tools to:
- Reduce maintainer workload
- Ensure consistent code quality
- Catch issues early
- Automate repetitive checks
- Provide faster feedback to contributors

## Tier 1: Essential Tools (Implement First)

### 1.1 CLA Assistant (Contributor License Agreement)

**Purpose**: Ensure contributors sign the CLA before merging

**Setup**:
```bash
# The CLA Assistant runs as a GitHub App
# Visit: https://cla-assistant.io/
# Configure for DoozieSoftware/opencode_worker
```

**Features**:
- Automatic CLA check on PRs
- CLA signing workflow
- History tracking

**Configuration**:
```yaml
# .github/cla.yml
cla:
  signed:
    - all
  unsigned:
    - changed-files:
        - all
```

**Cost**: Free for open source

---

### 1.2 Stale Bot

**Purpose**: Mark and close inactive issues/PRs

**Setup**: GitHub Action

**File**: `.github/workflows/stale.yml`

```yaml
name: Mark Stale Issues and PRs

on:
  schedule:
    - cron: "0 0 * * *"

jobs:
  stale:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/stale@v9
        with:
          days-before-stale: 60
          days-before-close: 7
          stale-issue-label: "stale"
          stale-pr-label: "stale"
          stale-issue-message: |
            This issue has been marked as stale because it has not had activity in the last 60 days.
            Please comment to keep it open, or it will be closed.
          stale-pr-message: |
            This PR has been marked as stale because it has not had activity in the last 60 days.
            Please update or it will be closed.
          close-issue-message: |
            This issue has been closed due to inactivity.
            Please reopen if still relevant.
          close-pr-message: |
            This PR has been closed due to inactivity.
            Please reopen if still relevant.
          operations-per-run: 100
```

**Cost**: Free (GitHub Actions)

---

### 1.3 Auto-Merge Bot

**Purpose**: Automatically merge PRs when checks pass

**Setup**: GitHub Action

**File**: `.github/workflows/auto-merge.yml`

```yaml
name: Auto Merge

on:
  pull_request_review:
    types: [approved]
  check_suite:
    types: [completed]
  status: {}

jobs:
  auto-merge:
    runs-on: ubuntu-latest
    if: github.event.pull_request.base.ref == 'main'
    steps:
      - name: Check if PR is ready to merge
        uses: actions/github-script@v7
        with:
          script: |
            const pr = await github.rest.pulls.get({
              owner: context.repo.owner,
              repo: context.repo.repo,
              pull_number: context.issue.number
            });
            
            const isReady = pr.data.mergeable_state === 'clean' && 
                           pr.data.approvals_required > 0 &&
                           pr.data.approvals > 0;
            
            if (isReady) {
              await github.rest.pulls.merge({
                owner: context.repo.owner,
                repo: context.repo.repo,
                pull_number: context.issue.number,
                merge_method: 'squash'
              });
            }
```

**Alternative**: Use [Auto-Merge GitHub App](https://github.com/apps/auto-merge)

**Cost**: Free for open source

---

### 1.4 Semantic PR Bot

**Purpose**: Enforce semantic commit messages and PR titles

**Setup**: GitHub App or Action

**File**: `.github/workflows/semantic-pr.yml`

```yaml
name: Enforce Semantic PRs

on:
  pull_request:
    types: [opened, edited, synchronize]

jobs:
  semantic-check:
    runs-on: ubuntu-latest
    steps:
      - name: Check PR title
        uses: amannn/action-semantic-pull-request@v5
        with:
          types: |
            feat
            fix
            docs
            style
            refactor
            perf
            test
            chore
            build
            ci
            revert
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Cost**: Free

---

## Tier 2: Code Quality Tools (Implement Second)

### 2.1 Danger

**Purpose**: Automated code review comments on PRs

**Setup**: npm package + GitHub Action

**File**: `dangerfile.ts`

```typescript
import { danger, markdown, warn, fail } from "danger";

// Check for PR size
const changedFiles = danger.github.pr.added_files.length + 
                     danger.github.pr.changed_files.length + 
                     danger.github.pr.removed_files.length;

if (changedFiles > 100) {
  warn("This PR has many files. Consider splitting into smaller PRs.");
}

// Check for missing tests
const testFiles = danger.git.modified_files.filter(f => 
  f.includes("test") || f.includes("spec")
);
if (danger.git.modified_files.length > 10 && testFiles.length === 0) {
  warn("This PR adds/modifies many files but no tests. Please add tests.");
}

// Check for documentation updates
const docFiles = danger.git.modified_files.filter(f =>
  f.endsWith(".md") || f.endsWith(".txt")
);
if (danger.git.modified_files.length > 5 && docFiles.length === 0) {
  warn("Consider adding documentation for new features.");
}

// Check for TODO comments
const todos = danger.git.diffForFiles("src/")
  ?.filter(f => f.new?.includes("TODO:"));
if (todos && todos.length > 0) {
  const todoCount = todos.reduce((acc, f) => 
    acc + (f.new?.match(/TODO:/g) || []).length, 0
  );
  markdown(`This PR contains ${todoCount} TODO comments.`);
}

// Check for breaking changes
const breakingChanges = danger.git.modified_files
  .filter(f => f.includes("CHANGELOG"))
  .length === 0;
  
if (breakingChanges && danger.github.pr.body.includes("breaking")) {
  warn("PR mentions breaking changes but no CHANGELOG update.");
}

// Check for proper issue reference
if (!danger.github.pr.body.includes("#")) {
  warn("Consider referencing related issues in the PR description.");
}

// Celebrate good PRs
if (danger.github.pr.title.startsWith("feat:") && 
    danger.github.pr.user.login !== "dependabot[bot]") {
  markdown("🎉 Thanks for the new feature!");
}
```

**GitHub Action** (`.github/workflows/danger.yml`):

```yaml
name: Danger

on: [pull_request]

jobs:
  danger:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Install Danger
        run: npm install -g danger
      - name: Run Danger
        run: danger
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Cost**: Free (npm package)

---

### 2.2 CodeFactor Auto-Fix

**Purpose**: Automated code quality analysis with auto-fix

**Setup**: [CodeFactor GitHub App](https://github.com/apps/codefactor)

**Features**:
- Auto-fix for style issues
- Security vulnerability detection
- Code complexity analysis

**Cost**: Free for open source (limited features)

---

### 2.3 DeepCode (Snyk)

**Purpose**: Security and code quality analysis

**Setup**: [Snyk GitHub App](https://github.com/apps/snyk)

**Features**:
- Vulnerability detection
- License compliance
- Fix recommendations

**Cost**: Free for open source

---

## Tier 3: AI-Assisted Review Tools (Implement Third)

### 3.1 Google Review (CodeRabbit)

**Purpose**: AI-powered code review

**Setup**: [CodeRabbit GitHub App](https://github.com/apps/coderabbit)

**Features**:
- AI-generated code review comments
- Summarizes PR changes
- Suggests improvements
- Checks for common bugs

**Configuration** (`.coderabbit.yaml`):

```yaml
language: en
early_access: true
reviews:
  profile: standard
  high_level_summary: true
  auto_title_placeholder: ''
  review_status: true
  poem: true
  collapse_walkthrough: false
  sequence_diagrams: true
categories:
  security_severity: >=
    security:
      score_threshold: 100
    performance:
      score_threshold: 100
    correctness:
      score_threshold: 100
    style:
      score_threshold: 200
    test_coverage:
      score_threshold: 80
    documentation:
      score_threshold: 100
```

**Cost**: Free for open source (Beta)

---

### 3.2 Gertile

**Purpose**: AI code review and analysis

**Setup**: [Gertile GitHub App](https://github.com/apps/gertile)

**Features**:
- AI-powered code review
- Bug detection
- Performance suggestions
- Best practices

**Cost**: Free tier available

---

### 3.3 Continue (AI Coding Assistant)

**Purpose**: AI-powered development assistance

**Setup**: [Continue.dev](https://continue.dev/)

**Features**:
- AI pair programmer
- Context-aware suggestions
- Code explanation

**Cost**: Free for open source contributors

---

### 3.4 Swimm

**Purpose**: Documentation and code sync

**Setup**: [Swimm GitHub App](https://github.com/apps/swimm)

**Features**:
- Auto-generate documentation
- Keep docs in sync with code
- Documentation coverage reports

**Cost**: Free for open source

---

## Tier 4: Specialized Review Tools

### 4.1 Label Bot

**Purpose**: Automatic labeling of PRs/issues

**Setup**: [Label Sync](https://github.com/apps/label-sync) or custom action

**File**: `.github/workflows/auto-label.yml`

```yaml
name: Auto Label PRs

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  label:
    runs-on: ubuntu-latest
    steps:
      - name: Label by changed files
        uses: actions/labeler@v5
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
          sync-labels: true
      
      - name: Label by size
        if: github.event.pull_request.author_association == 'CONTRIBUTOR'
        uses: actions/github-script@v7
        with:
          script: |
            const pr = await github.rest.pulls.get({
              owner: context.repo.owner,
              repo: context.repo.repo,
              pull_number: context.issue.number
            });
            
            const additions = pr.data.additions;
            const deletions = pr.data.deletions;
            const total = additions + deletions;
            
            let size;
            if (total < 100) size = "size/XS";
            else if (total < 400) size = "size/S";
            else if (total < 1000) size = "size/M";
            else if (total < 2000) size = "size/L";
            else size = "size/XL";
            
            await github.rest.issues.addLabels({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              labels: [size]
            });
```

---

### 4.2 Dependency Review

**Purpose**: Check for vulnerable dependencies

**Setup**: GitHub native feature

**File**: `.github/workflows/dependency-review.yml`

```yaml
name: Dependency Review

on:
  pull_request:
    paths:
      - 'package.json'
      - 'package-lock.json'
      - '**/package*.json'

permissions:
  contents: read
  pull-requests: write

jobs:
  dependency-review:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Review dependencies
        uses: actions/dependency-review-action@v4
        with:
          fail-on-severity: high
          license-check: true
          base-ref: ${{ github.base_ref }}
          head-ref: ${{ github.head_ref }}
```

**Cost**: Free (GitHub native)

---

### 4.3 OSV Scanner

**Purpose**: Vulnerability scanning

**Setup**: [OSV Scanner](https://google.github.io/osv-scanner/)

**File**: `.github/workflows/vulnerability-scan.yml`

```yaml
name: Vulnerability Scan

on:
  schedule:
    - cron: "0 0 * * 0"
  workflow_dispatch:

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: google/osv-scanner-action@v1
        with:
          args: -r .
```

**Cost**: Free (Google OSV)

---

## Implementation Roadmap

### Phase 1: Week 1 (Essential Tools)
- [ ] Set up CLA Assistant
- [ ] Configure Stale bot
- [ ] Enable Auto-merge
- [ ] Add Semantic PR check
- [ ] Set up auto-labeling

### Phase 2: Week 2 (Code Quality)
- [ ] Configure Danger with custom rules
- [ ] Enable CodeFactor
- [ ] Set up Snyk security scanning
- [ ] Enable Dependency Review

### Phase 3: Week 3 (AI-Assisted)
- [ ] Integrate CodeRabbit (Google Review)
- [ ] Configure Gertile
- [ ] Set up Continue.dev
- [ ] Enable Swimm documentation

### Phase 4: Week 4 (Polish)
- [ ] Fine-tune all configurations
- [ ] Create contributor guide for automation
- [ ] Set up dashboard for metrics
- [ ] Document all tools in README

---

## GitHub Actions Usage Quota

**Note**: GitHub provides 2,000 minutes/month for private repos, unlimited for public repos.

Estimated monthly usage for this project:
| Tool | Minutes | Status |
|------|---------|--------|
| Stale | ~5 min | ✅ Free |
| Auto-Merge | ~10 min | ✅ Free |
| Semantic PR | ~5 min | ✅ Free |
| Labeler | ~5 min | ✅ Free |
| Danger | ~30 min | ✅ Free |
| Dependency Review | ~10 min | ✅ Free |
| **Total** | ~65 min | ✅ Well within quota |

---

## Configuration Files to Create

```
.github/
├── workflows/
│   ├── stale.yml
│   ├── auto-merge.yml
│   ├── semantic-pr.yml
│   ├── auto-label.yml
│   ├── danger.yml
│   ├── dependency-review.yml
│   └── vulnerability-scan.yml
├── cla.yml
├── labeler.yml
└── ISSUE_TEMPLATE/
    ├── bug_report.md
    └── feature_request.md
coderabbit.yaml
dangerfile.ts
```

---

## Contributors Experience

With all tools enabled, contributors will experience:

1. **CLA Check** - Sign CLA before first PR
2. **Semantic Validation** - PR title format validated
3. **Auto-Labeling** - PR labeled automatically
4. **CI Checks** - All checks run automatically
5. **Code Review** - AI reviews from CodeRabbit/Gertile
6. **Danger Comments** - Automated review feedback
7. **Merge** - Automatic merge when approved

---

## Monitoring and Metrics

### Track:
- PR review time
- Number of issues resolved by bots
- CLA sign-up rate
- Stale issue resolution rate
- Security vulnerabilities found

### Tools:
- GitHub Insights
- CodeRabbit dashboard
- Snyk dashboard

---

## Cost Summary

| Tool | Cost | Monthly Cost |
|------|------|--------------|
| CLA Assistant | Free | $0 |
| Stale Bot | Free | $0 |
| Auto-Merge | Free | $0 |
| Semantic PR | Free | $0 |
| Danger | Free | $0 |
| CodeFactor | Free tier | $0 |
| Snyk | Free tier | $0 |
| CodeRabbit | Free (Beta) | $0 |
| Gertile | Free tier | $0 |
| **Total** | | **$0** |

All recommended tools are free for open source projects!

---

## Next Steps

1. Create all GitHub Actions workflows
2. Install GitHub Apps (CLA Assistant, CodeRabbit, Snyk)
3. Create `dangerfile.ts` with custom rules
4. Create `.coderabbit.yaml` configuration
5. Test all integrations with a sample PR
6. Document the automation setup in CONTRIBUTING.md
7. Announce automation improvements to contributors
