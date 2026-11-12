import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Printer,
  RotateCcw,
  ShieldCheck,
  Search,
  CheckCircle2,
  X,
  CheckSquare,
  Square,
  Scissors,
  Layers,
  FileSpreadsheet,
  CheckCheck,
  Clock,
  Settings2,
  Check,
  ChevronDown,
} from 'lucide-react';
import { localDb } from '../services/localDatabase';
import { Student } from '../types/database';

export type BadgeFormat = 'cr80' | 'badge_90x60' | 'badge_100x70' | 'custom';
export type A4Density = '8_per_page' | '10_per_page';

export const BadgesStudioView: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [printStatusFilter, setPrintStatusFilter] = useState<'all' | 'pending' | 'printed'>('all');
  const [qrCodeDataUrls, setQrCodeDataUrls] = useState<{ [studentId: string]: string }>({});

  // Layout & Dimension Configuration
  const [badgeFormat, setBadgeFormat] = useState<BadgeFormat>('cr80');
  const [customWidthMm, setCustomWidthMm] = useState<number>(85.6);
  const [customHeightMm, setCustomHeightMm] = useState<number>(54.0);
  const [layoutMode, setLayoutMode] = useState<'individual' | 'a4_batch'>('individual');
  const [a4Density, setA4Density] = useState<A4Density>('8_per_page');
  const [showCropMarks, setShowCropMarks] = useState<boolean>(true);

  // Selection for Batch Printing
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Messages & Modals
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [showRevokeModal, setShowRevokeModal] = useState<boolean>(false);
  const [showConfirmPrintedModal, setShowConfirmPrintedModal] = useState<boolean>(false);

  const classrooms = localDb.getClassrooms();

  const loadData = () => {
    const list = localDb.getStudents();
    setStudents(list);
    if (!selectedStudentId && list.length > 0) {
      setSelectedStudentId(list[0].id);
    }
  };

  useEffect(() => {
    loadData();
    return localDb.subscribe(loadData);
  }, []);

  // Generate QR Codes for all students
  useEffect(() => {
    const generateAllQrs = async () => {
      const urls: { [id: string]: string } = {};
      for (const s of students) {
        const ident = localDb.getActiveIdentifier(s.id);
        const tokenToEncode = ident ? ident.raw_token : `school_horizonte_01:student:${s.id}:v1`;
        try {
          const url = await QRCode.toDataURL(tokenToEncode, {
            errorCorrectionLevel: 'M',
            margin: 1,
            width: 240,
            color: {
              dark: '#111827',
              light: '#ffffff',
            },
          });
          urls[s.id] = url;
        } catch {
          // ignore
        }
      }
      setQrCodeDataUrls(urls);
    };

    if (students.length > 0) {
      generateAllQrs();
    }
  }, [students]);

  // Filter students based on search, classroom, and print status
  const filteredStudents = students.filter((s) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      s.full_name.toLowerCase().includes(query) ||
      s.enrollment_code.toLowerCase().includes(query);
    const matchesClass = classFilter === 'all' || s.class_id === classFilter;
    const matchesPrintStatus =
      printStatusFilter === 'all' ||
      (printStatusFilter === 'pending' && !s.badge_printed_at) ||
      (printStatusFilter === 'printed' && !!s.badge_printed_at);

    return matchesSearch && matchesClass && matchesPrintStatus;
  });

  const pendingStudents = students.filter((s) => !s.badge_printed_at);
  const printedStudents = students.filter((s) => !!s.badge_printed_at);

  const selectedStudent =
    students.find((s) => s.id === selectedStudentId) || filteredStudents[0] || students[0];
  const selectedIdentifier = selectedStudent
    ? localDb.getActiveIdentifier(selectedStudent.id)
    : null;
  const selectedClass = selectedStudent
    ? classrooms.find((c) => c.id === selectedStudent.class_id)
    : null;

  const showNotification = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  // Selection Helpers
  const handleToggleSelectStudent = (id: string) => {
    const next = new Set(selectedStudentIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedStudentIds(next);
  };

  const handleSelectAllFiltered = () => {
    const next = new Set(selectedStudentIds);
    filteredStudents.forEach((s) => next.add(s.id));
    setSelectedStudentIds(next);
  };

  const handleSelectAllPending = () => {
    const next = new Set(selectedStudentIds);
    pendingStudents.forEach((s) => next.add(s.id));
    setSelectedStudentIds(next);
    showNotification(`${pendingStudents.length} carteirinha(s) pendentes selecionadas.`);
  };

  const handleClearSelection = () => {
    setSelectedStudentIds(new Set());
  };

  const handleReissueBadge = () => {
    if (!selectedStudent) return;
    const newIdent = localDb.revokeAndReissueToken(selectedStudent.id);
    showNotification(
      `Nova credencial emitida para ${selectedStudent.full_name}. Token anterior revogado e carteirinha marcada como pendente.`
    );
    setShowRevokeModal(false);
  };

  const handlePrint = () => {
    // If no students are explicitly selected, print either the selected student or filtered list
    if (layoutMode === 'individual') {
      window.print();
      setShowConfirmPrintedModal(true);
    } else {
      if (selectedStudentIds.size === 0) {
        handleSelectAllFiltered();
      }
      setTimeout(() => {
        window.print();
        setShowConfirmPrintedModal(true);
      }, 100);
    }
  };

  const handleConfirmMarkAsPrinted = () => {
    const idsToMark =
      layoutMode === 'individual' && selectedStudent
        ? [selectedStudent.id]
        : Array.from(selectedStudentIds);

    if (idsToMark.length > 0) {
      localDb.markBadgesAsPrinted(idsToMark);
      showNotification(`${idsToMark.length} carteirinha(s) marcadas como impressas com sucesso.`);
    }
    setShowConfirmPrintedModal(false);
  };

  const handleMarkSelectedAsPrinted = () => {
    const ids = Array.from(selectedStudentIds);
    if (ids.length === 0) return;
    localDb.markBadgesAsPrinted(ids);
    showNotification(`${ids.length} carteirinha(s) marcadas como impressas.`);
  };

  const handleMarkSelectedAsPending = () => {
    const ids = Array.from(selectedStudentIds);
    if (ids.length === 0) return;
    ids.forEach((id) => localDb.markBadgeAsPending(id));
    showNotification(`${ids.length} carteirinha(s) marcadas como pendentes de impressão.`);
  };

  // Dimensions & CSS styling helper
  const getBadgeDimensions = () => {
    switch (badgeFormat) {
      case 'badge_90x60':
        return { width: '90mm', height: '60mm', label: 'Crachá Médio (90×60mm)' };
      case 'badge_100x70':
        return { width: '70mm', height: '100mm', label: 'Crachá Vertical (70×100mm)' };
      case 'custom':
        return {
          width: `${customWidthMm}mm`,
          height: `${customHeightMm}mm`,
          label: `Manual (${customWidthMm}×${customHeightMm}mm)`,
        };
      case 'cr80':
      default:
        return { width: '85.6mm', height: '53.98mm', label: 'Padrão PVC CR-80 (85.6×54mm)' };
    }
  };

  const badgeDims = getBadgeDimensions();

  // Group selected students into A4 sheets (chunks of 8 or 10)
  const studentsToPrintInBatch =
    selectedStudentIds.size > 0
      ? students.filter((s) => selectedStudentIds.has(s.id))
      : filteredStudents;

  const pageSize = a4Density === '8_per_page' ? 8 : 10;
  const chunkedA4Pages: Student[][] = [];
  for (let i = 0; i < studentsToPrintInBatch.length; i += pageSize) {
    chunkedA4Pages.push(studentsToPrintInBatch.slice(i, i + pageSize));
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5 select-none">
      {/* Dynamic Print Stylesheet */}
      <style>{`
        @media print {
          @page {
            size: ${layoutMode === 'individual' ? `${badgeDims.width} ${badgeDims.height}` : 'A4 portrait'};
            margin: ${layoutMode === 'individual' ? '0' : '8mm'};
          }
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Hide all non-printable shell elements */
          aside, nav, header, footer, .no-print, button, form, .top-nav, .sidebar {
            display: none !important;
          }
          .printable-sheet {
            page-break-after: always;
            break-after: page;
          }
        }
      `}</style>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 no-print">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">
            Emissão de Carteirinhas Escolares
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Geração calibrada em milímetros para impressoras térmicas de PVC (CR-80), crachás manuais e folhas de lote A4
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="bg-neutral-100 p-1 rounded-xl inline-flex gap-1 border border-neutral-200 text-xs font-medium">
            <button
              onClick={() => setLayoutMode('individual')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                layoutMode === 'individual'
                  ? 'bg-white text-neutral-900 border border-neutral-300 shadow-2xs font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <span>Cartão Individual</span>
            </button>
            <button
              onClick={() => setLayoutMode('a4_batch')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                layoutMode === 'a4_batch'
                  ? 'bg-white text-neutral-900 border border-neutral-300 shadow-2xs font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Folha A4 em Lote</span>
            </button>
          </div>

          {/* Master Print Button */}
          <button
            onClick={handlePrint}
            className="bg-[#0f766e] hover:bg-[#0d5f59] text-white text-xs font-medium px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors duration-150 cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>
              {layoutMode === 'individual'
                ? 'Imprimir carteirinha'
                : `Imprimir lote (${studentsToPrintInBatch.length})`}
            </span>
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 no-print">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Hardware Calibration & Dimension Controls Ribbon */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-3 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-100">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-900">
            <Settings2 className="w-4 h-4 text-[#0f766e]" />
            <span>Calibração Físico-Mecânica do Documento</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-neutral-500 font-medium">Formato Físico:</span>
            <select
              value={badgeFormat}
              onChange={(e) => setBadgeFormat(e.target.value as BadgeFormat)}
              className="bg-neutral-50 border border-neutral-300 rounded-lg px-2.5 py-1 text-xs text-neutral-800 font-medium focus:outline-none"
            >
              <option value="cr80">Cartão PVC Padrão CR-80 (85.60 × 53.98 mm) - Zebra / Evolis / Datacard</option>
              <option value="badge_90x60">Crachá Papel Médio (90 × 60 mm) - Bolsa Plástica</option>
              <option value="badge_100x70">Crachá Vertical (70 × 100 mm) - Furo Ovoide</option>
              <option value="custom">Tamanho Personalizado Manual (mm)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          {badgeFormat === 'custom' ? (
            <>
              <div className="space-y-1">
                <label className="text-neutral-600 font-medium">Largura Manual (mm):</label>
                <input
                  type="number"
                  step="0.5"
                  min="40"
                  max="200"
                  value={customWidthMm}
                  onChange={(e) => setCustomWidthMm(Number(e.target.value))}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-neutral-900"
                />
              </div>
              <div className="space-y-1">
                <label className="text-neutral-600 font-medium">Altura Manual (mm):</label>
                <input
                  type="number"
                  step="0.5"
                  min="30"
                  max="280"
                  value={customHeightMm}
                  onChange={(e) => setCustomHeightMm(Number(e.target.value))}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-neutral-900"
                />
              </div>
            </>
          ) : (
            <div className="col-span-2 flex items-center gap-2 p-2 bg-neutral-50 rounded-lg border border-neutral-200">
              <span className="text-neutral-500">Dimensão física do cartão:</span>
              <strong className="text-[#0f766e] font-mono">{badgeDims.width} × {badgeDims.height}</strong>
              <span className="text-neutral-400 text-[11px]">(300 DPI sem distorção óptica)</span>
            </div>
          )}

          {layoutMode === 'a4_batch' && (
            <>
              <div className="space-y-1">
                <label className="text-neutral-600 font-medium">Capacidade Folha A4:</label>
                <select
                  value={a4Density}
                  onChange={(e) => setA4Density(e.target.value as A4Density)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800"
                >
                  <option value="8_per_page">8 carteirinhas / folha (2 cols × 4 linhas - recomendado)</option>
                  <option value="10_per_page">10 carteirinhas / folha (2 cols × 5 linhas - econômico)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-4">
                <input
                  type="checkbox"
                  id="chkCropMarks"
                  checked={showCropMarks}
                  onChange={(e) => setShowCropMarks(e.target.checked)}
                  className="rounded border-neutral-300 text-[#0f766e] focus:ring-0"
                />
                <label htmlFor="chkCropMarks" className="text-neutral-700 cursor-pointer flex items-center gap-1">
                  <Scissors className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Guias pontilhadas de corte (Crop Marks)</span>
                </label>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Security Privacy Notice */}
      <div className="bg-white rounded-xl border border-neutral-200 p-3.5 flex items-start gap-3 text-xs no-print">
        <ShieldCheck className="w-5 h-5 text-[#0f766e] mt-0.5 shrink-0" />
        <div className="space-y-0.5">
          <div className="font-semibold text-neutral-900 text-xs">
            Privacidade por design & Criptografia (LGPD)
          </div>
          <p className="text-neutral-500 leading-relaxed text-xs">
            O QR Code gerado contém exclusivamente um token opaco imutável (<code className="text-[#0f766e] bg-neutral-100 px-1 py-0.2 rounded font-mono tabular-nums">school:student:&lt;uuidv7&gt;</code>) resolvido apenas pelo banco local. Em caso de extravio ou troca de ano letivo, o token é revogado com 1 clique e substituído de forma imediata.
          </p>
        </div>
      </div>

      {/* MODE 1: INDIVIDUAL CARD VIEW & REISSUE STUDIO */}
      {layoutMode === 'individual' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start no-print">
          {/* Left: Student Selector List with Print Status Tags (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-neutral-200 overflow-hidden flex flex-col h-[560px]">
            {/* Filters Bar */}
            <div className="p-3 border-b border-neutral-200 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filtrar por nome ou matrícula..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[#0f766e]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg px-2 py-1 text-xs text-neutral-700 focus:outline-none"
                >
                  <option value="all">Todas as turmas ({students.length})</option>
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <select
                  value={printStatusFilter}
                  onChange={(e) => setPrintStatusFilter(e.target.value as any)}
                  className="w-full bg-white border border-neutral-300 rounded-lg px-2 py-1 text-xs text-neutral-700 focus:outline-none"
                >
                  <option value="all">Todos ({students.length})</option>
                  <option value="pending">Pendentes ({pendingStudents.length})</option>
                  <option value="printed">Impressos ({printedStudents.length})</option>
                </select>
              </div>
            </div>

            {/* Student List */}
            <div className="overflow-y-auto flex-1 divide-y divide-neutral-100">
              {filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-neutral-400 text-xs">
                  Nenhum aluno encontrado para os filtros selecionados.
                </div>
              ) : (
                filteredStudents.map((s) => {
                  const isSelected = selectedStudent?.id === s.id;
                  const c = classrooms.find((cl) => cl.id === s.class_id);
                  const isPrinted = !!s.badge_printed_at;

                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStudentId(s.id)}
                      className={`w-full p-2.5 text-left flex items-center justify-between transition-colors duration-150 cursor-pointer ${
                        isSelected
                          ? 'bg-neutral-100 border-l-3 border-l-[#0f766e]'
                          : 'hover:bg-neutral-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={
                            s.photo_ref ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80'
                          }
                          alt=""
                          className="w-7 h-7 rounded-md object-cover border border-neutral-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-medium text-xs text-neutral-900 truncate">
                            {s.full_name}
                          </div>
                          <div className="text-[11px] text-neutral-500 font-mono tabular-nums">
                            {s.enrollment_code} &bull; {c?.name || 'Geral'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isPrinted ? (
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"
                            title={`Impressa em: ${new Date(s.badge_printed_at!).toLocaleDateString('pt-BR')}`}
                          >
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Impressa</span>
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Pendente</span>
                          </span>
                        )}
                        <QrCode className={`w-3.5 h-3.5 ${isSelected ? 'text-[#0f766e]' : 'text-neutral-400'}`} />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Individual Badge Preview & Management (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {selectedStudent && (
              <>
                {/* Physical Card Preview Container */}
                <div className="bg-neutral-100 p-6 rounded-xl border border-neutral-200 flex flex-col items-center justify-center space-y-3">
                  <div className="text-[11px] text-neutral-500 font-mono">
                    Visualização em escala real &bull; {badgeDims.label}
                  </div>

                  <div
                    id="cr80-card-preview"
                    className="w-[360px] h-[225px] bg-white rounded-xl border border-neutral-300 shadow-md p-4 flex flex-col justify-between relative overflow-hidden select-none"
                  >
                    {/* Header Strip */}
                    <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-[#142024] text-white flex items-center justify-center font-bold text-[10px]">
                          EH
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-neutral-900 tracking-tight">
                            Escola Horizonte
                          </div>
                          <div className="text-[10px] text-neutral-500 font-mono">
                            Carteirinha de Acesso
                          </div>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono tabular-nums font-semibold bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded border border-neutral-200">
                        {badgeFormat === 'cr80' ? 'CR-80 PVC' : badgeDims.label}
                      </span>
                    </div>

                    {/* Middle: Student Details + QR Code */}
                    <div className="flex items-center justify-between gap-3 py-1">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            selectedStudent.photo_ref ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                          }
                          alt=""
                          className="w-16 h-20 rounded-md object-cover border border-neutral-300"
                        />
                        <div className="space-y-0.5">
                          <div className="font-semibold text-xs text-neutral-900 leading-tight">
                            {selectedStudent.full_name}
                          </div>
                          <div className="text-xs text-neutral-500">
                            Turma: <strong className="text-neutral-800">{selectedClass?.name || 'Geral'}</strong>
                          </div>
                          <div className="text-xs text-neutral-500 font-mono tabular-nums">
                            Matrícula: <strong className="text-neutral-900">{selectedStudent.enrollment_code}</strong>
                          </div>
                          <div className="text-[11px] text-neutral-400">
                            Validade: 31/12/2026
                          </div>
                        </div>
                      </div>

                      {/* QR Code */}
                      <div className="text-center">
                        {qrCodeDataUrls[selectedStudent.id] ? (
                          <img
                            src={qrCodeDataUrls[selectedStudent.id]}
                            alt="QR Code do Estudante"
                            className="w-18 h-18 rounded border border-neutral-200 p-1 bg-white"
                          />
                        ) : (
                          <div className="w-18 h-18 rounded bg-neutral-100 flex items-center justify-center">
                            <QrCode className="w-6 h-6 text-neutral-400" />
                          </div>
                        )}
                        <span className="text-[9px] font-mono tabular-nums text-neutral-400 mt-0.5 block">
                          TOKEN SEGURO
                        </span>
                      </div>
                    </div>

                    {/* Card Footer Bar */}
                    <div className="border-t border-neutral-200 pt-1.5 flex items-center justify-between text-[10px] text-neutral-500 font-mono">
                      <span>Portaria Escolar &bull; Local-First</span>
                      <span>Leitor HID / Óptico</span>
                    </div>
                  </div>
                </div>

                {/* Print Status & Token Management Card */}
                <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-neutral-900">
                        Status de Impressão e Credencial
                      </div>
                      <div className="text-xs text-neutral-500 mt-0.5">
                        {selectedStudent.badge_printed_at ? (
                          <span className="text-emerald-700 font-medium">
                            ✓ Carteirinha impressa em {new Date(selectedStudent.badge_printed_at).toLocaleDateString('pt-BR')} às {new Date(selectedStudent.badge_printed_at).toLocaleTimeString('pt-BR')}
                          </span>
                        ) : (
                          <span className="text-amber-700 font-medium">
                            ⚠ Carteirinha ainda não foi impressa
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedStudent.badge_printed_at ? (
                        <button
                          onClick={() => {
                            localDb.markBadgeAsPending(selectedStudent.id);
                            showNotification(`Carteirinha de ${selectedStudent.full_name} marcada como pendente.`);
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-medium cursor-pointer"
                        >
                          Marcar como pendente
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            localDb.markBadgesAsPrinted([selectedStudent.id]);
                            showNotification(`Carteirinha de ${selectedStudent.full_name} marcada como impressa.`);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-medium cursor-pointer"
                        >
                          Marcar como impressa
                        </button>
                      )}

                      <button
                        onClick={() => setShowRevokeModal(true)}
                        className="px-2.5 py-1.5 rounded-lg border border-neutral-300 hover:bg-rose-50 text-neutral-700 hover:text-rose-700 hover:border-rose-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Revogar e reemitir</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200 space-y-1 font-mono text-xs">
                    <div className="text-neutral-600 truncate">
                      Payload Criptográfico: <strong className="text-[#0f766e]">{selectedIdentifier?.raw_token || 'school:student:v1'}</strong>
                    </div>
                    <div className="text-neutral-400 text-[11px] tabular-nums">
                      Emitido em: {selectedIdentifier ? new Date(selectedIdentifier.issued_at).toLocaleString('pt-BR') : 'Hoje'}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODE 2: BATCH SHEET & A4 MULTI-PRINTING */}
      {layoutMode === 'a4_batch' && (
        <div className="space-y-4 no-print">
          {/* Batch Selection Ribbon */}
          <div className="bg-white rounded-xl border border-neutral-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap text-xs">
              <span className="font-semibold text-neutral-900">
                {selectedStudentIds.size} de {filteredStudents.length} selecionadas
              </span>

              <div className="h-4 w-px bg-neutral-200" />

              <button
                onClick={handleSelectAllPending}
                className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-medium cursor-pointer"
              >
                Selecionar pendentes ({pendingStudents.length})
              </button>

              <button
                onClick={handleSelectAllFiltered}
                className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium cursor-pointer"
              >
                Selecionar filtradas ({filteredStudents.length})
              </button>

              {selectedStudentIds.size > 0 && (
                <button
                  onClick={handleClearSelection}
                  className="px-2.5 py-1 rounded-lg text-neutral-500 hover:text-neutral-800 cursor-pointer"
                >
                  Desmarcar todas
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {selectedStudentIds.size > 0 && (
                <>
                  <button
                    onClick={handleMarkSelectedAsPrinted}
                    className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-medium cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Marcar como impressas</span>
                  </button>

                  <button
                    onClick={handleMarkSelectedAsPending}
                    className="px-3 py-1.5 rounded-lg border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-medium cursor-pointer"
                  >
                    <span>Marcar como pendentes</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Interactive Multi-Select Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredStudents.map((s) => {
              const isSelected = selectedStudentIds.has(s.id);
              const c = classrooms.find((cl) => cl.id === s.class_id);
              const isPrinted = !!s.badge_printed_at;

              return (
                <div
                  key={s.id}
                  onClick={() => handleToggleSelectStudent(s.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-emerald-50/60 border-emerald-400 shadow-2xs'
                      : 'bg-white border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="text-[#0f766e]">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#0f766e]" />
                      ) : (
                        <Square className="w-4 h-4 text-neutral-400" />
                      )}
                    </div>

                    <img
                      src={
                        s.photo_ref ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80'
                      }
                      alt=""
                      className="w-9 h-11 rounded-md object-cover border border-neutral-200 shrink-0"
                    />

                    <div className="min-w-0 text-xs">
                      <div className="font-semibold text-neutral-900 truncate">
                        {s.full_name}
                      </div>
                      <div className="text-[11px] text-neutral-500 font-mono tabular-nums">
                        {s.enrollment_code} &bull; {c?.name || 'Geral'}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isPrinted ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">
                        Impressa
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800">
                        Pendente
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PRINT-ONLY CONTAINER (Rendered exclusively when printing or previewing) */}
      <div className="printable-badge-area">
        {layoutMode === 'individual' && selectedStudent && (
          <div className="flex items-center justify-center p-2">
            <div
              style={{ width: badgeDims.width, height: badgeDims.height }}
              className="bg-white border border-neutral-400 p-2.5 flex flex-col justify-between relative overflow-hidden select-none box-border"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-neutral-300 pb-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded bg-[#142024] text-white flex items-center justify-center font-bold text-[9px]">
                    EH
                  </div>
                  <div>
                    <div className="font-bold text-[11px] text-neutral-900 tracking-tight leading-none">
                      Escola Horizonte
                    </div>
                    <div className="text-[9px] text-neutral-600 font-mono">
                      Carteirinha de Acesso
                    </div>
                  </div>
                </div>
                <span className="text-[8px] font-mono font-bold bg-neutral-100 px-1 py-0.2 rounded border border-neutral-300">
                  {badgeFormat === 'cr80' ? 'CR-80' : 'ESTUDANTE'}
                </span>
              </div>

              {/* Body */}
              <div className="flex items-center justify-between gap-2 py-1">
                <div className="flex items-center gap-2">
                  <img
                    src={
                      selectedStudent.photo_ref ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                    }
                    alt=""
                    className="w-14 h-17 rounded object-cover border border-neutral-300"
                  />
                  <div className="space-y-0.5 text-[10px]">
                    <div className="font-bold text-neutral-900 leading-tight">
                      {selectedStudent.full_name}
                    </div>
                    <div className="text-neutral-600">
                      Turma: <strong>{selectedClass?.name || 'Geral'}</strong>
                    </div>
                    <div className="text-neutral-600 font-mono tabular-nums">
                      Matrícula: <strong>{selectedStudent.enrollment_code}</strong>
                    </div>
                    <div className="text-[9px] text-neutral-500">
                      Validade: 31/12/2026
                    </div>
                  </div>
                </div>

                <div className="text-center shrink-0">
                  {qrCodeDataUrls[selectedStudent.id] && (
                    <img
                      src={qrCodeDataUrls[selectedStudent.id]}
                      alt="QR Code"
                      className="w-16 h-16 rounded border border-neutral-300 p-0.5 bg-white"
                    />
                  )}
                  <span className="text-[8px] font-mono text-neutral-500 block mt-0.5">
                    TOKEN LGPD
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-neutral-300 pt-1 flex items-center justify-between text-[9px] text-neutral-600 font-mono">
                <span>Portaria Escolar Local-First</span>
                <span>Validação Óptica</span>
              </div>
            </div>
          </div>
        )}

        {layoutMode === 'a4_batch' && (
          <div className="space-y-6">
            {chunkedA4Pages.map((pageStudents, pageIdx) => (
              <div
                key={pageIdx}
                className="printable-sheet bg-white p-4 mx-auto"
                style={{ width: '210mm', minHeight: '297mm', boxSizing: 'border-box' }}
              >
                {/* A4 Sheet Header for Operators (Cut Guide) */}
                <div className="text-[10px] text-neutral-400 font-mono pb-2 mb-3 border-b border-neutral-200 flex items-center justify-between">
                  <span>Escola Horizonte &bull; Lote de Impressão A4 &bull; Página {pageIdx + 1} de {chunkedA4Pages.length}</span>
                  <span>Formato: {badgeDims.label} &bull; {pageStudents.length} unidades nesta folha</span>
                </div>

                {/* Grid of Badges on A4 */}
                <div
                  className="grid grid-cols-2 gap-x-4 gap-y-3 justify-center items-start"
                  style={{ width: '100%' }}
                >
                  {pageStudents.map((s) => {
                    const c = classrooms.find((cl) => cl.id === s.class_id);

                    return (
                      <div
                        key={s.id}
                        style={{ width: badgeDims.width, height: badgeDims.height }}
                        className={`bg-white p-2.5 flex flex-col justify-between relative overflow-hidden select-none box-border ${
                          showCropMarks ? 'border border-dashed border-neutral-400' : 'border border-neutral-300'
                        }`}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-neutral-300 pb-1">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded bg-[#142024] text-white flex items-center justify-center font-bold text-[9px]">
                              EH
                            </div>
                            <div>
                              <div className="font-bold text-[10px] text-neutral-900 tracking-tight leading-none">
                                Escola Horizonte
                              </div>
                              <div className="text-[8px] text-neutral-600 font-mono">
                                Carteirinha Escolar
                              </div>
                            </div>
                          </div>
                          <span className="text-[8px] font-mono font-bold bg-neutral-100 px-1 py-0.2 rounded border border-neutral-300">
                            CR-80
                          </span>
                        </div>

                        {/* Middle */}
                        <div className="flex items-center justify-between gap-2 py-0.5">
                          <div className="flex items-center gap-2">
                            <img
                              src={
                                s.photo_ref ||
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                              }
                              alt=""
                              className="w-13 h-16 rounded object-cover border border-neutral-300"
                            />
                            <div className="space-y-0.5 text-[10px]">
                              <div className="font-bold text-neutral-900 leading-tight">
                                {s.full_name}
                              </div>
                              <div className="text-neutral-600">
                                Turma: <strong>{c?.name || 'Geral'}</strong>
                              </div>
                              <div className="text-neutral-600 font-mono tabular-nums">
                                Matrícula: <strong>{s.enrollment_code}</strong>
                              </div>
                              <div className="text-[8px] text-neutral-500">
                                Validade: 31/12/2026
                              </div>
                            </div>
                          </div>

                          <div className="text-center shrink-0">
                            {qrCodeDataUrls[s.id] && (
                              <img
                                src={qrCodeDataUrls[s.id]}
                                alt="QR Code"
                                className="w-15 h-15 rounded border border-neutral-300 p-0.5 bg-white"
                              />
                            )}
                            <span className="text-[7px] font-mono text-neutral-500 block">
                              TOKEN SEGURO
                            </span>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t border-neutral-300 pt-0.5 flex items-center justify-between text-[8px] text-neutral-500 font-mono">
                          <span>Portaria Escolar Local-First</span>
                          <span>Leitor HID / Óptico</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal to Mark as Printed after dialog */}
      {showConfirmPrintedModal && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-md w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
              <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Confirmar Impressão Realizada
              </h3>
              <button
                onClick={() => setShowConfirmPrintedModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              O trabalho foi enviado para a impressora. Deseja marcar as carteirinhas impressas como <strong>"Impressas"</strong> no banco de dados para tirá-las da lista de pendentes?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200">
              <button
                onClick={() => setShowConfirmPrintedModal(false)}
                className="px-3.5 py-1.5 rounded-lg border border-neutral-300 hover:bg-neutral-50 text-xs font-medium text-neutral-700 cursor-pointer"
              >
                Não marcar agora
              </button>
              <button
                onClick={handleConfirmMarkAsPrinted}
                className="px-3.5 py-1.5 rounded-lg bg-[#0f766e] hover:bg-[#0d5f59] text-white text-xs font-medium transition-colors duration-150 cursor-pointer"
              >
                Sim, marcar como impressas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Modal */}
      {showRevokeModal && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-md w-full p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
              <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-rose-600" />
                Revogar credencial de acesso
              </h3>
              <button
                onClick={() => setShowRevokeModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              Deseja revogar o cartão atual de <strong>{selectedStudent?.full_name}</strong>? O token anterior será invalidado imediatamente na portaria e a carteirinha voltará para a lista de <strong>Pendentes de Impressão</strong>.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => setShowRevokeModal(false)}
                className="px-3.5 py-1.5 rounded-lg border border-neutral-300 hover:bg-neutral-50 text-xs font-medium text-neutral-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleReissueBadge}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-colors duration-150 cursor-pointer"
              >
                Confirmar revogação e reemitir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
