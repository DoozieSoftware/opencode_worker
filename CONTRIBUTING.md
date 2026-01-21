# Contributing to OpenCode Worker

Thank you for your interest in contributing to OpenCode Worker! This document provides guidelines and instructions for contributing.

## Code of Conduct

This project follows our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

### Prerequisites

- Node.js 22+
- npm or pnpm
- Git

### Setting Up Your Development Environment

1. **Fork the repository**

   Click the "Fork" button at the top right of the repository page.

2. **Clone your fork**

   ```bash
   git clone https://github.com/YOUR_USERNAME/opencode_worker.git
   cd opencode_worker
   ```

3. **Add upstream remote**

   ```bash
   git remote add upstream https://github.com/DoozieSoftware/opencode_worker.git
   ```

4. **Install dependencies**

   ```bash
   npm install
   ```

5. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### 1. Make Changes

Make your changes to the codebase. Follow the existing code style and conventions.

### 2. Run Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm test -- --run

# Run integration tests
node --experimental-strip-types test-remote.ts
```

### 3. Type Checking

```bash
npm run typecheck
```

### 4. Build

```bash
npm run build
```

### 5. Commit Your Changes

```bash
git add .
git commit -m "feat: add your feature description"
```

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Maintenance tasks

### 6. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 7. Create a Pull Request

1. Go to the original repository
2. Click "New Pull Request"
3. Select your branch and fill in the template
4. Submit the pull request

## Coding Standards

### TypeScript

- Use TypeScript strict mode
- Prefer interfaces over types for object shapes
- Use explicit return types for exported functions
- Avoid `any` type - use `unknown` instead

### Code Style

- Use ESLint and Prettier (configured in the project)
- Run `npm run lint` before committing
- Keep functions small and focused
- Write descriptive variable and function names

### Testing

- Write tests for new features
- Maintain test coverage
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

### Documentation

- Update README for new features
- Add JSDoc comments for public APIs
- Update CHANGELOG.md

## Project Structure

```
opencode_worker/
├── src/
│   ├── types/           # TypeScript type definitions
│   ├── session/         # Session lifecycle management
│   ├── tools/           # Plugin tool definitions
│   ├── governance/      # Resource limits and enforcement
│   ├── security/        # Security controls
│   └── observability/   # Logging and metrics
├── tests/               # Test files
├── scripts/             # Utility scripts
├── Dockerfile           # Docker image definition
├── docker-compose.yml   # Docker Compose configuration
└── package.json         # Project metadata
```

## Docker Development

### Building the Docker Image

```bash
docker build -t opencode-worker:latest .
```

### Running with Docker Compose

```bash
docker-compose up -d
```

### Testing SSH Connection

```bash
./scripts/test-ssh.sh
```

## Reporting Issues

### Bug Reports

When reporting bugs, include:

1. Clear description of the issue
2. Steps to reproduce
3. Expected behavior
4. Actual behavior
5. Screenshots or error messages
6. Environment details (OS, Node.js version, etc.)

### Feature Requests

When requesting features, include:

1. Clear description of the feature
2. Use case and motivation
3. Suggested implementation (optional)
4. Alternatives considered (optional)

## Questions?

If you have questions, feel free to open an issue with the "question" label.

---

Thank you for contributing to OpenCode Worker!
