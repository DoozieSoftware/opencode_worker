export type SessionState =
  | "INIT"
  | "PREPARING"
  | "EXECUTING"
  | "COLLECTING"
  | "DESTROYING"
  | "DESTROYED"
  | "ERROR";

export interface SessionContext {
  session_id: string;
  job_id: string;
  state: SessionState;
  work_dir: string;
  output_dir: string;
  config_path: string;
  created_at: number;
  started_at?: number;
  finished_at?: number;
  error?: string;
}

export interface SessionOptions {
  base_dir?: string;
  work_dir_name?: string;
  output_dir_name?: string;
}

export interface SessionLifecycleCallbacks {
  onStateChange?: (session: SessionContext, oldState: SessionState, newState: SessionState) => void;
  onError?: (session: SessionContext, error: Error) => void;
  onComplete?: (session: SessionContext, duration_ms: number) => void;
}
