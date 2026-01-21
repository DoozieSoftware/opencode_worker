export interface ResourceLimits {
  cpu: number;
  memory_mb: number;
  timeout_ms: number;
  max_output_bytes: number;
}

export interface ProcessInfo {
  pid: number;
  ppid: number;
  pgid: number;
  command: string;
  start_time: number;
}

export interface ExecutionResult {
  exit_code: number;
  signal?: string;
  stdout: string;
  stderr: string;
  duration_ms: number;
  memory_peak_mb?: number;
  cpu_time_ms?: number;
}

export interface GovernorState {
  is_governed: boolean;
  limits: ResourceLimits;
  start_time: number;
  memory_samples: number[];
  cpu_samples: number[];
  output_bytes: number;
  killed: boolean;
  kill_reason?: string;
}

export const DEFAULT_LIMITS: ResourceLimits = {
  cpu: 2,
  memory_mb: 2048,
  timeout_ms: 300000,
  max_output_bytes: 10 * 1024 * 1024,
};
