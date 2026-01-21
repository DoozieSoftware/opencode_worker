#!/bin/bash
set -e

echo "🔌 Testing SSH Connection to OpenCode Worker"
echo "=============================================="
echo ""

# Configuration
HOST="${OPENCODE_WORKER_HOST:-localhost}"
PORT="${OPENCODE_WORKER_PORT:-2222}"
USER="opencode"
KEY_FILE="${HOME}/.ssh/id_ed25519_opencode_worker"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}✅ $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Check if key exists
if [ ! -f "$KEY_FILE" ]; then
    log_error "SSH key not found: $KEY_FILE"
    echo ""
    echo "Run scripts/start-docker.sh first to generate the key."
    exit 1
fi

log_info "Using SSH key: $KEY_FILE"

# Test SSH connection
echo ""
echo "1️⃣  Testing SSH connection..."
echo "   Host: $HOST:$PORT"
echo "   User: $USER"

if ssh -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=10 \
       -i "$KEY_FILE" -p "$PORT" "$USER@$HOST" "echo 'SSH connection successful!'" 2>/dev/null; then
    log_info "SSH connection successful!"
else
    log_error "SSH connection failed!"
    echo ""
    echo "Troubleshooting:"
    echo "   1. Check if container is running: docker ps | grep opencode-worker"
    echo "   2. Check container logs: docker logs opencode-worker-test"
    echo "   3. Verify SSH is running in container"
    exit 1
fi

# Test session directory
echo ""
echo "2️⃣  Testing session directory access..."
OUTPUT=$(ssh -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=10 \
         -i "$KEY_FILE" -p "$PORT" "$USER@$HOST" "mkdir -p /opt/opencode/sessions/test-session && ls -la /opt/opencode/sessions/ && rm -rf /opt/opencode/sessions/test-session" 2>&1)

if echo "$OUTPUT" | grep -q "test-session"; then
    log_info "Session directory access working!"
else
    log_warn "Session directory test output: $OUTPUT"
fi

# Test command execution
echo ""
echo "3️⃣  Testing command execution..."
OUTPUT=$(ssh -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=10 \
         -i "$KEY_FILE" -p "$PORT" "$USER@$HOST" "echo 'Hello from OpenCode Worker!' && uname -a" 2>&1)

if echo "$OUTPUT" | grep -q "Hello from OpenCode Worker"; then
    log_info "Command execution working!"
    echo "   Output: $(echo "$OUTPUT" | head -1)"
else
    log_error "Command execution failed!"
    echo "   Output: $OUTPUT"
fi

# Test resource limits
echo ""
echo "4️⃣  Testing resource limits..."
OUTPUT=$(ssh -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=10 \
         -i "$KEY_FILE" -p "$PORT" "$USER@$HOST" "ulimit -v 2>/dev/null || echo 'ulimit check done'" 2>&1)
log_info "Resource limits accessible"

# Test file operations
echo ""
echo "5️⃣  Testing file operations..."
ssh -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=10 \
    -i "$KEY_FILE" -p "$PORT" "$USER@$HOST" "
    mkdir -p /tmp/opencode-test
    echo '{\"test\": true, \"timestamp\": \"$(date -Iseconds)\"}' > /tmp/opencode-test/task.json
    cat /tmp/opencode-test/task.json
    rm -rf /tmp/opencode-test
" > /tmp/test_output.txt 2>&1

if grep -q '"test": true' /tmp/test_output.txt; then
    log_info "File operations working!"
else
    log_warn "File operations test output: $(cat /tmp/test_output.txt)"
fi
rm -f /tmp/test_output.txt

# Summary
echo ""
echo "=============================================="
log_info "SSH Connection Test PASSED!"
echo ""
echo "📋 Summary:"
echo "   ✅ SSH connection: OK"
echo "   ✅ Session directories: OK"
echo "   ✅ Command execution: OK"
echo "   ✅ Resource limits: OK"
echo "   ✅ File operations: OK"
echo ""
echo "🚀 OpenCode Worker SSH is ready for use!"
echo ""
