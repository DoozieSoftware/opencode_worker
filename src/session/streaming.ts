import { spawn } from "child_process";
import * as fs from "fs/promises";
import * as path from "path";
import { SessionContext, SessionOptions } from "../types/session.js";
import { WorkerJobInput } from "../types/contracts.js";
import { logger } from "../observability/index.js";
import { getStreamingServer } from "../websocket/index.js";

export interface StreamingConfig {
  chunk_size?: number;
  heartbeat_interval?: number;
  capture_stdout?: boolean;
  capture_stderr?: boolean;
}

export interface StreamResult {
  session: SessionContext;
  stdout_chunks: string[];
  stderr_chunks: string[];
  exit_code: number;
  duration_ms: number;
}

export async function runStreamingSession(
  input: WorkerJobInput,
  options: SessionOptions = {},
  streaming_config: StreamingConfig = {}
): Promise<StreamResult> {
  const chunk_size = streaming_config.chunk_size || 1024;
  const capture_stdout = streaming_config.capture_stdout !== false;
  const capture_stderr = streaming_config.capture_stderr !== false;

  const base_dir = options.base_dir || "/opt/opencode";
  const sessions_dir = path.join(base_dir, "sessions");
  const session_id = `stream_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const session_dir = path.join(sessions_dir, `session-${session_id}`);
  const work_dir = path.join(session_dir, "work");
  const output_dir = path.join(session_dir, "output");

  await fs.mkdir(work_dir, { recursive: true });
  await fs.mkdir(output_dir, { recursive: true });

  const session: SessionContext = {
    session_id,
    job_id: input.job_id,
    state: "INIT",
    work_dir,
    output_dir,
    config_path: path.join(session_dir, "opencode.json"),
    created_at: Date.now(),
  };

  logger.info("Starting streaming session", {
    session_id,
    job_id: input.job_id,
  });

  try {
    for (const [filename, content] of Object.entries(input.files || {})) {
      const file_path = path.join(work_dir, filename);
      await fs.writeFile(file_path, content, "utf-8");
    }

    session.state = "EXECUTING";
    session.started_at = Date.now();

    await broadcastJobStatus(session.job_id, "job_start", {
      session_id: session.session_id,
      command: input.command,
    });

    const start_time = Date.now();
    const result = await executeStreamingCommand(
      session,
      input.command,
      { capture_stdout, capture_stderr, chunk_size }
    );
    const duration_ms = Date.now() - start_time;

    await broadcastJobComplete(session.job_id, {
      session_id: session.session_id,
      exit_code: result.exit_code,
      stdout_length: result.stdout_chunks.length,
      stderr_length: result.stderr_chunks.length,
      duration_ms,
    });

    await cleanupSession(session);

    return {
      session,
      stdout_chunks: result.stdout_chunks,
      stderr_chunks: result.stderr_chunks,
      exit_code: result.exit_code,
      duration_ms,
    };
  } catch (error) {
    await broadcastJobError(session.job_id, {
      session_id: session.session_id,
      error: String(error),
    });

    await cleanupSession(session);

    throw error;
  }
}

async function executeStreamingCommand(
  session: SessionContext,
  command: string,
  config: { capture_stdout: boolean; capture_stderr: boolean; chunk_size: number }
): Promise<{ stdout_chunks: string[]; stderr_chunks: string[]; exit_code: number }> {
  return new Promise((resolve, reject) => {
    const stdout_chunks: string[] = [];
    const stderr_chunks: string[] = [];
    let stdout_buffer = "";
    let stderr_buffer = "";

    const child = spawn("bash", ["-c", command], {
      cwd: session.work_dir,
      env: { ...process.env, HOME: session.work_dir },
    });

    if (config.capture_stdout && child.stdout) {
      child.stdout.on("data", (data: Buffer) => {
        const chunk = data.toString("utf-8");
        stdout_buffer += chunk;

        if (stdout_buffer.length >= config.chunk_size) {
          stdout_chunks.push(stdout_buffer);
          broadcastJobOutput(session.job_id, stdout_buffer, "stdout");
          stdout_buffer = "";
        }
      });
    }

    if (config.capture_stderr && child.stderr) {
      child.stderr.on("data", (data: Buffer) => {
        const chunk = data.toString("utf-8");
        stderr_buffer += chunk;

        if (stderr_buffer.length >= config.chunk_size) {
          stderr_chunks.push(stderr_buffer);
          broadcastJobOutput(session.job_id, stderr_buffer, "stderr");
          stderr_buffer = "";
        }
      });
    }

    child.on("error", async (error) => {
      await flushBuffers();
      reject(error);
    });

    child.on("close", async (code: number | null) => {
      await flushBuffers();
      resolve({
        stdout_chunks,
        stderr_chunks,
        exit_code: code ?? -1,
      });
    });

    child.on("spawn", () => {
      logger.info("Command spawned", {
        session_id: session.session_id,
        pid: child.pid,
      });
    });

    async function flushBuffers() {
      if (stdout_buffer.length > 0) {
        stdout_chunks.push(stdout_buffer);
        broadcastJobOutput(session.job_id, stdout_buffer, "stdout");
      }
      if (stderr_buffer.length > 0) {
        stderr_chunks.push(stderr_buffer);
        broadcastJobOutput(session.job_id, stderr_buffer, "stderr");
      }
    }
  });
}

async function broadcastJobStatus(
  job_id: string,
  status: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const server = await getStreamingServer();
    server.broadcastToJobSubscribers(job_id, {
      type: "job_status",
      data: { status, ...data },
    });
  } catch {
    // Streaming server not available, ignore
  }
}

async function broadcastJobOutput(
  job_id: string,
  chunk: string,
  stream: string
): Promise<void> {
  try {
    const server = await getStreamingServer();
    server.broadcastToJobSubscribers(job_id, {
      type: "job_output",
      data: { chunk, stream },
    });
  } catch {
    // Streaming server not available, ignore
  }
}

async function broadcastJobComplete(
  job_id: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const server = await getStreamingServer();
    server.broadcastToJobSubscribers(job_id, {
      type: "job_complete",
      data,
    });
  } catch {
    // Streaming server not available, ignore
  }
}

async function broadcastJobError(
  job_id: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const server = await getStreamingServer();
    server.broadcastToJobSubscribers(job_id, {
      type: "job_error",
      data,
    });
  } catch {
    // Streaming server not available, ignore
  }
}

async function cleanupSession(session: SessionContext): Promise<void> {
  try {
    await fs.rm(session.work_dir, { recursive: true, force: true });
    await fs.rm(session.output_dir, { recursive: true, force: true });

    const session_dir = path.dirname(session.work_dir);
    await fs.rm(session_dir, { recursive: true, force: true });

    session.state = "DESTROYED";
  } catch (error) {
    logger.error("Error cleaning up session", {
      session_id: session.session_id,
      error: String(error),
    });
  }
}
