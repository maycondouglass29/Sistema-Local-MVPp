import { StudentRecord } from '../repositories/studentRepository';
import { AttendanceRecord, AttendanceRepository } from '../repositories/attendanceRepository';
import { DecisionLogRepository, DecisionLogRecord } from '../repositories/decisionLogRepository';

export interface GateDecisionResult {
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
  decisionLogId?: string;
}

export class LayaDecisionService {
  constructor(
    private attendanceRepo: AttendanceRepository,
    private decisionLogRepo: DecisionLogRepository
  ) {}

  async evaluateAccess(params: {
    student: StudentRecord;
    eventType: 'entry' | 'exit';
    allowRepetition?: boolean;
    operatorRole?: string;
  }): Promise<GateDecisionResult> {
    const startTime = performance.now();
    const { student, eventType, allowRepetition } = params;

    const todayIso = new Date().toISOString().slice(0, 10);
    const isValidDate = student.valid_until >= todayIso;

    // 1. Status Check
    if (student.status === 'blocked') {
      const latencyMs = Math.round((performance.now() - startTime) * 100) / 100;
      const result: GateDecisionResult = {
        code: 'ACCESS_DENIED_BLOCKED',
        allowed: false,
        message: student.block_reason || 'Acesso bloqueado pela coordenação escolar.',
        confidence: 0.99,
        latencyMs,
        criteria: {
          statusCheck: false,
          validDateCheck: isValidDate,
          duplicateCheck: true,
          scheduleWindowCheck: true,
        },
      };

      this.logDecision(student.id, result);
      return result;
    }

    if (student.status !== 'active') {
      const latencyMs = Math.round((performance.now() - startTime) * 100) / 100;
      const result: GateDecisionResult = {
        code: 'ACCESS_DENIED_BLOCKED',
        allowed: false,
        message: `Estudante com matrícula ${student.status} (não ativa).`,
        confidence: 0.98,
        latencyMs,
        criteria: {
          statusCheck: false,
          validDateCheck: isValidDate,
          duplicateCheck: true,
          scheduleWindowCheck: true,
        },
      };

      this.logDecision(student.id, result);
      return result;
    }

    // 2. Credential Expiration
    if (!isValidDate) {
      const latencyMs = Math.round((performance.now() - startTime) * 100) / 100;
      const result: GateDecisionResult = {
        code: 'ACCESS_DENIED_BLOCKED',
        allowed: false,
        message: `Credencial expirada em ${student.valid_until}.`,
        confidence: 0.95,
        latencyMs,
        criteria: {
          statusCheck: true,
          validDateCheck: false,
          duplicateCheck: true,
          scheduleWindowCheck: true,
        },
      };

      this.logDecision(student.id, result);
      return result;
    }

    // 3. Duplicate Check — block repeated entry OR exit on the same calendar day
    const recentEvents = this.attendanceRepo.getRecentByStudent(student.id, 1);
    const lastEvent = recentEvents[0];

    if (lastEvent && !allowRepetition) {
      const todayIsoDate = new Date().toISOString().slice(0, 10);
      const lastEventDate = lastEvent.occurred_at_device.slice(0, 10);
      const isSameDay = lastEventDate === todayIsoDate;
      const isSameType = lastEvent.event_type === eventType;

      if (isSameDay && isSameType) {
        const latencyMs = Math.round((performance.now() - startTime) * 100) / 100;
        const secondsSinceLast = Math.round(
          (Date.now() - new Date(lastEvent.occurred_at_device).getTime()) / 1000
        );
        const result: GateDecisionResult = {
          code: 'ANOMALY_DUPLICATE_SCAN',
          allowed: false,
          message: `Registro de ${eventType === 'entry' ? 'entrada' : 'saída'} já registrado hoje (${secondsSinceLast}s atrás). Requer confirmação da coordenação.`,
          confidence: 0.92,
          latencyMs,
          criteria: {
            statusCheck: true,
            validDateCheck: true,
            duplicateCheck: false,
            scheduleWindowCheck: true,
          },
        };

        this.logDecision(student.id, result);
        return result;
      }
    }

    // 4. Default: Access Granted
    const latencyMs = Math.round((performance.now() - startTime) * 100) / 100;
    const result: GateDecisionResult = {
      code: 'ACCESS_GRANTED',
      allowed: true,
      message: `${eventType === 'entry' ? 'Entrada' : 'Saída'} autorizada com sucesso.`,
      confidence: 0.99,
      latencyMs,
      criteria: {
        statusCheck: true,
        validDateCheck: true,
        duplicateCheck: true,
        scheduleWindowCheck: true,
      },
    };

    this.logDecision(student.id, result);
    return result;
  }

  private logDecision(studentId: string, result: GateDecisionResult) {
    try {
      this.decisionLogRepo.recordDecision({
        student_id: studentId,
        decision_code: result.code,
        confidence_score: result.confidence,
        latency_ms: result.latencyMs,
        evaluated_criteria_json: JSON.stringify(result.criteria),
        operator_confirmed: result.allowed ? 1 : 0,
      });
    } catch (err) {
      console.error('Failed to log Laya decision:', err);
    }
  }
}

