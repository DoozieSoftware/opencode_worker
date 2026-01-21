#!/bin/bash
set -e

echo "🐳 OpenCode Worker - Docker Setup Script"
echo "=========================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}ℹ️  $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check for Docker
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install Docker first."
    exit 1
fi

log_info "Docker found: $(docker --version)"

# Build the Docker image
echo ""
echo "📦 Building Docker image..."
echo "---------------------------"
docker build -t opencode-worker:latest .

log_info "Docker image built successfully!"

# Create SSH key if it doesn't exist
SSH_DIR="$HOME/.ssh"
KEY_FILE="$SSH_DIR/id_ed25519_opencode_worker"

if [ ! -f "$KEY_FILE" ]; then
    echo ""
    echo "🔐 Generating SSH key for worker access..."
    log_info "Creating SSH key at: $KEY_FILE"
    ssh-keygen -t ed25519 -f "$KEY_FILE" -N "" -q
    chmod 600 "$KEY_FILE"
    chmod 644 "${KEY_FILE}.pub"
    log_info "SSH key generated!"
else
    log_info "SSH key already exists at: $KEY_FILE"
fi

# Start the Docker container
echo ""
echo "🚀 Starting OpenCode Worker container..."
echo "----------------------------------------"
docker-compose up -d

log_info "Container started!"

# Wait for SSH to be ready
echo ""
echo "⏳ Waiting for SSH server to be ready..."
for i in {1..30}; do
    if ssh -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=2 \
           -p 2222 opencode@localhost "echo 'SSH ready'" 2>/dev/null; then
        log_info "SSH server is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        log_error "SSH server did not become ready in time"
        exit 1
    fi
    sleep 1
done

# Get the public key and add it to authorized_keys
echo ""
echo "🔑 Configuring SSH access..."
log_info "Adding public key to container's authorized_keys..."
docker exec opencode-worker-test bash -c "mkdir -p /home/opencode/.ssh && echo '$(cat "${KEY_FILE}.pub")' >> /home/opencode/.ssh/authorized_keys && chown opencode:opencode /home/opencode/.ssh/authorized_keys && chmod 600 /home/opencode/.ssh/authorized_keys"

log_info "SSH access configured!"

# Display connection information
echo ""
echo "=========================================="
echo "🎉 OpenCode Worker is ready!"
echo "=========================================="
echo ""
echo "📋 Connection Information:"
echo "   Host:     localhost"
echo "   Port:     2222"
echo "   User:     opencode"
echo "   SSH Key:  $KEY_FILE"
echo ""
echo "🔗 Quick Test:"
echo "   ssh -i $KEY_FILE -p 2222 opencode@localhost"
echo ""
echo "📝 Next Steps:"
echo "   1. Test SSH connection: scripts/test-ssh.sh"
echo "   2. Run integration tests: scripts/test-remote.sh"
echo ""
echo "🐳 Container Management:"
echo "   Stop:   docker-compose down"
echo "   Logs:   docker logs opencode-worker-test"
echo "   Restart: docker-compose restart"
echo ""

# Show container status
echo "📊 Container Status:"
docker ps --filter "name=opencode-worker" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
