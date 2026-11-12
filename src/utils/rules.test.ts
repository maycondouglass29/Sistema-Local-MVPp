import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateScanRules,
  validateCsvStudentRow,
  validateCorrection,
  filterAttendanceEvents,
  calculateReportSummary,
} from './rules';
import { Student, AttendanceEvent } from '../types/database';
import {
  generateUUIDv7,
  generateOpaqueQrToken,
  parseOpaqueQrToken,
  generateIdempotencyKey,
} from './id';

test('UUIDv7 generates monotonic timestamp prefix', () => {
  const id1 = generateUUIDv7();
  const id2 = generateUUIDv7();
  assert.equal(typeof id1, 'string');
  assert.equal(id1.length, 36);
  assert.match(id1, /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});

test('Opaque token adheres to LGPD privacy format school:student:uuid:v1', () => {
  const schoolId = 'school_piloto_01';
  const studentId = 'stu_123';
  const token = generateOpaqueQrToken(schoolId, studentId);
  const parsed = parseOpaqueQrToken(token);

  assert.equal(parsed.valid, true);
  assert.equal(parsed.schoolId, schoolId);
  assert.equal(parsed.version, 'v1');
  assert.ok(parsed.tokenUuid && parsed.tokenUuid.length > 20);
});

test('Outbox idempotency key format tenant:device:seq', () => {
  const key = generateIdempotencyKey('school_01', 'term_portaria_A', 42);
  assert.equal(key, 'school_01:term_portaria_A:42');
});

const mockStudent: Student = {
  id: 'stu_01',
  school_id: 'school_01',
  enrollment_code: '2024-001',
  full_name: 'Lucas Silva Santos',
  class_id: 'class_1a',
  status: 'active',
  valid_from: '2024-01-01',
  valid_until: '2026-12-31',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

test('evaluateScanRules denies blocked students with reason', () => {
  const blockedStudent: Student = {
    ...mockStudent,
    status: 'blocked',
    block_reason: 'Pendência administrativa na secretaria',
  };

  const result = evaluateScanRules({
    student: blockedStudent,
    requestedType: 'entry',
    lastEventsToday: [],
    currentTime: new Date(),
  });

  assert.equal(result.allowed, false);
  assert.equal(result.alertType, 'denied');
  assert.match(result.message, /Acesso Bloqueado/);
});

test('evaluateScanRules denies inactive or graduated students', () => {
  const inactiveStudent: Student = {
    ...mockStudent,
    status: 'inactive',
  };

  const result = evaluateScanRules({
    student: inactiveStudent,
    requestedType: 'entry',
    lastEventsToday: [],
    currentTime: new Date(),
  });

  assert.equal(result.allowed, false);
  assert.equal(result.alertType, 'denied');
  assert.match(result.message, /Inativa/);
});

test('evaluateScanRules detects duplicity within 60s window', () => {
  const now = new Date();
  const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000).toISOString();

  const recentEvent: AttendanceEvent = {
    id: 'evt_01',
    school_id: 'school_01',
    student_id: mockStudent.id,
    event_type: 'entry',
    occurred_at_device: thirtySecondsAgo,
    occurred_at_utc: thirtySecondsAgo,
    device_id: 'dev_01',
    operator_id: 'op_01',
    source: 'qr',
    client_sequence: 1,
    created_at: thirtySecondsAgo,
    sync_state: 'pending',
  };

  const result = evaluateScanRules({
    student: mockStudent,
    requestedType: 'entry',
    lastEventsToday: [recentEvent],
    currentTime: now,
    duplicityWindowSeconds: 60,
  });

  assert.equal(result.allowed, false);
  assert.equal(result.alertType, 'duplicate');
  assert.match(result.message, /Leitura Duplicada/);
});

test('evaluateScanRules warns on exit without prior entry', () => {
  const now = new Date();
  const result = evaluateScanRules({
    student: mockStudent,
    requestedType: 'exit',
    lastEventsToday: [],
    currentTime: now,
  });

  assert.equal(result.allowed, true);
  assert.equal(result.alertType, 'warning');
  assert.match(result.message, /Saída sem registro prévio/);
});

test('validateCsvStudentRow checks required columns and uniqueness', () => {
  const existing = new Set(['2024-001']);
  
  // Valid row
  const validRes = validateCsvStudentRow(['2024-002', 'Mariana Oliveira', '1º Ano A', 'Carlos Oliveira', '11999998888'], existing);
  assert.equal(validRes.valid, true);
  assert.equal(validRes.parsedRow?.full_name, 'Mariana Oliveira');

  // Duplicate enrollment
  const dupRes = validateCsvStudentRow(['2024-001', 'Novo Aluno', '1º Ano B'], existing);
  assert.equal(dupRes.valid, false);
  assert.match(dupRes.error || '', /já cadastrada/);

  // Incomplete row
  const incRes = validateCsvStudentRow(['', 'Incompleto'], existing);
  assert.equal(incRes.valid, false);
});

test('validateCorrection enforces non-destructive reason length', () => {
  const dummyEvent: AttendanceEvent = {
    id: 'evt_orig',
    school_id: 'school_01',
    student_id: 'stu_01',
    event_type: 'entry',
    occurred_at_device: new Date().toISOString(),
    occurred_at_utc: new Date().toISOString(),
    device_id: 'dev_01',
    operator_id: 'op_01',
    source: 'manual',
    client_sequence: 5,
    created_at: new Date().toISOString(),
    sync_state: 'pending',
  };

  const invalid = validateCorrection(dummyEvent, 'err', 'op_01');
  assert.equal(invalid.valid, false);

  const valid = validateCorrection(dummyEvent, 'Aluno registrado por engano, saiu pela enfermaria', 'op_01');
  assert.equal(valid.valid, true);
});

test('filterAttendanceEvents filters by date interval and class', () => {
  const students: Student[] = [
    { ...mockStudent, id: 'stu_1', class_id: 'class_1a', full_name: 'Ana Silva' },
    { ...mockStudent, id: 'stu_2', class_id: 'class_2b', full_name: 'Bruno Lima' },
  ];

  const events: AttendanceEvent[] = [
    {
      id: 'e1',
      school_id: 'school_01',
      student_id: 'stu_1',
      event_type: 'entry',
      occurred_at_device: '2026-11-10T07:15:00Z',
      occurred_at_utc: '2026-11-10T07:15:00Z',
      device_id: 'dev_01',
      operator_id: 'op_01',
      source: 'qr',
      client_sequence: 1,
      created_at: '2026-11-10T07:15:00Z',
      sync_state: 'acked',
    },
    {
      id: 'e2',
      school_id: 'school_01',
      student_id: 'stu_1',
      event_type: 'exit',
      occurred_at_device: '2026-11-10T12:05:00Z',
      occurred_at_utc: '2026-11-10T12:05:00Z',
      device_id: 'dev_01',
      operator_id: 'op_01',
      source: 'qr',
      client_sequence: 2,
      created_at: '2026-11-10T12:05:00Z',
      sync_state: 'acked',
    },
    {
      id: 'e3',
      school_id: 'school_01',
      student_id: 'stu_2',
      event_type: 'entry',
      occurred_at_device: '2026-11-11T08:00:00Z',
      occurred_at_utc: '2026-11-11T08:00:00Z',
      device_id: 'dev_01',
      operator_id: 'op_01',
      source: 'qr',
      client_sequence: 3,
      created_at: '2026-11-11T08:00:00Z',
      sync_state: 'acked',
    },
  ];

  // Filter only on 2026-11-10
  const filteredDate = filterAttendanceEvents(events, students, {
    startDate: '2026-11-10',
    endDate: '2026-11-10',
  });
  assert.equal(filteredDate.length, 2);

  // Filter by class_1a
  const filteredClass = filterAttendanceEvents(events, students, {
    classId: 'class_1a',
  });
  assert.equal(filteredClass.length, 2);

  // Filter by class_2b on 2026-11-11
  const filteredBoth = filterAttendanceEvents(events, students, {
    startDate: '2026-11-11',
    endDate: '2026-11-11',
    classId: 'class_2b',
  });
  assert.equal(filteredBoth.length, 1);
  assert.equal(filteredBoth[0].id, 'e3');

  // Summary calculation
  const summary = calculateReportSummary(events);
  assert.equal(summary.totalRecords, 3);
  assert.equal(summary.totalEntries, 2);
  assert.equal(summary.totalExits, 1);
  assert.equal(summary.uniqueStudentsCount, 2);
});

