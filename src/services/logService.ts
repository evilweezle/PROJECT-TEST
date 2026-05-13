
export type LogLevel = 'info' | 'warn' | 'error' | 'success';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
  details?: unknown;
}

const STORAGE_KEY = 'jarviss_diagnostic_logs';
const MAX_LOGS = 200;

class LogService {
  private logs: LogEntry[] = [];

  constructor() {
    this.loadLogs();
  }

  private loadLogs() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.logs = JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to load diagnostic logs", e);
      this.logs = [];
    }
  }

  private saveLogs() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs));
    } catch (e) {
      console.error("Failed to save diagnostic logs", e);
    }
  }

  public addLog(entry: Omit<LogEntry, 'id' | 'timestamp'>) {
    const newEntry: LogEntry = {
      ...entry,
      id: Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toISOString(),
    };

    console.log(`[DiagnosticLog][${entry.level.toUpperCase()}][${entry.source}] ${entry.message}`, entry.details || '');

    this.logs.unshift(newEntry);

    // Keep only last MAX_LOGS
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(0, MAX_LOGS);
    }

    this.saveLogs();
    
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('jarviss_log_added', { detail: newEntry }));
  }

  public getLogs(): LogEntry[] {
    return this.logs;
  }

  public clearLogs() {
    this.logs = [];
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('jarviss_logs_cleared'));
  }
}

export const logService = new LogService();
