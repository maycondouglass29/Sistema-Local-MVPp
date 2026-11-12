import { SqlDatabase } from '../db/connection';
import crypto from 'crypto';

export interface StudentRecord {
  id: string;
  school_id: string;
  enrollment_code: string;
  full_name: string;
  preferred_name?: string;
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
  created_at: string;
  updated_at: string;
}

export class StudentRepository {
  constructor(private db: SqlDatabase) {}

  findById(id: string): StudentRecord | undefined {
    return this.db
      .query<StudentRecord>(
        `SELECT s.*, c.name as class_name 
         FROM students s 
         LEFT JOIN classrooms c ON s.class_id = c.id 
         WHERE s.id = ? AND s.deleted_at IS NULL`
      )
      .get(id);
  }

  findByEnrollment(code: string): StudentRecord | undefined {
    return this.db
      .query<StudentRecord>(
        `SELECT s.*, c.name as class_name 
         FROM students s 
         LEFT JOIN classrooms c ON s.class_id = c.id 
         WHERE s.enrollment_code = ? AND s.deleted_at IS NULL`
      )
      .get(code.trim());
  }

  findByToken(rawToken: string): StudentRecord | undefined {
    const clean = rawToken.trim();
    // Try exact enrollment match first
    const byEnrollment = this.findByEnrollment(clean);
    if (byEnrollment) return byEnrollment;

    // Try hash match in identifiers table
    const hash = crypto.createHash('sha256').update(clean).digest('hex');
    const ident = this.db
      .query<{ student_id: string }>(
        `SELECT student_id FROM student_identifiers WHERE (raw_token = ? OR value_hash = ?) AND active = 1`
      )
      .get(clean, hash);

    if (ident) {
      return this.findById(ident.student_id);
    }

    // Try extracting ID from opaque token format "ESCHZ:V1:stu_001:2024-001"
    if (clean.includes(':')) {
      const parts = clean.split(':');
      if (parts.length >= 3) {
        const studentId = parts[2];
        const student = this.findById(studentId);
        if (student) return student;
      }
    }

    return undefined;
  }

  listAll(filters?: { classId?: string; status?: string; search?: string }): StudentRecord[] {
    let sql = `
      SELECT s.*, c.name as class_name 
      FROM students s 
      LEFT JOIN classrooms c ON s.class_id = c.id 
      WHERE s.deleted_at IS NULL
    `;
    const params: any[] = [];

    if (filters?.classId) {
      sql += ' AND s.class_id = ?';
      params.push(filters.classId);
    }
    if (filters?.status) {
      sql += ' AND s.status = ?';
      params.push(filters.status);
    }
    if (filters?.search) {
      sql += ' AND (s.full_name LIKE ? OR s.enrollment_code LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    sql += ' ORDER BY s.full_name ASC';
    return this.db.query<StudentRecord>(sql).all(...params);
  }

  getGuardians(studentId: string) {
    return this.db
      .query(
        `SELECT g.*, sg.is_primary_contact, sg.can_pickup, sg.emergency_priority, sg.notes as link_notes
         FROM guardians g
         INNER JOIN student_guardians sg ON g.id = sg.guardian_id
         WHERE sg.student_id = ?
         ORDER BY sg.emergency_priority ASC`
      )
      .all(studentId);
  }

  create(student: Partial<StudentRecord>): StudentRecord {
    const now = new Date().toISOString();
    const id = student.id || `stu_${Date.now()}`;
    const schoolId = student.school_id || 'school_horizonte_01';
    const enrollmentCode = student.enrollment_code || `2026-${Math.floor(100 + Math.random() * 900)}`;

    this.db.run(
      `INSERT INTO students (id, school_id, enrollment_code, full_name, preferred_name, class_id, status, photo_ref, valid_from, valid_until, guardian_name, guardian_phone, block_reason, medical_notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      schoolId,
      enrollmentCode,
      student.full_name,
      student.preferred_name || null,
      student.class_id,
      student.status || 'active',
      student.photo_ref || null,
      student.valid_from || now.slice(0, 10),
      student.valid_until || '2026-12-31',
      student.guardian_name || null,
      student.guardian_phone || null,
      student.block_reason || null,
      student.medical_notes || null,
      now,
      now
    );

    // Register active QR identifier for fast scan lookup
    const rawQrToken = `ESCHZ:V1:${id}:${enrollmentCode}`;
    const qrHash = crypto.createHash('sha256').update(rawQrToken).digest('hex');
    try {
      this.db.run(
        `INSERT INTO student_identifiers (id, school_id, student_id, kind, value_hash, value_last4, raw_token, active, issued_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        `ident_${id}_qr`,
        schoolId,
        id,
        'qr',
        qrHash,
        enrollmentCode.slice(-4),
        rawQrToken,
        1,
        now
      );
    } catch {
      // Identifier already exists or duplicate key
    }

    return this.findById(id)!;
  }

  update(id: string, updates: Partial<StudentRecord>): StudentRecord | undefined {
    const now = new Date().toISOString();
    const ALLOWED_COLUMNS = [
      'full_name',
      'preferred_name',
      'enrollment_code',
      'class_id',
      'status',
      'photo_ref',
      'valid_from',
      'valid_until',
      'guardian_name',
      'guardian_phone',
      'block_reason',
      'medical_notes',
    ];

    const fields: string[] = [];
    const values: any[] = [];

    for (const [key, val] of Object.entries(updates)) {
      if (ALLOWED_COLUMNS.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(val);
      }
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    this.db.run(`UPDATE students SET ${fields.join(', ')} WHERE id = ?`, ...values);
    return this.findById(id);
  }
}

