FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

FROM node:22-alpine AS runner

ENV NODE_ENV=production
ENV OPENCODE_WORKER_HOME=/opt/opencode
ENV OPENCODE_WORKER_SESSIONS=/opt/opencode/sessions

# Create non-root user for security
RUN addgroup -g 1001 -S opencode && \
    adduser -S opencode -u 1001 -G opencode && \
    mkdir -p ${OPENCODE_WORKER_HOME} && \
    mkdir -p ${OPENCODE_WORKER_SESSIONS} && \
    chown -R opencode:opencode ${OPENCODE_WORKER_HOME} && \
    chown -R opencode:opencode ${OPENCODE_WORKER_SESSIONS}

WORKDIR ${OPENCODE_WORKER_HOME}

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Create base directories
RUN mkdir -p base models worker && \
    chown -R opencode:opencode ${OPENCODE_WORKER_HOME}

# Create directories for sessions with proper permissions
RUN mkdir -p ${OPENCODE_WORKER_SESSIONS}/session-test && \
    chown -R opencode:opencode ${OPENCODE_WORKER_SESSIONS}

# Install SSH server for remote access
RUN apk add --no-cache openssh bash curl jq

# SSH configuration
RUN echo "PermitRootLogin no" >> /etc/ssh/sshd_config && \
    echo "PasswordAuthentication no" >> /etc/ssh/sshd_config && \
    echo "ChallengeResponseAuthentication no" >> /etc/ssh/sshd_config && \
    echo "AllowUsers opencode" >> /etc/ssh/sshd_config && \
    echo "Port 2222" >> /etc/ssh/sshd_config && \
    ssh-keygen -A

# Generate SSH host keys
RUN ssh-keygen -t ed25519 -f /etc/ssh/ssh_host_ed25519_key -N "" -q

# Create SSH directory for user
RUN mkdir -p /home/opencode/.ssh && \
    chown opencode:opencode /home/opencode/.ssh && \
    chmod 700 /home/opencode/.ssh

# Set permissions
RUN chown opencode:opencode /etc/ssh/ssh_host_ed25519_key && \
    chmod 600 /etc/ssh/ssh_host_ed25519_key

# Create directories for test sessions
RUN mkdir -p /opt/opencode/sessions/session-test/work /opt/opencode/sessions/session-test/output && \
    chown -R opencode:opencode /opt/opencode/sessions

USER opencode

EXPOSE 2222

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD ssh -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=3 \
    -p 2222 opencode@localhost exit 0 || exit 1

# Entrypoint
ENTRYPOINT ["/bin/bash", "-c"]
CMD ["echo 'OpenCode Worker SSH server starting...' && /usr/sbin/sshd -D -e -p 2222"]
