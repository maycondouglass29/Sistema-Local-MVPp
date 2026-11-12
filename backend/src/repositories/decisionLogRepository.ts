import { SqlDatabase } from '../db/connection';

export interface DecisionLogRecord {
  id: string;
  attendance_event_id?: string;
  student_id: string;
  decision_code: 'ACCESS_GRANTED' | 'ACCESS_DENIED_BLOCKED' | 'REQUIRES_COORDINATION_OVERRIDE' | 'ANOMALY_DUPLICATE_SCAN';
  confidence_score: number;
  latency_ms: number;
  evaluated_criteria_json: string;
  operator_confirmed: number;
  created_at: string;
}

export class DecisionLogRepository {
  constructor(private db: SqlDatabase) {}

  recordDecision(log: Omit<DecisionLogRecord, 'id' | 'created_at'> & { id?: string }): DecisionLogRecord {
    const now = new Date().toISOString();
    const id = log.id || `dec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    this.db.run(
      `INSERT INTO gate_decision_logs (id, attendance_event_id, student_id, decision_code, confidence_score, latency_ms, evaluated_criteria_json, operator_confirmed, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      log.attendance_event_id || null,
      log.student_id,
      log.decision_code,
      log.confidence_score,
      log.latency_ms,
      log.evaluated_criteria_json,
      log.operator_confirmed !== undefined ? log.operator_confirmed : 1,
      now
    );

    return {
      id,
      ...log,
      operator_confirmed: log.operator_confirmed !== undefined ? log.operator_confirmed : 1,
      created_at: now,
    };
  }

  getRecentDecisions(limit = 20): DecisionLogRecord[] {
    return this.db
      .query<DecisionLogRecord>('SELECT * FROM gate_decision_logs ORDER BY created_at DESC LIMIT ?')
      .all(limit);
  }
}

