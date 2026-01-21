export interface WorkerJobInput {
  job_id: string;
  command: string;
  files: Record<string, string>;
  limits: JobLimits;
  config: SessionConfig;
}

export interface WorkerJobOutput {
  job_id: string;
  status: "finished" | "failed" | "timeout";
  exit_code: number;
  stdout: string;
  stderr: string;
  artifacts: string[];
  metrics: JobMetrics;
}

export interface JobLimits {
  cpu: number;
  memory: string;
  timeout: number;
  max_output_size?: number;
}

export interface JobMetrics {
  duration_ms: number;
  worker_id: string;
  memory_peak_mb?: number;
  cpu_time_ms?: number;
}

export interface SessionConfig {
  mode: "worker";
  provider: string;
  model: string;
  network: "restricted" | "open";
  telemetry: boolean;
}

export const JobStatus = {
  PENDING: "pending",
  RUNNING: "running",
  FINISHED: "finished",
  FAILED: "failed",
  TIMEOUT: "timeout",
  CANCELLED: "cancelled",
} as const;

export type JobStatusType = typeof JobStatus[keyof typeof JobStatus];
