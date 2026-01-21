import { Plugin } from "@opencode-ai/plugin";
import { allTools } from "./tools/index.js";
import { logger } from "./observability/index.js";

export const OpenCodeWorkerPlugin: Plugin = async (_input) => {
  logger.info("OpenCode Worker plugin initialized");

  return {
    tool: {
      worker_dispatch_job: allTools.worker_dispatch_job,
      worker_get_status: allTools.worker_get_status,
      worker_collect_output: allTools.worker_collect_output,
      worker_cancel_job: allTools.worker_cancel_job,
      worker_list_sessions: allTools.worker_list_sessions,
      worker_get_metrics: allTools.worker_get_metrics,
      worker_stream_job: allTools.worker_stream_job,
      worker_get_stream_url: allTools.worker_get_stream_url,
      worker_subscribe_stream: allTools.worker_subscribe_stream,
    },
    event: async (_input) => {
      logger.debug("Event received", { event: _input.event });
    },
  };
};

export default OpenCodeWorkerPlugin;
