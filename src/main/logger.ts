// T020: Logging infrastructure (LogConfiguration from data-model.md FR-077)

export type LogLevel = 'Error' | 'Warning' | 'Info' | 'Debug';

interface LogConfig {
  enabled: boolean;
  level: LogLevel;
  filePath: string;
}

const defaultConfig: LogConfig = {
  enabled: true,
  level: 'Info',
  filePath: '%APPDATA%/MarkRead/logs/app.log', // Will expand later
};

let currentConfig = { ...defaultConfig };

export function initLogger(config?: Partial<LogConfig>) {
  if (config) {
    currentConfig = { ...currentConfig, ...config };
  }
  console.log('Logger initialized:', currentConfig);
}

export function log(level: LogLevel, message: string, ...args: any[]) {
  if (!currentConfig.enabled) return;

  const levels: LogLevel[] = ['Error', 'Warning', 'Info', 'Debug'];
  const currentLevelIndex = levels.indexOf(currentConfig.level);
  const messageLevelIndex = levels.indexOf(level);

  if (messageLevelIndex <= currentLevelIndex) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}]`, message, ...args);
    // TODO: Write to file (Phase 10)
  }
}

export function logError(message: string, ...args: any[]) {
  log('Error', message, ...args);
}

export function logWarning(message: string, ...args: any[]) {
  log('Warning', message, ...args);
}

export function logInfo(message: string, ...args: any[]) {
  log('Info', message, ...args);
}

export function logDebug(message: string, ...args: any[]) {
  log('Debug', message, ...args);
}
