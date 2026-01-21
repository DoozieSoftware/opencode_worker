#!/usr/bin/env node

import { spawn } from "child_process";
import * as fs from "fs/promises";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

interface WorkerSSHConfig {
  host: string;
  port: number;
  user: string;
  keyFile: string;
}

interface JobInput {
  job_id: string;
  command: string;
  files: Record<string, string>;
  limits: {
    cpu: number;
    memory: string;
    timeout: number;
  };
}

interface JobResult {
  job_id: string;
  status: "finished" | "failed" | "timeout";
  exit_code: number;
  stdout: string;
  stderr: string;
  artifacts: string[];
  metrics: {
    duration_ms: number;
    worker_id: string;
  };
}

export class SSHWorkerExecutor {
  private config: WorkerSSHConfig;
  private worker_id: string;

  constructor(config: Partial<WorkerSSHConfig> = {}) {
    this.config = {
      host: config.host ?? "localhost",
      port: config.port ?? 2222,
      user: config.user ?? "opencode",
      keyFile: config.keyFile ?? process.env.HOME + "/.ssh/id_ed25519",
    };
    this.worker_id = `docker-worker-${uuidv4().substring(0, 8)}`;
  }

  private async sshExec(
    command: string,
    options: {
      input?: string;
      timeout?: number;
    } = {}
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      const sshArgs = [
        "-o",
        "StrictHostKeyChecking=no",
        "-o",
        "BatchMode=yes",
        "-o",
        "ConnectTimeout=10",
        "-i",
        this.config.keyFile,
        "-p",
        this.config.port.toString(),
        `${this.config.user}@${this.config.host}`,
        command,
      ];

      const proc = spawn("ssh", sshArgs, {
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";
      let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

      proc.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      proc.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      proc.on("close", (code) => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        resolve({ stdout, stderr, exitCode: code ?? -1 });
      });

      proc.on("error", (error) => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        reject(error);
      });

      if (options.timeout) {
        timeoutHandle = setTimeout(() => {
          proc.kill("SIGKILL");
          reject(new Error(`Command timed out after ${options.timeout}ms`));
        }, options.timeout);
      }

      if (options.input) {
        proc.stdin.write(options.input);
        proc.stdin.end();
      }
    });
  }

  async runJob(input: JobInput): Promise<JobResult> {
    const startTime = Date.now();
    const sessionId = `session-${input.job_id}`;
    const workDir = `/opt/opencode/sessions/${sessionId}/work`;
    const outputDir = `/opt/opencode/sessions/${sessionId}/output`;

    console.log(`🚀 Starting job ${input.job_id} on remote worker`);

    try {
      // Create session directories
      await this.sshExec(`mkdir -p ${workDir} ${outputDir}`);

      // Write files to session
      for (const [filename, content] of Object.entries(input.files)) {
        const filePath = `${workDir}/${filename}`;
        const escapedContent = content.replace(/'/g, "'\\''");
        await this.sshExec(`echo '${escapedContent}' > '${filePath}'`);
      }

      // Run command in session
      const memoryLimit = this.parseMemory(input.limits.memory);
      const cgroupMemory = Math.ceil(memoryLimit * 1.2); // Add buffer

      const runCommand = `
        cd ${workDir} && 
        ulimit -v ${cgroupMemory} 2>/dev/null || true &&
        ulimit -t ${Math.ceil(input.limits.timeout / 1000)} 2>/dev/null || true &&
        ${input.command}
      `;

      const result = await this.sshExec(runCommand, {
        timeout: input.limits.timeout + 5000,
      });

      const duration = Date.now() - startTime;

      // Collect artifacts
      const artifactsResult = await this.sshExec(`ls -la ${outputDir} 2>/dev/null || true`);

      // Cleanup session
      await this.sshExec(`rm -rf /opt/opencode/sessions/${sessionId}`);

      const status = result.exitCode === 0 ? "finished" : "failed";

      console.log(`✅ Job ${input.job_id} completed with status: ${status}`);

      return {
        job_id: input.job_id,
        status,
        exit_code: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        artifacts: [],
        metrics: {
          duration_ms: duration,
          worker_id: this.worker_id,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Cleanup on failure
      await this.sshExec(`rm -rf /opt/opencode/sessions/${sessionId}`).catch(() => {});

      console.error(`❌ Job ${input.job_id} failed:`, error);

      return {
        job_id: input.job_id,
        status: "failed",
        exit_code: -1,
        stdout: "",
        stderr: String(error),
        artifacts: [],
        metrics: {
          duration_ms: duration,
          worker_id: this.worker_id,
        },
      };
    }
  }

  private parseMemory(memStr: string): number {
    const match = memStr.match(/^(\d+)(GB|MB|KB)?$/i);
    if (!match) return 2048;

    const value = parseInt(match[1], 10);
    const unit = (match[2] || "MB").toUpperCase();

    switch (unit) {
      case "GB":
        return value * 1024;
      case "KB":
        return Math.ceil(value / 1024);
      default:
        return value;
    }
  }

  getWorkerId(): string {
    return this.worker_id;
  }
}

async function main() {
  console.log("🧪 Testing SSH Worker Executor\n");

  const executor = new SSHWorkerExecutor({
    host: "localhost",
    port: 2222,
    user: "opencode",
    keyFile: "/Users/akshaydoozie/.ssh/id_ed25519",
  });

  console.log(`Worker ID: ${executor.getWorkerId()}\n`);

  // Test job execution
  const testJob: JobInput = {
    job_id: `test-${uuidv4().substring(0, 8)}`,
    command: "echo 'Hello from OpenCode Worker!' && echo 'Second line' && pwd",
    files: {
      "task.json": JSON.stringify({ task: "SSH test", timestamp: new Date().toISOString() }, null, 2),
    },
    limits: {
      cpu: 1,
      memory: "512MB",
      timeout: 30000,
    },
  };

  console.log("📤 Submitting test job...");
  const result = await executor.runJob(testJob);

  console.log("\n📊 Job Result:");
  console.log(`   Job ID: ${result.job_id}`);
  console.log(`   Status: ${result.status}`);
  console.log(`   Exit Code: ${result.exit_code}`);
  console.log(`   Duration: ${result.metrics.duration_ms}ms`);
  console.log(`   Worker: ${result.metrics.worker_id}`);
  console.log(`   stdout:\n${result.stdout}`);
  if (result.stderr) {
    console.log(`   stderr: ${result.stderr}`);
  }

  console.log("\n✅ SSH Worker test completed!");
}

main().catch(console.error);
