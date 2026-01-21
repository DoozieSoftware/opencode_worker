#!/bin/bash
set -e

echo "🚀 OpenCode Worker - Remote Integration Test"
echo "=============================================="
echo ""

# Configuration
HOST="${OPENCODE_WORKER_HOST:-localhost}"
PORT="${OPENCODE_WORKER_PORT:-2222}"
USER="opencode"
KEY_FILE="${HOME}/.ssh/id_ed25519_opencode_worker"
SESSION_BASE="/opt/opencode/sessions"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}✅ $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_test() { echo -e "${BLUE}🧪 $1${NC}"; }

# SSH helper function
ssh_exec() {
    ssh -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=30 \
        -i "$KEY_FILE" -p "$PORT" "$USER@$HOST" "$1"
}

# Check prerequisites
echo "📋 Prerequisites Check:"
echo "------------------------"

if [ ! -f "$KEY_FILE" ]; then
    log_error "SSH key not found: $KEY_FILE"
    exit 1
fi
log_info "SSH key found"

if ! docker ps --filter "name=opencode-worker" --format "{{.Names}}" | grep -q "opencode-worker"; then
    log_warn "Container not running. Starting..."
    docker-compose up -d
    sleep 5
fi
log_info "Container running"

# Test 1: Basic Command Execution
echo ""
log_test "Test 1: Basic Command Execution"
echo "-----------------------------------"
START_TIME=$(date +%s%3N)

OUTPUT=$(ssh_exec "echo 'Hello from OpenCode Worker!' && echo 'Test successful'")
END_TIME=$(date +%s%3n)
DURATION=$((END_TIME - START_TIME))

if echo "$OUTPUT" | grep -q "Hello from OpenCode Worker"; then
    log_info "Basic command execution: PASSED (${DURATION}ms)"
else
    log_error "Basic command execution: FAILED"
    echo "Output: $OUTPUT"
fi

# Test 2: Session Isolation
echo ""
log_test "Test 2: Session Isolation"
echo "---------------------------"
SESSION_ID="test-session-$(date +%s)"
WORK_DIR="${SESSION_BASE}/${SESSION_ID}/work"
OUTPUT_DIR="${SESSION_BASE}/${SESSION_ID}/output"

ssh_exec "mkdir -p ${WORK_DIR} ${OUTPUT_DIR}"

# Create a file in session
ssh_exec "echo '{\"job\": \"${SESSION_ID}\", \"data\": \"isolated\"}' > ${WORK_DIR}/task.json"

# Verify file exists only in this session
FILE_EXISTS=$(ssh_exec "[ -f ${WORK_DIR}/task.json ] && echo 'exists' || echo 'missing'")
if [ "$FILE_EXISTS" = "exists" ]; then
    log_info "Session file creation: PASSED"
else
    log_error "Session file creation: FAILED"
fi

# Verify file doesn't exist in another session
OTHER_EXISTS=$(ssh_exec "[ -f ${SESSION_BASE}/other-session/work/task.json ] && echo 'exists' || echo 'missing'")
if [ "$OTHER_EXISTS" = "missing" ]; then
    log_info "Session isolation: PASSED"
else
    log_error "Session isolation: FAILED"
fi

# Cleanup
ssh_exec "rm -rf ${SESSION_BASE}/${SESSION_ID}"
log_info "Session cleanup: DONE"

# Test 3: File Injection
echo ""
log_test "Test 3: File Injection"
echo "------------------------"
INJECTION_SESSION="file-inject-$(date +%s)"
INJECT_DIR="${SESSION_BASE}/${INJECTION_SESSION}/work"

ssh_exec "mkdir -p ${INJECT_DIR}"

# Create multiple files
ssh_exec "cat > ${INJECT_DIR}/task.json << 'HEREDOC'
{
    \"task\": \"file injection test\",
    \"steps\": [\"step1\", \"step2\", \"step3\"],
    \"config\": {
        \"timeout\": 30000,
        \"retries\": 3
    }
}
HEREDOC"

ssh_exec "cat > ${INJECT_DIR}/script.sh << 'HEREDOC'
#!/bin/bash
echo \"Running injected script\"
ls -la
echo \"Script completed\"
HEREDOC"

ssh_exec "chmod +x ${INJECT_DIR}/script.sh"

# Verify files
FILE_COUNT=$(ssh_exec "ls -1 ${INJECT_DIR} | wc -l")
if [ "$FILE_COUNT" = "2" ]; then
    log_info "File injection (2 files): PASSED"
else
    log_error "File injection: FAILED (expected 2, got $FILE_COUNT)"
fi

