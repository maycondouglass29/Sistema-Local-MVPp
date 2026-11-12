import express from 'express';
import cors from 'cors';
import { initDatabase } from './db/connection';
import { seedDatabase } from './db/seed';
import { StudentRepository } from './repositories/studentRepository';
import { AttendanceRepository } from './repositories/attendanceRepository';
import { MemoryRepository } from './repositories/memoryRepository';
import { DecisionLogRepository } from './repositories/decisionLogRepository';
import { OutboxRepository } from './repositories/outboxRepository';
import { LayaDecisionService } from './services/layaDecisionService';
import { Mem0MemoryService } from './services/mem0MemoryService';
import { GateService } from './services/gateService';

export function createServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Database initialization
  const db = initDatabase();
  seedDatabase(db);

  // Repositories
  const studentRepo = new StudentRepository(db);
  const attendanceRepo = new AttendanceRepository(db);
  const memoryRepo = new MemoryRepository(db);
  const decisionLogRepo = new DecisionLogRepository(db);
  const outboxRepo = new OutboxRepository(db);

  // Services with Laya & Mem0
  const layaService = new LayaDecisionService(attendanceRepo, decisionLogRepo);
  const mem0Service = new Mem0MemoryService(memoryRepo);
  const gateService = new GateService(studentRepo, attendanceRepo, outboxRepo, layaService, mem0Service);

  // --- ROUTES ---

  // Health check
  app.get('/api/health', (req, res) => {
    const studentCount = db.query<{ c: number }>('SELECT count(*) as c FROM students').get()?.c || 0;
    const attendanceCount = db.query<{ c: number }>('SELECT count(*) as c FROM attendance_events').get()?.c || 0;
    const memoryCount = db.query<{ c: number }>('SELECT count(*) as c FROM context_memories').get()?.c || 0;
    const pendingOutbox = outboxRepo.getPendingCount();

    res.json({
      status: 'healthy',
      engine: 'SQLite WAL Mode',
      layaDecisionEngine: 'Ready (System 1 Sub-35ms)',
      mem0MemoryLayer: 'Ready (Context Semantic Memory)',
      counts: {
        students: studentCount,
        attendanceEvents: attendanceCount,
        memories: memoryCount,
        pendingOutbox,
      },
      timestamp: new Date().toISOString(),
    });
  });

  // Gate Scan (Laya + Mem0 + Attendance)
  app.post('/api/gate/scan', async (req, res) => {
    try {
      const { rawToken, eventType = 'entry', allowRepetition = false, operatorRole = 'operator' } = req.body;
      if (!rawToken) {
        return res.status(400).json({ error: 'Campo rawToken é obrigatório.' });
      }

      const result = await gateService.processScan({
        rawToken: String(rawToken),
        eventType,
        allowRepetition,
        operatorRole,
      });

      res.json(result);
    } catch (err: any) {
      console.error('Scan error:', err);
      res.status(500).json({ error: err.message || 'Erro ao processar leitura de portaria.' });
    }
  });

  // Gate Stats & Live Feed
  app.get('/api/gate/stats', (req, res) => {
    const counts = attendanceRepo.getCountsToday();
    const recent = attendanceRepo.getTodayEvents(15);
    const pendingOutbox = outboxRepo.getPendingCount();

    res.json({
      counts,
      recentEvents: recent,
      pendingOutboxCount: pendingOutbox,
    });
  });

  // Students CRUD
  app.get('/api/students', (req, res) => {
    const { classId, status, search } = req.query;
    const list = studentRepo.listAll({
      classId: classId ? String(classId) : undefined,
      status: status ? String(status) : undefined,
      search: search ? String(search) : undefined,
    });
    res.json(list);
  });

  app.get('/api/students/:id', (req, res) => {
    const student = studentRepo.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ error: 'Estudante não encontrado.' });
    }
    const context = mem0Service.getContextForStudent(student.id);
    const guardians = studentRepo.getGuardians(student.id);

    res.json({ student, context, guardians });
  });

  app.post('/api/students', (req, res) => {
    const created = studentRepo.create(req.body);
    res.status(201).json(created);
  });

  app.put('/api/students/:id', (req, res) => {
    const updated = studentRepo.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Estudante não encontrado.' });
    }
    res.json(updated);
  });

  // Mem0 Context Memories API
  app.get('/api/memories', (req, res) => {
    const { query, studentId } = req.query;
    if (studentId) {
      return res.json(mem0Service.getContextForStudent(String(studentId)));
    }
    if (query) {
      return res.json(mem0Service.searchMemories(String(query)));
    }
    res.json(mem0Service.listAll());
  });

  app.post('/api/memories', (req, res) => {
    const { studentId, category, content, importance, expiresAt } = req.body;
    if (!studentId || !content) {
      return res.status(400).json({ error: 'studentId e content são obrigatórios.' });
    }
    const mem = mem0Service.saveMemory({
      studentId,
      category: category || 'general',
      content,
      importance: Number(importance) || 3,
      expiresAt,
    });
    res.status(201).json(mem);
  });

  // Attendance History
  app.get('/api/attendance', (req, res) => {
    const events = attendanceRepo.getTodayEvents(100);
    res.json(events);
  });

  // Outbox Status
  app.get('/api/outbox', (req, res) => {
    const pending = outboxRepo.getPending(50);
    const count = outboxRepo.getPendingCount();
    res.json({ count, items: pending });
  });

  // --- HARDWARE & CAMERA MANAGEMENT ENDPOINTS ---

  // Get saved hardware & camera configuration
  app.get('/api/hardware/config', (req, res) => {
    try {
      const row = db.query<{ value_json: string }>('SELECT value_json FROM system_settings WHERE key = ?').get('hardware_camera_config');
      if (row?.value_json) {
        return res.json(JSON.parse(row.value_json));
      }
      res.json({
        cameraSourceType: 'usb_webrtc',
        preferredDeviceId: null,
        preferredDeviceLabel: null,
        resolution: '720p',
        ipStreamUrl: '',
        mirrorVideo: false,
        beepOnScan: true,
        autoSwitchExternal: true,
        scannerSpeed: 'turbo',
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Erro ao carregar configurações de hardware: ' + err.message });
    }
  });

  // Save hardware & camera configuration
  app.post('/api/hardware/config', (req, res) => {
    try {
      const config = req.body;
      const now = new Date().toISOString();
      db.run(
        `INSERT INTO system_settings (key, value_json, updated_at) 
         VALUES ('hardware_camera_config', ?, ?) 
         ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`,
        JSON.stringify(config),
        now
      );
      res.json({ success: true, updated_at: now, config });
    } catch (err: any) {
      res.status(500).json({ error: 'Erro ao salvar configurações de hardware: ' + err.message });
    }
  });

  // Test reachability of a local CCTV / IP Camera stream
  app.get('/api/hardware/camera/ping-stream', async (req, res) => {
    const streamUrl = req.query.url as string;
    if (!streamUrl) {
      return res.status(400).json({ ok: false, error: 'Parâmetro url é obrigatório' });
    }

    try {
      const start = Date.now();
      const response = await fetch(streamUrl, {
        signal: AbortSignal.timeout(3000),
        headers: { 'User-Agent': 'EscolaPortaria-LocalGateway/1.0' },
      });
      const latencyMs = Date.now() - start;
      const contentType = response.headers.get('content-type') || 'unknown';

      res.json({
        ok: response.ok,
        status: response.status,
        latencyMs,
        contentType,
        url: streamUrl,
        message: response.ok ? 'Câmera de monitoramento conectada com sucesso.' : `Resposta HTTP ${response.status}`,
      });
    } catch (err: any) {
      res.json({
        ok: false,
        latencyMs: -1,
        error: err.name === 'TimeoutError' ? 'Tempo limite esgotado (3s). Verifique o IP da câmera.' : err.message,
        url: streamUrl,
      });
    }
  });

  // Stream proxy for local IP cameras (MJPEG / snapshots) avoiding CORS and CSP issues
  app.get('/api/hardware/camera/proxy', async (req, res) => {
    const streamUrl = req.query.url as string;
    if (!streamUrl) {
      return res.status(400).send('Parâmetro url é obrigatório');
    }

    try {
      const upstream = await fetch(streamUrl, {
        signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': 'EscolaPortaria-LocalGateway/1.0' },
      });

      res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/jpeg');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

      if (!upstream.body) {
        return res.status(502).send('Sem corpo de resposta retornado pela câmera de monitoramento');
      }

      // Stream chunks directly to client
      // @ts-ignore
      const reader = upstream.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } catch (err: any) {
      res.status(502).json({ error: 'Falha no proxy da câmera: ' + err.message });
    }
  });

  return { app, db };
}

// Start standalone server on port 3002 if executed directly
if ((typeof process !== 'undefined' && process.env.RUN_STANDALONE === 'true') || (typeof require !== 'undefined' && require.main === module)) {
  const port = process.env.PORT || 3002;
  const { app } = createServer();
  app.listen(port, () => {
    console.log(`[Backend SQLite] Servidor ativo em http://localhost:${port}`);
    console.log(`[Laya Engine] Decisões sub-35ms ativas`);
    console.log(`[Mem0 Layer] Memória contextual ativa`);
  });
}
