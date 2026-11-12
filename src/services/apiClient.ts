// API Client com contingência Local-First automática

const API_BASE_URL = 'http://localhost:3002/api';

let isBackendReachable: boolean | null = null;
let lastProbeTime = 0;

/**
 * Checks if the current execution environment should attempt connecting to a local backend server.
 * On HTTPS (e.g. Vercel deployment), browsers block HTTP localhost as Mixed Content.
 * In that case, we operate in 100% Local-First offline mode without making network calls to localhost:3002.
 */
export function canAttemptBackend(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.location.protocol === 'https:') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

export async function isBackendAlive(): Promise<boolean> {
  if (!canAttemptBackend()) {
    isBackendReachable = false;
    return false;
  }
  const now = Date.now();
  if (isBackendReachable !== null && now - lastProbeTime < 15000) {
    return isBackendReachable;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 600);
    const res = await fetch(`${API_BASE_URL}/health`, {
      signal: controller.signal,
      cache: 'no-store',
    }).catch(() => null);
    clearTimeout(timeout);
    isBackendReachable = res ? res.ok : false;
  } catch {
    isBackendReachable = false;
  }
  lastProbeTime = now;
  return Boolean(isBackendReachable);
}

export function isBackendSyncActive(): boolean {
  return Boolean(isBackendReachable);
}

export interface ScanResultPayload {
  success: boolean;
  decision: {
    code: 'ACCESS_GRANTED' | 'ACCESS_DENIED_BLOCKED' | 'REQUIRES_COORDINATION_OVERRIDE' | 'ANOMALY_DUPLICATE_SCAN';
    allowed: boolean;
    message: string;
    confidence: number;
    latencyMs: number;
    criteria: {
      statusCheck: boolean;
      validDateCheck: boolean;
      duplicateCheck: boolean;
      scheduleWindowCheck: boolean;
    };
  };
  student?: {
    id: string;
    enrollment_code: string;
    full_name: string;
    class_id: string;
    class_name?: string;
    status: 'active' | 'inactive' | 'graduated' | 'blocked';
    photo_ref?: string;
    valid_from: string;
    valid_until: string;
    guardian_name?: string;
    guardian_phone?: string;
    block_reason?: string;
    medical_notes?: string;
  };
  guardians?: Array<{
    id: string;
    full_name: string;
    phone: string;
    relationship: string;
    is_primary_contact: number;
    can_pickup: number;
  }>;
  context?: {
    studentId: string;
    criticalAlerts: Array<{
      id: string;
      category: string;
      content: string;
      importance_score: number;
    }>;
    authorizedPickups: Array<{
      id: string;
      category: string;
      content: string;
    }>;
    generalNotes: Array<{
      id: string;
      category: string;
      content: string;
    }>;
    totalMemoriesCount: number;
  };
  attendanceEvent?: {
    id: string;
    occurred_at_device: string;
    event_type: 'entry' | 'exit';
    source: string;
    client_sequence: number;
  };
  soundCue: 'success' | 'warning' | 'error' | 'bell';
  timestamp: string;
}

export const api = {
  async getHealth() {
    if (!canAttemptBackend()) {
      return {
        status: 'local_first_active',
        engine: 'SQLite WAL Local',
        layaDecisionEngine: 'Laya Engine Local (<35ms)',
        mem0MemoryLayer: 'Mem0 Local Layer',
        counts: { students: 0, attendanceEvents: 0, memories: 0 },
      };
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 800);
    try {
      const res = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error('Health check failed');
      isBackendReachable = true;
      return res.json();
    } catch (err) {
      clearTimeout(timeout);
      isBackendReachable = false;
      throw err;
    }
  },

  async scanGate(data: {
    rawToken: string;
    eventType: 'entry' | 'exit';
    allowRepetition?: boolean;
    operatorRole?: string;
  }): Promise<ScanResultPayload> {
    if (!canAttemptBackend() || isBackendReachable === false) {
      throw new Error('Backend indisponível (Operando em Contingência Local-First)');
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);
    try {
      const res = await fetch(`${API_BASE_URL}/gate/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Falha na requisição de portaria');
      }
      isBackendReachable = true;
      return res.json();
    } catch (err) {
      clearTimeout(timeout);
      isBackendReachable = false;
      throw err;
    }
  },

  async getGateStats() {
    if (!canAttemptBackend() || isBackendReachable === false) {
      return { totalToday: 0, entries: 0, exits: 0, anomalies: 0 };
    }
    try {
      const res = await fetch(`${API_BASE_URL}/gate/stats`);
      if (!res.ok) throw new Error('Stats check failed');
      return res.json();
    } catch {
      isBackendReachable = false;
      return { totalToday: 0, entries: 0, exits: 0, anomalies: 0 };
    }
  },

  async getStudents(filters?: { classId?: string; status?: string; search?: string }) {
    if (!canAttemptBackend() || isBackendReachable === false) return [];
    try {
      const params = new URLSearchParams();
      if (filters?.classId) params.append('classId', filters.classId);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.search) params.append('search', filters.search);

      const res = await fetch(`${API_BASE_URL}/students?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch students');
      return res.json();
    } catch {
      isBackendReachable = false;
      return [];
    }
  },

  async getMemories(studentId?: string) {
    if (!canAttemptBackend() || isBackendReachable === false) return [];
    try {
      const url = studentId ? `${API_BASE_URL}/memories?studentId=${studentId}` : `${API_BASE_URL}/memories`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch memories');
      return res.json();
    } catch {
      isBackendReachable = false;
      return [];
    }
  },

  async addMemory(data: {
    studentId: string;
    category: string;
    content: string;
    importance?: number;
  }) {
    if (!canAttemptBackend() || isBackendReachable === false) return { success: true };
    try {
      const res = await fetch(`${API_BASE_URL}/memories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create memory');
      return res.json();
    } catch {
      isBackendReachable = false;
      return { success: true };
    }
  },

  async getAttendanceHistory() {
    if (!canAttemptBackend() || isBackendReachable === false) return [];
    try {
      const res = await fetch(`${API_BASE_URL}/attendance`);
      if (!res.ok) throw new Error('Failed to fetch attendance');
      return res.json();
    } catch {
      isBackendReachable = false;
      return [];
    }
  },
};

