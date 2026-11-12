import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { LayaDecisionService } from '../src/services/layaDecisionService';
import { Mem0MemoryService } from '../src/services/mem0MemoryService';
import { GateService } from '../src/services/gateService';
import { initDatabase, resetDatabaseInstance } from '../src/db/connection';
import { seedDatabase } from '../src/db/seed';
import { StudentRepository } from '../src/repositories/studentRepository';
import { MemoryRepository } from '../src/repositories/memoryRepository';
import { AttendanceRepository } from '../src/repositories/attendanceRepository';
import { DecisionLogRepository } from '../src/repositories/decisionLogRepository';
import { OutboxRepository } from '../src/repositories/outboxRepository';

// Force test environment for :memory: database
process.env.NODE_ENV = 'test';

describe('Laya Decision Engine & Mem0 Context Layer (Backend)', () => {
  let db: any;
  let studentRepo: StudentRepository;
  let attendanceRepo: AttendanceRepository;
  let memoryRepo: MemoryRepository;
  let decisionLogRepo: DecisionLogRepository;
  let outboxRepo: OutboxRepository;
  let layaService: LayaDecisionService;
  let mem0Service: Mem0MemoryService;
  let gateService: GateService;

  beforeEach(() => {
    // Fresh :memory: DB per test — reset singleton first
    resetDatabaseInstance();
    db = initDatabase();
    seedDatabase(db);
    studentRepo = new StudentRepository(db);
    attendanceRepo = new AttendanceRepository(db);
    memoryRepo = new MemoryRepository(db);
    decisionLogRepo = new DecisionLogRepository(db);
    outboxRepo = new OutboxRepository(db);

    layaService = new LayaDecisionService(attendanceRepo, decisionLogRepo);
    mem0Service = new Mem0MemoryService(memoryRepo);
    gateService = new GateService(studentRepo, attendanceRepo, outboxRepo, layaService, mem0Service);
  });

  afterEach(() => {
    try { db.close(); } catch (_) {}
    resetDatabaseInstance();
  });

  it('Laya Engine grants access in < 35ms for active student without prior entry', async () => {
    // 2024-005 has no prior entry today
    const student = studentRepo.findByEnrollment('2024-005');
    expect(student).toBeDefined();

    const startTime = performance.now();
    const decision = await layaService.evaluateAccess({
      student: student!,
      eventType: 'entry',
    });
    const duration = performance.now() - startTime;

    expect(decision.code).toBe('ACCESS_GRANTED');
    expect(decision.allowed).toBe(true);
    expect(duration).toBeLessThan(35); // Sub-35ms requirement
    expect(decision.latencyMs).toBeLessThan(35);
  });

  it('Laya Engine detects duplicate scan anomaly when student already entered', async () => {
    // 2024-001 already has an entry event in seed data
    const student = studentRepo.findByEnrollment('2024-001');
    expect(student).toBeDefined();

    const decision = await layaService.evaluateAccess({
      student: student!,
      eventType: 'entry',
      allowRepetition: false,
    });

    expect(decision.code).toBe('ANOMALY_DUPLICATE_SCAN');
    expect(decision.allowed).toBe(false);
  });

  it('Laya Engine blocks access for student with active custody restriction', async () => {
    // 2024-003 is blocked in seed data
    const student = studentRepo.findByEnrollment('2024-003');
    expect(student).toBeDefined();

    const decision = await layaService.evaluateAccess({
      student: student!,
      eventType: 'exit',
    });

    expect(decision.code).toBe('ACCESS_DENIED_BLOCKED');
    expect(decision.allowed).toBe(false);
  });

  it('Mem0 correctly partitions critical alerts, authorized pickups, and general notes', () => {
    const student = studentRepo.findByEnrollment('2024-001');
    expect(student).toBeDefined();

    const context = mem0Service.getContextForStudent(student!.id);
    expect(context).toBeDefined();
    expect(context.authorizedPickups.length).toBeGreaterThan(0);
    expect(context.authorizedPickups[0].content).toContain('Dona Maria');
  });

  it('GateService blocks scan when token does not exist in SQLite', async () => {
    const res = await gateService.processScan({
      rawToken: 'TOKEN_INEXISTENTE_999',
      eventType: 'entry',
    });

    expect(res.success).toBe(false);
    expect(res.decision.code).toBe('ACCESS_DENIED_BLOCKED');
    expect(res.soundCue).toBe('error');
  });

  it('GateService records attendance and enqueues to Outbox on valid scan', async () => {
    const initialOutboxCount = outboxRepo.getPendingCount();

    const res = await gateService.processScan({
      rawToken: '2024-005',
      eventType: 'entry',
    });

    expect(res.success).toBe(true);
    expect(res.attendanceEvent).toBeDefined();
    expect(res.soundCue).toBe('success');

    const newOutboxCount = outboxRepo.getPendingCount();
    expect(newOutboxCount).toBeGreaterThan(initialOutboxCount);
  });
});
