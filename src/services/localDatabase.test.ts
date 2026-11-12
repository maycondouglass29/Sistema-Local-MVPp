import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalDatabaseService } from './localDatabase';

test('LocalDatabaseService initializes with default seed data', () => {
  const db = new LocalDatabaseService();
  const school = db.getSchool();
  const students = db.getStudents();
  const classrooms = db.getClassrooms();

  assert.equal(school.name, 'Escola Horizonte');
  assert.ok(students.length >= 10);
  assert.equal(classrooms.length, 4);
});

test('LocalDatabaseService atomic scan commit writes event and outbox item', () => {
  const db = new LocalDatabaseService();
  const initialEvents = db.getAttendanceEvents().length;
  const initialOutbox = db.getOutboxItems().length;

  const res = db.resolveScanInput('2024-001', 'entry', 'enrollment');
  assert.equal(res.allowed, true);
  assert.ok(res.student);

  // Commit scan
  const event = db.commitAttendanceScan(res.student.id, 'entry', 'enrollment', '2024-001');
  assert.equal(event.student_id, res.student.id);
  assert.equal(event.event_type, 'entry');

  const newEvents = db.getAttendanceEvents();
  const newOutbox = db.getOutboxItems();

  assert.equal(newEvents.length, initialEvents + 1);
  assert.equal(newOutbox.length, initialOutbox + 1);
  assert.equal(newOutbox[0].aggregate_id, event.id);
  assert.match(newOutbox[0].idempotency_key, /^school_horizonte_01:terminal_portaria_01:\d+$/);
});

test('LocalDatabaseService non-destructive correction leaves original intact', () => {
  const db = new LocalDatabaseService();
  const originalEventsCount = db.getAttendanceEvents().length;
  const originalEvent = db.getAttendanceEvents()[0];

  const correctionEvent = db.commitCorrection(originalEvent.id, 'Entrada registrada com aluno incorreto');
  assert.equal(correctionEvent.event_type, 'correction');
  assert.equal(correctionEvent.correction_of_id, originalEvent.id);

  // Total events increased by 1 (original was not replaced or deleted)
  const currentEvents = db.getAttendanceEvents();
  assert.equal(currentEvents.length, originalEventsCount + 1);

  const stillExists = currentEvents.find((e) => e.id === originalEvent.id);
  assert.ok(stillExists, 'Original event must persist in immutable history');
});

test('LocalDatabaseService outbox processes items and updates state to acked', async () => {
  const db = new LocalDatabaseService();
  db.isOnline = true;

  // Add one event to outbox
  const student = db.getStudents()[0];
  db.commitAttendanceScan(student.id, 'entry', 'manual', student.enrollment_code);

  const pendingBefore = db.getPendingOutboxCount();
  assert.ok(pendingBefore > 0);

  const result = await db.processOutboxBatch();
  assert.equal(result.success, true);
  assert.ok(result.processed >= 1);

  const pendingAfter = db.getPendingOutboxCount();
  assert.equal(pendingAfter, 0);
});

test('LocalDatabaseService records manual attendance with reason and guardian', () => {
  const db = new LocalDatabaseService();
  const student = db.getStudents()[0];
  const initialEvents = db.getAttendanceEvents().length;

  const manualEvent = db.recordManualAttendance({
    studentId: student.id,
    eventType: 'entry',
    occurredAt: '2026-11-11T08:15:00Z',
    reason: 'Chegada tardia com atestado médico',
    guardianName: 'Marcos Silva (Pai)',
  });

  assert.equal(manualEvent.student_id, student.id);
  assert.equal(manualEvent.source, 'manual');
  assert.equal(manualEvent.notes, 'Chegada tardia com atestado médico');
  assert.equal(manualEvent.guardian_name, 'Marcos Silva (Pai)');

  const updatedEvents = db.getAttendanceEvents();
  assert.equal(updatedEvents.length, initialEvents + 1);
});

test('LocalDatabaseService executes complete classroom CRUD with integrity protection', () => {
  const db = new LocalDatabaseService();
  
  // 1. Create
  const created = db.addClassroom('3º Ano C', 'Ensino Médio', 'morning');
  assert.equal(created.name, '3º Ano C');

  // 2. Update
  const updated = db.updateClassroom(created.id, { name: '3º Ano C (Avançado)', shift: 'integral' });
  assert.equal(updated.name, '3º Ano C (Avançado)');
  assert.equal(updated.shift, 'integral');

  // 3. Delete safe when no students
  const delRes = db.deleteClassroom(created.id);
  assert.equal(delRes.success, true);

  // 4. Delete prevented when students exist
  const classWithStudents = db.getClassrooms()[0];
  const blockedDel = db.deleteClassroom(classWithStudents.id);
  assert.equal(blockedDel.success, false);
  assert.match(blockedDel.message || '', /Não é possível excluir esta turma/);
});

