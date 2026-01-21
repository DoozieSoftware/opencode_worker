export interface WorkerConfig {
  worker: {
    id: string;
    concurrency: number;
    cleanup_delay_ms: number;
  };
  session: {
    base_dir: string;
    work_dir_name: string;
    output_dir_name: string;
    max_concurrent_sessions: number;
    default_timeout_ms: number;
    max_output_size_mb: number;
  };
  governance: {
    default_cpu: number;
    default_memory_mb: number;
    default_timeout_ms: number;
    max_cpu: number;
    max_memory_mb: number;
    max_timeout_ms: number;
  };
  security: {
    command_allowlist: string[];
    dangerous_patterns: string[];
    require_command_validation: boolean;
    max_command_length: number;
  };
  websocket: {
    enabled: boolean;
    port: number;
    heartbeat_interval_ms: number;
    max_clients: number;
  };
  logging: {
    level: "debug" | "info" | "warn" | "error";
    format: "json" | "pretty";
    output: "stdout" | "file";
    log_file_path?: string;
  };
  api: {
    host: string;
    port: number;
    cors_origin: string;
    api_key?: string;
    rate_limit_rpm: number;
  };
  docker: {
    enabled: boolean;
    image: string;
    network: string;
    memory_limit_mb: number;
    cpu_limit: number;
  };
}

export const DEFAULT_CONFIG: WorkerConfig = {
  worker: {
    id: `worker-${process.env.HOSTNAME || "local"}-${Date.now()}`,
    concurrency: 4,
    cleanup_delay_ms: 5000,
  },
  session: {
    base_dir: "/opt/opencode/sessions",
    work_dir_name: "work",
    output_dir_name: "output",
    max_concurrent_sessions: 10,
    default_timeout_ms: 300000,
    max_output_size_mb: 10,
  },
  governance: {
    default_cpu: 2,
    default_memory_mb: 2048,
    default_timeout_ms: 300000,
    max_cpu: 8,
    max_memory_mb: 8192,
    max_timeout_ms: 600000,
  },
  security: {
    command_allowlist: [
      "npx", "node", "npm", "bun", "pnpm", "yarn", "git", "bash", "sh",
      "cat", "ls", "mkdir", "rm", "cp", "mv", "chmod", "chown", "find",
      "grep", "sed", "awk", "jq", "curl", "wget", "tar", "unzip", "zip",
      "echo", "printf", "head", "tail", "wc", "sort", "uniq", "cut", "tr",
      "diff", "patch", "make", "cmake", "cargo", "rustc", "go", "python",
      "python3", "pip", "pip3", "uv", "poetry", "opencode", "type", "which",
      "whoami", "id", "env", "printenv", "date", "sleep", "timeout", "pwd",
      "hostname", "uname",
    ],
    dangerous_patterns: [
      "rm -rf /",
      "| sh",
      "> /dev/null",
      "$(...)",
      "`...`",
      "chmod 777",
      "chmod 4755",
      "wget | sh",
      "curl | sh",
    ],
    require_command_validation: true,
    max_command_length: 10000,
  },
  websocket: {
    enabled: true,
    port: 8080,
    heartbeat_interval_ms: 30000,
    max_clients: 100,
  },
  logging: {
    level: "info",
    format: "json",
    output: "stdout",
  },
  api: {
    host: "0.0.0.0",
    port: 3000,
    cors_origin: "*",
    rate_limit_rpm: 1000,
  },
  docker: {
    enabled: false,
    image: "opencode-worker:latest",
    network: "bridge",
    memory_limit_mb: 2048,
    cpu_limit: 2,
  },
};

export function getEnvPrefix(): string {
  return "OPENCODE_WORKER";
}

export function parseEnvName(key: string): string {
  return `${getEnvPrefix()}_${key}`.toUpperCase().replace(/_/g, "__").replace(/\./g, "_");
}

export function envToConfigKey(envName: string): string {
  const prefix = `${getEnvPrefix()}_`;
  if (!envName.startsWith(prefix)) {
    return envName;
  }
  const key = envName.slice(prefix.length).toLowerCase().replace(/__/g, "_");
  return key;
}

export function isConfigKey(envName: string): boolean {
  return envName.startsWith(`${getEnvPrefix()}_`);
}
