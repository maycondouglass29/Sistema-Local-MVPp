import { StudentRepository, StudentRecord } from '../repositories/studentRepository';
import { AttendanceRepository, AttendanceRecord } from '../repositories/attendanceRepository';
import { OutboxRepository } from '../repositories/outboxRepository';
import { LayaDecisionService, GateDecisionResult } from './layaDecisionService';
import { Mem0MemoryService, StudentContextPayload } from './mem0MemoryService';

export interface GateScanResponse {
  success: boolean;
  decision: GateDecisionResult;
  student?: StudentRecord;
  guardians?: any[];
  context?: StudentContextPayload;
  attendanceEvent?: AttendanceRecord;
  soundCue: 'success' | 'warning' | 'error' | 'bell';
  timestamp: string;
}

export class GateService {
  constructor(
    private studentRepo: StudentRepository,
    private attendanceRepo: AttendanceRepository,
    private outboxRepo: OutboxRepository,
    private layaService: LayaDecisionService,
    private mem0Service: Mem0MemoryService
  ) {}

  async processScan(params: {
    rawToken: string;
    eventType: 'entry' | 'exit';
    deviceId?: string;
    operatorId?: string;
    allowRepetition?: boolean;
    operatorRole?: string;
  }): Promise<GateScanResponse> {
    const { rawToken, eventType, deviceId = 'terminal_01', operatorId = 'op_marina', allowRepetition, operatorRole } = params;
    const nowIso = new Date().toISOString();

    // 1. Identify Student
    const student = this.studentRepo.findByToken(rawToken);

    if (!student) {
      return {
        success: false,
        decision: {
          code: 'ACCESS_DENIED_BLOCKED',
          allowed: false,
          message: `Credencial ou matrícula não encontrada no banco local: "${rawToken}".`,
          confidence: 1.0,
          latencyMs: 1.2,
          criteria: {
            statusCheck: false,
            validDateCheck: false,
            duplicateCheck: false,
            scheduleWindowCheck: false,
          },
        },
        soundCue: 'error',
        timestamp: nowIso,
      };
    }

    // 2. Query Mem0 Context Memory
    const context = this.mem0Service.getContextForStudent(student.id);

    // 3. Query Guardians
    const guardians = this.studentRepo.getGuardians(student.id);

    // 4. Run Laya System 1 Decision Engine
    const decision = await this.layaService.evaluateAccess({
      student,
      eventType,
      allowRepetition,
      operatorRole,
    });

    let soundCue: 'success' | 'warning' | 'error' | 'bell' = 'success';
    if (!decision.allowed) {
      soundCue = decision.code === 'ANOMALY_DUPLICATE_SCAN' ? 'warning' : 'error';
    } else if (context.criticalAlerts.length > 0) {
      soundCue = 'warning'; // Has critical medical or custody alert even if entry allowed
    }

    // 5. If allowed, record attendance event & write to Outbox
    let attendanceEvent: AttendanceRecord | undefined;
    if (decision.allowed) {
      const source = rawToken.startsWith('ESCHZ:') ? 'qr' : /^\d+$/.test(rawToken) ? 'barcode' : 'enrollment';

      attendanceEvent = this.attendanceRepo.recordEvent({
        id: `att_${Date.now()}_${student.enrollment_code}`,
        school_id: student.school_id,
        student_id: student.id,
        event_type: eventType,
        occurred_at_device: nowIso,
        occurred_at_utc: nowIso,
        device_id: deviceId,
        operator_id: operatorId,
        source: source as any,
        source_value_hash: rawToken.slice(0, 16),
        sync_state: 'pending',
      });

      // Outbox Pattern
      this.outboxRepo.enqueue(
        'attendance_event',
        attendanceEvent.id,
        'append',
        attendanceEvent,
        `idemp_${attendanceEvent.id}`
      );
    }

    return {
      success: decision.allowed,
      decision,
      student,
      guardians,
      context,
      attendanceEvent,
      soundCue,
      timestamp: nowIso,
    };
  }
}

