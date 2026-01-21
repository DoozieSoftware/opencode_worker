import { execSync, spawnSync } from "child_process";
import { setInterval, clearInterval } from "timers";
import {
  ResourceLimits,
  GovernorState,
  ExecutionResult,
} from "../types/governance.js";
import { logger } from "../observability/index.js";

const MEMORY_SAMPLE_INTERVAL_MS = 100;
const CPU_SAMPLE_INTERVAL_MS = 100;

export class ResourceGovernor {
  private state: GovernorState;
  private limits: ResourceLimits;
  private process_group_id: number | null = null;
  private abort_controller: AbortController | null = null;
  private monitoring_interval: ReturnType<typeof setInterval> | null = null;

  constructor(limits: Partial<ResourceLimits> = {}) {
    this.limits = {
      cpu: limits.cpu ?? 2,
      memory_mb: limits.memory_mb ?? 2048,
      timeout_ms: limits.timeout_ms ?? 300000,
      max_output_bytes: limits.max_output_bytes ?? 10 * 1024 * 1024,
    };

    this.state = {
      is_governed: false,
      limits: this.limits,
      start_time: 0,
      memory_samples: [],
      cpu_samples: [],
      output_bytes: 0,
      killed: false,
    };
  }

  getState(): Readonly<GovernorState> {
    return { ...this.state };
  }

  getLimits(): Readonly<ResourceLimits> {
    return { ...this.limits };
  }

  startGovernance(
    process_group_id: number,
    abort_signal?: AbortSignal
  ): void {
    this.process_group_id = process_group_id;
    this.state.start_time = Date.now();
    this.state.is_governed = true;
    this.state.killed = false;
    this.abort_controller = new AbortController();

    if (abort_signal) {
      abort_signal.addEventListener("abort", () => {
        this.abort_controller?.abort();
      });
    }

    this.startMonitoring();

    logger.info("Resource governance started", {
      process_group_id,
      limits: this.limits,
    });
  }

  private startMonitoring(): void {
    this.monitoring_interval = setInterval(async () => {
      await this.checkResources();
    }, MEMORY_SAMPLE_INTERVAL_MS);
  }

  private async checkResources(): Promise<void> {
    if (this.state.killed || !this.process_group_id) {
      return;
    }

    try {
      await this.checkMemory();
      await this.checkTimeout();
    } catch (error) {
      logger.error("Error checking resources", {
        error: String(error),
      });
    }
  }

  private async checkMemory(): Promise<void> {
    if (!this.process_group_id) return;

    try {
      const memory_kb = execSync(
        `ps -o rss= -g ${this.process_group_id}`,
        { encoding: "utf-8" }
      ).trim();

      const memory_mb = parseInt(memory_kb, 10) / 1024;
      this.state.memory_samples.push(memory_mb);

      if (memory_mb > this.limits.memory_mb) {
        this.killProcess("memory_limit_exceeded", memory_mb);
      }
    } catch (error) {
      logger.debug("Could not check memory", { error: String(error) });
    }
  }

  private async checkTimeout(): Promise<void> {
    const elapsed_ms = Date.now() - this.state.start_time;

    if (elapsed_ms > this.limits.timeout_ms) {
      this.killProcess("timeout", elapsed_ms);
    }
  }

  trackOutput(bytes: number): void {
    this.state.output_bytes += bytes;

    if (this.state.output_bytes > this.limits.max_output_bytes) {
      this.killProcess("output_limit_exceeded", this.state.output_bytes);
    }
  }

  killProcess(reason: string, value?: number): void {
    if (this.state.killed) {
      return;
    }

    this.state.killed = true;
    this.state.kill_reason = `${reason}: ${value ?? "unknown"}`;

    logger.warn("Process killed by resource governor", {
      reason: this.state.kill_reason,
      process_group_id: this.process_group_id,
    });

    this.stopMonitoring();

    if (this.process_group_id) {
      try {
        execSync(`kill -9 -${this.process_group_id}`, {
          encoding: "utf-8",
          stdio: "pipe",
        });
      } catch (error) {
        logger.debug("Error killing process group", {
          error: String(error),
        });
      }
    }

    this.abort_controller?.abort();
  }

  private stopMonitoring(): void {
    if (this.monitoring_interval) {
      clearInterval(this.monitoring_interval);
      this.monitoring_interval = null;
    }
  }

  stop(): void {
    this.stopMonitoring();
    this.state.is_governed = false;
    this.state.killed = false;
  }

  getPeakMemoryMB(): number {
    if (this.state.memory_samples.length === 0) return 0;
    return Math.max(...this.state.memory_samples);
  }

  getCPUUsage(): number {
    if (this.state.cpu_samples.length === 0) return 0;
    return this.state.cpu_samples.reduce((a, b) => a + b, 0) /
      this.state.cpu_samples.length;
  }
}

export function createGovernor(limits?: Partial<ResourceLimits>): ResourceGovernor {
  return new ResourceGovernor(limits);
}

export async function executeWithGovernance(
  command: string,
  cwd: string,
  limits: Partial<ResourceLimits>
): Promise<ExecutionResult> {
  const governor = new ResourceGovernor(limits);
  const start_time = Date.now();

  const { spawnSync } = await import("child_process");

  try {
    governor.startGovernance(process.pid);

    const result = spawnSync("bash", ["-c", command], {
      cwd,
      encoding: "utf-8",
      maxBuffer: limits.max_output_bytes ?? 10 * 1024 * 1024,
      timeout: limits.timeout_ms ?? 300000,
    });

    governor.stop();

    return {
      exit_code: result.status ?? -1,
      signal: result.signal ?? undefined,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      duration_ms: Date.now() - start_time,
      memory_peak_mb: governor.getPeakMemoryMB(),
    };
  } catch (error: any) {
    governor.stop();

    return {
      exit_code: -1,
      stderr: error.message,
      stdout: "",
      duration_ms: Date.now() - start_time,
      memory_peak_mb: governor.getPeakMemoryMB(),
    };
  }
}
