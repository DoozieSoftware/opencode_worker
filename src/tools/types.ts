import { tool } from "@opencode-ai/plugin/tool";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toolFn = tool as any;

const schema = tool.schema;

const jobIdSchema = schema.string().describe("Unique job identifier");
const commandSchema = schema.string().describe("Command to execute");
const filesSchema = schema
  .record(schema.string(), schema.string())
  .describe("Files to inject into session");

const limitsSchema = schema.object({
  cpu: schema.number().describe("CPU cores to allocate"),
  memory: schema.string().describe("Memory limit (e.g., '2GB')"),
  timeout: schema.number().describe("Timeout in milliseconds"),
});

const configSchema = schema.object({
  mode: schema.literal("worker").describe("Mode must be 'worker'"),
  provider: schema.string().describe("LLM provider"),
  model: schema.string().describe("Model identifier"),
  network: schema
    .enum(["restricted", "open"])
    .describe("Network policy"),
  telemetry: schema
    .boolean()
    .describe("Enable telemetry for this session"),
});

interface ToolArgs {
  job_id?: string;
  command?: string;
  files?: Record<string, string>;
  limits?: {
    cpu: number;
    memory: string;
    timeout: number;
  };
  config?: {
    mode: string;
    provider: string;
    model: string;
    network: string;
    telemetry: boolean;
  };
  reason?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const workerDispatchJobTool = toolFn({
  description:
    "Dispatch a job to be executed in an isolated session. This runs the command in a disposable sandbox with resource limits.",
  args: {
    job_id: jobIdSchema,
    command: commandSchema,
    files: filesSchema,
    limits: limitsSchema,
    config: configSchema,
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: async (args: any) => {
    return `Job ${String(args.job_id ?? "")} dispatched`;
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const workerGetStatusTool = toolFn({
  description: "Get the status of a running or completed job",
  args: {
    job_id: jobIdSchema,
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: async (args: any) => {
    return `Status for job ${String(args.job_id ?? "")}`;
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const workerCollectOutputTool = toolFn({
  description: "Collect output artifacts from a completed job",
  args: {
    job_id: jobIdSchema,
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: async (args: any) => {
    return `Output for job ${String(args.job_id ?? "")}`;
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const workerCancelJobTool = toolFn({
  description: "Cancel a running job",
  args: {
    job_id: jobIdSchema,
    reason: schema.string().optional().describe("Cancellation reason"),
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: async (args: any) => {
    return `Job ${String(args.job_id ?? "")} cancelled`;
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const workerListSessionsTool = toolFn({
  description: "List all active sessions on this worker",
  args: {},
  execute: async () => {
    return "Active sessions list";
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const workerGetMetricsTool = toolFn({
  description: "Get performance metrics for the worker",
  args: {},
  execute: async () => {
    return "Worker metrics";
  },
});

const streamConfigSchema = schema.object({
  chunk_size: schema.number().optional().describe("Chunk size in bytes"),
  capture_stdout: schema.boolean().optional().describe("Capture stdout"),
  capture_stderr: schema.boolean().optional().describe("Capture stderr"),
});

const streamingArgsSchema = schema.object({
  job_id: jobIdSchema,
  command: commandSchema,
  files: filesSchema.optional(),
  limits: limitsSchema.optional(),
  config: configSchema.optional(),
  stream_config: streamConfigSchema.optional(),
});

export const workerStreamJobTool = toolFn({
  description:
    "Dispatch a job with WebSocket streaming for real-time output. Connect to ws://localhost:8080 and subscribe to job_id to receive streaming output.",
  args: streamingArgsSchema,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: async (args: any) => {
    return `Streaming job ${String(args.job_id ?? "")} dispatched`;
  },
});

const portSchema = schema.number().optional().describe("WebSocket port");

export const workerGetStreamUrlTool = toolFn({
  description:
    "Get the WebSocket URL for streaming job output. Connect to this URL and subscribe to job updates.",
  args: {
    port: portSchema,
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: async (args: any) => {
    const port = args.port ?? 8080;
    return `ws://localhost:${port}`;
  },
});

export const workerSubscribeStreamTool = toolFn({
  description:
    "Subscribe to real-time updates for a job. Returns subscription info for connecting to WebSocket stream.",
  args: {
    job_id: jobIdSchema,
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: async (args: any) => {
    const job_id = String(args.job_id ?? "");
    return JSON.stringify({
      action: "subscribe",
      job_id,
      ws_url: "ws://localhost:8080",
      message: {
        type: "subscribe",
        job_ids: [job_id],
      },
    });
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const allTools: any = {
  worker_dispatch_job: workerDispatchJobTool,
  worker_get_status: workerGetStatusTool,
  worker_collect_output: workerCollectOutputTool,
  worker_cancel_job: workerCancelJobTool,
  worker_list_sessions: workerListSessionsTool,
  worker_get_metrics: workerGetMetricsTool,
  worker_stream_job: workerStreamJobTool,
  worker_get_stream_url: workerGetStreamUrlTool,
  worker_subscribe_stream: workerSubscribeStreamTool,
};
