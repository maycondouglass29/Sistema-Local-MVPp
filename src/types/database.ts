export type StudentStatus = 'active' | 'inactive' | 'graduated' | 'blocked';

export type EventType = 'entry' | 'exit' | 'correction';

export type EventSource = 'qr' | 'barcode' | 'enrollment' | 'manual' | 'import';

export type SyncState = 'pending' | 'sent' | 'acked' | 'rejected' | 'dead_letter';

export type OutboxState = 'pending' | 'sending' | 'acked' | 'rejected' | 'dead_letter';

export type OutboxOperation = 'upsert' | 'append' | 'revoke';

export type UserRole = 'operator' | 'coordinator' | 'admin';

export interface School {
  id: string;
  name: string;
  cnpj?: string;
  address?: string;
  school_year?: string;
  morning_start?: string;
  morning_tolerance?: string;
  morning_end?: string;
  afternoon_start?: string;
  afternoon_tolerance?: string;
  afternoon_end?: string;
  timezone: string;
  created_at: string;
  updated_at: string;
  sync_version: number;
}

export interface SystemTechnicalSettings {
  journal_mode: 'WAL' | 'DELETE' | 'TRUNCATE' | 'MEMORY';
  synchronous: 'NORMAL' | 'FULL' | 'OFF';
  cache_size: number;
  busy_timeout: number;
  foreign_keys: boolean;
  auto_vacuum: 'NONE' | 'FULL' | 'INCREMENTAL';
  auto_backup_interval_hours: number;
}

export interface ClassRoom {
  id: string;
  school_id: string;
  name: string;
  grade: string;
  shift: 'morning' | 'afternoon' | 'integral';
}

export interface Guardian {
  id: string;
  school_id: string;
  full_name: string;
  phone: string;
  email?: string;
  relationship: string; // 'Mãe' | 'Pai' | 'Avó' | 'Tutor Legal'
  cpf_masked?: string;
  student_ids: string[];
  created_at: string;
}

export interface Student {
  id: string;
  school_id: string;
  enrollment_code: string;
  full_name: string;
  preferred_name?: string;
  class_id: string;
  status: StudentStatus;
  photo_ref?: string;
  valid_from: string;
  valid_until: string;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_relationship?: string;
  emergency_phone?: string;
  birth_date?: string;
  document_number?: string;
  medical_notes?: string;
  pickup_authorized_names?: string;
  gate_notes?: string;
  block_reason?: string;
  badge_printed_at?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface StudentIdentifier {
  id: string;
  school_id: string;
  student_id: string;
  kind: 'qr' | 'barcode' | 'enrollment';
  value_hash: string;
  value_last4?: string;
  raw_token: string;
  active: number; // 1 or 0
  issued_at: string;
  revoked_at?: string | null;
}

export interface AttendanceEvent {
  id: string;
  school_id: string;
  student_id: string;
  event_type: EventType;
  occurred_at_device: string;
  occurred_at_utc: string;
  device_id: string;
  operator_id: string;
  source: EventSource;
  source_value_hash?: string;
  correction_of_id?: string | null;
  correction_reason?: string | null;
  notes?: string | null;
  guardian_name?: string | null;
  client_sequence: number;
  created_at: string;
  sync_state: SyncState;
}

export interface OutboxItem {
  id: string;
  aggregate_type: 'attendance_event' | 'student' | 'student_identifier';
  aggregate_id: string;
  operation: OutboxOperation;
  payload_json: string;
  idempotency_key: string;
  created_at: string;
  attempt_count: number;
  next_attempt_at?: string | null;
  last_error?: string | null;
  state: OutboxState;
}

export interface SyncCursor {
  scope: string;
  cursor?: string;
  last_success_at?: string;
  last_error?: string;
}

export interface AuditLog {
  id: string;
  school_id: string;
  actor_id: string;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  metadata_json?: string;
  occurred_at: string;
}

export interface SystemUser {
  id: string;
  name: string;
  role: UserRole;
  badge_number: string;
  email?: string;
  password?: string;
}

export interface ScanValidationResult {
  allowed: boolean;
  alertType: 'success' | 'warning' | 'denied' | 'duplicate';
  message: string;
  student?: Student;
  classRoom?: ClassRoom;
  activeIdentifier?: StudentIdentifier;
  lastEventToday?: AttendanceEvent;
  latencyMs: number;
  evaluatedAt?: string;
  ruleBreakdown?: { rule: string; passed: boolean; details?: string }[];
}
