import {
  School,
  ClassRoom,
  Student,
  StudentIdentifier,
  AttendanceEvent,
  OutboxItem,
  AuditLog,
  ScanValidationResult,
  EventType,
  EventSource,
  SystemUser,
  UserRole,
  Guardian,
  SystemTechnicalSettings,
} from '../types/database';
import {
  generateUUIDv7,
  hashValue,
  generateOpaqueQrToken,
  generateIdempotencyKey,
  parseOpaqueQrToken,
} from '../utils/id';
import { evaluateScanRules, validateCorrection } from '../utils/rules';

const STORAGE_KEY = 'escolar_localfirst_db_v2';
const DEVICE_ID = 'terminal_portaria_01';

interface DatabaseSchema {
  school: School;
  classrooms: ClassRoom[];
  students: Student[];
  guardians: Guardian[];
  student_identifiers: StudentIdentifier[];
  attendance_events: AttendanceEvent[];
  outbox: OutboxItem[];
  audit_logs: AuditLog[];
  client_sequence: number;
  sync_version: number;
  system_settings?: SystemTechnicalSettings;
  users?: SystemUser[];
}

const DEFAULT_SCHOOL: School = {
  id: 'school_horizonte_01',
  name: 'Escola Horizonte',
  cnpj: '12.345.678/0001-90',
  address: 'Av. das Acácias, 1500 - Jardim Primavera, São Paulo - SP',
  school_year: '2026',
  morning_start: '07:00',
  morning_tolerance: '07:15',
  morning_end: '12:20',
  afternoon_start: '13:00',
  afternoon_tolerance: '13:15',
  afternoon_end: '18:20',
  timezone: 'America/Sao_Paulo',
  created_at: '2026-01-10T08:00:00Z',
  updated_at: '2026-01-10T08:00:00Z',
  sync_version: 1,
};

export const DEFAULT_SYSTEM_SETTINGS: SystemTechnicalSettings = {
  journal_mode: 'WAL',
  synchronous: 'NORMAL',
  cache_size: -2000,
  busy_timeout: 5000,
  foreign_keys: true,
  auto_vacuum: 'NONE',
  auto_backup_interval_hours: 24,
};

const DEFAULT_CLASSES: ClassRoom[] = [
  { id: 'class_1em_a', school_id: 'school_piloto_sp', name: '1º Ano A', grade: 'Ensino Médio', shift: 'morning' },
  { id: 'class_2em_b', school_id: 'school_piloto_sp', name: '2º Ano B', grade: 'Ensino Médio', shift: 'morning' },
  { id: 'class_3em_c', school_id: 'school_piloto_sp', name: '3º Ano C', grade: 'Ensino Médio', shift: 'morning' },
  { id: 'class_9ef_a', school_id: 'school_piloto_sp', name: '9º Ano A', grade: 'Fundamental II', shift: 'afternoon' },
];

export const SYSTEM_OPERATORS: SystemUser[] = [
  {
    id: 'admin_ti',
    name: 'Rafael Andrade (TI)',
    role: 'admin',
    badge_number: 'TI-01',
    email: 'admin@escola.local',
    password: 'admin123',
  },
  {
    id: 'coord_marcos',
    name: 'Prof. Marcos Rocha',
    role: 'coordinator',
    badge_number: 'COORD-02',
    email: 'coordenacao@escola.local',
    password: 'coord123',
  },
  {
    id: 'op_marina',
    name: 'Marina Azevedo',
    role: 'operator',
    badge_number: 'PORT-01',
    email: 'portaria@escola.local',
    password: 'portaria123',
  },
];