test('LocalDatabaseService executes guardian update CRUD', () => {
  const db = new LocalDatabaseService();
  const guardian = db.getGuardians()[0];

  const updated = db.updateGuardian(guardian.id, {
    phone: '(11) 99999-8888',
    relationship: 'Tutor Legal',
  });

  assert.equal(updated.phone, '(11) 99999-8888');
  assert.equal(updated.relationship, 'Tutor Legal');
});

test('LocalDatabaseService updates school settings and technical PRAGMA parameters', () => {
  const db = new LocalDatabaseService();

  // 1. Update school parameters
  db.updateSchool({
    name: 'Escola Horizonte Modelo',
    cnpj: '99.888.777/0001-11',
    school_year: '2027',
  });
  const school = db.getSchool();
  assert.equal(school.name, 'Escola Horizonte Modelo');
  assert.equal(school.cnpj, '99.888.777/0001-11');
  assert.equal(school.school_year, '2027');

  // 2. Update PRAGMA settings
  db.updateSystemSettings({
    journal_mode: 'WAL',
    synchronous: 'FULL',
    cache_size: -8000,
    busy_timeout: 10000,
  });
  const settings = db.getSystemSettings();
  assert.equal(settings.journal_mode, 'WAL');
  assert.equal(settings.synchronous, 'FULL');
  assert.equal(settings.cache_size, -8000);
  assert.equal(settings.busy_timeout, 10000);
});

test('LocalDatabaseService executes SQL console queries with real-time feedback', () => {
  const db = new LocalDatabaseService();

  // 1. SELECT query
  const resSelect = db.executeSqlConsole("SELECT * FROM students WHERE status = 'active' LIMIT 5;");
  assert.equal(resSelect.commandType, 'SELECT');
  assert.ok(resSelect.rowCount > 0);
  assert.ok(resSelect.executionTimeMs >= 0);
  assert.ok(resSelect.columns.includes('full_name') || resSelect.columns.length > 0);

  // 2. PRAGMA integrity_check
  const resPragma = db.executeSqlConsole('PRAGMA integrity_check;');
  assert.equal(resPragma.commandType, 'PRAGMA_GET');
  assert.equal(resPragma.rows[0][0], 'integrity_check');

  // 3. VACUUM & REINDEX
  const resVacuum = db.executeSqlConsole('VACUUM;');
  assert.equal(resVacuum.commandType, 'VACUUM');
  const resReindex = db.executeSqlConsole('REINDEX;');
  assert.equal(resReindex.commandType, 'REINDEX');

  // 4. Invalid table error handling
  const resInvalid = db.executeSqlConsole('SELECT * FROM non_existent_table;');
  assert.equal(resInvalid.commandType, 'ERROR');
  assert.ok(resInvalid.error);
});

test('LocalDatabaseService executes user RBAC CRUD and password authentication', () => {
  const db = new LocalDatabaseService();

  // 1. Authenticate with seeded user
  const authSuccess = db.authenticate('admin@escola.local', 'admin123');
  assert.equal(authSuccess.success, true);
  assert.equal(authSuccess.user?.role, 'admin');

  // 2. Reject invalid password
  const authWrongPass = db.authenticate('admin@escola.local', 'senhaerrada');
  assert.equal(authWrongPass.success, false);
  assert.ok(authWrongPass.error?.includes('Senha incorreta'));

  // 3. Reject non-existent user
  const authNotFound = db.authenticate('naocadastrado@escola.local', '1234');
  assert.equal(authNotFound.success, false);
  assert.ok(authNotFound.error?.includes('não cadastrado'));

  // 4. Create new user
  const newUser = db.addUser({
    name: 'Operador Teste',
    email: 'novo.operador@escola.local',
    password: 'senha_forte_123',
    badge_number: 'PORT-99',
    role: 'operator',
  });
  assert.ok(newUser.id);
  assert.equal(newUser.email, 'novo.operador@escola.local');

  // 5. Authenticate with newly created user
  const authNew = db.authenticate('novo.operador@escola.local', 'senha_forte_123');
  assert.equal(authNew.success, true);
  assert.equal(authNew.user?.name, 'Operador Teste');

  // 6. Update user
  const updatedUser = db.updateUser(newUser.id, {
    name: 'Operador Teste Atualizado',
    badge_number: 'PORT-99-B',
  });
  assert.equal(updatedUser.name, 'Operador Teste Atualizado');

  // 7. Delete user
  db.deleteUser(newUser.id);
  const afterDelete = db.authenticate('novo.operador@escola.local', 'senha_forte_123');
  assert.equal(afterDelete.success, false);
});
