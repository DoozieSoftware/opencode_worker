#!/bin/bash

# GitHub Labels Setup Script
# Run this script to create all labels in the repository

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Creating GitHub labels for opencode_worker...${NC}"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}GitHub CLI (gh) is not installed.${NC}"
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}Not authenticated with GitHub.${NC}"
    echo "Run: gh auth login"
    exit 1
fi

# Get repository info
REPO=$(gh repo view --json name,owner --jq '.owner.login + "/" + .name')

echo -e "${GREEN}Repository: ${REPO}${NC}"

# Type Labels
echo -e "${YELLOW}Creating type labels...${NC}"
gh label create "bug" --color "d73a4a" --repo "$REPO" --description "Something isn't working" 2>/dev/null || echo "  label 'bug' exists"
gh label create "enhancement" --color "a2eeef" --repo "$REPO" --description "New feature or request" 2>/dev/null || echo "  label 'enhancement' exists"
gh label create "documentation" --color "0075ca" --repo "$REPO" --description "Improvements or additions to documentation" 2>/dev/null || echo "  label 'documentation' exists"
gh label create "refactor" --color "fbca04" --repo "$REPO" --description "Code refactoring" 2>/dev/null || echo "  label 'refactor' exists"
gh label create "test" --color "b602ed" --repo "$REPO" --description "Adding or updating tests" 2>/dev/null || echo "  label 'test' exists"
gh label create "chore" --color "eeeeee" --repo "$REPO" --description "Maintenance tasks" 2>/dev/null || echo "  label 'chore' exists"
gh label create "performance" --color "f29111" --repo "$REPO" --description "Performance improvements" 2>/dev/null || echo "  label 'performance' exists"
gh label create "security" --color "b602ed" --repo "$REPO" --description "Security-related changes" 2>/dev/null || echo "  label 'security' exists"

# Priority Labels
echo -e "${YELLOW}Creating priority labels...${NC}"
gh label create "priority: critical" --color "ff0000" --repo "$REPO" --description "Critical issue, must be fixed immediately" 2>/dev/null || echo "  label 'priority: critical' exists"
gh label create "priority: high" --color "ff7f00" --repo "$REPO" --description "High priority, fix soon" 2>/dev/null || echo "  label 'priority: high' exists"
gh label create "priority: medium" --color "ffcc00" --repo "$REPO" --description "Medium priority" 2>/dev/null || echo "  label 'priority: medium' exists"
gh label create "priority: low" --color "66ff66" --repo "$REPO" --description "Low priority, nice to have" 2>/dev/null || echo "  label 'priority: low' exists"

# Status Labels
echo -e "${YELLOW}Creating status labels...${NC}"
gh label create "triage" --color "e4e669" --repo "$REPO" --description "Needs initial review" 2>/dev/null || echo "  label 'triage' exists"
gh label create "in progress" --color "a36ecf" --repo "$REPO" --description "Currently being worked on" 2>/dev/null || echo "  label 'in progress' exists"
gh label create "review needed" --color "007bff" --repo "$REPO" --description "Ready for code review" 2>/dev/null || echo "  label 'review needed' exists"
gh label create "changes requested" --color "ff9f43" --repo "$REPO" --description "Changes requested by reviewer" 2>/dev/null || echo "  label 'changes requested' exists"
gh label create "ready to merge" --color "28a745" --repo "$REPO" --description "Approved and ready to merge" 2>/dev/null || echo "  label 'ready to merge' exists"
gh label create "wontfix" --color "6e6e6e" --repo "$REPO" --description "Won't be fixed" 2>/dev/null || echo "  label 'wontfix' exists"
gh label create "duplicate" --color "6e6e6e" --repo "$REPO" --description "Duplicate of another issue" 2>/dev/null || echo "  label 'duplicate' exists"
gh label create "invalid" --color "6e6e6e" --repo "$REPO" --description "Not a valid issue" 2>/dev/null || echo "  label 'invalid' exists"

# Component Labels
echo -e "${YELLOW}Creating component labels...${NC}"
gh label create "component: core" --color "0366d6" --repo "$REPO" --description "Core functionality" 2>/dev/null || echo "  label 'component: core' exists"
gh label create "component: websocket" --color "6f42c1" --repo "$REPO" --description "WebSocket streaming" 2>/dev/null || echo "  label 'component: websocket' exists"
gh label create "component: config" --color "28a745" --repo "$REPO" --description "Configuration system" 2>/dev/null || echo "  label 'component: config' exists"
gh label create "component: security" --color "cb2431" --repo "$REPO" --description "Security features" 2>/dev/null || echo "  label 'component: security' exists"
gh label create "component: docker" --color "2496ed" --repo "$REPO" --description "Docker-related" 2>/dev/null || echo "  label 'component: docker' exists"
gh label create "component: documentation" --color "6a737a" --repo "$REPO" --description "Documentation" 2>/dev/null || echo "  label 'component: documentation' exists"
gh label create "component: tests" --color "28a745" --repo "$REPO" --description "Test infrastructure" 2>/dev/null || echo "  label 'component: tests' exists"

# Difficulty Labels
echo -e "${YELLOW}Creating difficulty labels...${NC}"
gh label create "good first issue" --color "70c238" --repo "$REPO" --description "Good for newcomers" 2>/dev/null || echo "  label 'good first issue' exists"
gh label create "help wanted" --color "9b59b6" --repo "$REPO" --description "Extra attention needed" 2>/dev/null || echo "  label 'help wanted' exists"
gh label create "complexity: low" --color "2ea44f" --repo "$REPO" --description "Simple change" 2>/dev/null || echo "  label 'complexity: low' exists"
gh label create "complexity: medium" --color "fbca04" --repo "$REPO" --description "Moderate complexity" 2>/dev/null || echo "  label 'complexity: medium' exists"
gh label create "complexity: high" --color "ff7f00" --repo "$REPO" --description "High complexity" 2>/dev/null || echo "  label 'complexity: high' exists"

echo ""
echo -e "${GREEN}Done! All labels have been created.${NC}"
echo ""
echo "To view labels, run: gh label list --repo $REPO"
