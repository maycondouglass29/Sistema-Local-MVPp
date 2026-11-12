import { SqlDatabase } from '../db/connection';
import crypto from 'crypto';

export interface AttendanceRecord {
  id: string;
  school_id: string;
  student_id: string;
  student_name?: string;
  class_name?: string;
  photo_ref?: string;
  event_type: 'entry' | 'exit' | 'correction';
  occurred_at_device: string;
  occurred_at_utc: string;
  device_id: string;
  operator_id: string;
  source: 'qr' | 'barcode' | 'enrollment' | 'manual' | 'import';
  source_value_hash?: string;
  correction_of_id?: string;
  correction_reason?: string;
  client_sequence: number;
  created_at: string;
  sync_state: 'pending' | 'sent' | 'acked' | 'rejected' | 'dead_letter';
}

export class AttendanceRepository {
  constructor(private db: SqlDatabase) {}

  recordEvent(event: Omit<AttendanceRecord, 'client_sequence' | 'created_at'>): AttendanceRecord {
    const nowIso = new Date().toISOString();
    const id = event.id || `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Client sequence counter
    const lastSeq =
      this.db.query<{ max_seq: number }>('SELECT COALESCE(MAX(client_sequence), 0) as max_seq FROM attendance_events').get()
        ?.max_seq || 0;
    const client_sequence = lastSeq + 1;

    this.db.run(
      `INSERT INTO attendance_events (id, school_id, student_id, event_type, occurred_at_device, occurred_at_utc, device_id, operator_id, source, source_value_hash, correction_of_id, correction_reason, client_sequence, created_at, sync_state)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      event.school_id,
      event.student_id,
      event.event_type,
      event.occurred_at_device,
      event.occurred_at_utc,
      event.device_id,
      event.operator_id,
      event.source,
      event.source_value_hash || null,
      event.correction_of_id || null,
      event.correction_reason || null,
      client_sequence,
      nowIso,
      event.sync_state || 'pending'
    );

    return this.findById(id)!;
  }

  findById(id: string): AttendanceRecord | undefined {
    return this.db
      .query<AttendanceRecord>(
        `SELECT a.*, s.full_name as student_name, s.photo_ref, c.name as class_name
         FROM attendance_events a
         LEFT JOIN students s ON a.student_id = s.id
         LEFT JOIN classrooms c ON s.class_id = c.id
         WHERE a.id = ?`
      )
      .get(id);
  }

  getRecentByStudent(studentId: string, limit = 5): AttendanceRecord[] {
    return this.db
      .query<AttendanceRecord>(
        `SELECT a.*, s.full_name as student_name, s.photo_ref, c.name as class_name
         FROM attendance_events a
         LEFT JOIN students s ON a.student_id = s.id
         LEFT JOIN classrooms c ON s.class_id = c.id
         WHERE a.student_id = ?
         ORDER BY a.occurred_at_device DESC
         LIMIT ?`
      )
      .all(studentId, limit);
  }

  getTodayEvents(limit = 50): AttendanceRecord[] {
    const todayStr = new Date().toISOString().slice(0, 10);
    return this.db
      .query<AttendanceRecord>(
        `SELECT a.*, s.full_name as student_name, s.photo_ref, c.name as class_name
         FROM attendance_events a
         LEFT JOIN students s ON a.student_id = s.id
         LEFT JOIN classrooms c ON s.class_id = c.id
         WHERE a.occurred_at_device >= ?
         ORDER BY a.occurred_at_device DESC
         LIMIT ?`
      )
      .all(`${todayStr}T00:00:00`, limit);
  }

  getCountsToday(): { entries: number; exits: number } {
    const todayStr = new Date().toISOString().slice(0, 10);
    const rows = this.db
      .query<{ event_type: string; count: number }>(
        `SELECT event_type, count(*) as count 
         FROM attendance_events 
         WHERE occurred_at_device >= ?
         GROUP BY event_type`
      )
      .all(`${todayStr}T00:00:00`);

    let entries = 0;
    let exits = 0;
    for (const r of rows) {
      if (r.event_type === 'entry') entries = r.count;
      if (r.event_type === 'exit') exits = r.count;
    }
    return { entries, exits };
  }
}

