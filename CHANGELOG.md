# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.0.0] - 2024-01-21

### Added

- Initial release of OpenCode Worker
- Session lifecycle management (INIT → PREPARE → EXECUTE → COLLECT → DESTROY)
- Resource governance (CPU, memory, timeout, output limits)
- Security controls (command allowlist, dangerous pattern detection)
- Plugin integration for OpenCode
- Docker support for remote worker deployment
- SSH-based remote execution
- Structured logging and observability
- Comprehensive test suite (8 integration tests)

### Features

- **Session Isolation**: Each job runs in its own filesystem, environment, and process tree
- **Resource Limits**: Configurable CPU, memory, timeout, and output limits per session
- **Command Allowlist**: Whitelist of safe commands prevents arbitrary code execution
- **Dangerous Pattern Detection**: Blocks commands like `rm -rf /` and pipe-to-shell patterns
- **Plugin Tools**:
  - `worker_dispatch_job`: Dispatch a job to an isolated session
  - `worker_get_status`: Get status of a running job
  - `worker_collect_output`: Collect output artifacts from a job
  - `worker_cancel_job`: Cancel a running job
  - `worker_list_sessions`: List all active sessions
  - `worker_get_metrics`: Get worker performance metrics

### Docker Support

- Alpine-based Docker image
- SSH server for remote access (port 2222)
- Non-root user for security
- Docker Compose configuration for easy deployment
- Health checks for container orchestration

### Security

- Command allowlist with 50+ safe commands
- Dangerous pattern detection (rm -rf, pipe to shell, command substitution)
- Non-root execution (opencode user)
- Session-scoped filesystem isolation

### Performance

- Session prep time: ≤ 2s
- Execution startup: ≤ 1s
- Cleanup: ≤ 500ms
- Concurrent sessions: Configurable, capped

### Compatibility

- Node.js 22+
- TypeScript 5.8+
- OpenCode Plugin API v1.1.20

## Roadmap

### v1.1.0 (Planned)

- Kubernetes support
- WebSocket-based communication
- Enhanced metrics and monitoring
- Multi-worker orchestration

### v1.2.0 (Planned)

- GPU support
- Custom resource limits
- Plugin extensibility
- Web UI for monitoring

---

## Older Versions

No releases prior to v1.0.0.
