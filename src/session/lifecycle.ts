import { v4 as uuidv4 } from "uuid";
import * as fs from "fs/promises";
import * as path from "path";
import {
  SessionContext,
  SessionState,
  SessionOptions,
  SessionLifecycleCallbacks,
} from "../types/session.js";
import { WorkerJobInput } from "../types/contracts.js";
import { logger } from "../observability/index.js";

const DEFAULT_BASE_DIR = "/opt/opencode";
const DEFAULT_SESSIONS_DIR = "sessions";
const DEFAULT_WORK_DIR = "work";
const DEFAULT_OUTPUT_DIR = "output";

export class SessionLifecycleManager {
  private base_dir: string;
  private sessions_dir: string;
  private callbacks: SessionLifecycleCallbacks;
  private active_sessions: Map<string, SessionContext> = new Map();

  constructor(
    base_dir: string = DEFAULT_BASE_DIR,
    callbacks: SessionLifecycleCallbacks = {}
  ) {
    this.base_dir = base_dir;
    this.sessions_dir = path.join(base_dir, DEFAULT_SESSIONS_DIR);
    this.callbacks = callbacks;
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.sessions_dir, { recursive: true });
    logger.info("Session lifecycle manager initialized", {
      sessions_dir: this.sessions_dir,
    });
  }

  async createSession(job_id: string, options: SessionOptions = {}): Promise<SessionContext> {
    const session_id = uuidv4();
    const session_dir = path.join(
      this.sessions_dir,
      `session-${session_id}`
    );
    const work_dir = path.join(
      session_dir,
      options.work_dir_name || DEFAULT_WORK_DIR
    );
    const output_dir = path.join(
      session_dir,
      options.output_dir_name || DEFAULT_OUTPUT_DIR
    );
    const config_path = path.join(session_dir, "opencode.json");

    const session: SessionContext = {
      session_id,
      job_id,
      state: "INIT",
      work_dir,
      output_dir,
      config_path,
      created_at: Date.now(),
    };

    await fs.mkdir(work_dir, { recursive: true });
    await fs.mkdir(output_dir, { recursive: true });

    this.active_sessions.set(session_id, session);
    this.transitionState(session, "INIT", "PREPARING");

    logger.info("Session created", {
      session_id,
      job_id,
      work_dir,
      output_dir,
    });

    return session;
  }

  async prepareSession(
    session: SessionContext,
    files: Record<string, string>
  ): Promise<void> {
    this.transitionState(session, "PREPARING", "PREPARING");

    for (const [filename, content] of Object.entries(files)) {
      const file_path = path.join(session.work_dir, filename);
      await fs.writeFile(file_path, content, "utf-8");
    }

    logger.info("Session prepared", {
      session_id: session.session_id,
      file_count: Object.keys(files).length,
    });
  }

  async executeCommand(
    session: SessionContext,
    command: string
  ): Promise<{ stdout: string; stderr: string; exit_code: number }> {
    this.transitionState(session, "PREPARING", "EXECUTING");
    session.started_at = Date.now();

    logger.info("Executing command in session", {
      session_id: session.session_id,
      command,
    });

    const { execSync } = await import("child_process");

    try {
      const stdout = execSync(command, {
        cwd: session.work_dir,
        encoding: "utf-8",
        timeout: 300000,
        maxBuffer: 10 * 1024 * 1024,
      });

      logger.info("Command executed successfully", {
        session_id: session.session_id,
        exit_code: 0,
      });

      return { stdout, stderr: "", exit_code: 0 };
    } catch (error: any) {
      const exit_code = error.status || -1;
      const stdout = error.stdout?.toString() || "";
      const stderr = error.stderr?.toString() || "";

      logger.error("Command execution failed", {
        session_id: session.session_id,
        exit_code,
        error: error.message,
      });

      return { stdout, stderr, exit_code };
    }
  }

  async collectArtifacts(session: SessionContext): Promise<string[]> {
    this.transitionState(session, "EXECUTING", "COLLECTING");

    const artifacts: string[] = [];

    try {
      const entries = await fs.readdir(session.output_dir, {
        recursive: true,
      });

      for (const entry of entries) {
        artifacts.push(entry);
      }

      logger.info("Artifacts collected", {
        session_id: session.session_id,
        artifact_count: artifacts.length,
      });
    } catch (error) {
      logger.warn("No artifacts found or error collecting", {
        session_id: session.session_id,
        error: String(error),
      });
    }

    return artifacts;
  }

  async destroySession(session: SessionContext): Promise<void> {
    if (session.state === "DESTROYED") {
      return;
    }

    this.transitionState(session, session.state, "DESTROYING");

    try {
      await fs.rm(session.work_dir, { recursive: true, force: true });
      await fs.rm(session.output_dir, { recursive: true, force: true });

      const session_dir = path.dirname(session.work_dir);
      await fs.rm(session_dir, { recursive: true, force: true });

      this.active_sessions.delete(session.session_id);

      logger.info("Session destroyed", {
        session_id: session.session_id,
        job_id: session.job_id,
      });
    } catch (error) {
      logger.error("Error destroying session", {
        session_id: session.session_id,
        error: String(error),
      });

      session.error = String(error);
    } finally {
      session.state = "DESTROYED";
    }
  }

  async destroySessionSafe(session: SessionContext): Promise<void> {
    try {
      await this.destroySession(session);
    } catch (error) {
      logger.error("Safe destroy failed", {
        session_id: session.session_id,
        error: String(error),
      });
      session.state = "DESTROYED";
    }
  }

  getSession(session_id: string): SessionContext | undefined {
    return this.active_sessions.get(session_id);
  }

  getSessionByJobId(job_id: string): SessionContext | undefined {
    for (const session of this.active_sessions.values()) {
      if (session.job_id === job_id) {
        return session;
      }
    }
    return undefined;
  }

  getActiveSessions(): SessionContext[] {
    return Array.from(this.active_sessions.values());
  }

  private transitionState(
    session: SessionContext,
    from: SessionState,
    to: SessionState
  ): void {
    if (session.state !== from) {
      logger.warn("State transition mismatch", {
        session_id: session.session_id,
        expected: from,
        actual: session.state,
      });
    }

    const old_state = session.state;
    session.state = to;

    logger.info("Session state transition", {
      session_id: session.session_id,
      job_id: session.job_id,
      from: old_state,
      to,
    });

    if (this.callbacks.onStateChange) {
      this.callbacks.onStateChange(session, old_state, to);
    }
  }
}

export async function runSessionLifecycle(
  input: WorkerJobInput,
  options: SessionOptions = {}
): Promise<{
  session: SessionContext;
  stdout: string;
  stderr: string;
  exit_code: number;
  duration_ms: number;
}> {
  const manager = new SessionLifecycleManager(options.base_dir);
  await manager.initialize();

  const session = await manager.createSession(input.job_id, options);

  try {
    await manager.prepareSession(session, input.files);

    const start_time = Date.now();
    const { stdout, stderr, exit_code } = await manager.executeCommand(
      session,
      input.command
    );
    const duration_ms = Date.now() - start_time;

    await manager.collectArtifacts(session);

    return {
      session,
      stdout,
      stderr,
      exit_code,
      duration_ms,
    };
  } finally {
    await manager.destroySessionSafe(session);
  }
}
