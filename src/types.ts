export interface Target {
  id: string;
  name: string;
  url: string;
  type: 'css' | 'js' | 'html' | 'webpage';
  userAgent: string;
  headers: string;
  lastScanned: string | null;
  lastHash: string | null;
  status: 'active' | 'paused';
  error: string | null;
  createdAt: string;
}

export interface Scan {
  id: string;
  targetId: string;
  timestamp: string;
  hash: string;
  content?: string; // Loaded when viewing specific scan
  isChange: boolean;
  addedLines: number;
  deletedLines: number;
  status: 'success' | 'failed';
  errorMessage: string | null;
  aiAnalysis?: {
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    summary: string;
    details: string;
    analyzedAt: string;
  } | null;
}

export interface Settings {
  telegramToken: string;
  telegramChatId: string;
  slackWebhook: string;
  enableAutoAI: boolean;
  scanIntervalHours: number;
}

export interface SystemLog {
  timestamp: string;
  message: string;
  type: 'info' | 'warn' | 'error';
}

export interface DashboardData {
  targets: Target[];
  scans: Scan[];
  settings: Settings;
  logs: SystemLog[];
}
