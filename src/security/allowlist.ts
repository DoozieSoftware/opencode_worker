export const ALLOWED_COMMANDS: string[] = [
  "npx",
  "node",
  "npm",
  "bun",
  "pnpm",
  "yarn",
  "git",
  "bash",
  "sh",
  "cat",
  "ls",
  "mkdir",
  "rm",
  "cp",
  "mv",
  "chmod",
  "chown",
  "find",
  "grep",
  "sed",
  "awk",
  "jq",
  "curl",
  "wget",
  "tar",
  "unzip",
  "zip",
  "echo",
  "printf",
  "head",
  "tail",
  "wc",
  "sort",
  "uniq",
  "cut",
  "tr",
  "diff",
  "patch",
  "make",
  "cmake",
  "cargo",
  "rustc",
  "go",
  "python",
  "python3",
  "pip",
  "pip3",
  "uv",
  "poetry",
  "opencode",
  "type",
  "which",
  "whoami",
  "id",
  "env",
  "printenv",
  "date",
  "sleep",
  "timeout",
  "pwd",
  "hostname",
  "uname",
];

export const ALLOWED_PATTERNS: RegExp[] = [
  /^npx\s+\S+/,
  /^node\s+\S+/,
  /^npm\s+(run|install|test|build|start|dev)\s*/,
  /^bun\s+(run|install|test|build|start|dev)\s*/,
  /^pnpm\s+(run|install|test|build|start|dev)\s*/,
  /^git\s+(clone|pull|push|checkout|checkout\s+-b|add|commit|status|log|branch|merge|fetch|remote)\s*/,
  /^cargo\s+(build|test|run|check|doc|clippy|fmt)\s*/,
  /^go\s+(run|build|test|get|mod|vet|fmt)\s*/,
  /^python3?\s+.*\.py/,
  /^make\s+/,
  /^cmake\s+/,
  /^bash\s+/,
  /^bash\s+-c\s+/,
  /^sh\s+/,
  /^sh\s+-c\s+/,
  /^cat\s+.*/,
  /^echo\s+.*/,
  /^sleep\s+\d+/,
  /^timeout\s+\d+\s+/,
];

export interface CommandValidationResult {
  allowed: boolean;
  reason?: string;
  sanitized_command?: string;
}

export const DANGEROUS_PATTERNS: RegExp[] = [
  /rm\s+-rf\s+\//,
  /rm\s+-rf\s+\//,
  /rm\s+-rf\s+\//,
  /\/\s*\|\s*sh/,
  /\>\s*\/dev\/null/,
  /\$\(/,
  /`[^`]+`/,
  /chmod\s+777/,
  /chmod\s+4755/,
  /wget\s+.*\|\s*sh/,
  /curl\s+.*\|\s*sh/,
];

export function validateCommand(command: string): CommandValidationResult {
  const trimmed = command.trim();

  if (!trimmed) {
    return { allowed: false, reason: "Empty command" };
  }

  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { allowed: false, reason: `Dangerous pattern detected: ${pattern}` };
    }
  }

  const base_command = trimmed.split(/\s+/)[0];

  if (ALLOWED_COMMANDS.includes(base_command)) {
    return { allowed: true, sanitized_command: trimmed };
  }

  for (const pattern of ALLOWED_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { allowed: true, sanitized_command: trimmed };
    }
  }

  return {
    allowed: false,
    reason: `Command not in allowlist: ${base_command}`,
  };
}

export function sanitizeCommand(command: string): string {
  const trimmed = command.trim();
  const parts = trimmed.split(/\s+/);

  const sanitized_parts: string[] = [];

  for (const part of parts) {
    if (part.startsWith("-")) {
      const safe_flag = part.replace(/[;&|`$(){}[\]\\]/g, "");
      sanitized_parts.push(safe_flag);
    } else {
      sanitized_parts.push(part);
    }
  }

  return sanitized_parts.join(" ");
}
