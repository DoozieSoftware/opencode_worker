#!/usr/bin/env node

import { SessionLifecycleManager } from "./dist/session/lifecycle.js";
import { ResourceGovernor, executeWithGovernance } from "./dist/governance/resource.js";
import { validateCommand, sanitizeCommand, ALLOWED_COMMANDS } from "./dist/security/allowlist.js";
import * as fs from "fs/promises";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

interface RemoteJobInput {
  job_id: string;
  command: string;
  files: Record<string, string>;
  limits: {
    cpu: number;
    memory: string;
    timeout: number;
  };
}

interface RemoteJobResult {
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

class LocalRemoteWorker {
  private sessionManager: SessionLifecycleManager;
  private workerId: string;
  private testDir: string;

  constructor() {
    this.workerId = `local-worker-${uuidv4().substring(0, 8)}`;
    this.testDir = `/tmp/opencode-worker-remote-test-${Date.now()}`;
    this.sessionManager = new SessionLifecycleManager(this.testDir);
  }

  async initialize(): Promise<void> {
    await this.sessionManager.initialize();
    await fs.mkdir(this.testDir, { recursive: true });
  }

  async runJob(input: RemoteJobInput): Promise<RemoteJobResult> {
    const startTime = Date.now();
    console.log(`🚀 Starting job ${input.job_id} on ${this.workerId}`);

    try {
      // Validate command
      const validation = validateCommand(input.command);
      if (!validation.allowed) {
        throw new Error(`Command not allowed: ${validation.reason}`);
      }

      // Create session
      const session = await this.sessionManager.createSession(input.job_id);

      // Prepare session with files
      await this.sessionManager.prepareSession(session, input.files);

      // Execute command with resource governance
      const memoryMb = this.parseMemory(input.limits.memory);
      const result = await executeWithGovernance(
        input.command,
        session.work_dir,
        {
          cpu: input.limits.cpu,
          memory_mb: memoryMb,
          timeout_ms: input.limits.timeout,
          max_output_bytes: 10 * 1024 * 1024,
        }
      );

      // Collect artifacts
      const artifacts = await this.sessionManager.collectArtifacts(session);

      // Calculate status
      let status: "finished" | "failed" | "timeout" = "finished";
      if (result.exit_code !== 0) {
        status = "failed";
      }
      if (result.signal === "SIGTERM" || result.signal === "SIGKILL") {
        status = "timeout";
      }

      const duration = Date.now() - startTime;

      console.log(`✅ Job ${input.job_id} completed with status: ${status}`);

      return {
        job_id: input.job_id,
        status,
        exit_code: result.exit_code,
        stdout: result.stdout,
        stderr: result.stderr,
        artifacts,
        metrics: {
          duration_ms: duration,
          worker_id: this.workerId,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
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
          worker_id: this.workerId,
        },
      };
    }
  }

