-- Sistema Escolar Local-First - Schema SQLite v1
-- Otimizado para alta performance em portaria (WAL Mode + Índices)

PRAGMA foreign_keys = ON;

-- 1. Unidade Escolar
CREATE TABLE IF NOT EXISTS schools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    sync_version INTEGER NOT NULL DEFAULT 1
);

-- 2. Turmas e Séries
CREATE TABLE IF NOT EXISTS classrooms (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    grade TEXT NOT NULL,
    shift TEXT NOT NULL CHECK(shift IN ('morning', 'afternoon', 'integral'))
);

-- 3. Estudantes
CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    enrollment_code TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    preferred_name TEXT,
    class_id TEXT NOT NULL REFERENCES classrooms(id),
    status TEXT NOT NULL CHECK(status IN ('active', 'inactive', 'graduated', 'blocked')),
    photo_ref TEXT,
    valid_from TEXT NOT NULL,
    valid_until TEXT NOT NULL,
    guardian_name TEXT,
    guardian_phone TEXT,
    block_reason TEXT,
    medical_notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_students_enrollment ON students(enrollment_code);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);

-- 4. Responsáveis Legais
CREATE TABLE IF NOT EXISTS guardians (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    relationship TEXT NOT NULL,
    cpf_masked TEXT,
    created_at TEXT NOT NULL
);

-- 5. Vínculo Estudante-Responsável (n:m com regras de retirada)
CREATE TABLE IF NOT EXISTS student_guardians (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    guardian_id TEXT NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
    is_primary_contact INTEGER NOT NULL DEFAULT 0,
    can_pickup INTEGER NOT NULL DEFAULT 1,
    emergency_priority INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_guardian_unique ON student_guardians(student_id, guardian_id);

-- 6. Identificadores de Acesso (Crachás QR Code e Código de Barras)
CREATE TABLE IF NOT EXISTS student_identifiers (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK(kind IN ('qr', 'barcode', 'enrollment')),
    value_hash TEXT NOT NULL UNIQUE,
    value_last4 TEXT,
    raw_token TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    issued_at TEXT NOT NULL,
    revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_identifiers_hash ON student_identifiers(value_hash);
CREATE INDEX IF NOT EXISTS idx_identifiers_student ON student_identifiers(student_id);

-- 7. Registro Imutável de Presença / Portaria (Attendance Events)
CREATE TABLE IF NOT EXISTS attendance_events (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK(event_type IN ('entry', 'exit', 'correction')),
    occurred_at_device TEXT NOT NULL,
    occurred_at_utc TEXT NOT NULL,
    device_id TEXT NOT NULL,
    operator_id TEXT NOT NULL,
    source TEXT NOT NULL CHECK(source IN ('qr', 'barcode', 'enrollment', 'manual', 'import')),
    source_value_hash TEXT,
    correction_of_id TEXT REFERENCES attendance_events(id),
    correction_reason TEXT,
    client_sequence INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    sync_state TEXT NOT NULL CHECK(sync_state IN ('pending', 'sent', 'acked', 'rejected', 'dead_letter')) DEFAULT 'pending'
);
CREATE INDEX IF NOT EXISTS idx_attendance_student_time ON attendance_events(student_id, occurred_at_device DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_sync ON attendance_events(sync_state);

-- 8. Decisões do Motor Laya (Laya Decision Logs)
CREATE TABLE IF NOT EXISTS gate_decision_logs (
    id TEXT PRIMARY KEY,
    attendance_event_id TEXT REFERENCES attendance_events(id),
    student_id TEXT NOT NULL REFERENCES students(id),
    decision_code TEXT NOT NULL CHECK(decision_code IN ('ACCESS_GRANTED', 'ACCESS_DENIED_BLOCKED', 'REQUIRES_COORDINATION_OVERRIDE', 'ANOMALY_DUPLICATE_SCAN')),
    confidence_score REAL NOT NULL,
    latency_ms REAL NOT NULL,
    evaluated_criteria_json TEXT NOT NULL,
    operator_confirmed INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_decisions_student ON gate_decision_logs(student_id);

-- 9. Memórias Contextuais e Semânticas (Mem0 Context Memories)
CREATE TABLE IF NOT EXISTS context_memories (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL CHECK(entity_type IN ('student', 'guardian', 'school_rule')),
    entity_id TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('custody', 'temporary_pickup', 'health_medical', 'behavioral', 'general')),
    content TEXT NOT NULL,
    metadata_json TEXT,
    importance_score INTEGER NOT NULL DEFAULT 3, -- 1 a 5 (5 = crítico para portaria)
    is_active INTEGER NOT NULL DEFAULT 1,
    expires_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_memories_entity ON context_memories(entity_id, is_active);
CREATE INDEX IF NOT EXISTS idx_memories_importance ON context_memories(importance_score DESC);

-- 10. Outbox Pattern para Resiliência e Sincronização Offline
CREATE TABLE IF NOT EXISTS outbox_items (
    id TEXT PRIMARY KEY,
    aggregate_type TEXT NOT NULL CHECK(aggregate_type IN ('attendance_event', 'student', 'student_identifier', 'memory')),
    aggregate_id TEXT NOT NULL,
    operation TEXT NOT NULL CHECK(operation IN ('upsert', 'append', 'revoke')),
    payload_json TEXT NOT NULL,
    idempotency_key TEXT NOT NULL UNIQUE,
    state TEXT NOT NULL CHECK(state IN ('pending', 'sending', 'acked', 'rejected', 'dead_letter')) DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TEXT,
    next_retry_at TEXT,
    error_message TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_outbox_state ON outbox_items(state, next_retry_at);

-- 11. Trilha Completa de Auditoria (Audit Logs)
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    operator_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target_table TEXT NOT NULL,
    target_id TEXT NOT NULL,
    details_json TEXT NOT NULL,
    device_id TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- 12. Configurações do Sistema e Hardware (Câmeras Externas, Leitores, Tolerâncias)
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
);


