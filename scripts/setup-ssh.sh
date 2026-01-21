#!/bin/bash
set -e

echo "🔐 OpenCode Worker SSH Setup"
echo "============================"

# Generate SSH key pair for the worker
SSH_DIR="/home/opencode/.ssh"
KEY_FILE="${SSH_DIR}/id_ed25519"

if [ ! -f "$KEY_FILE" ]; then
    echo "📝 Generating SSH key pair..."
    ssh-keygen -t ed25519 -f "$KEY_FILE" -N "" -q
    chown opencode:opencode "$KEY_FILE" "${KEY_FILE}.pub"
    chmod 600 "$KEY_FILE"
    chmod 644 "${KEY_FILE}.pub"
    echo "✅ SSH key generated: $KEY_FILE"
else
    echo "ℹ️  SSH key already exists: $KEY_FILE"
fi

# Add public key to authorized_keys
AUTHORIZED_KEYS="${SSH_DIR}/authorized_keys"
if [ ! -f "$AUTHORIZED_KEYS" ] || ! grep -qF "$(cat ${KEY_FILE}.pub)" "$AUTHORIZED_KEYS" 2>/dev/null; then
    echo "🔑 Adding public key to authorized_keys..."
    cat "${KEY_FILE}.pub" >> "$AUTHORIZED_KEYS"
    chown opencode:opencode "$AUTHORIZED_KEYS"
    chmod 600 "$AUTHORIZED_KEYS"
    echo "✅ Public key added to authorized_keys"
else
    echo "ℹ️  Public key already in authorized_keys"
fi

# Display public key for client connection
echo ""
echo "📋 Public Key (share with OpenCode Master):"
echo "-------------------------------------------"
cat "${KEY_FILE}.pub"
echo ""
echo "-------------------------------------------"

# Display connection info
echo ""
echo "🚀 Connection Information:"
echo "   Host: localhost (or container IP)"
echo "   Port: 2222"
echo "   User: opencode"
echo "   Key:  $KEY_FILE"
echo ""
echo "✅ SSH setup complete!"
