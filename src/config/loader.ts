import * as fs from "fs/promises";
import * as path from "path";
import { WorkerConfig, DEFAULT_CONFIG, parseEnvName, isConfigKey, envToConfigKey } from "./schema.js";

export interface ConfigLoaderOptions {
  configPath?: string;
  envPrefix?: string;
  skipValidation?: boolean;
}

export interface ConfigSource {
  source: "default" | "file" | "environment" | "cli";
  priority: number;
}

export class ConfigurationError extends Error {
  constructor(message: string, public readonly source: ConfigSource) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export class ConfigLoader {
  private config: WorkerConfig;
  private configPath: string;
  private envPrefix: string;
  private sources: Map<string, ConfigSource> = new Map();
  private cliArgs: Map<string, string> = new Map();

  constructor(options: ConfigLoaderOptions = {}) {
    this.configPath = options.configPath || process.cwd();
    this.envPrefix = options.envPrefix || "OPENCODE_WORKER";
    this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }

  async load(): Promise<WorkerConfig> {
    await this.loadFromFile();
    this.loadFromEnvironment();
    this.loadFromCliArgs();
    
    return this.config;
  }

  private async loadFromFile(): Promise<void> {
    const configFileNames = [
      "opencode-worker.json",
      "opencode-worker.config.json",
      ".opencode-worker.json",
      "worker.config.json",
    ];

    let foundConfigPath: string | null = null;

    for (const fileName of configFileNames) {
      const filePath = path.join(this.configPath, fileName);
      try {
        await fs.access(filePath);
        foundConfigPath = filePath;
        break;
      } catch {
        // File doesn't exist, continue
      }
    }

    if (!foundConfigPath) {
      const envConfigPath = process.env[`${this.envPrefix}_CONFIG_PATH`];
      if (envConfigPath) {
        try {
          await fs.access(envConfigPath);
          foundConfigPath = envConfigPath;
        } catch {
          throw new ConfigurationError(
            `Config file specified in ${this.envPrefix}_CONFIG_PATH not found: ${envConfigPath}`,
            { source: "environment", priority: 3 }
          );
        }
      }
    }

    if (foundConfigPath) {
      try {
        const content = await fs.readFile(foundConfigPath, "utf-8");
        const fileConfig = JSON.parse(content);
        this.mergeConfig(fileConfig, "file");
        this.sources.set("configFile", { source: "file", priority: 2 });
      } catch (error) {
        throw new ConfigurationError(
          `Failed to parse config file: ${(error as Error).message}`,
          { source: "file", priority: 2 }
        );
      }
    }
  }

  private loadFromEnvironment(): void {
    const prefix = `${this.envPrefix}_`;

    for (const [envKey, envValue] of Object.entries(process.env)) {
      if (!envKey.startsWith(prefix) || !envValue) continue;

      const configKey = this.envToConfigKey(envKey);
      if (!configKey) continue;

      this.setNestedValue(configKey, envValue);
      this.sources.set(configKey, { source: "environment", priority: 1 });
    }
  }

  private envToConfigKey(envKey: string): string {
    const prefix = `${this.envPrefix}_`;
    if (!envKey.startsWith(prefix)) return "";

    let key = envKey.slice(prefix.length).toLowerCase();

    key = key.replace(/_/g, ".");

    return key;
  }

  private loadFromCliArgs(): void {
    const args = process.argv.slice(2);

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg.startsWith("--")) {
        const equalsIndex = arg.indexOf("=");
        let key: string;
        let value: string;

        if (equalsIndex !== -1) {
          key = arg.slice(2, equalsIndex);
          value = arg.slice(equalsIndex + 1);
        } else {
          key = arg.slice(2);
          value = args[++i] || "true";
        }

        const configKey = key.replace(/-/g, ".");
        this.cliArgs.set(key, value);
        this.setNestedValue(configKey, value);
        this.sources.set(configKey, { source: "cli", priority: 0 });
      }
    }
  }

  private setNestedValue(key: string, value: string): void {
    const keys = key.split(".");
    let current: Record<string, unknown> = this.config as unknown as Record<string, unknown>;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]] as Record<string, unknown>;
    }

    const lastKey = keys[keys.length - 1];
    const typedValue = this.parseValue(value);

    (current as Record<string, unknown>)[lastKey] = typedValue;
  }

  private parseValue(value: string): unknown {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
    if (value === "null") return null;

    const num = Number(value);
    if (!Number.isNaN(num)) return num;

    if (value.startsWith("[") && value.endsWith("]")) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }

    return value;
  }

  private mergeConfig(source: Record<string, unknown>, _sourceName: ConfigSource["source"]): void {
    this.deepMerge(this.config as unknown as Record<string, unknown>, source);
  }

  private deepMerge(target: unknown, source: Record<string, unknown>): void {
    if (typeof target !== "object" || target === null) {
      return;
    }

    const targetObj = target as Record<string, unknown>;

    for (const key of Object.keys(source)) {
      if (key in source) {
        const sourceValue = source[key];
        const targetValue = targetObj[key];

        if (
          sourceValue !== null &&
          typeof sourceValue === "object" &&
          !Array.isArray(sourceValue) &&
          targetValue !== null &&
          typeof targetValue === "object" &&
          !Array.isArray(targetValue)
        ) {
          this.deepMerge(targetValue, sourceValue as Record<string, unknown>);
        } else if (key in targetObj) {
          targetObj[key] = sourceValue;
        }
      }
    }
  }

  getConfig(): WorkerConfig {
    return this.config;
  }

  getSource(key: string): ConfigSource | undefined {
    return this.sources.get(key);
  }

  getAllSources(): Record<string, ConfigSource> {
    return Object.fromEntries(this.sources);
  }

  validate(): void {
    const errors: string[] = [];

    if (this.config.session.max_concurrent_sessions < 1) {
      errors.push("session.max_concurrent_sessions must be >= 1");
    }

    if (this.config.session.default_timeout_ms < 1000) {
      errors.push("session.default_timeout_ms must be >= 1000");
    }

    if (this.config.governance.default_cpu < 1) {
      errors.push("governance.default_cpu must be >= 1");
    }

    if (this.config.governance.default_memory_mb < 128) {
      errors.push("governance.default_memory_mb must be >= 128");
    }

    if (this.config.websocket.port < 1 || this.config.websocket.port > 65535) {
      errors.push("websocket.port must be between 1 and 65535");
    }

    if (this.config.api.port < 1 || this.config.api.port > 65535) {
      errors.push("api.port must be between 1 and 65535");
    }

    if (this.config.logging.level && !["debug", "info", "warn", "error"].includes(this.config.logging.level)) {
      errors.push("logging.level must be one of: debug, info, warn, error");
    }

    if (this.config.logging.format && !["json", "pretty"].includes(this.config.logging.format)) {
      errors.push("logging.format must be one of: json, pretty");
    }

    if (errors.length > 0) {
      throw new ConfigurationError(
        `Configuration validation failed:\n${errors.join("\n")}`,
        { source: "default", priority: 4 }
      );
    }
  }

  static async loadConfig(options: ConfigLoaderOptions = {}): Promise<WorkerConfig> {
    const loader = new ConfigLoader(options);
    const config = await loader.load();
    loader.validate();
    return config;
  }
}

export function getWorkerId(): string {
  return process.env.OPENCODE_WORKER_WORKER_ID || 
         process.env.HOSTNAME || 
         `worker-${process.pid}-${Date.now()}`;
}
