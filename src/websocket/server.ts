import { WebSocket, WebSocketServer } from "ws";
import { logger } from "../observability/index.js";

export interface StreamMessage {
  type: "job_status" | "job_output" | "job_complete" | "job_error" | "heartbeat";
  job_id: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface WebSocketClient {
  id: string;
  ws: WebSocket;
  subscribed_jobs: Set<string>;
  connected_at: number;
}

export class WebSocketStreamingServer {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocketClient> = new Map();
  private port: number;
  private heartbeat_interval: NodeJS.Timeout | null = null;

  constructor(port: number = 8080) {
    this.port = port;
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.wss = new WebSocketServer({ port: this.port }, () => {
        logger.info("WebSocket streaming server started", { port: this.port });
        this.startHeartbeat();
        resolve();
      });

      this.wss.on("error", (error) => {
        logger.error("WebSocket server error", { error: error.message });
        reject(error);
      });

      this.wss.on("connection", (ws: WebSocket) => {
        this.handleConnection(ws);
      });
    });
  }

  private handleConnection(ws: WebSocket): void {
    const client_id = this.generateClientId();
    const client: WebSocketClient = {
      id: client_id,
      ws,
      subscribed_jobs: new Set(),
      connected_at: Date.now(),
    };

    this.clients.set(client_id, client);
    logger.info("WebSocket client connected", { client_id });

    ws.on("message", (data: Buffer) => {
      this.handleMessage(client_id, data.toString());
    });

    ws.on("close", () => {
      this.handleDisconnect(client_id);
    });

    ws.on("error", (error) => {
      logger.error("WebSocket client error", { client_id, error: error.message });
    });

    ws.send(
      JSON.stringify({
        type: "connected",
        client_id,
        timestamp: Date.now(),
      })
    );
  }

  private handleMessage(client_id: string, message: string): void {
    try {
      const parsed = JSON.parse(message);
      const client = this.clients.get(client_id);

      if (!client) {
        logger.warn("Message from unknown client", { client_id });
        return;
      }

      switch (parsed.type) {
        case "subscribe":
          if (parsed.job_ids && Array.isArray(parsed.job_ids)) {
            parsed.job_ids.forEach((job_id: string) => {
              client.subscribed_jobs.add(job_id);
            });
            logger.info("Client subscribed to jobs", {
              client_id,
              job_ids: parsed.job_ids,
            });
          }
          break;

        case "unsubscribe":
          if (parsed.job_ids && Array.isArray(parsed.job_ids)) {
            parsed.job_ids.forEach((job_id: string) => {
              client.subscribed_jobs.delete(job_id);
            });
            logger.info("Client unsubscribed from jobs", {
              client_id,
              job_ids: parsed.job_ids,
            });
          }
          break;

        case "ping":
          client.ws.send(
            JSON.stringify({
              type: "pong",
              timestamp: Date.now(),
            })
          );
          break;

        default:
          logger.warn("Unknown message type", { client_id, type: parsed.type });
      }
    } catch (error) {
      logger.error("Error parsing WebSocket message", {
        client_id,
        error: String(error),
      });
    }
  }

  private handleDisconnect(client_id: string): void {
    this.clients.delete(client_id);
    logger.info("WebSocket client disconnected", { client_id });
  }

  private startHeartbeat(): void {
    this.heartbeat_interval = setInterval(() => {
      this.broadcastHeartbeat();
    }, 30000);
  }

  private broadcastHeartbeat(): void {
    const heartbeat: StreamMessage = {
      type: "heartbeat",
      job_id: "system",
      timestamp: Date.now(),
      data: {},
    };

    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(heartbeat));
      }
    });
  }

  broadcastToJobSubscribers(job_id: string, message: Omit<StreamMessage, "job_id" | "timestamp">): void {
    const fullMessage: StreamMessage = {
      ...message,
      job_id,
      timestamp: Date.now(),
    };

    this.clients.forEach((client) => {
      if (
        client.ws.readyState === WebSocket.OPEN &&
        client.subscribed_jobs.has(job_id)
      ) {
        client.ws.send(JSON.stringify(fullMessage));
      }
    });
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  getConnectedClientsCount(): number {
    return this.clients.size;
  }

  isRunning(): boolean {
    return this.wss !== null;
  }

  async stop(): Promise<void> {
    if (this.heartbeat_interval) {
      clearInterval(this.heartbeat_interval);
    }

    if (this.wss) {
      this.clients.forEach((client) => {
        client.ws.close();
      });
      this.clients.clear();

      return new Promise((resolve) => {
        this.wss!.close(() => {
          this.wss = null;
          logger.info("WebSocket streaming server stopped");
          resolve();
        });
      });
    }
  }
}

let streaming_server: WebSocketStreamingServer | null = null;

export async function getStreamingServer(
  port: number = 8080
): Promise<WebSocketStreamingServer> {
  if (!streaming_server) {
    streaming_server = new WebSocketStreamingServer(port);
    await streaming_server.start();
  }
  return streaming_server;
}

export function hasStreamingServer(): boolean {
  return streaming_server !== null && streaming_server.isRunning();
}
