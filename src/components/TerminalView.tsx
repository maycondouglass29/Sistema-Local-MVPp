import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  Sliders,
  RotateCcw,
  Sparkles,
  X,
  Check,
  ChevronRight,
  Camera,
  CameraOff,
  Video,
  Scan,
  UserCheck,
  HeartPulse,
  Phone,
  Clock,
  HardDrive,
  Cpu,
  RefreshCw,
  Eye,
  KeyRound,
  Maximize2,
  Tv,
  Settings2,
  ArrowRight,
} from 'lucide-react';
import { localDb } from '../services/localDatabase';
import { soundManager } from '../utils/sound';
import { api, ScanResultPayload } from '../services/apiClient';
import { Mem0ContextCard } from './Mem0ContextCard';
import {
  hardwareConfig,
  DetectedCamera,
  HardwareConfig,
} from '../services/hardwareConfig';

import {
  EventType,
  EventSource,
  ScanValidationResult,
  AttendanceEvent,
  Student,
} from '../types/database';

export const TerminalView: React.FC = () => {
  const [eventType, setEventType] = useState<'entry' | 'exit'>('entry');
  const [inputValue, setInputValue] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<ScanValidationResult | null>(null);
  const [lastContext, setLastContext] = useState<ScanResultPayload['context'] | null>(null);
  const [lastCommittedEvent, setLastCommittedEvent] = useState<AttendanceEvent | null>(null);
  const [allowRepetition, setAllowRepetition] = useState<boolean>(false);

  // Camera & Optical Technology State
  const [cameraActive, setCameraActive] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hwConfig, setHwConfig] = useState<HardwareConfig>(hardwareConfig.getConfig());
  const [detectedCameras, setDetectedCameras] = useState<DetectedCamera[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>(hardwareConfig.getConfig().preferredDeviceId || '');
  const [scanLaserVisible, setScanLaserVisible] = useState<boolean>(true);
  const [hotplugToast, setHotplugToast] = useState<string | null>(null);

  // Stats for right panel
  const [entriesCount, setEntriesCount] = useState<number>(0);
  const [exitsCount, setExitsCount] = useState<number>(0);
  const [recentEvents, setRecentEvents] = useState<AttendanceEvent[]>([]);

  // Modals
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState<boolean>(false);
  const [showDemoBadgesModal, setShowDemoBadgesModal] = useState<boolean>(false);
  const [showStudentDetailModal, setShowStudentDetailModal] = useState<boolean>(false);
  const [showLayaInfoModal, setShowLayaInfoModal] = useState<boolean>(false);

  // Correction Form
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [correctionErrorMsg, setCorrectionErrorMsg] = useState<string | null>(null);

  // Rules State
  const [duplicitySeconds, setDuplicitySeconds] = useState<number>(60);
  const [enforceSchedule, setEnforceSchedule] = useState<boolean>(true);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ipImgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastScannedTokenRef = useRef<string>('');
  const lastScanTimestampRef = useRef<number>(0);

  const updateStats = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const events = localDb.getAttendanceEvents();
    const todayEvents = events.filter((e) => e.occurred_at_device.startsWith(todayStr));

    setEntriesCount(
      todayEvents.filter((e) => e.event_type === 'entry' && !e.correction_of_id).length
    );
    setExitsCount(
      todayEvents.filter((e) => e.event_type === 'exit' && !e.correction_of_id).length
    );
    setRecentEvents(todayEvents.slice(0, 6));
    if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  };

  useEffect(() => {
    updateStats();
    return localDb.subscribe(updateStats);
  }, []);

  // Detect available video devices and listen to hotplug
  useEffect(() => {
    const syncHw = () => {
      const cfg = hardwareConfig.getConfig();
      setHwConfig(cfg);
      if (cfg.preferredDeviceId) {
        setSelectedCameraId(cfg.preferredDeviceId);
      }
    };
    const unsubHw = hardwareConfig.subscribe(syncHw);

    hardwareConfig.detectCameras().then((cams) => {
      setDetectedCameras(cams);
      const pref = hardwareConfig.getConfig().preferredDeviceId;
      if (pref && cams.some((c) => c.deviceId === pref)) {
        setSelectedCameraId(pref);
      } else {
        // Automatically prefer external USB camera over notebook integrated webcam
        const external = cams.find((c) => c.isExternal);
        if (external) {
          setSelectedCameraId(external.deviceId);
        } else if (cams.length > 0) {
          setSelectedCameraId(cams[0].deviceId);
        }
      }
    });

    const unsubHotplug = hardwareConfig.onHotplug((cams) => {
      setDetectedCameras(cams);
      const newExternal = cams.find((c) => c.isExternal);
      if (newExternal) {
        setHotplugToast(`📷 Câmera USB externa detectada: ${newExternal.label}`);
        setTimeout(() => setHotplugToast(null), 5000);
        if (hardwareConfig.getConfig().autoSwitchExternal) {
          setSelectedCameraId(newExternal.deviceId);
        }
      }
    });

    return () => {
      unsubHw();
      unsubHotplug();
    };
  }, []);

  const handleSelectCamera = (deviceId: string) => {
    setSelectedCameraId(deviceId);
    const cam = detectedCameras.find((c) => c.deviceId === deviceId);
    hardwareConfig.saveConfig({
      preferredDeviceId: deviceId,
      preferredDeviceLabel: cam?.label || null,
      cameraSourceType: 'usb_webrtc',
    });
  };

  // Video & QR scanning loop with jsQR (supports USB WebRTC & IP Stream)
  useEffect(() => {
    let active = true;

    if (cameraActive && hwConfig.cameraSourceType === 'usb_webrtc') {
      const resLimits = hardwareConfig.getResolutionConstraints(hwConfig.resolution);
      const constraints: MediaStreamConstraints = {
        video: selectedCameraId
          ? { deviceId: { exact: selectedCameraId }, width: { ideal: resLimits.width }, height: { ideal: resLimits.height } }
          : { facingMode: 'environment', width: { ideal: resLimits.width }, height: { ideal: resLimits.height } },
      };

      navigator.mediaDevices
        ?.getUserMedia(constraints)
        .then((stream) => {
          if (!active) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
          setCameraError(null);

          // Continuous Frame Scanning Loop
          const processFrame = () => {
            if (!active || !cameraActive) return;

            const video = videoRef.current;
            const canvas = canvasRef.current;

            if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
                  inversionAttempts: 'dontInvert',
                });

                if (decoded && decoded.data) {
                  const now = Date.now();
                  const token = decoded.data.trim();
                  // Cooldown 2 seconds for identical token
                  if (token !== lastScannedTokenRef.current || now - lastScanTimestampRef.current > 2000) {
                    lastScannedTokenRef.current = token;
                    lastScanTimestampRef.current = now;
                    executeScan(token, 'qr');
                  }
                }
              }
            }
            animationFrameRef.current = requestAnimationFrame(processFrame);
          };

          animationFrameRef.current = requestAnimationFrame(processFrame);
        })
        .catch((err) => {
          console.warn('Erro ao conectar com câmera:', err);
          setCameraError('Câmera USB não acessível ou permissão negada. O terminal opera normalmente via leitor USB HID.');
          setCameraActive(false);
        });
    } else if (cameraActive && hwConfig.cameraSourceType === 'ip_stream') {
      // IP Stream Continuous frame sampling
      const processIpFrame = () => {
        if (!active || !cameraActive) return;
        const img = ipImgRef.current;
        const canvas = canvasRef.current;
        if (img && canvas && img.naturalWidth > 0) {
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            try {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert',
              });
              if (decoded && decoded.data) {
                const now = Date.now();
                const token = decoded.data.trim();
                if (token !== lastScannedTokenRef.current || now - lastScanTimestampRef.current > 2000) {
                  lastScannedTokenRef.current = token;
                  lastScanTimestampRef.current = now;
                  executeScan(token, 'qr');
                }
              }
            } catch {
              // Ignore cross-origin canvas security exceptions if any
            }
          }
        }
        animationFrameRef.current = requestAnimationFrame(processIpFrame);
      };
      animationFrameRef.current = requestAnimationFrame(processIpFrame);
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [cameraActive, selectedCameraId, hwConfig.cameraSourceType, hwConfig.ipStreamUrl, hwConfig.resolution]);


  // Ensure input stays focused for USB HID barcode/QR readers
  useEffect(() => {
    const timer = setInterval(() => {
      const activeEl = document.activeElement;
      if (
        activeEl?.tagName !== 'INPUT' &&
        activeEl?.tagName !== 'TEXTAREA' &&
        activeEl?.tagName !== 'SELECT' &&
        !showRulesModal &&
        !showCorrectionModal &&
        !showDemoBadgesModal &&
        !showStudentDetailModal &&
        !showLayaInfoModal
      ) {
        inputRef.current?.focus();
      }
    }, 2500);
    inputRef.current?.focus();
    return () => clearInterval(timer);
  }, [showRulesModal, showCorrectionModal, showDemoBadgesModal, showStudentDetailModal, showLayaInfoModal]);

  // Global USB Barcode/QR Scanner HID listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showRulesModal || showCorrectionModal || showDemoBadgesModal || showStudentDetailModal || showLayaInfoModal) return;

      if (e.key === 'F2') {
        e.preventDefault();
        setEventType((prev) => (prev === 'entry' ? 'exit' : 'entry'));
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setInputValue('');
        bufferRef.current = '';
        return;
      }

      const now = Date.now();
      const interval = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        if (bufferRef.current.length >= 3) {
          const scanned = bufferRef.current;
          bufferRef.current = '';
          e.preventDefault();
          executeScan(scanned, 'qr');
          return;
        }
        bufferRef.current = '';
      } else if (e.key.length === 1) {
        if (interval > 150) {
          bufferRef.current = e.key;
        } else {
          bufferRef.current += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [eventType, allowRepetition, duplicitySeconds, showRulesModal, showCorrectionModal, showDemoBadgesModal, showStudentDetailModal, showLayaInfoModal]);

  const executeScan = async (rawInput: string, source: EventSource = 'qr') => {
    if (!rawInput.trim() || isProcessing) return;
    setIsProcessing(true);

    try {
      // 1. Try backend with SQLite + Laya + Mem0
      try {
        const backendRes = await api.scanGate({
          rawToken: rawInput.trim(),
          eventType,
          allowRepetition,
          operatorRole: localDb.currentOperator.role,
        });

        if (backendRes.context) {
          setLastContext(backendRes.context);
        }

        const alertType =
          backendRes.decision.code === 'ACCESS_GRANTED'
            ? backendRes.context?.criticalAlerts && backendRes.context.criticalAlerts.length > 0
              ? 'warning'
              : 'success'
            : backendRes.decision.code === 'ANOMALY_DUPLICATE_SCAN'
            ? 'duplicate'
            : 'denied';

        const validationResult: ScanValidationResult = {
          allowed: backendRes.decision.allowed,
          alertType,
          message: backendRes.decision.message,
          student: backendRes.student as any,
          classRoom: backendRes.student
            ? ({ id: backendRes.student.class_id, name: backendRes.student.class_name || 'Turma' } as any)
            : undefined,
          evaluatedAt: backendRes.timestamp,
          latencyMs: backendRes.decision.latencyMs,
          ruleBreakdown: [
            {
              rule: 'Laya Decision Engine',
              passed: backendRes.decision.allowed,
              details: `${backendRes.decision.code} (Confiança: ${Math.round(backendRes.decision.confidence * 100)}%)`,
            },
            {
              rule: 'Mem0 Context Memory',
              passed: true,
              details: `${backendRes.context?.totalMemoriesCount || 0} memórias carregadas`,
            },
          ],
        };

        setLastResult(validationResult);

        if (backendRes.soundCue === 'success') {
          soundManager.playSuccess();
        } else if (backendRes.soundCue === 'warning') {
          soundManager.playWarning();
        } else {
          soundManager.playDenied();
        }

        if (backendRes.attendanceEvent) {
          setLastCommittedEvent(backendRes.attendanceEvent as any);
        } else {
          setLastCommittedEvent(null);
        }

        updateStats();
        return;
      } catch (backendErr) {
        console.warn('Backend SQLite scan indisponível, usando fallback localDb:', backendErr);
      }

      // 2. Fallback to localDb
      const result = localDb.resolveScanInput(rawInput, eventType, source);
      setLastContext(null);

      if (result.alertType === 'duplicate' && allowRepetition) {
        result.allowed = true;
        result.alertType = 'warning';
        result.message = 'Entrada confirmada sob permissão de repetição configurada.';
      }

      setLastResult(result);

      if (result.alertType === 'success') {
        soundManager.playSuccess();
        if (result.student) {
          const committed = localDb.commitAttendanceScan(
            result.student.id,
            eventType,
            source,
            rawInput
          );
          setLastCommittedEvent(committed);
        }
      } else if (result.alertType === 'warning') {
        soundManager.playWarning();
        if (result.student && result.allowed) {
          const committed = localDb.commitAttendanceScan(
            result.student.id,
            eventType,
            source,
            rawInput
          );
          setLastCommittedEvent(committed);
        }
      } else {
        soundManager.playDenied();
        setLastCommittedEvent(null);
      }

      updateStats();
    } finally {
      setIsProcessing(false);
      setInputValue('');
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      executeScan(inputValue.trim(), 'manual');
    }
  };

  const handleCreateCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    setCorrectionErrorMsg(null);

    if (!selectedEventId) {
      setCorrectionErrorMsg('Selecione um evento para corrigir.');
      return;
    }

    if (correctionReason.trim().length < 8) {
      setCorrectionErrorMsg('A justificativa deve conter no mínimo 8 caracteres.');
      return;
    }

    try {
      localDb.createAttendanceCorrection(selectedEventId, correctionReason.trim());
      setShowCorrectionModal(false);
      setCorrectionReason('');
      updateStats();
    } catch (err: any) {
      setCorrectionErrorMsg(err.message || 'Erro ao registrar correção.');
    }
  };

  const students = localDb.getStudents();

  const demoBadges = [
    { code: '2024-001', name: 'Lucas Silva Santos', class: '1º Ano A', desc: 'Ativo • Avó autorizada a buscar', token: 'ESCHZ:V1:stu_001:2024-001' },
    { code: '2024-004', name: 'Mariana Duarte Souza', class: '1º Ano A', desc: 'Alerta médico: Alergia severa a amendoim', token: 'ESCHZ:V1:stu_004:2024-004' },
    { code: '2024-003', name: 'Gabriel Rodrigues Lima', class: '1º Ano A', desc: 'Bloqueado: Suspensão temporária', isBlocked: true, token: 'ESCHZ:V1:stu_003:2024-003' },
    { code: '2024-006', name: 'Sophia Martins Castro', class: '2º Ano B', desc: 'Matrícula inativa / Transferência', isInactive: true, token: 'ESCHZ:V1:stu_006:2024-006' },
  ];

  const isEntry = eventType === 'entry';

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5 select-none">
      {/* 1. Hardware & Technology Status Bar */}
      <div className="bg-white border border-neutral-200 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="font-semibold text-neutral-900">Tecnologia de Portaria Ativa</span>
          </div>

          <div className="h-3.5 w-px bg-neutral-200" />

          {/* USB HID Status */}
          <div className="flex items-center gap-1.5 text-neutral-600">
            <Scan className="w-3.5 h-3.5 text-[#0f766e]" />
            <span>Leitor USB HID</span>
            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-medium">Pronto</span>
          </div>

          <div className="h-3.5 w-px bg-neutral-200 hidden sm:block" />

          {/* Camera Hardware Source Pill */}
          <div className="hidden md:flex items-center gap-1.5 text-neutral-600">
            {hwConfig.cameraSourceType === 'ip_stream' ? (
              <>
                <Tv className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-[11px] font-medium text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  CFTV IP Ativo
                </span>
              </>
            ) : hwConfig.cameraSourceType === 'usb_webrtc' ? (
              <>
                <Camera className="w-3.5 h-3.5 text-[#0f766e]" />
                <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {detectedCameras.find((c) => c.deviceId === selectedCameraId)?.isExternal ? 'Câmera USB Externa' : 'Câmera Local'}
                </span>
              </>
            ) : (
              <>
                <CameraOff className="w-3.5 h-3.5 text-neutral-400" />
                <span className="text-[11px] font-medium text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded">
                  Modo Somente Leitor
                </span>
              </>
            )}
          </div>

          <div className="h-3.5 w-px bg-neutral-200 hidden sm:block" />

          {/* Local SQLite + Laya Status Didactic Pill */}
          <button
            onClick={() => setShowLayaInfoModal(true)}
            className="hidden sm:flex items-center gap-1.5 text-emerald-800 bg-emerald-50/80 hover:bg-emerald-100 border border-emerald-200/80 px-2.5 py-1 rounded-lg font-mono text-[11px] tabular-nums transition-colors duration-150 cursor-pointer shadow-2xs"
            title="Clique para entender o Motor Laya (< 0.2ms) e a validação offline"
          >
            <Cpu className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span className="font-semibold">Motor Laya: &lt; 0.2ms</span>
            <span className="text-[10px] text-emerald-600 underline ml-0.5">Tecnologia</span>
          </button>
        </div>

        {/* Camera Toggle Button & Simulator Link */}
        <div className="flex items-center gap-2">
          {hwConfig.cameraSourceType !== 'disabled' && (
            <button
              onClick={() => setCameraActive(!cameraActive)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors duration-150 cursor-pointer ${
                cameraActive
                  ? 'bg-[#0f766e] text-white border-[#0f766e]'
                  : 'bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              {cameraActive ? <Camera className="w-3.5 h-3.5" /> : <CameraOff className="w-3.5 h-3.5 text-neutral-400" />}
              <span>{cameraActive ? 'Câmera ativa' : 'Ativar câmera'}</span>
            </button>
          )}

          <button
            onClick={() => setShowDemoBadgesModal(true)}
            className="bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors duration-150 cursor-pointer"
            title="Simular bip de carteirinhas de teste"
          >
            <Sparkles className="w-3.5 h-3.5 text-neutral-500" />
            <span>Simulador de crachás</span>
          </button>
        </div>
      </div>

      {hotplugToast && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{hotplugToast}</span>
          </div>
          <button onClick={() => setHotplugToast(null)} className="cursor-pointer text-emerald-700 hover:text-emerald-950 font-bold ml-2">✕</button>
        </div>
      )}


      {/* 2. Main High-Contrast Mode Banner: ENTRADA vs SAÍDA */}
      <div
        className={`rounded-2xl border p-4 transition-all duration-150 ${
          isEntry
            ? 'bg-[#f0fdf4] border-emerald-300 text-emerald-950'
            : 'bg-[#eff6ff] border-blue-300 text-blue-950'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                isEntry ? 'bg-emerald-600 text-white shadow-xs' : 'bg-blue-600 text-white shadow-xs'
              }`}
            >
              {isEntry ? (
                <ArrowDownLeft className="w-7 h-7 stroke-[2.25]" />
              ) : (
                <ArrowUpRight className="w-7 h-7 stroke-[2.25]" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    isEntry ? 'bg-emerald-200/80 text-emerald-900' : 'bg-blue-200/80 text-blue-900'
                  }`}
                >
                  {isEntry ? 'Operação de Entrada' : 'Operação de Saída & Retirada'}
                </span>
                <span className="text-xs text-neutral-500">Pressione <kbd className="px-1.5 py-0.5 bg-white border border-neutral-300 rounded text-[10px] font-mono font-semibold">F2</kbd> para alternar</span>
              </div>
              <h2 className="text-lg font-bold tracking-tight mt-0.5">
                {isEntry
                  ? 'Entrada de Alunos • Acolhimento e Verificação de Acesso'
                  : 'Saída de Alunos • Verificação de Responsáveis e Retirada Segura'}
              </h2>
            </div>
          </div>

          {/* Quick Mode Toggle Switch */}
          <div className="flex items-center bg-white p-1 rounded-xl border border-neutral-300 shadow-2xs">
            <button
              onClick={() => {
                setEventType('entry');
                inputRef.current?.focus();
              }}
              className={`py-2 px-4 rounded-lg flex items-center gap-2 text-xs font-semibold transition-all duration-150 cursor-pointer ${
                isEntry
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Entrada (F2)</span>
            </button>

            <button
              onClick={() => {
                setEventType('exit');
                inputRef.current?.focus();
              }}
              className={`py-2 px-4 rounded-lg flex items-center gap-2 text-xs font-semibold transition-all duration-150 cursor-pointer ${
                !isEntry
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Saída (F2)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Main Grid: Scanner/Camera Surface (Left 7 cols) & Analytics / Audit (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Camera / Scanner Card + Decision Feedback */}
        <div className="lg:col-span-7 space-y-4">
          {/* Card: Leitor Óptico / Câmera Viewfinder */}
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
            {/* Viewfinder Header */}
            <div className="px-4 py-2.5 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-medium text-neutral-700">
                <Scan className="w-4 h-4 text-[#0f766e]" />
                <span>Leitor de Carteirinhas & QR Code</span>
                {hwConfig.cameraSourceType === 'ip_stream' && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    CFTV IP
                  </span>
                )}
              </div>

              {cameraActive && hwConfig.cameraSourceType === 'usb_webrtc' && detectedCameras.length > 0 && (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedCameraId}
                    onChange={(e) => handleSelectCamera(e.target.value)}
                    className="bg-white border border-neutral-300 rounded px-2 py-0.5 text-xs text-neutral-700 focus:outline-none cursor-pointer max-w-[220px] truncate"
                    title="Alternar câmera USB"
                  >
                    {detectedCameras.map((c, i) => (
                      <option key={c.deviceId || i} value={c.deviceId}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Live Camera Viewfinder or USB Optical Graphic */}
            <div className="p-5 text-center">
              {cameraActive && hwConfig.cameraSourceType === 'usb_webrtc' ? (
                <div className="relative mx-auto max-w-sm rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800 shadow-inner aspect-4/3 flex items-center justify-center">
                  <video
                    ref={videoRef}
                    playsInline
                    autoPlay
                    muted
                    className={`w-full h-full object-cover ${hwConfig.mirrorVideo ? 'scale-x-[-1]' : ''}`}
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Optical Scanning Reticle Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                    <div className="relative w-44 h-44 border-2 border-dashed border-emerald-400/70 rounded-xl">
                      {/* Corner Target Brackets */}
                      <span className="absolute -top-1 -left-1 w-4 h-4 border-t-3 border-l-3 border-emerald-400" />
                      <span className="absolute -top-1 -right-1 w-4 h-4 border-t-3 border-r-3 border-emerald-400" />
                      <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-3 border-l-3 border-emerald-400" />
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-3 border-r-3 border-emerald-400" />

                      {/* Animated Laser Scanning Line */}
                      {scanLaserVisible && (
                        <div className="w-full h-0.5 bg-emerald-400 shadow-[0_0_8px_#10b981] animate-bounce mt-20" />
                      )}
                    </div>
                  </div>

                  <div className="absolute bottom-2 left-2 right-2 text-center bg-black/60 backdrop-blur-xs py-1 px-2 rounded text-[11px] text-emerald-300 font-mono">
                    Aponte o QR Code ou código da carteirinha para a mira
                  </div>
                </div>
              ) : cameraActive && hwConfig.cameraSourceType === 'ip_stream' && hwConfig.ipStreamUrl ? (
                <div className="relative mx-auto max-w-sm rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800 shadow-inner aspect-4/3 flex items-center justify-center">
                  <img
                    ref={ipImgRef}
                    src={hardwareConfig.getProxyStreamUrl(hwConfig.ipStreamUrl)}
                    alt="Stream CFTV"
                    crossOrigin="anonymous"
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Optical Scanning Reticle Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                    <div className="relative w-44 h-44 border-2 border-dashed border-blue-400/70 rounded-xl">
                      <span className="absolute -top-1 -left-1 w-4 h-4 border-t-3 border-l-3 border-blue-400" />
                      <span className="absolute -top-1 -right-1 w-4 h-4 border-t-3 border-r-3 border-blue-400" />
                      <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-3 border-l-3 border-blue-400" />
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-3 border-r-3 border-blue-400" />
                      {scanLaserVisible && (
                        <div className="w-full h-0.5 bg-blue-400 shadow-[0_0_8px_#3b82f6] animate-bounce mt-20" />
                      )}
                    </div>
                  </div>

                  <div className="absolute bottom-2 left-2 right-2 text-center bg-black/60 backdrop-blur-xs py-1 px-2 rounded text-[11px] text-blue-300 font-mono">
                    Stream CFTV Local • Decodificando via Laya Engine
                  </div>
                </div>
              ) : (
                <div className="py-2">
                  <div className="w-14 h-14 rounded-2xl bg-neutral-100 text-[#0f766e] flex items-center justify-center mx-auto border border-neutral-200">
                    <Scan className="w-7 h-7 stroke-[1.75]" />
                  </div>
                  <h3 className="text-sm font-semibold text-neutral-900 mt-2.5">
                    Aguardando apresentação da carteirinha
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5 max-w-sm mx-auto">
                    Aponte o leitor de código de barras USB ou posicione a carteirinha escolar na frente da câmera.
                  </p>
                </div>
              )}


              {/* Input for Barcode Scanner (HID emulation) or manual typing */}
              <form onSubmit={handleSubmit} className="mt-4 max-w-md mx-auto space-y-2 text-left">
                <div className="relative">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Bipar carteirinha ou digitar matrícula (ex: 2024-001)..."
                    aria-label="Matrícula ou token da carteirinha"
                    autoComplete="off"
                    className="w-full bg-white border border-neutral-300 rounded-lg pl-9 pr-16 py-2 text-xs text-neutral-900 font-mono tabular-nums placeholder-neutral-400 focus:outline-none focus:border-[#0f766e] transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="absolute right-1.5 top-1 px-2.5 py-1 rounded-md bg-[#0f766e] hover:bg-[#0d5f59] text-white text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    Bipar
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1">
                  <span>Leitor USB: <strong className="text-neutral-700">Conectado (Foco contínuo)</strong></span>
                  <span className="font-mono text-neutral-400">Pressione ENTER após ler</span>
                </div>
              </form>
            </div>
          </div>

          {/* Decision Feedback Banner: O Aluno e o Veredito de Acesso */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
            {!lastResult ? (
              <div className="flex items-center gap-3.5 text-left py-2">
                <div className="w-12 h-12 rounded-xl bg-neutral-100 text-neutral-400 flex items-center justify-center shrink-0 border border-neutral-200">
                  <KeyRound className="w-6 h-6 stroke-[1.5]" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-neutral-800">
                    Nenhum aluno em análise no momento
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    Assim que a carteirinha for lida, a foto do estudante, dados do responsável e a liberação de portaria aparecerão aqui instantaneamente.
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Result Verdict Alert Box */}
                <div
                  className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                    lastResult.alertType === 'success'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : lastResult.alertType === 'warning'
                      ? 'bg-amber-50 border-amber-300 text-amber-950'
                      : lastResult.alertType === 'duplicate'
                      ? 'bg-amber-50 border-amber-300 text-amber-950'
                      : 'bg-rose-50 border-rose-300 text-rose-950'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {lastResult.alertType === 'success' && (
                      <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                    )}
                    {lastResult.alertType === 'warning' && (
                      <div className="w-10 h-10 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                    )}
                    {lastResult.alertType === 'duplicate' && (
                      <div className="w-10 h-10 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0">
                        <ShieldAlert className="w-6 h-6" />
                      </div>
                    )}
                    {lastResult.alertType === 'denied' && (
                      <div className="w-10 h-10 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
                        <XCircle className="w-6 h-6" />
                      </div>
                    )}

                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider opacity-80">
                        {isEntry ? 'Registro de Entrada' : 'Registro de Saída'}
                      </div>
                      <div className="text-base font-bold tracking-tight">
                        {lastResult.message}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono text-xs font-semibold px-2 py-1 rounded bg-white/80 border border-current tabular-nums">
                      {lastResult.latencyMs}ms (Laya Engine)
                    </span>
                  </div>
                </div>

                {/* Scanned Student Profile */}
                {lastResult.student && (
                  <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <img
                          src={
                            lastResult.student.photo_ref ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                          }
                          alt=""
                          className="w-14 h-14 rounded-xl object-cover border border-neutral-300 shrink-0 shadow-2xs"
                        />
                        <div>
                          <div className="text-base font-bold text-neutral-900 tracking-tight">
                            {lastResult.student.full_name}
                          </div>
                          {lastResult.student.preferred_name && (
                            <div className="text-xs text-neutral-500 italic">
                              "{lastResult.student.preferred_name}"
                            </div>
                          )}
                          <div className="mt-1 flex items-center gap-2 text-xs">
                            <span className="font-mono tabular-nums font-semibold text-neutral-800 bg-white px-2 py-0.5 rounded border border-neutral-200">
                              Matrícula: {lastResult.student.enrollment_code}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-white text-neutral-700 border border-neutral-200 font-medium">
                              {lastResult.classRoom?.name || 'Turma'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setShowStudentDetailModal(true)}
                        className="px-3 py-1.5 rounded-lg border border-neutral-300 hover:bg-white text-xs font-medium text-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Ficha rápida</span>
                      </button>
                    </div>

                    {/* Operational Details Grid */}
                    <div className="pt-2 border-t border-neutral-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-neutral-500 block text-[11px]">Responsável principal:</span>
                        <span className="font-semibold text-neutral-900">
                          {lastResult.student.guardian_name || 'Não informado'}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block text-[11px]">Telefone para contato:</span>
                        <span className="font-mono tabular-nums text-neutral-800 font-semibold flex items-center gap-1">
                          <Phone className="w-3 h-3 text-neutral-400" />
                          {lastResult.student.guardian_phone || 'Não informado'}
                        </span>
                      </div>
                    </div>

                    {/* Exit Specific: Pessoas Autorizadas para Retirada (Mem0) */}
                    {!isEntry && (
                      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-950 space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-blue-900">
                          <UserCheck className="w-4 h-4 text-blue-700" />
                          <span>Conferência de Retirada Autorizada (Portaria)</span>
                        </div>
                        <p className="text-[11px] text-blue-800">
                          {lastContext?.authorizedPickups && lastContext.authorizedPickups.length > 0
                            ? lastContext.authorizedPickups.map((m) => m.content).join(' • ')
                            : lastResult.student.guardian_name
                            ? `Responsável legal: ${lastResult.student.guardian_name}. Sem restrições adicionais cadastradas.`
                            : 'Nenhuma autorização especial cadastrada. Exigir documento do responsável.'}
                        </p>
                      </div>
                    )}

                    {/* Entry Specific: Alertas Médicos ou Cuidados Especiais (Mem0) */}
                    {isEntry && lastResult.student.medical_notes && (
                      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-amber-900">
                          <HeartPulse className="w-4 h-4 text-amber-700" />
                          <span>Aviso Médico / Cuidados de Saúde</span>
                        </div>
                        <p className="text-[11px] text-amber-800">
                          {lastResult.student.medical_notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Mem0 Complete Semantic Memory Layer */}
                {lastResult.student && (
                  <Mem0ContextCard
                    criticalAlerts={lastContext?.criticalAlerts}
                    authorizedPickups={lastContext?.authorizedPickups}
                    generalNotes={lastContext?.generalNotes}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Shift Analytics, Validation Rules & Live Feed */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card 1: Movimentação do Turno */}
          <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-800">
                Movimentação do turno atual
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                Operação ativa
              </span>
            </div>

            <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-4 flex items-center justify-around text-center">
              <div>
                <div className="text-3xl font-bold font-mono tabular-nums text-emerald-700">
                  {entriesCount}
                </div>
                <div className="text-xs text-neutral-600 font-medium mt-0.5">
                  Entradas confirmadas
                </div>
              </div>

              <div className="text-neutral-300 text-lg font-light">
                /
              </div>

              <div>
                <div className="text-3xl font-bold font-mono tabular-nums text-blue-700">
                  {exitsCount}
                </div>
                <div className="text-xs text-neutral-600 font-medium mt-0.5">
                  Saídas confirmadas
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Regras e Parâmetros de Portaria */}
          <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-800">
                Regras de segurança ativas
              </span>
              <button
                onClick={() => setShowRulesModal(true)}
                title="Ajustar parâmetros de tolerância"
                className="p-1 rounded text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-neutral-700">
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#0f766e] shrink-0" />
                <span>Credencial válida e matrícula ativa</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#0f766e] shrink-0" />
                <span>Cooldown anti-duplicidade: {duplicitySeconds}s</span>
              </div>
              <div className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Alerta para entrada fora da janela de turno</span>
              </div>
            </div>

            <div className="border-t border-neutral-100 pt-2.5">
              <label className="flex items-center justify-between cursor-pointer text-xs text-neutral-700">
                <span>Permitir repetição forçada (exceção)</span>
                <input
                  type="checkbox"
                  checked={allowRepetition}
                  onChange={(e) => setAllowRepetition(e.target.checked)}
                  className="rounded text-[#0f766e] focus:ring-0 cursor-pointer"
                />
              </label>
            </div>

            <div className="border-t border-neutral-100 pt-2.5 flex items-center justify-between">
              <button
                onClick={() => setShowCorrectionModal(true)}
                className="text-xs text-neutral-600 hover:text-neutral-900 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Registrar retificação de evento</span>
                <RotateCcw className="w-3.5 h-3.5 text-neutral-400" />
              </button>
            </div>
          </div>

          {/* Card 3: Feed ao Vivo dos Últimos Alunos */}
          {recentEvents.length > 0 && (
            <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-neutral-800">
                  Últimas validações ao vivo
                </span>
                <span className="text-neutral-400 font-mono text-[11px]">Audit Feed</span>
              </div>

              <div className="space-y-1.5">
                {recentEvents.map((ev) => {
                  const stu = students.find((s) => s.id === ev.student_id);
                  const isEntryEvent = ev.event_type === 'entry';
                  const time = new Date(ev.occurred_at_device).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  return (
                    <div
                      key={ev.id}
                      className="p-2 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isEntryEvent ? 'bg-emerald-600' : 'bg-blue-600'
                          }`}
                        />
                        <div className="truncate">
                          <div className="font-medium text-neutral-900 truncate max-w-[150px]">
                            {stu?.full_name || 'Estudante'}
                          </div>
                          <div className="text-[10px] text-neutral-400 font-mono">
                            {isEntryEvent ? 'Entrada' : 'Saída'} &bull; Matrícula: {stu?.enrollment_code}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums text-neutral-500">
                        <span>{time}</span>
                        <span className="px-1.5 py-0.2 rounded bg-white text-neutral-600 border border-neutral-200 uppercase text-[10px]">
                          {ev.source}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Regras e Parâmetros */}
      {showRulesModal && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-md w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
              <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#0f766e]" />
                Parâmetros operacionais de portaria
              </h3>
              <button 
                onClick={() => setShowRulesModal(false)} 
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-neutral-700">
              <div>
                <label className="block font-medium mb-1">
                  Tolerância de duplicidade de leitura:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={10}
                    max={180}
                    step={10}
                    value={duplicitySeconds}
                    onChange={(e) => setDuplicitySeconds(Number(e.target.value))}
                    className="flex-1 accent-[#0f766e]"
                  />
                  <span className="font-mono tabular-nums font-semibold w-12 text-right">{duplicitySeconds}s</span>
                </div>
                <span className="text-xs text-neutral-500 mt-1 block">
                  Evita dupla leitura acidental no leitor óptico.
                </span>
              </div>

              <div className="border-t border-neutral-100 pt-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enforceSchedule}
                    onChange={(e) => setEnforceSchedule(e.target.checked)}
                    className="rounded text-[#0f766e] focus:ring-0"
                  />
                  <span className="font-medium">Verificar horários oficiais de turno</span>
                </label>
                <span className="text-xs text-neutral-500 ml-5 block mt-0.5">
                  Alerta se o aluno tentar entrar fora do período de aula regular.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-neutral-200">
              <button
                onClick={() => setShowRulesModal(false)}
                className="px-3.5 py-1.5 rounded-lg bg-[#0f766e] hover:bg-[#0d5f59] text-white font-medium text-xs cursor-pointer"
              >
                Salvar parâmetros
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Retificação de Evento */}
      {showCorrectionModal && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-lg w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
              <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-[#0f766e]" />
                Registrar retificação de evento de portaria
              </h3>
              <button 
                onClick={() => setShowCorrectionModal(false)} 
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCorrection} className="space-y-3 text-xs text-neutral-700">
              <div>
                <label className="block font-medium mb-1">Evento a ser retificado:</label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg p-2 text-neutral-900 focus:outline-none focus:border-[#0f766e] cursor-pointer"
                >
                  {localDb.getAttendanceEvents().slice(0, 15).map((e) => {
                    const s = students.find((stu) => stu.id === e.student_id);
                    return (
                      <option key={e.id} value={e.id}>
                        {new Date(e.occurred_at_device).toLocaleTimeString('pt-BR')} &bull; {s?.full_name || 'Aluno'} &bull; {e.event_type === 'entry' ? 'Entrada' : 'Saída'}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1">
                  Justificativa administrativa formal (mínimo 8 caracteres):
                </label>
                <textarea
                  rows={3}
                  required
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="Ex: Aluno bipou saída acidentalmente ao se despedir do colega..."
                  className="w-full bg-white border border-neutral-300 rounded-lg p-2 text-neutral-900 focus:outline-none focus:border-[#0f766e]"
                />
              </div>

              {correctionErrorMsg && (
                <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {correctionErrorMsg}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setShowCorrectionModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50 font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-[#0f766e] hover:bg-[#0d5f59] text-white font-medium cursor-pointer"
                >
                  Gravar retificação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Simulador de Crachás */}
      {showDemoBadgesModal && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-lg w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
              <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#0f766e]" />
                Simulador de leitura de crachás
              </h3>
              <button 
                onClick={() => setShowDemoBadgesModal(false)} 
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-500">
              Clique em qualquer carteirinha abaixo para simular uma leitura instantânea no terminal:
            </p>

            <div className="space-y-2">
              {demoBadges.map((b) => (
                <button
                  key={b.code}
                  onClick={() => {
                    executeScan(b.token, 'qr');
                    setShowDemoBadgesModal(false);
                  }}
                  className={`w-full p-3 rounded-lg border text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                    b.isBlocked
                      ? 'border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-900'
                      : b.isInactive
                      ? 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-800'
                      : 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-900'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-neutral-900">{b.name}</div>
                    <div className="text-xs text-neutral-500 font-mono tabular-nums mt-0.5">
                      Matrícula: {b.code} &bull; {b.class} &bull; {b.desc}
                    </div>
                  </div>
                  <span className="font-mono tabular-nums text-[11px] px-2.5 py-1 rounded bg-[#0f766e] text-white font-medium">
                    Bipar agora
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Ficha Rápida do Aluno */}
      {showStudentDetailModal && lastResult?.student && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-md w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
              <h3 className="font-semibold text-neutral-900 text-sm">Ficha rápida do estudante</h3>
              <button 
                onClick={() => setShowStudentDetailModal(false)} 
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3.5">
              <img
                src={lastResult.student.photo_ref || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt=""
                className="w-14 h-14 rounded-lg object-cover border border-neutral-200"
              />
              <div className="text-xs">
                <h4 className="font-semibold text-sm text-neutral-900">{lastResult.student.full_name}</h4>
                <div className="text-neutral-500 font-mono tabular-nums mt-0.5">
                  Matrícula: {lastResult.student.enrollment_code}
                </div>
                <div className="text-neutral-500">{lastResult.classRoom?.name}</div>
              </div>
            </div>

            <div className="space-y-2 text-xs text-neutral-700 bg-neutral-50 p-3 rounded-lg border border-neutral-200">
              <div>
                <span className="text-neutral-500 block text-[10px]">Responsável principal:</span>
                <span className="font-medium text-neutral-900">{lastResult.student.guardian_name || 'Não informado'}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px]">Contato de emergência:</span>
                <span className="font-mono tabular-nums text-neutral-900">{lastResult.student.guardian_phone || 'Não informado'}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px]">Situação cadastral:</span>
                <span className="font-medium text-emerald-700 uppercase">{lastResult.student.status}</span>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-neutral-200">
              <button
                onClick={() => setShowStudentDetailModal(false)}
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
