# OpenCode Worker

<p align="center">
  <strong>Stateless Remote Execution Runtime for OpenCode</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#websocket-streaming">WebSocket Streaming</a> •
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
| **WebSocket Streaming** | Real-time job output streaming via WebSocket |

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
| `worker_stream_job` | Dispatch a job with WebSocket streaming |
| `worker_get_stream_url` | Get the WebSocket URL for streaming |
| `worker_subscribe_stream` | Get subscription info for WebSocket streaming |

### WebSocket Streaming

The worker supports real-time job output streaming via WebSocket. This enables live monitoring of job progress and output.

#### Starting the Streaming Server

```typescript
import { getStreamingServer } from "opencode-worker";

// Start the WebSocket server on port 8080 (default)
const server = await getStreamingServer(8080);

// Check if running
console.log(server.isRunning()); // true

// Get connected clients count
console.log(server.getConnectedClientsCount()); // 0
```

#### Connecting and Subscribing

```typescript
import { WebSocket } from "ws";

const ws = new WebSocket("ws://localhost:8080");

ws.on("open", () => {
  // Subscribe to job updates
  ws.send(JSON.stringify({
    type: "subscribe",
    job_ids: ["job-123", "job-456"]
  }));
});

ws.on("message", (data) => {
  const message = JSON.parse(data.toString());
  
  switch (message.type) {
    case "connected":
      console.log("Connected:", message.client_id);
      break;
    case "job_status":
      console.log("Job status:", message.data);
      break;
    case "job_output":
      console.log("Output chunk:", message.data.chunk);
      break;
    case "job_complete":
      console.log("Job completed:", message.data);
      break;
    case "job_error":
      console.log("Job error:", message.data);
      break;
  }
});
```

#### Streaming a Job

```typescript
import { runStreamingSession } from "opencode-worker";

const result = await runStreamingSession(
  {
    job_id: "job-123",
    command: "npx opencode run task.json",
    files: { "task.json": '{"task": "test"}' }
  },
  {},
  {
    chunk_size: 1024,
    capture_stdout: true,
    capture_stderr: true
  }
);

console.log("Exit code:", result.exit_code);
console.log("Duration:", result.duration_ms, "ms");
console.log("Output chunks:", result.stdout_chunks.length);
```

#### Message Types

| Type | Description |
|------|-------------|
| `connected` | Client successfully connected |
| `job_status` | Job status update (started, progress) |
| `job_output` | Output chunk from stdout/stderr |
| `job_complete` | Job completed successfully |
| `job_error` | Job execution error |
| `heartbeat` | Keep-alive ping |

#### WebSocket URL Tool

Get the WebSocket URL for streaming:

```typescript
const streamUrl = await plugin.tool.worker_get_stream_url.execute({
  port: 8080  // optional, defaults to 8080
});
// Returns: "ws://localhost:8080"
```

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

## Configuration

The worker supports configuration from multiple sources with the following priority (highest to lowest):

1. **Command-line arguments** (`--key=value`)
2. **Environment variables** (`OPENCODE_WORKER_*`)
3. **Config file** (`opencode-worker.json`)
4. **Default values**

### Config File

Create a `opencode-worker.json` file in your working directory:

```json
{
  "worker": {
    "id": "worker-01",
    "concurrency": 4,
    "cleanup_delay_ms": 5000
  },
  "session": {
    "base_dir": "/opt/opencode/sessions",
    "work_dir_name": "work",
    "output_dir_name": "output",
    "max_concurrent_sessions": 10,
    "default_timeout_ms": 300000,
    "max_output_size_mb": 10
  },
  "governance": {
    "default_cpu": 2,
    "default_memory_mb": 2048,
    "default_timeout_ms": 300000,
    "max_cpu": 8,
    "max_memory_mb": 8192,
    "max_timeout_ms": 600000
  },
  "websocket": {
    "enabled": true,
    "port": 8080,
    "heartbeat_interval_ms": 30000,
    "max_clients": 100
  },
  "logging": {
    "level": "info",
    "format": "json",
    "output": "stdout"
  },
  "api": {
    "host": "0.0.0.0",
    "port": 3000,
    "cors_origin": "*",
    "rate_limit_rpm": 1000
  },
  "docker": {
    "enabled": false,
    "image": "opencode-worker:latest",
    "network": "bridge",
    "memory_limit_mb": 2048,
    "cpu_limit": 2
  }
}
```

### Environment Variables

All configuration can be set via environment variables using the `OPENCODE_WORKER_` prefix:

```bash
# Worker settings
OPENCODE_WORKER_WORKER_ID=my-worker
OPENCODE_WORKER_WORKER_CONCURRENCY=8

# Session settings
OPENCODE_WORKER_SESSION_BASE_DIR=/var/data/sessions
OPENCODE_WORKER_SESSION_MAX_CONCURRENT_SESSIONS=20

# Governance settings
OPENCODE_WORKER_GOVERNANCE_DEFAULT_CPU=4
OPENCODE_WORKER_GOVERNANCE_DEFAULT_MEMORY_MB=4096

# WebSocket settings
OPENCODE_WORKER_WEBSOCKET_ENABLED=true
OPENCODE_WORKER_WEBSOCKET_PORT=8080

# Logging settings
OPENCODE_WORKER_LOGGING_LEVEL=debug
OPENCODE_WORKER_LOGGING_FORMAT=json

# API settings
OPENCODE_WORKER_API_HOST=0.0.0.0
OPENCODE_WORKER_API_PORT=3000
```

### Command-Line Arguments

Override config at runtime:

```bash
node dist/index.js --worker.id=cli-worker --websocket.port=9999 --logging.level=debug
```

### Configuration Programmatic

```typescript
import { ConfigLoader } from "opencode-worker";

const config = await ConfigLoader.loadConfig({
  configPath: "/path/to/config",
});

console.log(config.worker.id);
console.log(config.session.base_dir);
console.log(config.governance.default_cpu);
```

### Configuration Options

| Section | Option | Description | Default |
|---------|--------|-------------|---------|
| **worker** | `id` | Unique worker identifier | Auto-generated |
| | `concurrency` | Max concurrent jobs | 4 |
| | `cleanup_delay_ms` | Session cleanup delay | 5000 |
| **session** | `base_dir` | Session directory | `/opt/opencode/sessions` |
| | `max_concurrent_sessions` | Max active sessions | 10 |
| | `default_timeout_ms` | Job timeout | 300000 |
| **governance** | `default_cpu` | CPU cores per job | 2 |
| | `default_memory_mb` | Memory limit per job | 2048 |
| | `max_cpu` | Maximum CPU limit | 8 |
| | `max_memory_mb` | Maximum memory limit | 8192 |
| **websocket** | `enabled` | Enable WebSocket streaming | true |
| | `port` | WebSocket port | 8080 |
| **logging** | `level` | Log level | info |
| | `format` | Log format (json/pretty) | json |
| **api** | `host` | API host | 0.0.0.0 |
| | `port` | API port | 3000 |
| **docker** | `enabled` | Enable Docker mode | false |
| | `image` | Docker image | opencode-worker:latest |

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
