# OpenCode Worker - Quick Start Guide

Get up and running with OpenCode Worker in 5 minutes.

## Prerequisites

- Node.js 22+
- npm or pnpm
- Git

## Installation

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

## Quick Usage

### 1. Basic Job Dispatch

```typescript
import { OpenCodeWorkerPlugin } from "opencode-worker";

const plugin = await OpenCodeWorkerPlugin({
  client: createOpencodeClient(),
  project: { id: "my-project", name: "My Project", worktree: "/path/to/worktree", time: Date.now() },
  directory: "/path/to/project",
  worktree: "/path/to/project/.git/worktrees/branch",
  serverUrl: new URL("http://localhost:3000"),
  $: bunShell,
});

const result = await plugin.tool.worker_dispatch_job.execute({
  job_id: "job-123",
  command: "npx opencode run task.json",
  files: { "task.json": '{"task": "test"}' },
  limits: { cpu: 2, memory: "2GB", timeout: 300000 },
  config: { mode: "worker", provider: "openai", model: "gpt-4", network: "restricted", telemetry: false },
});

console.log(result);
```

### 2. Stream Job Output in Real-Time

```typescript
import { runStreamingSession } from "opencode-worker";

const result = await runStreamingSession(
  {
    job_id: "job-456",
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

### 3. Connect to WebSocket Stream

```typescript
import { WebSocket } from "ws";

const ws = new WebSocket("ws://localhost:8080");

ws.on("open", () => {
  ws.send(JSON.stringify({
    type: "subscribe",
    job_ids: ["job-456"]
  }));
});

ws.on("message", (data) => {
  const message = JSON.parse(data.toString());
  
  switch (message.type) {
    case "connected":
      console.log("Connected:", message.client_id);
      break;
    case "job_output":
      console.log("Output:", message.data.chunk);
      break;
    case "job_complete":
      console.log("Job completed:", message.data);
      break;
  }
});
```

## Configuration

### Environment Variables

```bash
# Worker settings
export OPENCODE_WORKER_WORKER_ID=my-worker
export OPENCODE_WORKER_WORKER_CONCURRENCY=8

# Session settings
export OPENCODE_WORKER_SESSION_BASE_DIR=/var/data/sessions
export OPENCODE_WORKER_SESSION_MAX_CONCURRENT_SESSIONS=20

# WebSocket settings
export OPENCODE_WORKER_WEBSOCKET_ENABLED=true
export OPENCODE_WORKER_WEBSOCKET_PORT=8080

# Logging
export OPENCODE_WORKER_LOGGING_LEVEL=debug
```

### Config File

Create `opencode-worker.json`:

```json
{
  "worker": {
    "id": "worker-01",
    "concurrency": 4
  },
  "session": {
    "base_dir": "/opt/opencode/sessions",
    "max_concurrent_sessions": 10
  },
  "websocket": {
    "enabled": true,
    "port": 8080
  },
  "logging": {
    "level": "info",
    "format": "json"
  }
}
```

### CLI Arguments

```bash
node dist/index.js --worker.id=cli-worker --websocket.port=9999 --logging.level=debug
```

## Docker Quick Start

```bash
# Build and run
docker build -t opencode-worker:latest .
docker run -d --name opencode-worker -p 2222:2222 opencode-worker:latest

# SSH into the worker
ssh -i ~/.ssh/id_ed25519 -p 2222 opencode@localhost
```

Or with docker-compose:

```bash
docker-compose up -d
```

## Plugin Tools

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
| `worker_subscribe_stream` | Get subscription info for streaming |

## Security

### Allowed Commands

The worker only allows whitelisted commands:

```bash
npx, node, npm, bun, git, cat, ls, mkdir, rm, cp, mv, 
chmod, bash, sh, grep, sed, awk, curl, wget, tar, echo, 
python, python3, make, cargo, go, and more...
```

### Dangerous Patterns Blocked

- `rm -rf /` and similar
- Pipe to shell (`| sh`)
- Command substitution (`$(...)`, backticks)
- Unauthorized chmod operations

## Testing

```bash
# Run all tests
npm test

# Run specific tests
npm test -- tests/websocket.test.ts
npm test -- tests/config.test.ts

# Type checking
npm run typecheck

# Build
npm run build
```

## Next Steps

1. **Read the full documentation**: [README.md](README.md)
2. **Explore the examples**: Check the `samples/` directory
3. **Configure for production**: Set up environment variables and config files
4. **Deploy to Docker**: Use the provided Dockerfile and docker-compose.yml
5. **Contribute**: See [CONTRIBUTING.md](CONTRIBUTING.md)

## Troubleshooting

### Worker won't start

```bash
# Check Node.js version
node --version  # Must be 22+

# Check port availability
lsof -i :8080
lsof -i :3000

# View logs
export OPENCODE_WORKER_LOGGING_LEVEL=debug
node dist/index.js
```

### Jobs failing

```bash
# Check command allowlist
# Ensure your command uses only whitelisted commands

# Check resource limits
# Verify cpu, memory, and timeout settings

# Enable debug logging
export OPENCODE_WORKER_LOGGING_LEVEL=debug
```

### WebSocket not connecting

```bash
# Verify WebSocket is enabled
export OPENCODE_WORKER_WEBSOCKET_ENABLED=true

# Check port
export OPENCODE_WORKER_WEBSOCKET_PORT=8080

# Firewall settings
# Ensure port 8080 is accessible
```

## Support

- **Issues**: https://github.com/DoozieSoftware/opencode_worker/issues
- **Documentation**: [README.md](README.md)
- **Contributing**: [CONTRIBUTING.md](CONTRIBUTING.md)
