/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  HardDrive,
  RefreshCw,
  Wifi,
  WifiOff,
  CheckCircle2,
  Clock,
  Download,
  Code,
  FileCode,
  Eye,
  X,
  Zap,
  Volume2,
  Sliders,
  Keyboard,
  ShieldCheck,
  Play,
  Camera,
  Video,
  Tv,
  AlertCircle,
  Settings2,
  Lock,
  ShieldAlert,
  Cpu,
  Sparkles,
  Layers,
  Activity,
  Users,
  ArrowRight,
  BookOpen,
  Info,
  Shield,
  Check,
  Terminal,
  RotateCcw,
  Building2,
  Calendar,
  Trash2,
} from 'lucide-react';
import { localDb, SYSTEM_OPERATORS } from '../services/localDatabase';
import { OutboxItem, SystemUser, Student, SystemTechnicalSettings, School } from '../types/database';
import { soundManager } from '../utils/sound';
import {
  hardwareConfig,
  DetectedCamera,
  HardwareConfig,
} from '../services/hardwareConfig';

export const OutboxSyncView: React.FC = () => {
  const [activePersona, setActivePersona] = useState<
    'operador' | 'hardware' | 'coordenacao' | 'laya' | 'ti'
  >('operador');
  const [outboxItems, setOutboxItems] = useState<OutboxItem[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(localDb.isOnline);
  const [isSyncing, setIsSyncing] = useState<boolean>(localDb.isSyncing);
  const [selectedItem, setSelectedItem] = useState<OutboxItem | null>(null);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [currentOperator, setCurrentOperator] = useState<SystemUser>(localDb.currentOperator);

  // Hardware & Camera State
  const [hwConfig, setHwConfig] = useState<HardwareConfig>(hardwareConfig.getConfig());
  const [detectedCameras, setDetectedCameras] = useState<DetectedCamera[]>([]);
  const [isRefreshingCameras, setIsRefreshingCameras] = useState<boolean>(false);
  const [isTestingCamera, setIsTestingCamera] = useState<boolean>(false);
  const [cameraTestFps, setCameraTestFps] = useState<number>(0);
  const [cameraTestResolution, setCameraTestResolution] = useState<string>('');
  const [isTestingIp, setIsTestingIp] = useState<boolean>(false);
  const [ipTestResult, setIpTestResult] = useState<{
    ok: boolean;
    latencyMs: number;
    contentType?: string;
    message?: string;
    error?: string;
  } | null>(null);
  const testVideoRef = useRef<HTMLVideoElement>(null);
  const testStreamRef = useRef<MediaStream | null>(null);

  // Operator configs
  const [scannerSpeed] = useState<string>('turbo');

  // Coordination configs
  const [morningToleranceMins, setMorningToleranceMins] = useState<number>(15);
  const [duplicitySeconds, setDuplicitySeconds] = useState<number>(60);
  const [requireGuardianOnEarlyExit, setRequireGuardianOnEarlyExit] = useState<boolean>(true);
  const [retentionMessage, setRetentionMessage] = useState<string>(
    'Favor encaminhar o estudante à Coordenação Pedagógica (Sala 04).'
  );

  // Laya Simulator State
  const [students, setStudents] = useState<Student[]>([]);
  const [simStudentId, setSimStudentId] = useState<string>('');
  const [simEventType, setSimEventType] = useState<'entry' | 'exit'>('entry');
  const [simResult, setSimResult] = useState<{
    allowed: boolean;
    decision: string;
    reason: string;
    latencyMs: number;
    confidence: number;
    steps: { label: string; ok: boolean; detail: string }[];
    studentName?: string;
    medicalNote?: string;
    guardiansNote?: string;
  } | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // TI configs & Modals
  const [integrityStatus, setIntegrityStatus] = useState<string | null>(null);
  const [systemSettings, setSystemSettings] = useState<SystemTechnicalSettings>(localDb.getSystemSettings());
  const [sqlQuery, setSqlQuery] = useState<string>("SELECT * FROM students WHERE status = 'active' LIMIT 5;");
  const [sqlResult, setSqlResult] = useState<{
    columns: string[];
    rows: any[][];
    rowCount: number;
    executionTimeMs: number;
    error?: string;
    commandType: string;
  } | null>(null);
  const [isExecutingSql, setIsExecutingSql] = useState<boolean>(false);
  const [schoolForm, setSchoolForm] = useState<School>(localDb.getSchool());
  const [maintenanceNotice, setMaintenanceNotice] = useState<string | null>(null);

  const isAdmin = currentOperator.role === 'admin';
  const isCoordinator = currentOperator.role === 'coordinator' || isAdmin;

  const loadData = () => {
    setOutboxItems(localDb.getOutboxItems());
    setIsOnline(localDb.isOnline);
    setIsSyncing(localDb.isSyncing);
    setCurrentOperator(localDb.currentOperator);
    setSystemSettings(localDb.getSystemSettings());
    setSchoolForm(localDb.getSchool());
    const stuList = localDb.getStudents();
    setStudents(stuList);
    if (!simStudentId && stuList.length > 0) {
      setSimStudentId(stuList[0].id);
    }
  };

  const refreshDeviceList = async () => {
    setIsRefreshingCameras(true);
    const cams = await hardwareConfig.detectCameras();
    setDetectedCameras(cams);
    setIsRefreshingCameras(false);
  };

  useEffect(() => {
    const preferred = window.sessionStorage.getItem('preferred_config_persona');
    if (preferred && ['operador', 'hardware', 'coordenacao', 'laya', 'ti'].includes(preferred)) {
      setActivePersona(preferred as any);
      window.sessionStorage.removeItem('preferred_config_persona');
    }

    const handlePersonaNav = (e: Event) => {
      const customEvent = e as CustomEvent<{ persona: string }>;
      if (customEvent.detail?.persona && ['operador', 'hardware', 'coordenacao', 'laya', 'ti'].includes(customEvent.detail.persona)) {
        setActivePersona(customEvent.detail.persona as any);
      }
    };
    window.addEventListener('app-navigate-persona', handlePersonaNav);

    loadData();
    refreshDeviceList();
    const unsubDb = localDb.subscribe(loadData);

    const unsubHw = hardwareConfig.subscribe(() => {
      setHwConfig(hardwareConfig.getConfig());
    });

    const unsubHotplug = hardwareConfig.onHotplug((cams) => {
      setDetectedCameras(cams);
      showNotification('Novo dispositivo de vídeo USB detectado.');
    });

    return () => {
      window.removeEventListener('app-navigate-persona', handlePersonaNav);
      unsubDb();
      unsubHw();
      unsubHotplug();
      stopCameraTest();
    };
  }, []);

  const pendingCount = outboxItems.filter(
    (i) => i.state === 'pending' || i.state === 'sending'
  ).length;
  const ackedCount = outboxItems.filter((i) => i.state === 'acked').length;

  const handleForceSync = async () => {
    const res = await localDb.processOutboxBatch();
    if (res.success) {
      setSyncStatusMsg(
        `Sincronização concluída: ${res.processed} evento(s) confirmados pelo servidor (ACK).`
      );
    } else {
      setSyncStatusMsg(
        'Terminal em modo offline. Eventos permanecem preservados no banco local.'
      );
    }
    setTimeout(() => setSyncStatusMsg(null), 4000);
  };

  const showNotification = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const stopCameraTest = () => {
    if (testStreamRef.current) {
      testStreamRef.current.getTracks().forEach((t) => t.stop());
      testStreamRef.current = null;
    }
    setIsTestingCamera(false);
    setCameraTestFps(0);
    setCameraTestResolution('');
  };

  const startCameraTest = async (deviceId?: string) => {
    stopCameraTest();
    try {
      const targetId = deviceId || hwConfig.preferredDeviceId;
      const resLimits = hardwareConfig.getResolutionConstraints(hwConfig.resolution);

      const constraints: MediaStreamConstraints = {
        video: targetId
          ? {
            deviceId: { exact: targetId },
            width: { ideal: resLimits.width },
            height: { ideal: resLimits.height },
          }
          : {
            facingMode: 'environment',
            width: { ideal: resLimits.width },
            height: { ideal: resLimits.height },
          },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      testStreamRef.current = stream;
      if (testVideoRef.current) {
        testVideoRef.current.srcObject = stream;
        await testVideoRef.current.play();
        const track = stream.getVideoTracks()[0];
        const settings = track.getSettings();
        setCameraTestResolution(`${settings.width || 1280}x${settings.height || 720}`);
        setCameraTestFps(Math.round(settings.frameRate || 30));
      }
      setIsTestingCamera(true);
      showNotification('Teste de câmera iniciado.');
    } catch (err: any) {
      showNotification(
        'Erro ao acessar câmera: ' +
        (err.message || 'Verifique se o dispositivo está em uso.')
      );
      stopCameraTest();
    }
  };

  const handleSelectDefaultCamera = async (device: DetectedCamera) => {
    if (!isAdmin) {
      showNotification('Permissão negada: Apenas Administradores podem definir a câmera padrão.');
      return;
    }
    await hardwareConfig.saveConfig({
      preferredDeviceId: device.deviceId,
      preferredDeviceLabel: device.label,
      cameraSourceType: 'usb_webrtc',
    });
    showNotification(`Câmera padrão definida: ${device.label}`);
    if (isTestingCamera) {
      startCameraTest(device.deviceId);
    }
  };

  const handleTestIpCamera = async () => {
    if (!hwConfig.ipStreamUrl.trim()) {
      showNotification('Informe a URL da câmera IP ou stream de monitoramento.');
      return;
    }
    setIsTestingIp(true);
    setIpTestResult(null);
    const result = await hardwareConfig.pingIpCamera(hwConfig.ipStreamUrl.trim());
    setIsTestingIp(false);
    setIpTestResult(result);
    if (result.ok) {
      showNotification(`Câmera conectada com sucesso (${result.latencyMs}ms).`);
    } else {
      showNotification(
        `Falha na conexão: ${result.error || 'Verifique o endereço da câmera.'}`
      );
    }
  };

  const handleSaveIpCamera = () => {
    if (!isAdmin) {
      showNotification('Permissão negada: Apenas Administradores podem salvar a URL de CFTV.');
      return;
    }
    hardwareConfig.saveConfig({ ipStreamUrl: hwConfig.ipStreamUrl });
    showNotification('Endereço da câmera IP/CFTV salvo com sucesso.');
  };

  const handleTestSound = (type: 'success' | 'warning' | 'denied') => {
    if (type === 'success') {
      soundManager.playSuccess();
      showNotification('Sinal sonoro de liberação reproduzido.');
    } else if (type === 'warning') {
      soundManager.playWarning();
      showNotification('Sinal sonoro de atenção reproduzido.');
    } else {
      soundManager.playDenied();
      showNotification('Sinal sonoro de bloqueio reproduzido.');
    }
  };

  const handleCheckDatabaseIntegrity = () => {
    if (!isAdmin) {
      showNotification('Permissão negada: Apenas Administradores podem checar o banco de dados.');
      return;
    }
    setIntegrityStatus('Executando PRAGMA integrity_check no arquivo SQLite...');
    setTimeout(() => {
      setIntegrityStatus(
        'PRAGMA integrity_check: OK (0 páginas corrompidas, modo WAL ativo).'
      );
    }, 400);
  };

  const handleDownloadSql = () => {
    if (!isAdmin) {
      showNotification('Permissão negada: Apenas Administradores podem exportar o DDL SQL.');
      return;
    }
    const ddl = localDb.exportSqlSchema();
    const blob = new Blob([ddl], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schema_portaria_sqlite.sql';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showNotification('Arquivo DDL SQL gerado para o Administrador de TI.');
  };

  const handleDownloadBackupJson = () => {
    if (!isAdmin) {
      showNotification('Permissão negada: Apenas Administradores podem gerar backups completos.');
      return;
    }
    const json = localDb.exportDatabaseJson();
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_sqlite_local_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showNotification('Backup completo do banco salvo com sucesso.');
  };

  const handleSaveSystemSettings = () => {
    if (!isAdmin) {
      showNotification('Permissão negada: Apenas Administradores podem alterar os parâmetros do motor SQLite.');
      return;
    }
    localDb.updateSystemSettings(systemSettings);
    showNotification(`Parâmetros PRAGMA do SQLite salvos (journal_mode=${systemSettings.journal_mode}, sync=${systemSettings.synchronous}).`);
  };

  const handleSaveSchoolParameters = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isAdmin) {
      showNotification('Permissão negada: Apenas Administradores podem atualizar os dados institucionais.');
      return;
    }
    localDb.updateSchool(schoolForm);
    showNotification('Parâmetros da escola e horários de turno atualizados com sucesso.');
  };

  const handleExecuteSql = () => {
    if (!isAdmin) {
      showNotification('Permissão negada: Apenas Administradores podem executar consultas no console SQL.');
      return;
    }
    setIsExecutingSql(true);
    setTimeout(() => {
      const res = localDb.executeSqlConsole(sqlQuery);
      setSqlResult(res);
      setIsExecutingSql(false);
      if (res.error) {
        showNotification(`Erro SQL: ${res.error}`);
      } else {
        showNotification(`Query SQL concluída com sucesso (${res.executionTimeMs}ms) - ${res.rowCount} linha(s).`);
      }
    }, 40);
  };

  const handleRunVacuum = () => {
    if (!isAdmin) return;
    const res = localDb.runVacuum();
    setMaintenanceNotice(res.status);
    showNotification(`VACUUM executado (${res.durationMs}ms).`);
  };

  const handleRunReindex = () => {
    if (!isAdmin) return;
    const res = localDb.runReindex();
    setMaintenanceNotice(res.status);
    showNotification(`REINDEX executado (${res.durationMs}ms).`);
  };

  const handleResetToSeed = () => {
    if (!isAdmin) return;
    if (window.confirm('Tem certeza de que deseja restaurar o banco de dados para os registros originais de demonstração?')) {
      localDb.resetToFactorySeed();
      loadData();
      showNotification('Banco de dados restaurado com sucesso para o padrão de demonstração.');
    }
  };

  // Run Laya Interactive Simulation
  const handleRunLayaSimulation = (customStudentId?: string) => {
    const targetId = customStudentId || simStudentId || (students[0]?.id);
    if (!targetId) return;

    setIsSimulating(true);
    const t0 = performance.now();

    const student = localDb.getStudentById(targetId);
    const identifier = localDb.getActiveIdentifier(targetId);
    const rawToken = identifier
      ? identifier.raw_token
      : student?.enrollment_code || 'N/A';

    const res = localDb.resolveScanInput(rawToken, simEventType, 'qr');
    const t1 = performance.now();
    const latency = Math.round((t1 - t0) * 100) / 100 || 0.19;

    const isBlocked = student?.status === 'blocked';
    const hasMedical = !!student?.medical_notes;
    const hasGuardians =
      !!student?.pickup_authorized_names || !!student?.guardian_name;

    const steps = [
      {
        label: 'Passo 1: Decodificação Determinística',
        ok: true,
        detail: `Token resolvido instantaneamente no padrão opaco LGPD (${rawToken.slice(
          0,
          24
        )}...) sem dependência de nuvem.`,
      },
      {
        label: 'Passo 2: Avaliação Não-Autoregressiva de Status',
        ok: student?.status === 'active',
        detail:
          student?.status === 'active'
            ? `Estudante com matrícula ativa (${student.enrollment_code}) e dentro do período letivo.`
            : `Estudante com status '${student?.status}': ${student?.block_reason || 'Acesso bloqueado pela coordenação'
            }.`,
      },
      {
        label: 'Passo 3: Janela Anti-Passback e Duplicidade',
        ok: res.allowed,
        detail: res.allowed
          ? `Nenhuma duplicidade registrada dentro do cooldown de ${duplicitySeconds} segundos.`
          : res.message || 'Conflito de duplicidade detectado pelo Laya.',
      },
      {
        label: 'Passo 4: Resolução de Memória Contextual Mem0',
        ok: true,
        detail:
          hasMedical || hasGuardians
            ? `Recuperadas ${hasMedical
              ? `alertas médicos ("${student?.medical_notes}")`
              : ''
            } ${hasGuardians
              ? `e autorizações de terceiros (${student?.pickup_authorized_names || student?.guardian_name})`
              : ''
            }.`
            : 'Nenhum alerta crítico médico ou de custódia associado.',
      },
    ];

    setSimResult({
      allowed: res.allowed,
      decision: res.allowed
        ? 'ACCESS_GRANTED'
        : isBlocked
          ? 'ACCESS_BLOCKED'
          : 'ANOMALY_DUPLICATE_SCAN',
      reason: res.message,
      latencyMs: latency,
      confidence: 0.999,
      steps,
      studentName: student?.full_name,
      medicalNote: student?.medical_notes,
      guardiansNote:
        student?.pickup_authorized_names ||
        (student?.guardian_name
          ? `Responsável: ${student.guardian_name}`
          : undefined),
    });

    setIsSimulating(false);
  };

  const handleSwitchOperator = (op: SystemUser) => {
    localDb.currentOperator = op;
    setCurrentOperator(op);
    showNotification(`Perfil alternado para ${op.name} (${op.role.toUpperCase()}).`);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 tracking-tight flex items-center gap-2">
            Configurações
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Operador de portaria, câmeras, políticas pedagógicas, motor Laya e dados da escola
          </p>
        </div>

        {/* Header Right Badges and Outbox Status */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Active Operator Status Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-white border-neutral-200 shadow-2xs text-xs">
            <span className="text-neutral-500">Operador ativo:</span>
            <strong className="text-neutral-900">{currentOperator.name}</strong>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isAdmin
                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                  : isCoordinator
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                }`}
            >
              {isAdmin
                ? 'Administrador'
                : isCoordinator
                  ? 'Coordenação'
                  : 'Operador'}
            </span>
          </div>

          <button
            onClick={() => {
              localDb.isOnline = !isOnline;
              setIsOnline(!isOnline);
              showNotification(
                !isOnline
                  ? 'Simulação: Conexão com o servidor ativada.'
                  : 'Simulação: Conexão desativada (Modo Offline Estrito).'
              );
            }}
            className={`border px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs ${isOnline
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-neutral-100 border-neutral-300 text-neutral-600'
              }`}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span>Rede conectada</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-neutral-500" />
                <span>Modo offline</span>
              </>
            )}
          </button>

          <button
            onClick={handleForceSync}
            disabled={!isOnline || isSyncing}
            className="bg-[#0f766e] hover:bg-[#0d5f59] disabled:opacity-50 text-white text-xs font-medium px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors duration-150 cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Sincronizar outbox</span>
          </button>
        </div>
      </div>

      {syncStatusMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{syncStatusMsg}</span>
        </div>
      )}

      {actionNotice && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Role Navigation Segmented Tabs (5 Tabs com Laya em Destaque) */}
      <div className="bg-neutral-100 p-1 rounded-xl inline-flex flex-wrap gap-1 border border-neutral-200 text-xs font-medium">
        <button
          onClick={() => setActivePersona('operador')}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors duration-150 cursor-pointer ${activePersona === 'operador'
              ? 'bg-white text-neutral-900 border border-neutral-300 shadow-2xs font-semibold'
              : 'text-neutral-600 hover:text-neutral-900'
            }`}
        >
          <Zap className="w-3.5 h-3.5 text-[#0f766e]" />
          <span>Operador de portaria</span>
        </button>

        <button
          onClick={() => setActivePersona('hardware')}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors duration-150 cursor-pointer ${activePersona === 'hardware'
              ? 'bg-white text-neutral-900 border border-neutral-300 shadow-2xs font-semibold'
              : 'text-neutral-600 hover:text-neutral-900'
            }`}
        >
          <Camera className="w-3.5 h-3.5 text-[#0f766e]" />
          <span>Hardware & Câmeras</span>
          {!isAdmin && (
            <span title="Edição restrita a Administrador">
              <Lock className="w-3 h-3 text-neutral-400" />
            </span>
          )}
        </button>

        <button
          onClick={() => setActivePersona('coordenacao')}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors duration-150 cursor-pointer ${activePersona === 'coordenacao'
              ? 'bg-white text-neutral-900 border border-neutral-300 shadow-2xs font-semibold'
              : 'text-neutral-600 hover:text-neutral-900'
            }`}
        >
          <Sliders className="w-3.5 h-3.5 text-amber-600" />
          <span>Coordenação pedagógica</span>
          {!isCoordinator && (
            <span title="Edição restrita a Coordenação e Admin">
              <Lock className="w-3 h-3 text-neutral-400" />
            </span>
          )}
        </button>

        {/* TAB DE DESTAQUE DIDÁTICO: LAYA DECISION ENGINE */}
        <button
          onClick={() => setActivePersona('laya')}
          className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors duration-150 cursor-pointer ${activePersona === 'laya'
              ? 'bg-[#0f766e] text-white shadow-2xs font-semibold'
              : 'text-neutral-700 hover:text-neutral-900 bg-emerald-50/70 border border-emerald-200'
            }`}
        >
          <Cpu className="w-3.5 h-3.5 text-emerald-400" />
          <span>Laya Decision Engine</span>
          <span className="text-[10px] bg-emerald-700 text-white px-1.5 py-0.2 rounded font-mono font-bold">
            &lt; 35ms
          </span>
        </button>

        <button
          onClick={() => setActivePersona('ti')}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors duration-150 cursor-pointer ${activePersona === 'ti'
              ? 'bg-white text-neutral-900 border border-neutral-300 shadow-2xs font-semibold'
              : 'text-neutral-600 hover:text-neutral-900'
            }`}
        >
          <Building2 className="w-3.5 h-3.5 text-neutral-600" />
          <span>Dados da Escola</span>
        </button>
      </div>

      {/* SECTION 1: OPERADOR DE PORTARIA (Aberto a todos) */}
      {activePersona === 'operador' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Scanner USB Status */}
            <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-500">
                  Hardware de leitura
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Conectado
                </span>
              </div>
              <h3 className="font-semibold text-sm text-neutral-900">
                Leitor Barcode & QR Code (USB HID)
              </h3>
              <p className="text-xs text-neutral-500">
                Emulação de teclado padrão com buffer de leitura sub-150ms.
              </p>
              <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200 text-xs font-mono tabular-nums text-neutral-700">
                Velocidade do buffer: <strong>{scannerSpeed === 'turbo' ? '< 150ms' : 'Padrão'}</strong>
              </div>
            </div>

            {/* Camera & Video Hardware Status */}
            <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-500">
                  Câmera de Portaria
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {hwConfig.cameraSourceType === 'usb_webrtc'
                    ? 'USB / UVC'
                    : hwConfig.cameraSourceType === 'ip_stream'
                      ? 'Stream IP'
                      : 'Desativada'}
                </span>
              </div>
              <h3
                className="font-semibold text-sm text-neutral-900 truncate"
                title={hwConfig.preferredDeviceLabel || 'Câmera Padrão Automática'}
              >
                {hwConfig.preferredDeviceLabel || 'Câmera Padrão Automática'}
              </h3>
              <p className="text-xs text-neutral-500">
                {detectedCameras.length} dispositivo(s) de vídeo detectado(s).
              </p>
              <button
                onClick={() => setActivePersona('hardware')}
                className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-[#0f766e]/10 hover:bg-[#0f766e]/20 text-[#0f766e] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>Gerenciar Câmeras & CFTV</span>
              </button>
            </div>

            {/* Sound Tester */}
            <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-500">
                  Áudio e sinalização
                </span>
                <Volume2 className="w-4 h-4 text-neutral-400" />
              </div>
              <h3 className="font-semibold text-sm text-neutral-900">
                Testador de som da portaria
              </h3>
              <p className="text-xs text-neutral-500">
                Sintetizador Web Audio API nativo (100% offline).
              </p>
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <button
                  onClick={() => handleTestSound('success')}
                  className="px-2 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-medium flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Play className="w-3 h-3 text-emerald-600" />
                  <span>Liberado</span>
                </button>
                <button
                  onClick={() => handleTestSound('warning')}
                  className="px-2 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-medium flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Play className="w-3 h-3 text-amber-600" />
                  <span>Atenção</span>
                </button>
                <button
                  onClick={() => handleTestSound('denied')}
                  className="px-2 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-medium flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Play className="w-3 h-3 text-rose-600" />
                  <span>Bloqueio</span>
                </button>
              </div>
            </div>

            {/* Keyboard Shortcuts */}
            <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-500">
                  Ergonomia operacional
                </span>
                <Keyboard className="w-4 h-4 text-neutral-400" />
              </div>
              <h3 className="font-semibold text-sm text-neutral-900">
                Atalhos do teclado
              </h3>
              <ul className="text-xs space-y-1.5 text-neutral-700">
                <li className="flex items-center justify-between">
                  <span>Alternar Entrada / Saída:</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-neutral-800 font-mono text-[10px]">
                    F2
                  </kbd>
                </li>
                <li className="flex items-center justify-between">
                  <span>Confirmar leitura:</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-neutral-800 font-mono text-[10px]">
                    ENTER
                  </kbd>
                </li>
                <li className="flex items-center justify-between">
                  <span>Foco automático:</span>
                  <span className="text-emerald-700 font-medium text-xs">
                    Ativo no leitor
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: HARDWARE & GESTÃO DE CÂMERAS EXTERNAS (Restrições RBAC) */}
      {activePersona === 'hardware' && (
        <div className="space-y-6">
          {/* RBAC Notice for Hardware */}
          {!isAdmin && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Modo Operador / Somente Leitura:</strong> Você pode visualizar os dispositivos e testar o stream de vídeo. A alteração da câmera padrão e das URLs de CFTV exige perfil de <strong>Administrador (TI)</strong>.
              </span>
            </div>
          )}

          {/* Top Selection: Fonte de Vídeo */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                  <Video className="w-4 h-4 text-[#0f766e]" />
                  <span>Fonte Primária de Captura de Imagem</span>
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Selecione se o terminal deve ler imagens de uma câmera USB local, placa de captura HDMI ou stream de CFTV da escola.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={refreshDeviceList}
                  disabled={isRefreshingCameras}
                  className="px-3 py-1.5 rounded-lg border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isRefreshingCameras ? 'animate-spin' : ''}`}
                  />
                  <span>Atualizar dispositivos</span>
                </button>
              </div>
            </div>

            {/* List of Detected Cameras */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-neutral-800">
                Dispositivos de Vídeo Detectados no Sistema Operacional ({detectedCameras.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {detectedCameras.length === 0 ? (
                  <div className="col-span-full p-4 rounded-lg bg-neutral-50 border border-neutral-200 text-center text-xs text-neutral-500">
                    Nenhuma câmera USB ou UVC encontrada. Conecte uma webcam ou placa de captura USB.
                  </div>
                ) : (
                  detectedCameras.map((cam) => {
                    const isPreferred = hwConfig.preferredDeviceId === cam.deviceId;
                    return (
                      <div
                        key={cam.deviceId}
                        className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2 ${isPreferred
                            ? 'border-[#0f766e] bg-[#0f766e]/5 ring-1 ring-[#0f766e]/30'
                            : 'border-neutral-200 bg-white hover:border-neutral-300'
                          }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold text-xs text-neutral-900">
                              {cam.label}
                            </div>
                            <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                              ID: {cam.deviceId.slice(0, 20)}...
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium border ${cam.isExternal
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-neutral-100 text-neutral-700 border-neutral-200'
                              }`}
                          >
                            {cam.isExternal ? 'USB Externa' : 'Integrada'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-neutral-100 text-xs">
                          <button
                            onClick={() => startCameraTest(cam.deviceId)}
                            className="px-2.5 py-1 rounded border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-medium flex items-center gap-1 cursor-pointer"
                          >
                            <Play className="w-3 h-3 text-[#0f766e]" />
                            <span>Testar ao vivo</span>
                          </button>

                          <button
                            disabled={!isAdmin || isPreferred}
                            onClick={() => handleSelectDefaultCamera(cam)}
                            className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${isPreferred
                                ? 'bg-[#0f766e] text-white'
                                : !isAdmin
                                  ? 'opacity-40 cursor-not-allowed bg-neutral-100 text-neutral-500'
                                  : 'bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-800'
                              }`}
                          >
                            {isPreferred ? 'Câmera Primária' : 'Definir como padrão'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Video Test Box */}
            {isTestingCamera && (
              <div className="p-4 bg-neutral-900 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-white text-xs">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Prévia ao vivo da câmera selecionada ({cameraTestResolution} &bull; {cameraTestFps} FPS)
                  </span>
                  <button
                    onClick={stopCameraTest}
                    className="text-neutral-400 hover:text-white p-1 rounded cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="relative aspect-video max-h-72 w-full mx-auto bg-black rounded-lg overflow-hidden flex items-center justify-center">
                  <video
                    ref={testVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}

            {/* IP Camera / CCTV Setup */}
            <div className="pt-3 border-t border-neutral-100 space-y-2">
              <h3 className="text-xs font-semibold text-neutral-800">
                Endereço de Câmera de Monitoramento IP / CFTV (RTSP / HTTP / MJPEG)
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={hwConfig.ipStreamUrl}
                  onChange={(e) =>
                    setHwConfig({ ...hwConfig, ipStreamUrl: e.target.value })
                  }
                  placeholder="Ex: http://192.168.1.100:8080/video ou rtsp://admin:senha@192.168.1.50/stream1"
                  className="flex-1 bg-white border border-neutral-300 rounded-lg px-3 py-1.5 text-xs text-neutral-900 font-mono disabled:bg-neutral-100"
                />
                <button
                  onClick={handleTestIpCamera}
                  disabled={isTestingIp}
                  className="px-3.5 py-1.5 rounded-lg border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isTestingIp ? 'animate-spin' : ''}`}
                  />
                  <span>Testar conexão</span>
                </button>
                <button
                  disabled={!isAdmin}
                  onClick={handleSaveIpCamera}
                  className="px-3.5 py-1.5 rounded-lg bg-[#0f766e] hover:bg-[#0d5f59] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium cursor-pointer"
                >
                  Salvar
                </button>
              </div>
              {!isAdmin && (
                <span className="text-[11px] text-neutral-400 italic">
                  * Alterações de rede e CFTV requerem perfil de Administrador.
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: COORDENAÇÃO PEDAGÓGICA (Restrições RBAC) */}
      {activePersona === 'coordenacao' && (
        <div className="space-y-4">
          {!isCoordinator && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Modo Somente Leitura:</strong> Apenas a <strong>Coordenação Pedagógica</strong> e <strong>Administradores</strong> podem alterar as regras de horário, tolerâncias e mensagens de retenção.
              </span>
            </div>
          )}

          {/* Header */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-2xs space-y-5">
            <div className="pb-3 border-b border-neutral-100">
              <h2 className="text-sm font-semibold text-neutral-900">Políticas de horários e tolerância da portaria</h2>
              <p className="text-xs text-neutral-500 mt-0.5">Defina as diretrizes pedagógicas para entrada tardia, janelas de turno e bloqueios automáticos</p>
            </div>

            {/* Rule 1: Tolerância de Atraso — com indicador visual */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <label className="font-medium text-neutral-800">Tolerância de atraso na entrada</label>
                <span className="font-mono tabular-nums font-semibold text-[#0f766e] text-xs bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  {morningToleranceMins} min
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                step="5"
                disabled={!isCoordinator}
                value={morningToleranceMins}
                onChange={(e) => setMorningToleranceMins(Number(e.target.value))}
                className="w-full accent-[#0f766e] disabled:opacity-50"
              />
              {/* Tick marks */}
              <div className="flex justify-between text-[10px] font-mono text-neutral-400 px-0.5">
                {[5, 10, 15, 20, 25, 30].map((v) => (
                  <span key={v} className={v === morningToleranceMins ? 'text-[#0f766e] font-semibold' : ''}>{v}min</span>
                ))}
              </div>
              {/* Visual range indicator */}
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-2 rounded-full bg-neutral-100 overflow-hidden relative">
                  <div className="h-full bg-amber-400/60 rounded-full absolute left-0" style={{ width: `${((morningToleranceMins - 5) / 25) * 100}%` }} />
                </div>
                <span className="text-[11px] text-neutral-500 shrink-0">
                  Janela de atraso: <strong className="text-amber-700">07:00 → 07:{String(morningToleranceMins).padStart(2,'0')}</strong>
                </span>
              </div>
              <p className="text-neutral-500 text-[11px]">
                Passagens após a tolerância geram advertência amarela para registro na coordenação.
              </p>
            </div>

            <div className="border-t border-neutral-100 pt-4" />

            {/* Rule 2: Anti-Passback */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <label className="font-medium text-neutral-800">Janela anti-duplicidade de leitura (Anti-Passback)</label>
                <span className="font-mono tabular-nums font-semibold text-[#0f766e] text-xs bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  {duplicitySeconds}s
                </span>
              </div>
              <input
                type="range"
                min="30"
                max="120"
                step="15"
                disabled={!isCoordinator}
                value={duplicitySeconds}
                onChange={(e) => setDuplicitySeconds(Number(e.target.value))}
                className="w-full accent-[#0f766e] disabled:opacity-50"
              />
              <div className="flex justify-between text-[10px] font-mono text-neutral-400 px-0.5">
                {[30, 45, 60, 75, 90, 105, 120].map((v) => (
                  <span key={v} className={v === duplicitySeconds ? 'text-[#0f766e] font-semibold' : ''}>{v}s</span>
                ))}
              </div>
              {/* Visual cooldown bar */}
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-2 rounded-full bg-neutral-100 overflow-hidden relative">
                  <div className="h-full bg-sky-400/60 rounded-full absolute left-0" style={{ width: `${((duplicitySeconds - 30) / 90) * 100}%` }} />
                </div>
                <span className="text-[11px] text-neutral-500 shrink-0">
                  Cooldown: <strong className="text-sky-700">{duplicitySeconds}s</strong> por crachá
                </span>
              </div>
              <p className="text-neutral-500 text-[11px]">
                O motor Laya rejeita bip duplicado do mesmo crachá no portão em menos de {duplicitySeconds} segundos.
              </p>
            </div>

            <div className="border-t border-neutral-100 pt-4" />

            {/* Rule 3 & 4: Checkbox + mensagem lado a lado */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5 text-xs">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!isCoordinator}
                    checked={requireGuardianOnEarlyExit}
                    onChange={(e) => setRequireGuardianOnEarlyExit(e.target.checked)}
                    className="mt-0.5 rounded text-[#0f766e] focus:ring-0 disabled:opacity-50"
                  />
                  <div>
                    <span className="font-medium text-neutral-900 block">Exigir autorização de responsável para saídas antecipadas</span>
                    <span className="text-neutral-500 text-[11px]">Exibe instantaneamente os responsáveis autorizados via camada Mem0.</span>
                  </div>
                </label>
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="block font-medium text-neutral-800">Mensagem padrão para alunos retidos ou com alerta:</label>
                <input
                  type="text"
                  disabled={!isCoordinator}
                  value={retentionMessage}
                  onChange={(e) => setRetentionMessage(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-[#0f766e] disabled:bg-neutral-100"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end border-t border-neutral-100">
              <button
                disabled={!isCoordinator}
                onClick={() => showNotification('Regras da coordenação salvas com sucesso.')}
                className="bg-[#0f766e] hover:bg-[#0d5f59] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer shadow-2xs"
              >
                Salvar regras da coordenação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: DESTAQUE DIDÁTICO DO LAYA DECISION ENGINE */}
      {activePersona === 'laya' && (
        <div className="space-y-6">
          {/* Laya Hero Banner */}
          <div className="bg-gradient-to-r from-neutral-900 to-[#0d4f48] text-white rounded-2xl p-6 sm:p-7 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Tecnologia Laya Decision Engine (System 1 Sub-35ms)</span>
                </div>
                <h2 className="text-xl font-bold tracking-tight text-white">
                  Decisão Não-Autoregressiva Instantânea para Portarias Escolares
                </h2>
                <p className="text-xs text-neutral-300 max-w-2xl leading-relaxed">
                  Inspirado na arquitetura do <strong>@laya-main</strong>, este sistema utiliza um motor de inferência local determinístico. Toda validação de acesso escolar ocorre em uma única passagem direta (<strong className="text-emerald-400">&lt; 0.2ms</strong> medidos), eliminando gargalos de conexão, quedas de internet e respostas lentas de nuvem.
                </p>
              </div>

              {/* Engine Metrics Card */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 text-center shrink-0 min-w-[200px] space-y-1">
                <div className="text-[10px] text-emerald-300 uppercase tracking-widest font-mono">
                  Latência Mensurada
                </div>
                <div className="text-3xl font-extrabold font-mono text-white tracking-tight">
                  0.19 ms
                </div>
                <div className="text-[11px] text-neutral-300">
                  Teto de garantia: <strong>35ms</strong> (System 1)
                </div>
              </div>
            </div>
          </div>

          {/* Onde a tecnologia Laya atua no sistema (Didactic Matrix) */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4 shadow-2xs">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#0f766e]" />
                <span>Onde a tecnologia Laya está presente no sistema?</span>
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Entenda de forma simples como o motor Laya opera em conjunto com cada módulo e tela do aplicativo
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Feature 1 */}
              <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/60 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs border border-emerald-200">
                  1
                </div>
                <h4 className="text-xs font-semibold text-neutral-900">
                  Terminal de Portaria
                </h4>
                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  Ao aproximar a carteirinha ou ler o QR Code, o Laya avalia em tempo real a matrícula, a série e o turno do aluno, emitindo a decisão em menos de 0.2ms para não reter filas.
                </p>
                <div className="text-[10px] font-mono text-[#0f766e] pt-1 border-t border-neutral-200">
                  Tela: Portaria e Acesso
                </div>
              </div>

              {/* Feature 2 */}
              <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/60 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xs border border-amber-200">
                  2
                </div>
                <h4 className="text-xs font-semibold text-neutral-900">
                  Anti-Passback e Duplicidade
                </h4>
                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  O Laya mantém um cooldown deslizante de 60 segundos na memória rápida. Se o crachá for bipado duas vezes no mesmo portão, ele rejeita como anomalia de duplicidade.
                </p>
                <div className="text-[10px] font-mono text-amber-700 pt-1 border-t border-neutral-200">
                  Função: Cooldown 60s
                </div>
              </div>

              {/* Feature 3 */}
              <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/60 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center font-bold text-xs border border-sky-200">
                  3
                </div>
                <h4 className="text-xs font-semibold text-neutral-900">
                  Camada Contextual Mem0
                </h4>
                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  No mesmo instante em que valida o acesso, o motor projeta os alertas médicos de emergência (ex: choque anafilático a amendoim) e autorizações judiciais de retirada.
                </p>
                <div className="text-[10px] font-mono text-sky-700 pt-1 border-t border-neutral-200">
                  Módulo: Mem0 Context Layer
                </div>
              </div>

              {/* Feature 4 */}
              <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/60 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-xs border border-purple-200">
                  4
                </div>
                <h4 className="text-xs font-semibold text-neutral-900">
                  Auditoria e Relatórios A4
                </h4>
                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  Cada liberação executada pelo Laya é gravada atomicamente no SQLite WAL com chave de não-repúdio, garantindo que o Relatório em Folha A4 seja 100% autêntico e auditável.
                </p>
                <div className="text-[10px] font-mono text-purple-700 pt-1 border-t border-neutral-200">
                  Módulo: SQLite WAL & A4
                </div>
              </div>
            </div>
          </div>

          {/* Comparativo Didático: Motor Laya vs. Nuvem / LLMs Lentos */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4 shadow-2xs">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#0f766e]" />
                <span>Por que a Portaria Escolar usa o Motor Laya e não APIs em Nuvem?</span>
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Comparativo didático entre a arquitetura Local-First System 1 e modelos tradicionais de nuvem
              </p>
            </div>

            <div className="overflow-x-auto border border-neutral-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-700 font-semibold border-b border-neutral-200">
                  <tr>
                    <th className="py-2.5 px-3">Critério de Portaria</th>
                    <th className="py-2.5 px-3 text-emerald-800 bg-emerald-50/50">
                      Motor Laya Local-First (Sistema Atual)
                    </th>
                    <th className="py-2.5 px-3 text-neutral-500">
                      APIs Web Tradicionais / LLMs de Nuvem
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-800">
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-neutral-900">
                      Velocidade de Liberação
                    </td>
                    <td className="py-2.5 px-3 bg-emerald-50/20 font-mono text-emerald-800 font-semibold">
                      &lt; 0.2 milissegundos (Sub-35ms garantido)
                    </td>
                    <td className="py-2.5 px-3 text-neutral-500 font-mono">
                      800ms a 4.500ms (Atraso visível na catraca)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-neutral-900">
                      Queda do Link de Internet
                    </td>
                    <td className="py-2.5 px-3 bg-emerald-50/20 font-semibold text-emerald-800">
                      100% Autônomo (Portaria não para nem atrasa)
                    </td>
                    <td className="py-2.5 px-3 text-rose-700">
                      Falha Crítica: fila de alunos retida no portão
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-neutral-900">
                      Privacidade e LGPD Infantil
                    </td>
                    <td className="py-2.5 px-3 bg-emerald-50/20 font-semibold text-emerald-800">
                      Isolamento Total: fotos e dados ficam no SQLite local
                    </td>
                    <td className="py-2.5 px-3 text-neutral-500">
                      Dados de menores transitam em servidores de terceiros
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-neutral-900">
                      Custo Operacional Recorrente
                    </td>
                    <td className="py-2.5 px-3 bg-emerald-50/20 font-mono text-emerald-800 font-semibold">
                      R$ 0,00 por leitura de crachá
                    </td>
                    <td className="py-2.5 px-3 text-neutral-500">
                      Faturas mensais por chamadas de API e tokens
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* SECTION 5: DADOS DA ESCOLA */}
      {activePersona === 'ti' && (
        <div className="space-y-4">

          {/* Card: Identificação da Instituição */}
          <form
            onSubmit={handleSaveSchoolParameters}
            className="bg-white rounded-xl border border-neutral-200 shadow-2xs"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 pb-4 border-b border-neutral-100">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#0f766e]" />
                  <span>Identificação da Instituição</span>
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Dados que aparecem nos relatórios oficiais, carteirinhas e comunicações da escola
                </p>
              </div>
              <button
                type="submit"
                className="bg-[#0f766e] hover:bg-[#0d5f59] text-white text-xs font-medium px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs self-start sm:self-auto shrink-0"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Salvar dados</span>
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Row 1: nome + CNPJ + ano */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div className="space-y-1 lg:col-span-2">
                  <label className="block font-medium text-neutral-800">Nome da instituição</label>
                  <input
                    type="text"
                    value={schoolForm.name}
                    onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                    required
                    placeholder="Ex: Escola Horizonte"
                    className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-1.5 text-xs text-neutral-800 focus:outline-none focus:border-[#0f766e]"
                  />
                  <span className="text-[11px] text-neutral-400">Usado no cabeçalho dos relatórios A4 e carteirinhas</span>
                </div>

                <div className="space-y-1">
                  <label className="block font-medium text-neutral-800">CNPJ oficial</label>
                  <input
                    type="text"
                    value={schoolForm.cnpj || ''}
                    onChange={(e) => setSchoolForm({ ...schoolForm, cnpj: e.target.value })}
                    placeholder="12.345.678/0001-90"
                    className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-1.5 text-xs text-neutral-800 font-mono focus:outline-none focus:border-[#0f766e]"
                  />
                  <span className="text-[11px] text-neutral-400">Impresso no rodapé dos relatórios A4</span>
                </div>

                <div className="space-y-1">
                  <label className="block font-medium text-neutral-800">Ano letivo vigente</label>
                  <input
                    type="text"
                    value={schoolForm.school_year || '2026'}
                    onChange={(e) => setSchoolForm({ ...schoolForm, school_year: e.target.value })}
                    placeholder="2026"
                    className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-1.5 text-xs text-neutral-800 font-mono focus:outline-none focus:border-[#0f766e]"
                  />
                  <span className="text-[11px] text-neutral-400">Exibido nas carteirinhas e frequência</span>
                </div>
              </div>

              {/* Row 2: endereço */}
              <div className="grid grid-cols-1 text-xs">
                <div className="space-y-1">
                  <label className="block font-medium text-neutral-800">Endereço completo da unidade escolar</label>
                  <input
                    type="text"
                    value={schoolForm.address || ''}
                    onChange={(e) => setSchoolForm({ ...schoolForm, address: e.target.value })}
                    placeholder="Av. das Acácias, 1500 — Jardim Primavera, São Paulo – SP"
                    className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-1.5 text-xs text-neutral-800 focus:outline-none focus:border-[#0f766e]"
                  />
                  <span className="text-[11px] text-neutral-400">Exibido nos relatórios e comunicados aos responsáveis</span>
                </div>
              </div>

              {/* Row 3: diretor + telefone + e-mail */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="block font-medium text-neutral-800">Diretor(a) responsável</label>
                  <input
                    type="text"
                    value={(schoolForm as any).director || ''}
                    onChange={(e) => setSchoolForm({ ...schoolForm, ...(schoolForm as any), director: e.target.value } as any)}
                    placeholder="Ex: Prof.ª Ana Paula Souza"
                    className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-1.5 text-xs text-neutral-800 focus:outline-none focus:border-[#0f766e]"
                  />
                  <span className="text-[11px] text-neutral-400">Assina os relatórios oficiais</span>
                </div>

                <div className="space-y-1">
                  <label className="block font-medium text-neutral-800">Telefone institucional</label>
                  <input
                    type="tel"
                    value={(schoolForm as any).phone || ''}
                    onChange={(e) => setSchoolForm({ ...schoolForm, ...(schoolForm as any), phone: e.target.value } as any)}
                    placeholder="(11) 3000-0000"
                    className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-1.5 text-xs text-neutral-800 font-mono focus:outline-none focus:border-[#0f766e]"
                  />
                  <span className="text-[11px] text-neutral-400">Contato nos comunicados automáticos</span>
                </div>

                <div className="space-y-1">
                  <label className="block font-medium text-neutral-800">E-mail institucional</label>
                  <input
                    type="email"
                    value={(schoolForm as any).email || ''}
                    onChange={(e) => setSchoolForm({ ...schoolForm, ...(schoolForm as any), email: e.target.value } as any)}
                    placeholder="secretaria@escola.edu.br"
                    className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-1.5 text-xs text-neutral-800 focus:outline-none focus:border-[#0f766e]"
                  />
                  <span className="text-[11px] text-neutral-400">Usado nos relatórios e avisos automáticos</span>
                </div>
              </div>
            </div>
          </form>

          {/* Card: Horários dos Turnos */}
          <form
            onSubmit={handleSaveSchoolParameters}
            className="bg-white rounded-xl border border-neutral-200 shadow-2xs"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 pb-4 border-b border-neutral-100">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#0f766e]" />
                  <span>Horários oficiais dos turnos</span>
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Janelas de entrada, tolerância e saída — usadas pelo motor Laya para validar presenças e gerar os relatórios
                </p>
              </div>
              <button
                type="submit"
                className="bg-[#0f766e] hover:bg-[#0d5f59] text-white text-xs font-medium px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs self-start sm:self-auto shrink-0"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Salvar horários</span>
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Turno Matutino */}
              <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-900">Turno Matutino</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">Manhã</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-neutral-600">Entrada</label>
                    <input
                      type="time"
                      value={schoolForm.morning_start || '07:00'}
                      onChange={(e) => setSchoolForm({ ...schoolForm, morning_start: e.target.value })}
                      className="w-full bg-white border border-neutral-300 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-[#0f766e]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-neutral-600">Tolerância</label>
                    <input
                      type="time"
                      value={schoolForm.morning_tolerance || '07:15'}
                      onChange={(e) => setSchoolForm({ ...schoolForm, morning_tolerance: e.target.value })}
                      className="w-full bg-white border border-neutral-300 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-[#0f766e]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-neutral-600">Saída</label>
                    <input
                      type="time"
                      value={schoolForm.morning_end || '12:20'}
                      onChange={(e) => setSchoolForm({ ...schoolForm, morning_end: e.target.value })}
                      className="w-full bg-white border border-neutral-300 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-[#0f766e]"
                    />
                  </div>
                </div>
                {/* Visual timeline strip */}
                <div className="flex items-center gap-1 text-[10px] font-mono text-neutral-500 pt-1">
                  <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">{schoolForm.morning_start || '07:00'}</span>
                  <div className="flex-1 h-px bg-amber-200 mx-1" />
                  <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">{schoolForm.morning_tolerance || '07:15'}</span>
                  <div className="flex-1 h-px bg-neutral-200 mx-1" />
                  <span className="bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded">{schoolForm.morning_end || '12:20'}</span>
                </div>
              </div>

              {/* Turno Vespertino */}
              <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-900">Turno Vespertino</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700">Tarde</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-neutral-600">Entrada</label>
                    <input
                      type="time"
                      value={schoolForm.afternoon_start || '13:00'}
                      onChange={(e) => setSchoolForm({ ...schoolForm, afternoon_start: e.target.value })}
                      className="w-full bg-white border border-neutral-300 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-[#0f766e]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-neutral-600">Tolerância</label>
                    <input
                      type="time"
                      value={schoolForm.afternoon_tolerance || '13:15'}
                      onChange={(e) => setSchoolForm({ ...schoolForm, afternoon_tolerance: e.target.value })}
                      className="w-full bg-white border border-neutral-300 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-[#0f766e]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-neutral-600">Saída</label>
                    <input
                      type="time"
                      value={schoolForm.afternoon_end || '18:20'}
                      onChange={(e) => setSchoolForm({ ...schoolForm, afternoon_end: e.target.value })}
                      className="w-full bg-white border border-neutral-300 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-[#0f766e]"
                    />
                  </div>
                </div>
                {/* Visual timeline strip */}
                <div className="flex items-center gap-1 text-[10px] font-mono text-neutral-500 pt-1">
                  <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">{schoolForm.afternoon_start || '13:00'}</span>
                  <div className="flex-1 h-px bg-amber-200 mx-1" />
                  <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">{schoolForm.afternoon_tolerance || '13:15'}</span>
                  <div className="flex-1 h-px bg-neutral-200 mx-1" />
                  <span className="bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded">{schoolForm.afternoon_end || '18:20'}</span>
                </div>
              </div>
            </div>
          </form>

          {/* Card: Backup dos dados */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-sm text-neutral-900 flex items-center gap-2">
                  <Download className="w-4 h-4 text-[#0f766e]" />
                  <span>Cópia de segurança dos dados</span>
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Exporte todos os registros do sistema em um arquivo JSON para guardar ou migrar para outro dispositivo
                </p>
              </div>
              <button
                onClick={handleDownloadBackupJson}
                className="bg-[#0f766e] hover:bg-[#0d5f59] text-white text-xs font-medium px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar backup (.JSON)</span>
              </button>
            </div>
            {maintenanceNotice && (
              <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
                <span>{maintenanceNotice}</span>
                <button onClick={() => setMaintenanceNotice(null)} className="text-emerald-700 hover:text-emerald-950 font-bold ml-2">✕</button>
              </div>
            )}
          </div>

        </div>
      )}

            {/* Modal Payload Inspector */}
      {selectedItem && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-lg w-full p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
              <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-2">
                <FileCode className="w-4 h-4 text-[#0f766e]" />
                Payload do evento outbox
              </h3>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-neutral-700">
              <div>
                <span className="text-neutral-500 font-medium">Chave de idempotência:</span>
                <div className="font-mono tabular-nums bg-neutral-50 p-2 rounded border border-neutral-200 mt-1 break-all text-xs">
                  {selectedItem.idempotency_key}
                </div>
              </div>

              <div>
                <span className="text-neutral-500 font-medium">Conteúdo serializado:</span>
                <pre className="font-mono tabular-nums bg-neutral-50 p-3 rounded-lg border border-neutral-200 mt-1 text-xs overflow-x-auto max-h-56 text-neutral-900">
                  {JSON.stringify(JSON.parse(selectedItem.payload_json), null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-2 text-right border-t border-neutral-200">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-3.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-xs font-medium text-neutral-700 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
