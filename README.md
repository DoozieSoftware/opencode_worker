# OpenCode Worker

<p align="center">
  <strong>Stateless Remote Execution Runtime for OpenCode</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#docker">Docker</a> •
  <a href="#api">API</a> •
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <img alt="License" src="https://img.shields.io/badge/License-ISC-blue.svg">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.8-blue.svg">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-22-green.svg">
</p>

---

## Overview

OpenCode Worker is a **controlled, subordinate OpenCode runtime** that enables distributed, stateless task execution across remote worker nodes. It is designed for secure, isolated, and disposable job execution.

### Key Characteristics

- **Non-Autonomous**: Operates only within disposable, session-scoped sandboxes
- **Stateless**: Retains zero memory or state across tasks
- **Deterministic**: Each task runs in a fresh, isolated environment
- **Secure**: Command allowlist, resource limits, and user isolation

## Features

| Feature | Description |
|---------|-------------|
| **Session Isolation** | Each job runs in its own filesystem, environment, and process tree |
| **Resource Governance** | CPU, memory, timeout, and output limits per session |
| **Command Allowlist** | Whitelist of safe commands prevents arbitrary code execution |
| **Session Lifecycle** | INIT → PREPARE → EXECUTE → COLLECT → DESTROY |
| **Zero Cross-Task Contamination** | Sessions are destroyed after completion |
| **Docker Support** | Optional Docker-based worker for enhanced isolation |

## Quick Start

### Prerequisites

- Node.js 22+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/DoozieSoftware/opencode_worker.git
cd opencode_worker

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

### Basic Usage

```typescript
import { OpenCodeWorkerPlugin } from "opencode-worker";

// Initialize the plugin
const plugin = await OpenCodeWorkerPlugin({
  client: createOpencodeClient(),
  project: { id: "my-project", name: "My Project" },
  directory: "/path/to/project",
  worktree: "/path/to/project/.git/worktrees/branch",
  serverUrl: new URL("http://localhost:3000"),
  $: bunShell,
});

// Access worker tools
const result = await plugin.tool.worker_dispatch_job.execute({
  job_id: "job-123",
  command: "npx opencode run task.json",
  files: { "task.json": '{"task": "test"}' },
  limits: { cpu: 2, memory: "2GB", timeout: 300000 },
  config: { mode: "worker", provider: "openai", model: "gpt-4", network: "restricted", telemetry: false },
});
```

## Architecture

```
OpenCode Master                    OpenCode Worker
     │                                    │
     ├── dispatch_job() ───────────────► │  → Session Lifecycle Manager
     │                                    │  → Resource Governor
     │                                    │  → Security Enforcer
     │                                    │
     ◄── job_status() ───────────────────│
     │                                    │
     ◄── collect_output() ───────────────│
```

### Session Lifecycle

```
INIT → PREPARE → EXECUTE → COLLECT → DESTROY
```

| Phase | Description |
|-------|-------------|
| **INIT** | Create session directory and context |
| **PREPARE** | Inject files into session work directory |
| **EXECUTE** | Run command with resource governance |
| **COLLECT** | Gather output artifacts |
| **DESTROY** | Clean up session (always runs) |

### Directory Structure

```
/opt/opencode/
├── base/              # Immutable OpenCode installation
├── models/            # Optional shared, read-only cache
├── worker/            # Worker daemon
└── sessions/
     └── session-<uuid>/
          ├── work/          # Input files
          ├── output/        # Output artifacts
          └── opencode.json  # Session config
```

## Docker

### Quick Start with Docker

```bash
# Build and start the worker container
./scripts/start-docker.sh

# Test SSH connection
./scripts/test-ssh.sh

# Run integration tests
./scripts/test-remote.sh
```

### Manual Docker Setup

```bash
# Build the image
docker build -t opencode-worker:latest .

# Run the container
docker run -d \
  --name opencode-worker \
  -p 2222:2222 \
  -v opencode-sessions:/opt/opencode/sessions \
  opencode-worker:latest
```

### SSH Access

The Docker container exposes SSH on port 2222:

```bash
ssh -i ~/.ssh/id_ed25519_opencode_worker -p 2222 opencode@localhost
```

### Docker Compose

```yaml
services:
  opencode-worker:
    build: .
    ports:
      - "2222:2222"
    volumes:
      - opencode-sessions:/opt/opencode/sessions
    environment:
      - NODE_ENV=production
```

## API

### Plugin Tools

| Tool | Description |
|------|-------------|
| `worker_dispatch_job` | Dispatch a job to an isolated session |
| `worker_get_status` | Get status of a running job |
| `worker_collect_output` | Collect output artifacts from a job |
| `worker_cancel_job` | Cancel a running job |
| `worker_list_sessions` | List all active sessions |
| `worker_get_metrics` | Get worker performance metrics |

### Job Input Contract

```json
{
  "job_id": "uuid-v7",
  "command": "npx opencode run task.json",
  "files": {
    "task.json": "{...}"
  },
  "limits": {
    "cpu": 2,
    "memory": "2GB",
    "timeout": 300000
  },
  "config": {
    "mode": "worker",
    "provider": "openai",
    "model": "gpt-4",
    "network": "restricted",
    "telemetry": false
  }
}
```

### Job Output Contract

```json
{
  "job_id": "uuid-v7",
  "status": "finished | failed | timeout",
  "exit_code": 0,
  "stdout": "...",
  "stderr": "...",
  "artifacts": ["output.json"],
  "metrics": {
    "duration_ms": 1432,
    "worker_id": "node-3"
  }
}
```

## Security

### Command Allowlist

Only whitelisted commands are allowed:

```typescript
const ALLOWED_COMMANDS = [
  "npx", "node", "npm", "bun", "git", "cat", "ls",
  "mkdir", "rm", "cp", "mv", "chmod", "bash", "sh",
  // ... 50+ more safe commands
];
```

### Dangerous Pattern Detection

Commands matching these patterns are blocked:

- `rm -rf /` and similar
- Pipe to shell (`| sh`)
- Command substitution (`$(...)`, backticks)
- Unauthorized chmod operations

### Resource Limits

| Resource | Default | Maximum |
|----------|---------|---------|
| CPU | 2 cores | Configurable |
| Memory | 2GB | Configurable |
| Timeout | 5min | Configurable |
| Output | 10MB | Configurable |

## Development

### Setup

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Type checking
npm run typecheck
```

### Testing

```bash
# Unit tests
npm test

# Integration tests
node --experimental-strip-types test-remote.ts

# Docker tests
./scripts/start-docker.sh
./scripts/test-ssh.sh
```

## Contributing

Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## Versioning

We use [Semantic Versioning](https://semver.org/). For available versions, see the [CHANGELOG](CHANGELOG.md).

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [OpenCode](https://opencode.ai) for the plugin architecture
- [OpenCode-AI](https://github.com/opencode-ai) for the SDK and plugin system