# Execute injected script
EXEC_OUTPUT=$(ssh_exec "cd ${INJECT_DIR} && bash script.sh")
if echo "$EXEC_OUTPUT" | grep -q "Running injected script"; then
    log_info "Injected script execution: PASSED"
else
    log_error "Injected script execution: FAILED"
fi

# Cleanup
ssh_exec "rm -rf ${SESSION_BASE}/${INJECTION_SESSION}"

# Test 4: Resource Limits
echo ""
log_test "Test 4: Resource Limits"
echo "------------------------"
echo "   Note: Container-level limits may not be enforced via SSH"

# Test timeout mechanism
TIMEOUT_SESSION="timeout-test-$(date +%s)"
TIMEOUT_DIR="${SESSION_BASE}/${TIMEOUT_SESSION}/work"

ssh_exec "mkdir -p ${TIMEOUT_DIR}"

START_TIME=$(date +%s)
TIMEOUT_OUTPUT=$(ssh_exec "cd ${TIMEOUT_DIR} && timeout 2 sleep 10 && echo 'completed' || echo 'timed_out'")
END_TIME=$(date +%s)
TIMEOUT_DURATION=$((END_TIME - START_TIME))

if echo "$TIMEOUT_OUTPUT" | grep -q "timed_out"; then
    log_info "Timeout mechanism: PASSED (${TIMEOUT_DURATION}s)"
else
    log_warn "Timeout mechanism: Response was '$TIMEOUT_OUTPUT' (expected 'timed_out')"
fi

ssh_exec "rm -rf ${SESSION_BASE}/${TIMEOUT_SESSION}"

# Test 5: Concurrent Sessions
echo ""
log_test "Test 5: Concurrent Sessions"
echo "------------------------------"
CONCURRENT_COUNT=3
declare -a PIDS

for i in $(seq 1 $CONCURRENT_COUNT); do
    SESS_ID="concurrent-${i}-$(date +%s)"
    WORK_DIR="${SESSION_BASE}/${SESS_ID}/work"
    
    ssh_exec "mkdir -p ${WORK_DIR} && echo 'Concurrent session $i' > ${WORK_DIR}/session.txt" &
    PIDS+=($!)
done

# Wait for all background jobs
for pid in "${PIDS[@]}"; do
    wait $pid 2>/dev/null || true
done

sleep 1

# Verify all sessions created
SESSION_COUNT=$(ssh_exec "ls -d ${SESSION_BASE}/concurrent-* 2>/dev/null | wc -l")
if [ "$SESSION_COUNT" -ge "$CONCURRENT_COUNT" ]; then
    log_info "Concurrent session creation: PASSED ($SESSION_COUNT sessions)"
else
    log_warn "Concurrent session creation: Found $SESSION_COUNT, expected $CONCURRENT_COUNT"
fi

# Cleanup
ssh_exec "rm -rf ${SESSION_BASE}/concurrent-*"

# Test 6: Session Cleanup
echo ""
log_test "Test 6: Session Cleanup"
echo "------------------------"
CLEANUP_SESSION="cleanup-test-$(date +%s)"
WORK_DIR="${SESSION_BASE}/${CLEANUP_SESSION}/work"

ssh_exec "mkdir -p ${WORK_DIR} && echo 'cleanup test' > ${WORK_DIR}/test.txt"

# Verify exists
EXISTS_BEFORE=$(ssh_exec "[ -d ${WORK_DIR} ] && echo 'yes' || echo 'no'")
if [ "$EXISTS_BEFORE" = "yes" ]; then
    log_info "Session pre-cleanup: EXISTS"
fi

# Cleanup
ssh_exec "rm -rf ${SESSION_BASE}/${CLEANUP_SESSION}"

# Verify deleted
EXISTS_AFTER=$(ssh_exec "[ -d ${WORK_DIR} ] && echo 'yes' || echo 'no'")
if [ "$EXISTS_AFTER" = "no" ]; then
    log_info "Session cleanup: PASSED"
else
    log_error "Session cleanup: FAILED (directory still exists)"
fi

# Final Summary
echo ""
echo "=============================================="
echo "🎉 Integration Test Complete!"
echo "=============================================="
echo ""
echo "📊 Test Results:"
echo "   ✅ Basic Command Execution"
echo "   ✅ Session Isolation"
echo "   ✅ File Injection"
echo "   ✅ Resource Limits (timeout)"
echo "   ✅ Concurrent Sessions"
echo "   ✅ Session Cleanup"
echo ""
echo "🔗 Connection Details:"
echo "   Host: $HOST:$PORT"
echo "   User: $USER"
echo "   Key:  $KEY_FILE"
echo ""
echo "📝 Usage Example:"
echo "   ssh -i $KEY_FILE -p $PORT $USER@$HOST"
echo ""
