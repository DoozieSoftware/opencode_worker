# Contributing to OpenCode Worker

Thank you for your interest in contributing to OpenCode Worker! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Submitting Changes](#submitting-changes)
- [Release Process](#release-process)

## Code of Conduct

This project follows our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

### Prerequisites

- Node.js 22+
- npm or pnpm
- Git
- Docker (optional, for container testing)

### Setting Up Development Environment

```bash
# Fork the repository on GitHub

# Clone your fork
git clone https://github.com/YOUR_USERNAME/opencode_worker.git
cd opencode_worker

# Add upstream remote
git remote add upstream https://github.com/DoozieSoftware/opencode_worker.git

# Install dependencies
npm install

# Create a feature branch
git checkout -b feature/your-feature-name

# Verify the build
npm run build

# Run tests
npm test
```

### Finding Issues to Work On

- Look for issues tagged with `good first issue` or `help wanted`
- Check the [Roadmap](https://github.com/DoozieSoftware/opencode_worker/projects) for planned features
- Browse open issues and PRs to understand the codebase

## Development Workflow

### 1. Create a Feature Branch

```bash
# Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main

# Create your feature branch
git checkout -b feature/your-feature-name
```

### 2. Make Changes

Follow the [Coding Standards](#coding-standards) and implement your feature or bug fix.

### 3. Test Your Changes

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/your-test.test.ts

# Run type checking
npm run typecheck

# Run linting (if available)
npm run lint
```

### 4. Update Documentation

- Update README.md if adding new features
- Add JSDoc comments to new functions
- Update the CHANGELOG.md

### 5. Commit Your Changes

```bash
# Stage your changes
git add .

# Write a descriptive commit message
git commit -m "feat: Add new feature description

- Description of change
- Another change
- Fixes #issue-number"
```

### 6. Push and Create PR

```bash
# Push to your fork
git push origin feature/your-feature-name

# Create a Pull Request on GitHub
```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable `strict: true` in tsconfig.json
- Use explicit types rather than inference where it aids clarity

```typescript
// Good
function processJob(input: WorkerJobInput, config: WorkerConfig): Promise<JobResult> {
  // ...
}

// Avoid
function processJob(input, config) {
  // ...
}
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Variables | camelCase | `jobId`, `sessionDir` |
| Constants | SCREAMING_SNAKE_CASE | `DEFAULT_TIMEOUT` |
| Functions | camelCase | `runSession()`, `executeCommand()` |
| Classes | PascalCase | `SessionManager`, `ConfigLoader` |
| Interfaces | PascalCase | `WorkerJobInput`, `SessionContext` |
| Files | kebab-case | `session-lifecycle.ts`, `websocket-server.ts` |

### Code Style

- Use semicolons
- Use single quotes for strings
- Use async/await over raw promises
- Handle errors explicitly
- Keep functions small and focused

```typescript
// Good
async function runSessionLifecycle(
  input: WorkerJobInput,
  options: SessionOptions
): Promise<SessionResult> {
  const session = await createSession(input, options);
  await prepareSession(session, input.files);
  const result = await executeCommand(session, input.command);
  await destroySession(session);
  return result;
}

// Avoid - too many responsibilities
async function doEverything(input: WorkerJobInput) {
  // Creating, preparing, executing, cleanup all in one function
}
```

### Comments

- Use comments to explain "why", not "what"
- Document public APIs with JSDoc
- Add TODO comments for future work (format: `TODO: description - [author]`)

```typescript
/**
 * Runs a job in an isolated session with real-time streaming output.
 * 
 * @param input - The job input containing command and files
 * @param options - Session configuration options
 * @param streamingConfig - WebSocket streaming configuration
 * @returns Promise resolving to the stream result
 * 
 * @throws ConfigurationError - If configuration validation fails
 * @throws SessionError - If session creation or execution fails
 */
export async function runStreamingSession(
  input: WorkerJobInput,
  options: SessionOptions = {},
  streamingConfig: StreamingConfig = {}
): Promise<StreamResult> {
  // Implementation
}
```

### Error Handling

- Use custom error classes for specific error types
- Include contextual information in errors
- Log errors appropriately

```typescript
export class SessionError extends Error {
  constructor(
    message: string,
    public readonly sessionId: string,
    public readonly jobId: string,
    public readonly code?: number
  ) {
    super(message);
    this.name = "SessionError";
  }
}

// Usage
if (!sessionDirectory.exists) {
  throw new SessionError(
    "Session directory not found",
    session.sessionId,
    session.jobId
  );
}
```

## Testing

### Test Structure

```
tests/
├── worker.test.ts          # Core functionality tests
├── websocket.test.ts       # WebSocket tests
├── config.test.ts          # Configuration tests
└── integration/
    └── test-remote.ts      # Integration tests
```

### Writing Tests

- Use Vitest for unit tests
- Follow the AAA pattern (Arrange, Act, Assert)
- Use descriptive test names
- Test edge cases and error conditions

```typescript
describe("SessionManager", () => {
  describe("createSession", () => {
    it("should create a session with unique ID", async () => {
      // Arrange
      const manager = new SessionManager();
      const jobId = "test-job-1";

      // Act
      const session = await manager.createSession(jobId);

      // Assert
      expect(session.sessionId).toBeDefined();
      expect(session.jobId).toBe(jobId);
      expect(session.state).toBe("INIT");
    });

    it("should create session directories", async () => {
      // Test implementation
    });

    it("should track active sessions", async () => {
      // Test implementation
    });
  });
});
```

### Test Coverage

Aim for high test coverage, especially for:
- Session lifecycle management
- Configuration validation
- Security allowlist checks
- Error handling paths

## Documentation

### Types of Documentation

| Type | Location | Purpose |
|------|----------|---------|
| README.md | Root | Overview, quick start, features |
| QUICK_START.md | Root | 5-minute getting started guide |
| CONTRIBUTING.md | Root | Contribution guidelines |
| Code comments | In-file | Implementation details |
| API docs | tools/types.ts | Tool descriptions |

### Writing Documentation

- Use clear, concise language
- Include code examples
- Keep documentation up to date with code changes
- Use Markdown formatting consistently

## Submitting Changes

### Pull Request Process

1. **Ensure CI passes** - All tests and checks must pass
2. **Update CHANGELOG.md** - Add entry for your changes
3. **Update documentation** - If adding new features
4. **Review your changes** - Self-review before requesting review
5. **Request review** - Assign appropriate reviewers
6. **Address feedback** - Make requested changes
7. **Merge** - Maintainer merges after approval

### PR Title Format

Use conventional commit format:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only
- `refactor:` Code restructuring
- `test:` Adding/updating tests
- `chore:` Maintenance tasks
- `perf:` Performance improvements
- `style:` Formatting changes

Example: `feat: Add WebSocket streaming support`

### PR Description Template

```markdown
## Summary
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change)
- [ ] New feature (non-breaking change)
- [ ] Breaking change (fix or feature that causes existing functionality to change)
- [ ] Documentation update

## Testing
Describe how changes were tested

## Checklist
- [ ] My code follows the coding standards
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally
```

## Release Process

### Version Numbering

Follow Semantic Versioning (SemVer):
- `MAJOR` - Breaking changes
- `MINOR` - New features (backward compatible)
- `PATCH` - Bug fixes (backward compatible)

### Release Checklist

1. Update version in `package.json`
2. Update CHANGELOG.md with release notes
3. Create release commit
4. Create GitHub release
5. Publish to npm (if applicable)
6. Update documentation

### Changelog Format

```markdown
## [1.0.0] - 2026-01-21

### Added
- WebSocket streaming support for real-time job output
- Configuration system with env vars, config files, and CLI args
- 3 new plugin tools: worker_stream_job, worker_get_stream_url, worker_subscribe_stream

### Changed
- Improved session lifecycle management
- Enhanced security allowlist validation

### Fixed
- Fixed memory leak in WebSocket server
- Fixed race condition in session cleanup

### Security
- Added dangerous pattern detection
- Improved command validation
```

## Community

- **Discussions**: Use GitHub Discussions for questions and ideas
- **Issues**: Report bugs and request features
- **Slack**: Join our community Slack channel (link in README)

## Recognition

Contributors are recognized in:
- The CONTRIBUTORS file
- Release notes
- The project's acknowledgments

Thank you for contributing!
