import { SqlDatabase } from './connection';
import crypto from 'crypto';

export function seedDatabase(db: SqlDatabase) {
  const schoolCount = db.query<{ count: number }>('SELECT count(*) as count FROM schools').get()?.count || 0;
  if (schoolCount > 0) {
    return; // Already seeded
  }

  const nowIso = new Date().toISOString();
  const todayStr = nowIso.slice(0, 10);

  // 1. School
  db.run(
    `INSERT INTO schools (id, name, timezone, created_at, updated_at, sync_version)
     VALUES (?, ?, ?, ?, ?, ?)`,
    'school_horizonte_01',
    'Escola Horizonte',
    'America/Sao_Paulo',
    nowIso,
    nowIso,
    1
  );

  // 2. Classrooms
  const classes = [
    { id: 'class_1em_a', name: '1º Ano A', grade: 'Ensino Médio', shift: 'morning' },
    { id: 'class_2em_b', name: '2º Ano B', grade: 'Ensino Médio', shift: 'morning' },
    { id: 'class_3em_c', name: '3º Ano C', grade: 'Ensino Médio', shift: 'morning' },
    { id: 'class_9ef_a', name: '9º Ano A', grade: 'Fundamental II', shift: 'afternoon' },
  ];

  for (const c of classes) {
    db.run(
      `INSERT INTO classrooms (id, school_id, name, grade, shift) VALUES (?, ?, ?, ?, ?)`,
      c.id,
      'school_horizonte_01',
      c.name,
      c.grade,
      c.shift
    );
  }

  // 3. Students
  const rawStudents = [
    { id: 'stu_001', code: '2024-001', name: 'Lucas Silva Santos', classId: 'class_1em_a', guardian: 'Renata Silva', phone: '(11) 98765-4321', status: 'active', photo: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80', medical: 'Sem restrições conhecidas.' },
    { id: 'stu_002', code: '2024-002', name: 'Beatriz Almeida Costa', classId: 'class_1em_a', guardian: 'Carlos Costa', phone: '(11) 97654-3210', status: 'active', photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80', medical: 'Usa óculos de grau em sala.' },
    { id: 'stu_003', code: '2024-003', name: 'Gabriel Rodrigues Lima', classId: 'class_1em_a', guardian: 'Sônia Lima', phone: '(11) 96543-2109', status: 'blocked', blockReason: 'Suspensão temporária / Coordenação', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', medical: 'Acompanhamento pedagógico especial.' },
    { id: 'stu_004', code: '2024-004', name: 'Mariana Duarte Souza', classId: 'class_1em_a', guardian: 'Fábio Souza', phone: '(11) 95432-1098', status: 'active', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', medical: 'Alergia severa a amendoim e castanhas.' },
    { id: 'stu_005', code: '2024-005', name: 'Enzo Ferreira Ramos', classId: 'class_2em_b', guardian: 'Juliana Ferreira', phone: '(11) 94321-0987', status: 'active', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', medical: 'Intolerância à lactose.' },
    { id: 'stu_006', code: '2024-006', name: 'Sophia Martins Castro', classId: 'class_2em_b', guardian: 'André Castro', phone: '(11) 93210-9876', status: 'inactive', photo: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80', medical: 'Transferência solicitada.' },
    { id: 'stu_007', code: '2024-007', name: 'Matheus Henrique Dias', classId: 'class_2em_b', guardian: 'Paula Dias', phone: '(11) 92109-8765', status: 'active', photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80', medical: 'Nenhuma restrição.' },
    { id: 'stu_008', code: '2024-008', name: 'Camila Nogueira Pires', classId: 'class_2em_b', guardian: 'Roberto Pires', phone: '(11) 91098-7654', status: 'active', photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', medical: 'Nenhuma restrição.' },
    { id: 'stu_009', code: '2024-009', name: 'Thiago Farias Barreto', classId: 'class_3em_c', guardian: 'Vanessa Barreto', phone: '(11) 99887-6543', status: 'active', photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80', medical: 'Nenhuma restrição.' },
    { id: 'stu_010', code: '2024-010', name: 'Larissa Azevedo Mendes', classId: 'class_3em_c', guardian: 'Marcelo Mendes', phone: '(11) 98876-5432', status: 'active', photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80', medical: 'Nenhuma restrição.' },
  ];

  for (const s of rawStudents) {
    db.run(
      `INSERT INTO students (id, school_id, enrollment_code, full_name, class_id, status, photo_ref, valid_from, valid_until, guardian_name, guardian_phone, block_reason, medical_notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      s.id,
      'school_horizonte_01',
      s.code,
      s.name,
      s.classId,
      s.status,
      s.photo,
      '2026-02-01',
      '2026-12-31',
      s.guardian,
      s.phone,
      s.blockReason || null,
      s.medical,
      nowIso,
      nowIso
    );

    // Identifiers (QR and Barcode)
    const rawQrToken = `ESCHZ:V1:${s.id}:${s.code}`;
    const qrHash = crypto.createHash('sha256').update(rawQrToken).digest('hex');

    db.run(
      `INSERT INTO student_identifiers (id, school_id, student_id, kind, value_hash, value_last4, raw_token, active, issued_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      `ident_${s.id}_qr`,
      'school_horizonte_01',
      s.id,
      'qr',
      qrHash,
      s.code.slice(-4),
      rawQrToken,
      1,
      nowIso
    );
  }

  // 4. Guardians
  const guardians = [
    { id: 'guard_001', name: 'Renata Silva', phone: '(11) 98765-4321', relationship: 'Mãe', studentId: 'stu_001' },
    { id: 'guard_002', name: 'Carlos Costa', phone: '(11) 97654-3210', relationship: 'Pai', studentId: 'stu_002' },
    { id: 'guard_003', name: 'Sônia Lima', phone: '(11) 96543-2109', relationship: 'Mãe', studentId: 'stu_003' },
    { id: 'guard_004', name: 'Fábio Souza', phone: '(11) 95432-1098', relationship: 'Pai', studentId: 'stu_004' },
    { id: 'guard_005', name: 'Dona Maria Santos (Avó)', phone: '(11) 98888-1122', relationship: 'Avó', studentId: 'stu_001' },
  ];

  for (const g of guardians) {
    db.run(
      `INSERT INTO guardians (id, school_id, full_name, phone, relationship, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      g.id,
      'school_horizonte_01',
      g.name,
      g.phone,
      g.relationship,
      nowIso
    );

    db.run(
      `INSERT INTO student_guardians (id, student_id, guardian_id, is_primary_contact, can_pickup, emergency_priority, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      `sg_${g.id}_${g.studentId}`,
      g.studentId,
      g.id,
      g.relationship === 'Mãe' ? 1 : 0,
      1,
      g.relationship === 'Mãe' ? 1 : 2,
      nowIso
    );
  }

  // 5. Context Memories (Mem0 Memory Layer)
  const memories = [
    {
      id: 'mem_001',
      entity_type: 'student',
      entity_id: 'stu_004',
      category: 'health_medical',
      importance: 5,
      content: 'Alergia alimentar severa a amendoim e castanhas. Aluna carrega medicação de emergência na mochila. Em caso de reação na portaria acionar enfermaria imediatamente.',
    },
    {
      id: 'mem_002',
      entity_type: 'student',
      entity_id: 'stu_003',
      category: 'custody',
      importance: 5,
      content: 'Suspensão pedagógica vigente até sexta-feira. Somente a mãe Sônia Lima pode retirar o material didático. Não autorizada saída desacompanhada.',
    },
    {
      id: 'mem_003',
      entity_type: 'student',
      entity_id: 'stu_001',
      category: 'temporary_pickup',
      importance: 4,
      content: 'Avó Dona Maria Santos autorizada formalmente a buscar o aluno às terças e quintas-feiras após o término das aulas.',
    },
    {
      id: 'mem_004',
      entity_type: 'student',
      entity_id: 'stu_002',
      category: 'general',
      importance: 2,
      content: 'Aluna participa do clube de robótica extracurricular às quartas-feiras até 18h30.',
    },
  ];

  for (const m of memories) {
    db.run(
      `INSERT INTO context_memories (id, entity_type, entity_id, category, content, importance_score, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      m.id,
      m.entity_type,
      m.entity_id,
      m.category,
      m.content,
      m.importance,
      nowIso,
      nowIso
    );
  }

  // 6. Sample Initial Attendance
  const morningEvents = [
    { id: 'att_001', student_id: 'stu_001', time: `${todayStr}T07:12:35Z`, seq: 1 },
    { id: 'att_002', student_id: 'stu_002', time: `${todayStr}T07:14:18Z`, seq: 2 },
    { id: 'att_003', student_id: 'stu_004', time: `${todayStr}T07:18:40Z`, seq: 3 },
  ];

  for (const ev of morningEvents) {
    db.run(
      `INSERT INTO attendance_events (id, school_id, student_id, event_type, occurred_at_device, occurred_at_utc, device_id, operator_id, source, client_sequence, created_at, sync_state)
       VALUES (?, ?, ?, 'entry', ?, ?, 'terminal_01', 'op_marina', 'qr', ?, ?, 'acked')`,
      ev.id,
      'school_horizonte_01',
      ev.student_id,
      ev.time,
      ev.time,
      ev.seq,
      ev.time
    );
  }

  console.log('Database seeded successfully with initial school, students, identifiers, guardians, and Mem0 memories.');
}

