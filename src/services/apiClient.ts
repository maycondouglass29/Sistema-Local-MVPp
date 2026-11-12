// API Client com contingência Local-First automática

const API_BASE_URL = 'http://localhost:3002/api';

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
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  async scanGate(data: {
    rawToken: string;
    eventType: 'entry' | 'exit';
    allowRepetition?: boolean;
    operatorRole?: string;
  }): Promise<ScanResultPayload> {
    const res = await fetch(`${API_BASE_URL}/gate/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha na requisição de portaria');
    }
    return res.json();
  },

  async getGateStats() {
    const res = await fetch(`${API_BASE_URL}/gate/stats`);
    if (!res.ok) throw new Error('Stats check failed');
    return res.json();
  },

  async getStudents(filters?: { classId?: string; status?: string; search?: string }) {
    const params = new URLSearchParams();
    if (filters?.classId) params.append('classId', filters.classId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);

    const res = await fetch(`${API_BASE_URL}/students?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch students');
    return res.json();
  },

  async getMemories(studentId?: string) {
    const url = studentId ? `${API_BASE_URL}/memories?studentId=${studentId}` : `${API_BASE_URL}/memories`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch memories');
    return res.json();
  },

  async addMemory(data: {
    studentId: string;
    category: string;
    content: string;
    importance?: number;
  }) {
    const res = await fetch(`${API_BASE_URL}/memories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create memory');
    return res.json();
  },

  async getAttendanceHistory() {
    const res = await fetch(`${API_BASE_URL}/attendance`);
    if (!res.ok) throw new Error('Failed to fetch attendance');
    return res.json();
  },
};