function generateSeedData(): DatabaseSchema {
  const school = DEFAULT_SCHOOL;
  const classrooms = DEFAULT_CLASSES;

  const rawStudents = [
    { code: '2024-001', name: 'Lucas Silva Santos', classId: 'class_1em_a', guardian: 'Renata Silva', phone: '(11) 98765-4321', status: 'active' as const, photo: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80' },
    { code: '2024-002', name: 'Beatriz Almeida Costa', classId: 'class_1em_a', guardian: 'Carlos Costa', phone: '(11) 97654-3210', status: 'active' as const, photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80' },
    { code: '2024-003', name: 'Gabriel Rodrigues Lima', classId: 'class_1em_a', guardian: 'Sônia Lima', phone: '(11) 96543-2109', status: 'blocked' as const, block_reason: 'Suspensão temporária / Coordenação', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
    { code: '2024-004', name: 'Mariana Duarte Souza', classId: 'class_1em_a', guardian: 'Fábio Souza', phone: '(11) 95432-1098', status: 'active' as const, photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' },
    { code: '2024-005', name: 'Enzo Ferreira Ramos', classId: 'class_2em_b', guardian: 'Juliana Ferreira', phone: '(11) 94321-0987', status: 'active' as const, photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
    { code: '2024-006', name: 'Sophia Martins Castro', classId: 'class_2em_b', guardian: 'André Castro', phone: '(11) 93210-9876', status: 'inactive' as const, photo: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80' },
    { code: '2024-007', name: 'Matheus Henrique Dias', classId: 'class_2em_b', guardian: 'Paula Dias', phone: '(11) 92109-8765', status: 'active' as const, photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80' },
    { code: '2024-008', name: 'Camila Nogueira Pires', classId: 'class_2em_b', guardian: 'Roberto Pires', phone: '(11) 91098-7654', status: 'active' as const, photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
    { code: '2024-009', name: 'Thiago Farias Barreto', classId: 'class_3em_c', guardian: 'Vanessa Barreto', phone: '(11) 99887-6543', status: 'active' as const, photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80' },
    { code: '2024-010', name: 'Larissa Azevedo Mendes', classId: 'class_3em_c', guardian: 'Marcelo Mendes', phone: '(11) 98876-5432', status: 'active' as const, photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80' },
    { code: '2024-011', name: 'Guilherme Peixoto Prado', classId: 'class_3em_c', guardian: 'Cristina Prado', phone: '(11) 97765-4321', status: 'active' as const, photo: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80' },
    { code: '2024-012', name: 'Isabela Fontes Guimarães', classId: 'class_9ef_a', guardian: 'Eduardo Guimarães', phone: '(11) 96654-3210', status: 'active' as const, photo: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80' },
    { code: '2024-013', name: 'Felipe Antunes Moraes', classId: 'class_9ef_a', guardian: 'Tatiane Moraes', phone: '(11) 95543-2109', status: 'active' as const, photo: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=150&auto=format&fit=crop&q=80' },
  ];

  const nowIso = new Date().toISOString();
  const students: Student[] = [];
  const student_identifiers: StudentIdentifier[] = [];

  rawStudents.forEach((raw, idx) => {
    const studentId = `stu_${String(idx + 1).padStart(3, '0')}`;
    students.push({
      id: studentId,
      school_id: school.id,
      enrollment_code: raw.code,
      full_name: raw.name,
      class_id: raw.classId,
      status: raw.status,
      photo_ref: raw.photo,
      valid_from: '2026-02-01',
      valid_until: '2026-12-31',
      guardian_name: raw.guardian,
      guardian_phone: raw.phone,
      block_reason: (raw as { block_reason?: string }).block_reason,
      created_at: nowIso,
      updated_at: nowIso,
    });

    // Generate active opaque token for QR Code
    const rawToken = generateOpaqueQrToken(school.id, studentId);
    student_identifiers.push({
      id: `ident_${String(idx + 1).padStart(3, '0')}`,
      school_id: school.id,
      student_id: studentId,
      kind: 'qr',
      value_hash: hashValue(rawToken),
      value_last4: rawToken.slice(-6),
      raw_token: rawToken,
      active: 1,
      issued_at: nowIso,
    });
  });

  // Seed sample morning attendance events (in the past today)
  const nowMs = Date.now();
  const time1 = new Date(nowMs - 3 * 3600 * 1000).toISOString();
  const time2 = new Date(nowMs - 2.8 * 3600 * 1000).toISOString();
  const time3 = new Date(nowMs - 2.5 * 3600 * 1000).toISOString();

  const attendance_events: AttendanceEvent[] = [
    {
      id: generateUUIDv7(),
      school_id: school.id,
      student_id: 'stu_001',
      event_type: 'entry',
      occurred_at_device: time1,
      occurred_at_utc: time1,
      device_id: DEVICE_ID,
      operator_id: 'op_claudia',
      source: 'qr',
      client_sequence: 1,
      created_at: time1,
      sync_state: 'acked',
    },
    {
      id: generateUUIDv7(),
      school_id: school.id,
      student_id: 'stu_002',
      event_type: 'entry',
      occurred_at_device: time2,
      occurred_at_utc: time2,
      device_id: DEVICE_ID,
      operator_id: 'op_claudia',
      source: 'qr',
      client_sequence: 2,
      created_at: time2,
      sync_state: 'acked',
    },
    {
      id: generateUUIDv7(),
      school_id: school.id,
      student_id: 'stu_004',
      event_type: 'entry',
      occurred_at_device: time3,
      occurred_at_utc: time3,
      device_id: DEVICE_ID,
      operator_id: 'op_claudia',
      source: 'enrollment',
      client_sequence: 3,
      created_at: time3,
      sync_state: 'acked',
    },
  ];

  const audit_logs: AuditLog[] = [
    {
      id: generateUUIDv7(),
      school_id: school.id,
      actor_id: 'admin_ti',
      actor_name: 'Rafael Andrade (TI)',
      action: 'INITIALIZE_TERMINAL',
      entity_type: 'school',
      entity_id: school.id,
      metadata_json: JSON.stringify({ pragma: 'WAL', device_id: DEVICE_ID }),
      occurred_at: nowIso,
    },
  ];

  const guardians: Guardian[] = [
    {
      id: 'guard_001',
      school_id: school.id,
      full_name: 'Renata Silva Santos',
      phone: '(11) 98765-4321',
      email: 'renata.silva@exemplo.com.br',
      relationship: 'Mãe',
      cpf_masked: '***.451.890-**',
      student_ids: ['stu_001'],
      created_at: nowIso,
    },
    {
      id: 'guard_002',
      school_id: school.id,
      full_name: 'Carlos Costa',
      phone: '(11) 97654-3210',
      email: 'carlos.costa@exemplo.com.br',
      relationship: 'Pai',
      cpf_masked: '***.329.110-**',
      student_ids: ['stu_002'],
      created_at: nowIso,
    },
    {
      id: 'guard_003',
      school_id: school.id,
      full_name: 'Sônia Lima',
      phone: '(11) 96543-2109',
      email: 'sonia.lima@exemplo.com.br',
      relationship: 'Mãe',
      cpf_masked: '***.882.500-**',
      student_ids: ['stu_003'],
      created_at: nowIso,
    },
  ];

  return {
    school,
    classrooms,
    students,
    guardians,
    student_identifiers,
    attendance_events,
    outbox: [],
    audit_logs,
    client_sequence: 4,
    sync_version: 1,
    system_settings: { ...DEFAULT_SYSTEM_SETTINGS },
    users: [...SYSTEM_OPERATORS],
  };
}

export class LocalDatabaseService {
  private data: DatabaseSchema;
  private listeners: Set<() => void> = new Set();
  public isOnline: boolean = true;
  public isSyncing: boolean = false;
  public lastSyncAt: string | null = null;
  public lastSyncError: string | null = null;
  private _currentOperator: SystemUser = SYSTEM_OPERATORS[0];

  public get currentOperator(): SystemUser {
    return this._currentOperator;
  }

  public set currentOperator(op: SystemUser) {
    this._currentOperator = op;
    this.notify();
  }

  constructor() {
    this.data = this.loadFromStorage();
    // Start auto outbox worker simulation every 6 seconds
    if (typeof window !== 'undefined') {
      window.setInterval(() => {
        if (this.isOnline && !this.isSyncing) {
          this.processOutboxBatch().catch(() => {});
        }
      }, 6000);
    }
  }

  private loadFromStorage(): DatabaseSchema {
    if (typeof window === 'undefined') {
      return generateSeedData();
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (!parsed.users || !Array.isArray(parsed.users) || parsed.users.length === 0) {
          parsed.users = [...SYSTEM_OPERATORS];
        }
        return parsed;
      }
    } catch {
      // fallback to seed
    }
    const seed = generateSeedData();
    this.saveToStorage(seed);
    return seed;
  }

  private saveToStorage(schema: DatabaseSchema): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(schema));
    } catch {
      // storage quota or error
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.saveToStorage(this.data);
    this.listeners.forEach((l) => l());
  }

  // --- GETTERS ---
  public getSchool(): School {
    return this.data.school;
  }

  public getClassrooms(): ClassRoom[] {
    return this.data.classrooms;
  }

  public getStudents(): Student[] {
    return this.data.students.filter((s) => !s.deleted_at);
  }

  public getGuardians(): Guardian[] {
    return this.data.guardians || [];
  }

  public addGuardian(guardianData: Partial<Guardian>): Guardian {
    const nowIso = new Date().toISOString();
    const newGuardian: Guardian = {
      id: `guard_${generateUUIDv7().slice(0, 8)}`,
      school_id: this.data.school.id,
      full_name: guardianData.full_name || 'Novo Responsável',
      phone: guardianData.phone || '',
      email: guardianData.email,
      relationship: guardianData.relationship || 'Mãe',
      cpf_masked: guardianData.cpf_masked,
      student_ids: guardianData.student_ids || [],
      created_at: nowIso,
    };
    if (!this.data.guardians) {
      this.data.guardians = [];
    }
    this.data.guardians.push(newGuardian);

    this.data.audit_logs.unshift({
      id: generateUUIDv7(),
      school_id: this.data.school.id,
      actor_id: this.currentOperator.id,
      actor_name: this.currentOperator.name,
      action: 'GUARDIAN_CREATED',
      entity_type: 'guardian',
      entity_id: newGuardian.id,
      metadata_json: JSON.stringify({ full_name: newGuardian.full_name, phone: newGuardian.phone }),
      occurred_at: nowIso,
    });

    this.notify();
    return newGuardian;
  }

  public deleteGuardian(id: string): void {
    if (!this.data.guardians) return;
    this.data.guardians = this.data.guardians.filter((g) => g.id !== id);
    this.notify();
  }

  public updateGuardian(id: string, updates: Partial<Guardian>): Guardian {
    if (!this.data.guardians) {
      this.data.guardians = [];
    }
    const guardian = this.data.guardians.find((g) => g.id === id);
    if (!guardian) {
      throw new Error(`Responsável com ID ${id} não encontrado.`);
    }
    Object.assign(guardian, updates);
    this.data.audit_logs.unshift({
      id: generateUUIDv7(),
      school_id: this.data.school.id,
      actor_id: this.currentOperator.id,
      actor_name: this.currentOperator.name,
      action: 'GUARDIAN_UPDATED',
      entity_type: 'guardian',
      entity_id: id,
      metadata_json: JSON.stringify({ updates }),
      occurred_at: new Date().toISOString(),
    });
    this.notify();
    return guardian;
  }

  public getStudentById(id: string): Student | undefined {
    return this.data.students.find((s) => s.id === id && !s.deleted_at);
  }

  public getActiveIdentifier(studentId: string): StudentIdentifier | undefined {
    return this.data.student_identifiers.find(
      (i) => i.student_id === studentId && i.active === 1
    );
  }

  public getAttendanceEvents(): AttendanceEvent[] {
    return [...this.data.attendance_events].sort(
      (a, b) => new Date(b.occurred_at_device).getTime() - new Date(a.occurred_at_device).getTime()
    );
  }

  public getOutboxItems(): OutboxItem[] {
    return [...this.data.outbox].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  public getPendingOutboxCount(): number {
    return this.data.outbox.filter((o) => o.state === 'pending' || o.state === 'sending').length;
  }

  public getAuditLogs(): AuditLog[] {
    return [...this.data.audit_logs].sort(
      (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
    );
  }

  // --- CORE SCAN RESOLVER & BUSINESS VALIDATION ---
  /**
   * Resolves a raw scan input (QR token, Barcode, or typed Enrollment Code)
   * Guaranteed to complete in <500ms (typically 2-15ms locally).
   */
  public resolveScanInput(
    rawInput: string,
    requestedType: EventType,
    sourceOverride?: EventSource
  ): ScanValidationResult {
    const startTime = performance.now();
    const cleanInput = rawInput.trim();

    if (!cleanInput) {
      return {
        allowed: false,
        alertType: 'denied',
        message: 'Código de leitura vazio ou inválido',
        latencyMs: Math.round(performance.now() - startTime),
      };
    }

    let detectedStudent: Student | undefined;
    let detectedIdentifier: StudentIdentifier | undefined;
    let source: EventSource = sourceOverride || 'qr';

    // 1. Try parsing as Opaque Token format: school_xx:student:uuid:v1
    const parsedToken = parseOpaqueQrToken(cleanInput);
    if (parsedToken.valid) {
      const tokenHash = hashValue(cleanInput);
      detectedIdentifier = this.data.student_identifiers.find(
        (i) => (i.value_hash === tokenHash || i.raw_token === cleanInput) && i.active === 1
      );
      if (detectedIdentifier) {
        detectedStudent = this.data.students.find((s) => s.id === detectedIdentifier?.student_id);
      }
    }

    // 2. If not found, try searching by enrollment_code (matricula fallback)
    if (!detectedStudent) {
      detectedStudent = this.data.students.find(
        (s) => s.enrollment_code.toLowerCase() === cleanInput.toLowerCase() && !s.deleted_at
      );
      if (detectedStudent) {
        source = 'enrollment';
        detectedIdentifier = this.getActiveIdentifier(detectedStudent.id);
      }
    }

    // 3. If still not found, search by direct student_id or raw token string match
    if (!detectedStudent) {
      detectedIdentifier = this.data.student_identifiers.find(
        (i) => i.raw_token === cleanInput && i.active === 1
      );
      if (detectedIdentifier) {
        detectedStudent = this.data.students.find((s) => s.id === detectedIdentifier?.student_id);
      }
    }

    if (!detectedStudent) {
      const latencyMs = Math.round(performance.now() - startTime);
      return {
        allowed: false,
        alertType: 'denied',
        message: `Identificador '${cleanInput}' não localizado no banco local. Carteirinha inválida ou revogada.`,
        latencyMs,
      };
    }

    const classRoom = this.data.classrooms.find((c) => c.id === detectedStudent?.class_id);

    // Retrieve today's events for this student
    const todayStr = new Date().toISOString().slice(0, 10);
    const lastEventsToday = this.data.attendance_events.filter(
      (e) => e.student_id === detectedStudent?.id && e.occurred_at_device.startsWith(todayStr)
    );

    const ruleCheck = evaluateScanRules({
      student: detectedStudent,
      requestedType,
      lastEventsToday,
      currentTime: new Date(),
      duplicityWindowSeconds: 60,
    });

    const latencyMs = Math.round(performance.now() - startTime);

    return {
      allowed: ruleCheck.allowed,
      alertType: ruleCheck.alertType,
      message: ruleCheck.message,
      student: detectedStudent,
      classRoom,
      activeIdentifier: detectedIdentifier,
      lastEventToday: lastEventsToday[0],
      latencyMs,
    };
  }

  /**
   * ATOMIC TRANSACTION:
   * Records Attendance Event + Outbox Item atomically (PRD Section 6.1).
   */
  public commitAttendanceScan(
    studentId: string,
    eventType: EventType,
    source: EventSource,
    rawValue: string
  ): AttendanceEvent {
    const nowIso = new Date().toISOString();
    const eventId = generateUUIDv7();
    const seq = this.data.client_sequence++;

    const student = this.getStudentById(studentId);
    if (!student) {
      throw new Error(`Aluno ${studentId} não encontrado.`);
    }

    // 1. Create Immutable Attendance Event
    const newEvent: AttendanceEvent = {
      id: eventId,
      school_id: this.data.school.id,
      student_id: studentId,
      event_type: eventType,
      occurred_at_device: nowIso,
      occurred_at_utc: nowIso,
      device_id: DEVICE_ID,
      operator_id: this.currentOperator.id,
      source,
      source_value_hash: hashValue(rawValue),
      client_sequence: seq,
      created_at: nowIso,
      sync_state: 'pending',
    };

    // 2. Create Outbox Item (Outbox Pattern)
    const idempotencyKey = generateIdempotencyKey(this.data.school.id, DEVICE_ID, seq);
    const outboxItem: OutboxItem = {
      id: generateUUIDv7(),
      aggregate_type: 'attendance_event',
      aggregate_id: eventId,
      operation: 'append',
      payload_json: JSON.stringify(newEvent),
      idempotency_key: idempotencyKey,
      created_at: nowIso,
      attempt_count: 0,
      state: 'pending',
    };

    // 3. Record Audit Log
    const auditItem: AuditLog = {
      id: generateUUIDv7(),
      school_id: this.data.school.id,
      actor_id: this.currentOperator.id,
      actor_name: this.currentOperator.name,
      action: eventType === 'entry' ? 'RECORD_ENTRY' : 'RECORD_EXIT',
      entity_type: 'attendance_event',
      entity_id: eventId,
      metadata_json: JSON.stringify({
        student_id: studentId,
        student_name: student.full_name,
        source,
        idempotencyKey,
      }),
      occurred_at: nowIso,
    };

    // Atomic Push
    this.data.attendance_events.unshift(newEvent);
    this.data.outbox.unshift(outboxItem);
    this.data.audit_logs.unshift(auditItem);

    this.notify();
    return newEvent;
  }

  /**
   * NON-DESTRUCTIVE CORRECTION (RF-05):
   * Never updates or deletes original event.
   * Inserts an event with event_type = 'correction', referencing correction_of_id.
   */
  public commitCorrection(originalEventId: string, reason: string): AttendanceEvent {
    const originalEvent = this.data.attendance_events.find((e) => e.id === originalEventId);
    const validation = validateCorrection(originalEvent, reason, this.currentOperator.id);
    if (!validation.valid || !originalEvent) {
      throw new Error(validation.error || 'Erro na validação da correção.');
    }

    const nowIso = new Date().toISOString();
    const correctionEventId = generateUUIDv7();
    const seq = this.data.client_sequence++;

    const correctionEvent: AttendanceEvent = {
      id: correctionEventId,
      school_id: this.data.school.id,
      student_id: originalEvent.student_id,
      event_type: 'correction',
      occurred_at_device: nowIso,
      occurred_at_utc: nowIso,
      device_id: DEVICE_ID,
      operator_id: this.currentOperator.id,
      source: 'manual',
      correction_of_id: originalEventId,
      correction_reason: reason,
      client_sequence: seq,
      created_at: nowIso,
      sync_state: 'pending',
    };

    const idempotencyKey = generateIdempotencyKey(this.data.school.id, DEVICE_ID, seq);
    const outboxItem: OutboxItem = {
      id: generateUUIDv7(),
      aggregate_type: 'attendance_event',
      aggregate_id: correctionEventId,
      operation: 'append',
      payload_json: JSON.stringify(correctionEvent),
      idempotency_key: idempotencyKey,
      created_at: nowIso,
      attempt_count: 0,
      state: 'pending',
    };

    const auditItem: AuditLog = {
      id: generateUUIDv7(),
      school_id: this.data.school.id,
      actor_id: this.currentOperator.id,
      actor_name: this.currentOperator.name,
      action: 'CORRECTION_APPLIED',
      entity_type: 'attendance_event',
      entity_id: correctionEventId,
      metadata_json: JSON.stringify({
        original_event_id: originalEventId,
        reason,
        idempotencyKey,
      }),
      occurred_at: nowIso,
    };

    this.data.attendance_events.unshift(correctionEvent);
    this.data.outbox.unshift(outboxItem);
    this.data.audit_logs.unshift(auditItem);

    this.notify();
    return correctionEvent;
  }

  // --- TOKEN ISSUANCE & REVOCATION (RF-7.1 / RF-08) ---
  public revokeAndReissueToken(studentId: string): StudentIdentifier {
    const student = this.getStudentById(studentId);
    if (!student) throw new Error('Aluno não encontrado.');

    const nowIso = new Date().toISOString();

    // Revoke previous tokens
    this.data.student_identifiers.forEach((ident) => {
      if (ident.student_id === studentId && ident.active === 1) {
        ident.active = 0;
        ident.revoked_at = nowIso;
      }
    });

    // Issue brand new opaque token
    const rawToken = generateOpaqueQrToken(this.data.school.id, studentId);
    student.badge_printed_at = undefined;
    const newIdent: StudentIdentifier = {
      id: generateUUIDv7(),
      school_id: this.data.school.id,
      student_id: studentId,
      kind: 'qr',
      value_hash: hashValue(rawToken),
      value_last4: rawToken.slice(-6),
      raw_token: rawToken,
      active: 1,
      issued_at: nowIso,
    };

    this.data.student_identifiers.push(newIdent);

    // Audit
    this.data.audit_logs.unshift({
      id: generateUUIDv7(),
      school_id: this.data.school.id,
      actor_id: this.currentOperator.id,
      actor_name: this.currentOperator.name,
      action: 'TOKEN_REISSUED',
      entity_type: 'student_identifier',
      entity_id: newIdent.id,
      metadata_json: JSON.stringify({ student_id: studentId, new_token_hash: newIdent.value_hash }),
      occurred_at: nowIso,
    });

    this.notify();
    return newIdent;
  }

  // --- STUDENT & CLASSROOM CRUD ---
  public addStudent(studentData: Partial<Student>): Student {
    const nowIso = new Date().toISOString();
    const studentId = generateUUIDv7();
    const enrollmentCode =
      studentData.enrollment_code ||
      `2026-${String(this.data.students.length + 1).padStart(3, '0')}`;

    const newStudent: Student = {
      id: studentId,
      school_id: this.data.school.id,
      enrollment_code: enrollmentCode,
      full_name: studentData.full_name || 'Novo Aluno',
      preferred_name: studentData.preferred_name,
      class_id: studentData.class_id || this.data.classrooms[0].id,
      status: studentData.status || 'active',
      photo_ref:
        studentData.photo_ref ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      valid_from: studentData.valid_from || '2026-02-01',
      valid_until: studentData.valid_until || '2026-12-31',
      guardian_name: studentData.guardian_name,
      guardian_phone: studentData.guardian_phone,
      guardian_relationship: studentData.guardian_relationship,
      emergency_phone: studentData.emergency_phone,
      birth_date: studentData.birth_date,
      document_number: studentData.document_number,
      medical_notes: studentData.medical_notes,
      pickup_authorized_names: studentData.pickup_authorized_names,
      gate_notes: studentData.gate_notes,
      block_reason: studentData.block_reason,
      created_at: nowIso,
      updated_at: nowIso,
    };

    this.data.students.push(newStudent);

    // 1. Create active opaque token (LGPD compliant for QR Cards)
    const rawToken = generateOpaqueQrToken(this.data.school.id, studentId);
    this.data.student_identifiers.push({
      id: generateUUIDv7(),
      school_id: this.data.school.id,
      student_id: studentId,
      kind: 'qr',
      value_hash: hashValue(rawToken),
      value_last4: rawToken.slice(-6),
      raw_token: rawToken,
      active: 1,
      issued_at: nowIso,
    });

    // 2. Also create an enrollment code identifier for barcode or direct keyboard scan
    this.data.student_identifiers.push({
      id: generateUUIDv7(),
      school_id: this.data.school.id,
      student_id: studentId,
      kind: 'enrollment',
      value_hash: hashValue(enrollmentCode),
      value_last4: enrollmentCode.slice(-4),
      raw_token: enrollmentCode,
      active: 1,
      issued_at: nowIso,
    });

    // 3. Register guardian in list if provided
    if (studentData.guardian_name && studentData.guardian_phone) {
      if (!this.data.guardians) this.data.guardians = [];
      const existingGuard = this.data.guardians.find(
        (g) => g.phone === studentData.guardian_phone
      );
      if (!existingGuard) {
        this.data.guardians.push({
          id: generateUUIDv7(),
          school_id: this.data.school.id,
          full_name: studentData.guardian_name,
          phone: studentData.guardian_phone,
          relationship: studentData.guardian_relationship || 'Responsável Legal',
          student_ids: [studentId],
          created_at: nowIso,
        });
      } else {
        if (!existingGuard.student_ids.includes(studentId)) {
          existingGuard.student_ids.push(studentId);
        }
      }
    }

    // Audit
    this.data.audit_logs.unshift({
      id: generateUUIDv7(),
      school_id: this.data.school.id,
      actor_id: this.currentOperator.id,
      actor_name: this.currentOperator.name,
      action: 'STUDENT_CREATED',
      entity_type: 'student',
      entity_id: studentId,
      metadata_json: JSON.stringify({
        enrollment_code: newStudent.enrollment_code,
        full_name: newStudent.full_name,
        class_id: newStudent.class_id,
      }),
      occurred_at: nowIso,
    });

    this.notify();
    return newStudent;
  }

  public updateStudentStatus(studentId: string, status: Student['status'], blockReason?: string): void {
    const student = this.getStudentById(studentId);
    if (!student) return;

    student.status = status;
    student.block_reason = blockReason;
    student.updated_at = new Date().toISOString();

    this.data.audit_logs.unshift({
      id: generateUUIDv7(),
      school_id: this.data.school.id,
      actor_id: this.currentOperator.id,
      actor_name: this.currentOperator.name,
      action: 'STUDENT_STATUS_UPDATED',
      entity_type: 'student',
      entity_id: studentId,
      metadata_json: JSON.stringify({ status, blockReason }),
      occurred_at: new Date().toISOString(),
    });

    this.notify();
  }

  public blockStudent(studentId: string, reason: string): void {
    this.updateStudentStatus(studentId, 'blocked', reason);
  }

  public unblockStudent(studentId: string, reason?: string): void {
    this.updateStudentStatus(studentId, 'active', reason);
  }

  public deleteStudent(studentId: string): void {
    const student = this.getStudentById(studentId);
    if (!student) return;
    student.status = 'inactive';
    student.deleted_at = new Date().toISOString();
    student.updated_at = new Date().toISOString();
    this.notify();
  }

  public createAttendanceCorrection(originalEventId: string, reason: string): AttendanceEvent {
    return this.commitCorrection(originalEventId, reason);
  }

  public markBadgesAsPrinted(studentIds: string[]): void {
    const now = new Date().toISOString();
    let changed = false;
    for (const id of studentIds) {
      const student = this.getStudentById(id);
      if (student) {
        student.badge_printed_at = now;
        student.updated_at = now;
        changed = true;
      }
    }
    if (changed) {
      this.notify();
    }
  }

  public markBadgeAsPending(studentId: string): void {
    const student = this.getStudentById(studentId);
    if (student) {
      delete student.badge_printed_at;
      student.updated_at = new Date().toISOString();
      this.notify();
    }
  }


  public addClassroom(name: string, grade: string, shift: 'morning' | 'afternoon' | 'integral'): ClassRoom {
    const newClass: ClassRoom = {
      id: `class_${generateUUIDv7().slice(0, 8)}`,
      school_id: this.data.school.id,
      name,
      grade,
      shift,
    };
    this.data.classrooms.push(newClass);
    this.notify();
    return newClass;
  }

  public updateClassroom(
    id: string,
    updates: { name?: string; grade?: string; shift?: 'morning' | 'afternoon' | 'integral' }
  ): ClassRoom {
    const classroom = this.data.classrooms.find((c) => c.id === id);
    if (!classroom) {
      throw new Error(`Turma com ID ${id} não encontrada.`);
    }
    if (updates.name !== undefined) classroom.name = updates.name.trim();
    if (updates.grade !== undefined) classroom.grade = updates.grade.trim();
    if (updates.shift !== undefined) classroom.shift = updates.shift;
    this.notify();
    return classroom;
  }

  public deleteClassroom(id: string): { success: boolean; message?: string } {
    const studentCount = this.data.students.filter((s) => s.class_id === id && !s.deleted_at).length;
    if (studentCount > 0) {
      return {
        success: false,
        message: `Não é possível excluir esta turma pois existem ${studentCount} estudante(s) matriculado(s) nela.`
      };
    }
    this.data.classrooms = this.data.classrooms.filter((c) => c.id !== id);
    this.notify();
    return { success: true };
  }

  public recordManualAttendance(params: {
    studentId: string;
    eventType: EventType;
    occurredAt?: string;
    reason: string;
    guardianName?: string;
  }): AttendanceEvent {
    const student = this.getStudentById(params.studentId);
    if (!student) {
      throw new Error(`Estudante com ID ${params.studentId} não encontrado.`);
    }

    const nowIso = new Date().toISOString();
    const eventTimeIso = params.occurredAt
      ? new Date(params.occurredAt).toISOString()
      : nowIso;
    const eventId = generateUUIDv7();
    const seq = this.data.client_sequence++;

    const newEvent: AttendanceEvent = {
      id: eventId,
      school_id: this.data.school.id,
      student_id: params.studentId,
      event_type: params.eventType,
      occurred_at_device: eventTimeIso,
      occurred_at_utc: eventTimeIso,
      device_id: DEVICE_ID,
      operator_id: this.currentOperator.id,
      source: 'manual',
      source_value_hash: hashValue(`manual:${params.studentId}:${eventTimeIso}`),
      notes: params.reason,
      guardian_name: params.guardianName || undefined,
      client_sequence: seq,
      created_at: nowIso,
      sync_state: 'pending',
    };

    const idempotencyKey = generateIdempotencyKey(this.data.school.id, DEVICE_ID, seq);
    const outboxItem: OutboxItem = {
      id: generateUUIDv7(),
      aggregate_type: 'attendance_event',
      aggregate_id: eventId,
      operation: 'append',
      payload_json: JSON.stringify(newEvent),
      idempotency_key: idempotencyKey,
      created_at: nowIso,
      attempt_count: 0,
      state: 'pending',
    };

    const auditItem: AuditLog = {
      id: generateUUIDv7(),
      school_id: this.data.school.id,
      actor_id: this.currentOperator.id,
      actor_name: this.currentOperator.name,
      action: params.eventType === 'entry' ? 'MANUAL_ENTRY_RECORDED' : 'MANUAL_EXIT_RECORDED',
      entity_type: 'attendance_event',
      entity_id: eventId,
      metadata_json: JSON.stringify({
        student_id: params.studentId,
        student_name: student.full_name,
        reason: params.reason,
        guardian_name: params.guardianName,
        occurred_at: eventTimeIso,
      }),
      occurred_at: nowIso,
    };

    this.data.attendance_events.unshift(newEvent);
    this.data.outbox.unshift(outboxItem);
    this.data.audit_logs.unshift(auditItem);

    this.notify();
    return newEvent;
  }

  // --- OUTBOX BACKGROUND SYNC WORKER (Section 6.1) ---
  public async processOutboxBatch(): Promise<{ processed: number; success: boolean }> {
    if (!this.isOnline) {
      return { processed: 0, success: false };
    }

    const pendingItems = this.data.outbox.filter(
      (o) => o.state === 'pending' || o.state === 'sending'
    );

    if (pendingItems.length === 0) {
      return { processed: 0, success: true };
    }

    this.isSyncing = true;
    this.notify();

    // Emulate network transmission latency (120ms)
    await new Promise((r) => setTimeout(r, 150));

    try {
      pendingItems.forEach((item) => {
        item.state = 'acked';
        item.attempt_count += 1;

        // Also update matching attendance event sync_state
        if (item.aggregate_type === 'attendance_event') {
          const ev = this.data.attendance_events.find((e) => e.id === item.aggregate_id);
          if (ev) {
            ev.sync_state = 'acked';
          }
        }
      });

      this.lastSyncAt = new Date().toISOString();
      this.lastSyncError = null;
      this.isSyncing = false;
      this.notify();
      return { processed: pendingItems.length, success: true };
    } catch (err) {
      this.lastSyncError = String(err);
      this.isSyncing = false;
      this.notify();
      return { processed: 0, success: false };
    }
  }

  // --- NETWORK STATE SIMULATION ---
  public toggleOnline(): void {
    this.isOnline = !this.isOnline;
    if (this.isOnline) {
      this.processOutboxBatch().catch(() => {});
    }
    this.notify();
  }

  // --- RESET & BACKUP UTILITIES ---
  public resetToFactorySeed(): void {
    this.data = generateSeedData();
    this.saveToStorage(this.data);
    this.notify();
  }

  public updateSchool(updates: Partial<School>): void {
    this.data.school = {
      ...this.data.school,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.saveToStorage(this.data);
    this.notify();
  }

  public getSystemSettings(): SystemTechnicalSettings {
    if (!this.data.system_settings) {
      this.data.system_settings = { ...DEFAULT_SYSTEM_SETTINGS };
    }
    return { ...this.data.system_settings };
  }

  public updateSystemSettings(updates: Partial<SystemTechnicalSettings>): void {
    this.data.system_settings = {
      ...this.getSystemSettings(),
      ...updates,
    };
    this.saveToStorage(this.data);
    this.notify();
  }

  public runVacuum(): { freedPages: number; durationMs: number; status: string } {
    const t0 = performance.now();
    // Simulate SQLite WAL vacuum and page reclamation
    const durationMs = Math.round((performance.now() - t0) * 100) / 100;
    return {
      freedPages: 0,
      durationMs: durationMs || 0.15,
      status: 'VACUUM concluído com sucesso. Páginas desfragmentadas e checkpoint WAL sincronizado.',
    };
  }

  public runReindex(): { indexesRebuilt: number; durationMs: number; status: string } {
    const t0 = performance.now();
    const durationMs = Math.round((performance.now() - t0) * 100) / 100;
    return {
      indexesRebuilt: 4,
      durationMs: durationMs || 0.12,
      status: 'REINDEX concluído com sucesso. Índices de matrícula, hash de token e timestamp recriados.',
    };
  }

  public executeSqlConsole(rawSql: string): {
    columns: string[];
    rows: any[][];
    rowCount: number;
    executionTimeMs: number;
    error?: string;
    commandType: string;
  } {
    const t0 = performance.now();
    const sql = rawSql.trim().replace(/;+$/, '');
    const lower = sql.toLowerCase();

    try {
      if (!sql) {
        throw new Error('Nenhuma instrução SQL informada.');
      }

      // 1. PRAGMAS
      if (lower.startsWith('pragma')) {
        const pragmaMatch = lower.match(/^pragma\s+([a-z_]+)(?:\s*=\s*([a-z0-9_-]+))?/i);
        const pragmaName = pragmaMatch ? pragmaMatch[1].toLowerCase() : 'integrity_check';
        const pragmaVal = pragmaMatch ? pragmaMatch[2] : null;

        if (pragmaVal) {
          const s = this.getSystemSettings();
          if (pragmaName === 'journal_mode') {
            this.updateSystemSettings({ journal_mode: pragmaVal.toUpperCase() as any });
          } else if (pragmaName === 'synchronous') {
            this.updateSystemSettings({ synchronous: pragmaVal.toUpperCase() as any });
          } else if (pragmaName === 'foreign_keys') {
            this.updateSystemSettings({ foreign_keys: pragmaVal === 'on' || pragmaVal === '1' });
          } else if (pragmaName === 'busy_timeout') {
            this.updateSystemSettings({ busy_timeout: parseInt(pragmaVal, 10) || 5000 });
          }
          const dur = Math.round((performance.now() - t0) * 100) / 100;
          return {
            columns: ['pragma', 'status'],
            rows: [[pragmaName, `DEFINIDO PARA: ${pragmaVal.toUpperCase()}`]],
            rowCount: 1,
            executionTimeMs: dur,
            commandType: 'PRAGMA_SET',
          };
        } else {
          const s = this.getSystemSettings();
          let val: any = 'ok';
          if (pragmaName === 'journal_mode') val = s.journal_mode;
          else if (pragmaName === 'synchronous') val = s.synchronous;
          else if (pragmaName === 'cache_size') val = s.cache_size;
          else if (pragmaName === 'busy_timeout') val = `${s.busy_timeout}ms`;
          else if (pragmaName === 'foreign_keys') val = s.foreign_keys ? 1 : 0;
          else if (pragmaName === 'auto_vacuum') val = s.auto_vacuum;
          else if (pragmaName === 'page_count') val = 142;
          else if (pragmaName === 'freelist_count') val = 0;
          else if (pragmaName === 'integrity_check') val = 'ok (0 corrupções detectadas)';

          const dur = Math.round((performance.now() - t0) * 100) / 100;
          return {
            columns: ['pragma', 'value'],
            rows: [[pragmaName, val]],
            rowCount: 1,
            executionTimeMs: dur,
            commandType: 'PRAGMA_GET',
          };
        }
      }

      // 2. VACUUM
      if (lower === 'vacuum') {
        const res = this.runVacuum();
        return {
          columns: ['operation', 'status', 'duration_ms'],
          rows: [['VACUUM', res.status, `${res.durationMs}ms`]],
          rowCount: 1,
          executionTimeMs: res.durationMs,
          commandType: 'VACUUM',
        };
      }

      // 3. REINDEX
      if (lower.startsWith('reindex')) {
        const res = this.runReindex();
        return {
          columns: ['operation', 'indexes_rebuilt', 'status'],
          rows: [['REINDEX', String(res.indexesRebuilt), res.status]],
          rowCount: 1,
          executionTimeMs: res.durationMs,
          commandType: 'REINDEX',
        };
      }

      // 4. SELECT
      if (lower.startsWith('select')) {
        let dataset: any[] = [];
        let targetTable = '';

        if (lower.includes('from students') || lower.includes('from student')) {
          targetTable = 'students';
          dataset = this.data.students;
        } else if (lower.includes('from classrooms') || lower.includes('from classroom')) {
          targetTable = 'classrooms';
          dataset = this.data.classrooms;
        } else if (lower.includes('from guardians') || lower.includes('from guardian')) {
          targetTable = 'guardians';
          dataset = this.data.guardians || [];
        } else if (lower.includes('from attendance_events') || lower.includes('from attendance_event')) {
          targetTable = 'attendance_events';
          dataset = this.data.attendance_events;
        } else if (lower.includes('from outbox')) {
          targetTable = 'outbox';
          dataset = this.data.outbox;
        } else if (lower.includes('from school')) {
          targetTable = 'school';
          dataset = [this.data.school];
        } else if (lower.includes('from users') || lower.includes('from user')) {
          targetTable = 'users';
          dataset = this.getUsers().map((u) => ({
            id: u.id,
            name: u.name,
            role: u.role,
            badge_number: u.badge_number,
            email: u.email,
          }));
        }

        if (!targetTable) {
          throw new Error('Tabela não reconhecida. Tabelas suportadas: students, classrooms, guardians, attendance_events, outbox, school, users.');
        }

        // Group By
        if (lower.includes('count(*)') && lower.includes('group by')) {
          if (targetTable === 'attendance_events') {
            const counts: Record<string, number> = {};
            this.data.attendance_events.forEach((e) => {
              counts[e.event_type] = (counts[e.event_type] || 0) + 1;
            });
            const rows = Object.entries(counts).map(([type, total]) => [type, total]);
            const dur = Math.round((performance.now() - t0) * 100) / 100;
            return {
              columns: ['event_type', 'total'],
              rows,
              rowCount: rows.length,
              executionTimeMs: dur,
              commandType: 'SELECT_AGGREGATE',
            };
          }
        }

        // Filters
        let filtered = [...dataset];
        if (lower.includes("status = 'active'")) {
          filtered = filtered.filter((d) => d.status === 'active');
        } else if (lower.includes("status = 'blocked'")) {
          filtered = filtered.filter((d) => d.status === 'blocked');
        }

        // Limit
        const limitMatch = lower.match(/limit\s+(\d+)/);
        const limit = limitMatch ? parseInt(limitMatch[1], 10) : 50;
        filtered = filtered.slice(0, limit);

        if (filtered.length === 0) {
          const dur = Math.round((performance.now() - t0) * 100) / 100;
          return {
            columns: ['resultado'],
            rows: [['Nenhum registro encontrado para o critério informado.']],
            rowCount: 0,
            executionTimeMs: dur,
            commandType: 'SELECT',
          };
        }

        const sample = filtered[0];
        const allKeys = Object.keys(sample);
        const cols = allKeys.slice(0, 6);
        const rows = filtered.map((item) => cols.map((k) => String(item[k] ?? '')));
        const dur = Math.round((performance.now() - t0) * 100) / 100;

        return {
          columns: cols,
          rows,
          rowCount: filtered.length,
          executionTimeMs: dur,
          commandType: 'SELECT',
        };
      }

      throw new Error('Comando SQL não suportado. Instruções suportadas: SELECT, PRAGMA, VACUUM, REINDEX.');
    } catch (err: any) {
      const dur = Math.round((performance.now() - t0) * 100) / 100;
      return {
        columns: ['error'],
        rows: [[err.message || 'Erro de sintaxe SQL']],
        rowCount: 0,
        executionTimeMs: dur,
        error: err.message,
        commandType: 'ERROR',
      };
    }
  }

  // --- USERS MANAGEMENT & AUTH (RBAC) ---
  public getUsers(): SystemUser[] {
    if (!this.data.users || !Array.isArray(this.data.users) || this.data.users.length === 0) {
      this.data.users = [...SYSTEM_OPERATORS];
    }
    return this.data.users;
  }

  public addUser(userData: {
    name: string;
    role: UserRole;
    badge_number: string;
    email: string;
    password?: string;
  }): SystemUser {
    const cleanEmail = userData.email.trim().toLowerCase();
    const existing = this.getUsers().find((u) => u.email && u.email.toLowerCase() === cleanEmail);
    if (existing) {
      throw new Error(`Já existe um usuário cadastrado com o e-mail "${userData.email}".`);
    }

    const newUser: SystemUser = {
      id: `usr_${generateUUIDv7().slice(0, 8)}`,
      name: userData.name.trim(),
      role: userData.role,
      badge_number: userData.badge_number.trim(),
      email: cleanEmail,
      password: userData.password?.trim() || 'escola123',
    };

    if (!this.data.users) this.data.users = [...SYSTEM_OPERATORS];
    this.data.users.push(newUser);
    this.notify();
    return newUser;
  }

  public updateUser(
    id: string,
    updates: Partial<{
      name: string;
      role: UserRole;
      badge_number: string;
      email: string;
      password?: string;
    }>
  ): SystemUser {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) {
      throw new Error(`Usuário ${id} não encontrado.`);
    }

    if (updates.email) {
      const cleanEmail = updates.email.trim().toLowerCase();
      const duplicate = users.find((u) => u.id !== id && u.email && u.email.toLowerCase() === cleanEmail);
      if (duplicate) {
        throw new Error(`O e-mail "${updates.email}" já está em uso por outro usuário.`);
      }
    }

    const updated: SystemUser = {
      ...users[idx],
      ...updates,
      email: updates.email ? updates.email.trim().toLowerCase() : users[idx].email,
      password: updates.password !== undefined && updates.password.trim() ? updates.password.trim() : users[idx].password,
    };

    users[idx] = updated;
    this.data.users = users;

    if (this._currentOperator.id === id) {
      this._currentOperator = updated;
    }

    this.notify();
    return updated;
  }

  public deleteUser(id: string): void {
    const users = this.getUsers();
    const target = users.find((u) => u.id === id);
    if (!target) return;

    if (target.role === 'admin') {
      const remainingAdmins = users.filter((u) => u.role === 'admin' && u.id !== id);
      if (remainingAdmins.length === 0) {
        throw new Error('Operação negada: não é permitido excluir o único administrador do sistema.');
      }
    }

    this.data.users = users.filter((u) => u.id !== id);
    if (this._currentOperator.id === id) {
      this._currentOperator = this.data.users[0] || SYSTEM_OPERATORS[0];
    }
    this.notify();
  }

  public authenticate(email: string, password: string): { success: boolean; user?: SystemUser; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail) {
      return { success: false, error: 'Informe o e-mail institucional do usuário cadastrado.' };
    }
    if (!cleanPassword) {
      return { success: false, error: 'Informe a senha de acesso.' };
    }

    const users = this.getUsers();
    const foundUser = users.find(
      (u) =>
        (u.email && u.email.toLowerCase() === cleanEmail) ||
        u.id.toLowerCase() === cleanEmail ||
        u.badge_number.toLowerCase() === cleanEmail
    );

    if (!foundUser) {
      return {
        success: false,
        error: 'Usuário não cadastrado. Apenas operadores e coordenadores previamente registrados no sistema podem acessar.',
      };
    }

    if (foundUser.password && foundUser.password !== cleanPassword) {
      return {
        success: false,
        error: 'Senha incorreta. Verifique os caracteres e tente novamente.',
      };
    }

    this._currentOperator = foundUser;
    this.notify();
    return { success: true, user: foundUser };
  }

  public exportDatabaseJson(): string {
    return JSON.stringify(this.data, null, 2);
  }

  public exportSqlSchema(): string {
    return `-- SQLite DDL Schema - Sistema Local-First de Portaria
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;

CREATE TABLE school (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE student (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  enrollment_code TEXT NOT NULL,
  full_name TEXT NOT NULL,
  preferred_name TEXT,
  class_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('active','inactive','graduated','blocked')),
  photo_ref TEXT,
  valid_from TEXT,
  valid_until TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  UNIQUE (school_id, enrollment_code),
  FOREIGN KEY (school_id) REFERENCES school(id)
);

CREATE TABLE student_identifier (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('qr','barcode','enrollment')),
  value_hash TEXT NOT NULL,
  value_last4 TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  issued_at TEXT NOT NULL,
  revoked_at TEXT,
  UNIQUE (school_id, kind, value_hash),
  FOREIGN KEY (student_id) REFERENCES student(id)
);

CREATE TABLE attendance_event (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('entry','exit','correction')),
  occurred_at_device TEXT NOT NULL,
  occurred_at_utc TEXT NOT NULL,
  device_id TEXT NOT NULL,
  operator_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('qr','barcode','enrollment','manual','import')),
  source_value_hash TEXT,
  correction_of_id TEXT,
  correction_reason TEXT,
  client_sequence INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  sync_state TEXT NOT NULL DEFAULT 'pending'
    CHECK (sync_state IN ('pending','sent','acked','rejected','dead_letter')),
  FOREIGN KEY (student_id) REFERENCES student(id)
);

CREATE TABLE outbox (
  id TEXT PRIMARY KEY,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('upsert','append','revoke')),
  payload_json TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT,
  last_error TEXT,
  state TEXT NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending','sending','acked','rejected','dead_letter'))
);

CREATE TABLE sync_cursor (
  scope TEXT PRIMARY KEY,
  cursor TEXT,
  last_success_at TEXT,
  last_error TEXT
);

CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata_json TEXT,
  occurred_at TEXT NOT NULL
);
`;
  }
}

export const localDb = new LocalDatabaseService();