  async cleanup(): Promise<void> {
    // Clean up all active sessions
    const sessions = this.sessionManager.getActiveSessions();
    for (const session of sessions) {
      await this.sessionManager.destroySessionSafe(session);
    }
    await fs.rm(this.testDir, { recursive: true, force: true });
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

  getTestDir(): string {
    return this.testDir;
  }

  getWorkerId(): string {
    return this.workerId;
  }
}

async function runIntegrationTests() {
  console.log("=".repeat(60));
  console.log("🚀 OpenCode Worker - Remote Integration Tests");
  console.log("=".repeat(60));
  console.log("");

  const worker = new LocalRemoteWorker();
  let passed = 0;
  let failed = 0;

  try {
    await worker.initialize();
    console.log(`📦 Worker initialized: ${worker.getWorkerId()}`);
    console.log(`📁 Test directory: ${worker.getTestDir()}`);
    console.log("");

    // Test 1: Basic Job Execution
    console.log("🧪 Test 1: Basic Job Execution");
    console.log("-".repeat(40));
    const basicJob: RemoteJobInput = {
      job_id: `test-basic-${uuidv4().substring(0, 8)}`,
      command: "echo 'Hello from OpenCode Worker!' && echo 'Second line'",
      files: {},
      limits: { cpu: 1, memory: "512MB", timeout: 30000 },
    };
    const basicResult = await worker.runJob(basicJob);
    if (basicResult.status === "finished" && basicResult.stdout.includes("Hello from OpenCode Worker")) {
      console.log("✅ Basic job execution: PASSED");
      passed++;
    } else {
      console.log("❌ Basic job execution: FAILED");
      failed++;
    }
    console.log("");

    // Test 2: File Injection
    console.log("🧪 Test 2: File Injection");
    console.log("-".repeat(40));
    const fileJob: RemoteJobInput = {
      job_id: `test-files-${uuidv4().substring(0, 8)}`,
      command: "cat task.json && echo '---EOF---'",
      files: {
        "task.json": JSON.stringify({ task: "file injection test", success: true }, null, 2),
        "config.yaml": "environment: test\ndebug: true",
      },
      limits: { cpu: 1, memory: "512MB", timeout: 30000 },
    };
    const fileResult = await worker.runJob(fileJob);
    if (fileResult.status === "finished" && fileResult.stdout.includes("file injection test")) {
      console.log("✅ File injection: PASSED");
      passed++;
    } else {
      console.log("❌ File injection: FAILED");
      console.log(`   Status: ${fileResult.status}`);
      console.log(`   Exit code: ${fileResult.exit_code}`);
      console.log(`   stdout: ${fileResult.stdout.substring(0, 200)}`);
      if (fileResult.stderr) console.log(`   stderr: ${fileResult.stderr}`);
      failed++;
    }
    console.log("");

    // Test 3: Command with Exit Code
    console.log("🧪 Test 3: Command Exit Codes");
    console.log("-".repeat(40));
    const exitCodeJob: RemoteJobInput = {
      job_id: `test-exitcode-${uuidv4().substring(0, 8)}`,
      command: "bash -c 'exit 42'",
      files: {},
      limits: { cpu: 1, memory: "512MB", timeout: 10000 },
    };
    const exitCodeResult = await worker.runJob(exitCodeJob);
    if (exitCodeResult.status === "failed" && exitCodeResult.exit_code === 42) {
      console.log("✅ Exit code handling: PASSED");
      passed++;
    } else {
      console.log("❌ Exit code handling: FAILED");
      failed++;
    }
    console.log("");

    // Test 4: Session Isolation
    console.log("🧪 Test 4: Session Isolation");
    console.log("-".repeat(40));
    const isoJob1: RemoteJobInput = {
      job_id: `test-iso1-${uuidv4().substring(0, 8)}`,
      command: "echo 'session1-data' > session_file.txt && cat session_file.txt",
      files: {},
      limits: { cpu: 1, memory: "512MB", timeout: 30000 },
    };
    const isoJob2: RemoteJobInput = {
      job_id: `test-iso2-${uuidv4().substring(0, 8)}`,
      command: "cat session_file.txt 2>&1 || echo 'File not found (expected)'",
      files: {},
      limits: { cpu: 1, memory: "512MB", timeout: 30000 },
    };

    const isoResult1 = await worker.runJob(isoJob1);
    const isoResult2 = await worker.runJob(isoJob2);

    if (isoResult1.status === "finished" && isoResult2.status === "finished" && isoResult2.stdout.includes("not found")) {
      console.log("✅ Session isolation: PASSED");
      passed++;
    } else {
      console.log("❌ Session isolation: FAILED");
      console.log(`   iso1 status: ${isoResult1.status}, stdout: ${isoResult1.stdout.substring(0, 50)}`);
      console.log(`   iso2 status: ${isoResult2.status}, stdout: ${isoResult2.stdout.substring(0, 50)}`);
      failed++;
    }
    console.log("");

    // Test 5: Timeout Handling
    console.log("🧪 Test 5: Timeout Handling");
    console.log("-".repeat(40));
    const timeoutJob: RemoteJobInput = {
      job_id: `test-timeout-${uuidv4().substring(0, 8)}`,
      command: "sleep 10 && echo 'Done'",
      files: {},
      limits: { cpu: 1, memory: "512MB", timeout: 2000 },
    };
    const timeoutResult = await worker.runJob(timeoutJob);
    if (timeoutResult.status === "timeout" || timeoutResult.exit_code === -1) {
      console.log("✅ Timeout handling: PASSED");
      passed++;
    } else {
      console.log("❌ Timeout handling: FAILED");
      failed++;
    }
    console.log("");

    // Test 6: Security - Command Allowlist
    console.log("🧪 Test 6: Security - Command Allowlist");
    console.log("-".repeat(40));
    const securityJob: RemoteJobInput = {
      job_id: `test-security-${uuidv4().substring(0, 8)}`,
      command: "rm -rf /",
      files: {},
      limits: { cpu: 1, memory: "512MB", timeout: 10000 },
    };
    const securityResult = await worker.runJob(securityJob);
    if (securityResult.status === "failed" && (securityResult.stderr.includes("not allowed") || securityResult.stderr.includes("not in allowlist"))) {
      console.log("✅ Security allowlist: PASSED");
      passed++;
    } else {
      console.log("❌ Security allowlist: FAILED");
      console.log(`   Status: ${securityResult.status}`);
      console.log(`   Exit code: ${securityResult.exit_code}`);
      console.log(`   stderr: ${securityResult.stderr}`);
      failed++;
    }
    console.log("");

    // Test 7: Multi-line Script Execution
    console.log("🧪 Test 7: Multi-line Script Execution");
    console.log("-".repeat(40));
    const multilineJob: RemoteJobInput = {
      job_id: `test-multiline-${uuidv4().substring(0, 8)}`,
      command: `bash -c 'for i in 1 2 3; do echo \"Iteration $i\"; done; echo \"Script completed successfully\"'`,
      files: {},
      limits: { cpu: 1, memory: "512MB", timeout: 30000 },
    };
    const multilineResult = await worker.runJob(multilineJob);
    if (multilineResult.status === "finished" && multilineResult.stdout.includes("Iteration 1")) {
      console.log("✅ Multi-line script: PASSED");
      passed++;
    } else {
      console.log("❌ Multi-line script: FAILED");
      failed++;
    }
    console.log("");

    // Test 8: Concurrent Jobs
    console.log("🧪 Test 8: Concurrent Jobs");
    console.log("-".repeat(40));
    const concurrentJobs: RemoteJobInput[] = [];
    for (let i = 0; i < 3; i++) {
      concurrentJobs.push({
        job_id: `test-concurrent-${i}-${uuidv4().substring(0, 8)}`,
        command: `echo 'Job ${i} executed' && sleep 0.5`,
        files: {},
        limits: { cpu: 1, memory: "512MB", timeout: 30000 },
      });
    }

    const concurrentResults = await Promise.all(
      concurrentJobs.map((job) => worker.runJob(job))
    );

    const allConcurrentPassed = concurrentResults.every(
      (r) => r.status === "finished" && r.stdout.includes("executed")
    );
    if (allConcurrentPassed) {
      console.log("✅ Concurrent jobs: PASSED (3/3 jobs)");
      passed++;
    } else {
      console.log("❌ Concurrent jobs: FAILED");
      failed++;
    }
    console.log("");

  } finally {
    await worker.cleanup();
  }

  // Summary
  console.log("=".repeat(60));
  console.log("🎉 Integration Test Results");
  console.log("=".repeat(60));
  console.log("");
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📊 Total:  ${passed + failed}`);
  console.log("");

  if (failed === 0) {
    console.log("🎊 All tests passed! OpenCode Worker is ready for use.");
  } else {
    console.log("⚠️  Some tests failed. Review the output above.");
  }
  console.log("");
}

runIntegrationTests().catch(console.error);
