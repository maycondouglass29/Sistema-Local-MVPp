import { SqlDatabase } from '../db/connection';

export interface OutboxItemRecord {
  id: string;
  aggregate_type: 'attendance_event' | 'student' | 'student_identifier' | 'memory';
  aggregate_id: string;
  operation: 'upsert' | 'append' | 'revoke';
  payload_json: string;
  idempotency_key: string;
  state: 'pending' | 'sending' | 'acked' | 'rejected' | 'dead_letter';
  attempts: number;
  last_attempt_at?: string;
  next_retry_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export class OutboxRepository {
  constructor(private db: SqlDatabase) {}

  enqueue(
    aggregate_type: OutboxItemRecord['aggregate_type'],
    aggregate_id: string,
    operation: OutboxItemRecord['operation'],
    payload: any,
    idempotency_key: string
  ): OutboxItemRecord {
    const now = new Date().toISOString();
    const id = `out_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const payload_json = JSON.stringify(payload);

    this.db.run(
      `INSERT INTO outbox_items (id, aggregate_type, aggregate_id, operation, payload_json, idempotency_key, state, attempts, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?)`,
      id,
      aggregate_type,
      aggregate_id,
      operation,
      payload_json,
      idempotency_key,
      now,
      now
    );

    return this.getById(id)!;
  }

  getById(id: string): OutboxItemRecord | undefined {
    return this.db.query<OutboxItemRecord>('SELECT * FROM outbox_items WHERE id = ?').get(id);
  }

  getPending(limit = 100): OutboxItemRecord[] {
    return this.db
      .query<OutboxItemRecord>(
        "SELECT * FROM outbox_items WHERE state = 'pending' ORDER BY created_at ASC LIMIT ?"
      )
      .all(limit);
  }

  getPendingCount(): number {
    return (
      this.db
        .query<{ count: number }>("SELECT count(*) as count FROM outbox_items WHERE state = 'pending'")
        .get()?.count || 0
    );
  }

  markAcked(id: string) {
    const now = new Date().toISOString();
    this.db.run("UPDATE outbox_items SET state = 'acked', updated_at = ? WHERE id = ?", now, id);
  }
}

