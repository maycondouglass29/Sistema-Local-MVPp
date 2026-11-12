import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Users,
  UserPlus,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  ShieldAlert,
  Download,
  Trash2,
  Plus,
  Eye,
  X,
  Phone,
  LayoutGrid,
  List,
  CreditCard,
  QrCode,
  Calendar,
  HeartPulse,
  UserCheck,
  Copy,
  Check,
  FileText,
  Sparkles,
} from 'lucide-react';
import { localDb } from '../services/localDatabase';
import { Student, ClassRoom } from '../types/database';
import { validateCsvStudentRow } from '../utils/rules';

export const StudentsView: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classrooms, setClassrooms] = useState<ClassRoom[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');

  // Pre-selected as CARDS view by default as requested by user
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

  // Modals
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showCsvModal, setShowCsvModal] = useState<boolean>(false);
  const [showBlockModal, setShowBlockModal] = useState<Student | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<Student | null>(null);
  const [blockReasonInput, setBlockReasonInput] = useState<string>('');
  const [detailQrDataUrl, setDetailQrDataUrl] = useState<string>('');
  const [copiedToken, setCopiedToken] = useState<boolean>(false);

  // Add Student Modal State with Comprehensive Fields
  const [addModalTab, setAddModalTab] = useState<'student' | 'guardian' | 'gate'>('student');
  const [fullName, setFullName] = useState<string>('');
  const [preferredName, setPreferredName] = useState<string>('');
  const [enrollmentCode, setEnrollmentCode] = useState<string>('');
  const [classId, setClassId] = useState<string>('');
  const [birthDate, setBirthDate] = useState<string>('');
  const [documentNumber, setDocumentNumber] = useState<string>('');
  const [photoRef, setPhotoRef] = useState<string>('');

  // Guardian & Emergency fields
  const [guardianName, setGuardianName] = useState<string>('');
  const [guardianRelationship, setGuardianRelationship] = useState<string>('Mãe');
  const [guardianPhone, setGuardianPhone] = useState<string>('');
  const [emergencyPhone, setEmergencyPhone] = useState<string>('');
  const [pickupAuthorizedNames, setPickupAuthorizedNames] = useState<string>('');

  // Gate & Medical fields
  const [validUntil, setValidUntil] = useState<string>('2026-12-31');
  const [medicalNotes, setMedicalNotes] = useState<string>('');
  const [gateNotes, setGateNotes] = useState<string>('');
  const [initialStatus, setInitialStatus] = useState<'active' | 'blocked'>('active');
  const [initialBlockReason, setInitialBlockReason] = useState<string>('');
  const [addError, setAddError] = useState<string | null>(null);

  // Live QR Preview in modal
  const [modalPreviewQr, setModalPreviewQr] = useState<string>('');

  // CSV Import State
  const [csvRawText, setCsvRawText] = useState<string>('');
  const [csvPreviewRows, setCsvPreviewRows] = useState<
    { raw: string[]; valid: boolean; error?: string }[]
  >([]);
  const [csvImportSuccess, setCsvImportSuccess] = useState<string | null>(null);

  const loadData = () => {
    setStudents(localDb.getStudents());
    const rooms = localDb.getClassrooms();
    setClassrooms(rooms);
    if (!classId && rooms.length > 0) {
      setClassId(rooms[0].id);
    }
  };

  useEffect(() => {
    loadData();
    return localDb.subscribe(loadData);
  }, []);

  // Generate next recommended enrollment code when opening add modal
  useEffect(() => {
    if (showAddModal && !enrollmentCode) {
      const year = new Date().getFullYear();
      const nextNum = students.length + 1;
      setEnrollmentCode(`${year}-${String(nextNum).padStart(3, '0')}`);
    }
  }, [showAddModal, students.length]);

  // Generate live QR preview inside add modal
  useEffect(() => {
    const code = enrollmentCode.trim() || '2026-000';
    const sampleToken = `ESCHZ:V1:stu_preview:${code}`;
    QRCode.toDataURL(sampleToken, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 130,
      color: { dark: '#0f766e', light: '#ffffff' },
    })
      .then((url) => setModalPreviewQr(url))
      .catch(() => {});
  }, [enrollmentCode]);

  // Generate QR for detail modal
  useEffect(() => {
    if (showDetailModal) {
      const ident = localDb.getActiveIdentifier(showDetailModal.id);
      const token = ident ? ident.raw_token : `ESCHZ:V1:${showDetailModal.id}:${showDetailModal.enrollment_code}`;
      QRCode.toDataURL(token, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 160,
        color: { dark: '#111827', light: '#ffffff' },
      })
        .then((url) => setDetailQrDataUrl(url))
        .catch(() => {});
    } else {
      setDetailQrDataUrl('');
      setCopiedToken(false);
    }
  }, [showDetailModal]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(12);

  const filteredStudents = students.filter((s) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      s.full_name.toLowerCase().includes(query) ||
      (s.preferred_name && s.preferred_name.toLowerCase().includes(query)) ||
      s.enrollment_code.toLowerCase().includes(query) ||
      (s.document_number && s.document_number.toLowerCase().includes(query));
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchesClass = classFilter === 'all' || s.class_id === classFilter;
    return matchesSearch && matchesStatus && matchesClass;
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, classFilter, pageSize]);

  const totalStudents = filteredStudents.length;
  const totalPages = pageSize === -1 ? 1 : Math.ceil(totalStudents / pageSize) || 1;
  const paginatedStudents = pageSize === -1
    ? filteredStudents
    : filteredStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize);


  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || fullName.trim().length < 3) {
      setAddError('Nome deve ter no mínimo 3 caracteres.');
      setAddModalTab('student');
      return;
    }
    if (!enrollmentCode.trim()) {
      setAddError('Matrícula é obrigatória.');
      setAddModalTab('student');
      return;
    }

    const exists = students.some(
      (s) => s.enrollment_code.toLowerCase() === enrollmentCode.trim().toLowerCase()
    );
    if (exists) {
      setAddError(`A matrícula ${enrollmentCode} já está cadastrada no sistema.`);
      setAddModalTab('student');
      return;
    }

    localDb.addStudent({
      full_name: fullName.trim(),
      preferred_name: preferredName.trim() || undefined,
      enrollment_code: enrollmentCode.trim(),
      class_id: classId || classrooms[0]?.id || 'default_class',
      birth_date: birthDate.trim() || undefined,
      document_number: documentNumber.trim() || undefined,
      photo_ref: photoRef.trim() || undefined,
      guardian_name: guardianName.trim() || undefined,
      guardian_relationship: guardianRelationship || 'Mãe',
      guardian_phone: guardianPhone.trim() || undefined,
      emergency_phone: emergencyPhone.trim() || undefined,
      pickup_authorized_names: pickupAuthorizedNames.trim() || undefined,
      valid_until: validUntil || '2026-12-31',
      medical_notes: medicalNotes.trim() || undefined,
      gate_notes: gateNotes.trim() || undefined,
      status: initialStatus,
      block_reason: initialStatus === 'blocked' ? initialBlockReason || 'Bloqueio preventivo inicial' : undefined,
    });

    // Reset Form
    setShowAddModal(false);
    setFullName('');
    setPreferredName('');
    setEnrollmentCode('');
    setBirthDate('');
    setDocumentNumber('');
    setPhotoRef('');
    setGuardianName('');
    setGuardianRelationship('Mãe');
    setGuardianPhone('');
    setEmergencyPhone('');
    setPickupAuthorizedNames('');
    setMedicalNotes('');
    setGateNotes('');
    setInitialStatus('active');
    setInitialBlockReason('');
    setAddError(null);
    setAddModalTab('student');
  };

  const handleToggleBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showBlockModal) return;

    if (showBlockModal.status === 'blocked') {
      localDb.unblockStudent(showBlockModal.id, blockReasonInput.trim() || 'Desbloqueio regular');
    } else {
      localDb.blockStudent(
        showBlockModal.id,
        blockReasonInput.trim() || 'Bloqueio preventivo de portaria'
      );
    }
    setShowBlockModal(null);
    setBlockReasonInput('');
  };

  const handleDeleteStudent = (studentId: string, studentName: string) => {
    if (
      window.confirm(
        `Deseja realmente inativar o cadastro do aluno "${studentName}"? A credencial deixará de ser aceita na portaria.`
      )
    ) {
      localDb.deleteStudent(studentId);
    }
  };

  const handleCopyToken = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleParseCsv = (text: string) => {
    setCsvRawText(text);
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      setCsvPreviewRows([]);
      return;
    }

    const existingCodes = new Set(students.map((s) => s.enrollment_code.toLowerCase()));
    const previewList: { raw: string[]; valid: boolean; error?: string }[] = [];

    const firstLine = lines[0].toLowerCase();
    const startIndex =
      firstLine.includes('matricula') || firstLine.includes('matrícula') || firstLine.includes('nome')
        ? 1
        : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
      const validation = validateCsvStudentRow(parts, existingCodes);
      if (validation.valid && validation.parsedRow) {
        existingCodes.add(validation.parsedRow.enrollment_code.toLowerCase());
        previewList.push({ raw: parts, valid: true });
      } else {
        previewList.push({ raw: parts, valid: false, error: validation.error });
      }
    }
    setCsvPreviewRows(previewList);
  };

  const handleCommitCsv = () => {
    const validRows = csvPreviewRows.filter((r) => r.valid);
    if (validRows.length === 0) return;

    let importedCount = 0;
    validRows.forEach((row) => {
      const code = row.raw[0];
      const name = row.raw[1];
      const className = row.raw[2];
      const guardian = row.raw[3] || '';
      const phone = row.raw[4] || '';

      let targetClass = classrooms.find(
        (c) => c.name.toLowerCase() === className.toLowerCase()
      );
      if (!targetClass) {
        targetClass = localDb.addClassroom(className, 'Geral', 'morning');
      }

      localDb.addStudent({
        full_name: name,
        enrollment_code: code,
        class_id: targetClass.id,
        guardian_name: guardian,
        guardian_phone: phone,
      });
      importedCount++;
    });

    setCsvImportSuccess(`Sucesso: ${importedCount} alunos importados com credenciais geradas.`);
    setShowCsvModal(false);
    setCsvRawText('');
    setCsvPreviewRows([]);
    setTimeout(() => setCsvImportSuccess(null), 5000);
  };

  const downloadSampleCsv = () => {
    const csvContent =
      'matricula,nome_completo,turma,responsavel,telefone\n' +
      '2026-001,Lucas Silva Santos,1º Ano A,Marcos Silva,(11) 98888-1111\n' +
      '2026-002,Beatriz Almeida Costa,1º Ano A,Renata Almeida,(11) 98888-2222\n' +
      '2026-003,Gabriel Rodrigues Lima,1º Ano A,Cláudio Lima,(11) 98888-3333\n' +
      '2026-004,Mariana Ferreira Souza,1º Ano B,Patrícia Souza,(11) 98888-4444\n' +
      '2026-005,Enzo Santos Oliveira,2º Ano A,Juliana Oliveira,(11) 98888-5555\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_importacao_alunos.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5 select-none">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">
            Cadastro de Alunos
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Cadastros armazenados no banco local SQLite com credenciais únicas de acesso e dados completos de portaria
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCsvModal(true)}
            className="bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-medium px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors duration-150 cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5 text-neutral-500" />
            <span>Carga em massa (.CSV)</span>
          </button>
          <button
            onClick={() => {
              setShowAddModal(true);
              setAddModalTab('student');
            }}
            className="bg-[#0f766e] hover:bg-[#0d5f59] text-white text-xs font-medium px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors duration-150 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo aluno</span>
          </button>
        </div>
      </div>

      {csvImportSuccess && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{csvImportSuccess}</span>
        </div>
      )}

      {/* Control & Filter Bar */}
      <div className="bg-white rounded-xl border border-neutral-200 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por nome, matrícula ou documento..."
              aria-label="Buscar alunos"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-neutral-300 rounded-lg pl-9 pr-3 py-1.5 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[#0f766e] transition-colors duration-150"
            />
          </div>

          {/* Filter by Class */}
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-700 focus:outline-none focus:border-[#0f766e] transition-colors duration-150 cursor-pointer"
          >
            <option value="all">Todas as turmas</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Filter by Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-700 focus:outline-none focus:border-[#0f766e] transition-colors duration-150 cursor-pointer"
          >
            <option value="all">Todos os status</option>
            <option value="active">Liberados</option>
            <option value="blocked">Bloqueados</option>
            <option value="inactive">Inativos</option>
          </select>
        </div>

        {/* Right: View Mode Toggle (Cards vs. List) & Count */}
        <div className="flex items-center gap-3">
          <div className="text-neutral-500 text-xs font-mono tabular-nums">
            {filteredStudents.length} {filteredStudents.length === 1 ? 'aluno listado' : 'alunos listados'}
          </div>

          {/* Segmented Toggle Button */}
          <div className="flex items-center bg-neutral-100 p-0.5 rounded-lg border border-neutral-200">
            <button
              onClick={() => setViewMode('cards')}
              title="Visualização em cards"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/60 font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="Visualização em lista"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/60 font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: CARDS (DEFAULT) */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl border border-neutral-200 p-12 text-center text-neutral-400">
              <Users className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
              <p className="text-xs">Nenhum aluno encontrado para os filtros selecionados.</p>
            </div>
          ) : (
            paginatedStudents.map((s) => {
              const classRoom = classrooms.find((c) => c.id === s.class_id);
              const isBlocked = s.status === 'blocked';
              const isInactive = s.status === 'inactive';

              return (
                <div
                  key={s.id}
                  className={`bg-white rounded-xl border transition-all duration-150 p-4 flex flex-col justify-between hover:shadow-sm ${
                    isBlocked
                      ? 'border-rose-200 bg-rose-50/20'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Card Header: Avatar, Name, Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={
                            s.photo_ref ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                          }
                          alt=""
                          className="w-11 h-11 rounded-lg object-cover border border-neutral-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <h3 className="font-semibold text-neutral-900 text-sm tracking-tight truncate" title={s.full_name}>
                            {s.full_name}
                          </h3>
                          {s.preferred_name && (
                            <p className="text-[11px] text-neutral-500 italic truncate">
                              "{s.preferred_name}"
                            </p>
                          )}
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-medium text-neutral-700 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200 tabular-nums">
                              {s.enrollment_code}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="shrink-0">
                        {isBlocked ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                            Bloqueado
                          </span>
                        ) : isInactive ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-100 border border-neutral-200 text-neutral-600 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                            Inativo
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            Liberado
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Class & Shift Info */}
                    <div className="flex items-center gap-2 pt-1 text-xs">
                      <span className="px-2 py-0.5 rounded bg-neutral-50 border border-neutral-200 text-neutral-700 font-medium text-[11px]">
                        {classRoom?.name || 'Sem turma'}
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        {classRoom?.shift === 'morning' ? 'Manhã' : classRoom?.shift === 'afternoon' ? 'Tarde' : 'Integral'}
                      </span>
                    </div>

                    {/* Guardian & Emergency Phone */}
                    <div className="pt-2 border-t border-neutral-100 text-xs space-y-1">
                      <div className="flex items-center justify-between text-neutral-600">
                        <span className="text-neutral-400 text-[11px]">Responsável:</span>
                        <span className="font-medium text-neutral-800 text-[11px] truncate max-w-[170px]">
                          {s.guardian_name || 'Não cadastrado'}
                        </span>
                      </div>
                      {s.guardian_phone && (
                        <div className="flex items-center justify-between text-neutral-600">
                          <span className="text-neutral-400 text-[11px]">Contato:</span>
                          <span className="font-mono text-[11px] text-neutral-700 tabular-nums flex items-center gap-1">
                            <Phone className="w-2.5 h-2.5 text-neutral-400" />
                            {s.guardian_phone}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Medical Alert / Special Notes if present */}
                    {s.medical_notes && (
                      <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-1.5">
                        <HeartPulse className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{s.medical_notes}</span>
                      </div>
                    )}

                    {/* Authorized Pickup chip if present */}
                    {s.pickup_authorized_names && (
                      <div className="p-2 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-[11px] flex items-start gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-teal-700 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">Autorizado: {s.pickup_authorized_names}</span>
                      </div>
                    )}

                    {/* Block Reason alert if blocked */}
                    {isBlocked && s.block_reason && (
                      <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-start gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                        <span className="line-clamp-2"><strong>Motivo:</strong> {s.block_reason}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Credential Indicator & Actions */}
                  <div className="pt-3 mt-3 border-t border-neutral-100 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[11px] text-neutral-500">
                      <QrCode className="w-3 h-3 text-[#0f766e]" />
                      <span>QR ativo</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setShowDetailModal(s)}
                        title="Ver ficha completa e QR Code"
                        className="p-1.5 rounded-md border border-neutral-200 hover:bg-neutral-50 text-neutral-600 hover:text-neutral-900 transition-colors duration-150 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          setShowBlockModal(s);
                          setBlockReasonInput(s.block_reason || '');
                        }}
                        title={isBlocked ? 'Desbloquear aluno' : 'Bloquear na portaria'}
                        className={`p-1.5 rounded-md border transition-colors duration-150 cursor-pointer ${
                          isBlocked
                            ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                            : 'border-neutral-200 text-neutral-600 hover:text-rose-600 hover:bg-rose-50'
                        }`}
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteStudent(s.id, s.full_name)}
                        title="Inativar cadastro"
                        className="p-1.5 rounded-md border border-neutral-200 hover:bg-rose-50 text-neutral-400 hover:text-rose-600 transition-colors duration-150 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW MODE 2: TABLE (LISTA) */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-500 border-b border-neutral-200 font-medium">
                <tr>
                  <th className="py-2.5 px-4">Estudante</th>
                  <th className="py-2.5 px-4">Matrícula</th>
                  <th className="py-2.5 px-4">Turma</th>
                  <th className="py-2.5 px-4">Status de portaria</th>
                  <th className="py-2.5 px-4">Responsável</th>
                  <th className="py-2.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-neutral-400">
                      Nenhum aluno encontrado para os critérios selecionados.
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((s) => {
                    const classRoom = classrooms.find((c) => c.id === s.class_id);
                    const isBlocked = s.status === 'blocked';
                    const isInactive = s.status === 'inactive';

                    return (
                      <tr key={s.id} className="hover:bg-neutral-50/80 transition-colors duration-150 h-12">
                        <td className="py-2 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                s.photo_ref ||
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
                              }
                              alt=""
                              className="w-8 h-8 rounded-md object-cover border border-neutral-200 shrink-0"
                            />
                            <div>
                              <div className="font-medium text-neutral-900 text-xs">
                                {s.full_name}
                              </div>
                              {s.preferred_name ? (
                                <div className="text-[11px] text-neutral-400 italic">
                                  {s.preferred_name}
                                </div>
                              ) : (
                                <div className="text-[11px] text-neutral-400">
                                  Cadastro local
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-2 px-4 font-mono tabular-nums text-neutral-800">
                          {s.enrollment_code}
                        </td>

                        <td className="py-2 px-4 text-neutral-600">
                          <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200 text-xs">
                            {classRoom?.name || 'Sem turma'}
                          </span>
                        </td>

                        <td className="py-2 px-4">
                          {isBlocked ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-1 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                              Bloqueado
                            </span>
                          ) : isInactive ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 border border-neutral-200 text-neutral-600 flex items-center gap-1 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                              Inativo
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-1 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              Liberado
                            </span>
                          )}
                        </td>

                        <td className="py-2 px-4 text-neutral-600">
                          {s.guardian_name ? (
                            <div>
                              <div className="font-medium text-neutral-900">{s.guardian_name}</div>
                              <div className="text-xs text-neutral-500 font-mono tabular-nums">{s.guardian_phone}</div>
                            </div>
                          ) : (
                            <span className="text-neutral-400">—</span>
                          )}
                        </td>

                        <td className="py-2 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setShowDetailModal(s)}
                              title="Ver ficha do aluno"
                              className="p-1.5 rounded border border-neutral-300 hover:bg-neutral-100 text-neutral-600 transition-colors duration-150 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                setShowBlockModal(s);
                                setBlockReasonInput(s.block_reason || '');
                              }}
                              title={isBlocked ? 'Desbloquear aluno' : 'Bloquear na portaria'}
                              className={`p-1.5 rounded border transition-colors duration-150 cursor-pointer ${
                                isBlocked
                                  ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                                  : 'border-neutral-300 text-neutral-600 hover:text-rose-600 hover:bg-rose-50'
                              }`}
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteStudent(s.id, s.full_name)}
                              title="Inativar aluno"
                              className="p-1.5 rounded border border-neutral-300 hover:bg-rose-50 text-neutral-400 hover:text-rose-600 transition-colors duration-150 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls (Cards & List) */}
      {totalStudents > 0 && (
        <div className="bg-white border border-neutral-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="text-neutral-500">
            Exibindo <strong className="text-neutral-900 font-mono tabular-nums">{pageSize === -1 ? 1 : (currentPage - 1) * pageSize + 1}</strong> a{' '}
            <strong className="text-neutral-900 font-mono tabular-nums">{pageSize === -1 ? totalStudents : Math.min(currentPage * pageSize, totalStudents)}</strong> de{' '}
            <strong className="text-neutral-900 font-mono tabular-nums">{totalStudents}</strong> alunos listados
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5 mr-2">
              <span className="text-neutral-500">Exibir:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-neutral-50 border border-neutral-300 rounded-lg px-2 py-1 text-xs text-neutral-700 cursor-pointer focus:outline-none"
              >
                <option value={12}>12 por página</option>
                <option value={24}>24 por página</option>
                <option value={48}>48 por página</option>
                <option value={-1}>Ver todos ({totalStudents})</option>
              </select>
            </div>

            {/* Pagination Buttons */}
            {pageSize !== -1 && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-2.5 py-1 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium cursor-pointer"
                >
                  Anterior
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((p, idx, arr) => (
                    <React.Fragment key={p}>
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span className="px-1 text-neutral-400 select-none">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(p)}
                        className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer ${
                          currentPage === p
                            ? 'bg-[#0f766e] text-white shadow-2xs'
                            : 'border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700'
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  ))}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-2.5 py-1 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium cursor-pointer"
                >
                  Próxima
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: Cadastrar Novo Aluno (Aprimorado com abas e metadados completos de QR) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-2xl w-full p-6 shadow-xl space-y-4 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div>
                <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#0f766e]" />
                  Cadastrar novo estudante
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Preencha os dados completos para vinculação do token de segurança e leitura rápida no terminal
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {addError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            {/* Modal Segmented Navigation Tabs */}
            <div className="flex items-center gap-1 border-b border-neutral-200 pb-2 text-xs">
              <button
                type="button"
                onClick={() => setAddModalTab('student')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  addModalTab === 'student'
                    ? 'bg-[#0f766e] text-white'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                1. Identificação do Estudante
              </button>
              <button
                type="button"
                onClick={() => setAddModalTab('guardian')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  addModalTab === 'guardian'
                    ? 'bg-[#0f766e] text-white'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                2. Responsáveis & Retirada
              </button>
              <button
                type="button"
                onClick={() => setAddModalTab('gate')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  addModalTab === 'gate'
                    ? 'bg-[#0f766e] text-white'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                3. Portaria & Credencial QR
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleCreateStudent} className="space-y-4 text-xs flex-1 overflow-y-auto pr-1">
              {/* TAB 1: DADOS DO ESTUDANTE */}
              {addModalTab === 'student' && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">
                      Nome completo do estudante *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex.: Mariana Fernandes de Souza"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-[#0f766e]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-neutral-700 mb-1">
                        Nome social / Apelido escolar (opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex.: Mari"
                        value={preferredName}
                        onChange={(e) => setPreferredName(e.target.value)}
                        className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-[#0f766e]"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-neutral-700 mb-1">
                        Turma / Série *
                      </label>
                      <select
                        value={classId}
                        onChange={(e) => setClassId(e.target.value)}
                        className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-[#0f766e] cursor-pointer"
                      >
                        {classrooms.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.shift === 'morning' ? 'Manhã' : c.shift === 'afternoon' ? 'Tarde' : 'Integral'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-medium text-neutral-700">
                          Matrícula escolar *
                        </label>
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="Ex.: 2026-015"
                        value={enrollmentCode}
                        onChange={(e) => setEnrollmentCode(e.target.value)}
                        className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 font-mono tabular-nums text-xs text-neutral-900 focus:outline-none focus:border-[#0f766e]"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-neutral-700 mb-1">
                        Data de nascimento
                      </label>
                      <input
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-[#0f766e]"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-neutral-700 mb-1">
                        Documento (RG / CPF)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex.: 52.345.678-9"
                        value={documentNumber}
                        onChange={(e) => setDocumentNumber(e.target.value)}
                        className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 font-mono text-xs text-neutral-900 focus:outline-none focus:border-[#0f766e]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">
                      Foto do estudante (URL ou foto institucional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/... ou deixe em branco para avatar padrão"
                      value={photoRef}
                      onChange={(e) => setPhotoRef(e.target.value)}
                      className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-[#0f766e]"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: RESPONSÁVEIS E RETIRADA */}
              {addModalTab === 'guardian' && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-neutral-700 mb-1">
                        Nome do responsável legal
                      </label>
                      <input
                        type="text"
                        placeholder="Ex.: Carla Fernandes"
                        value={guardianName}
                        onChange={(e) => setGuardianName(e.target.value)}
                        className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-[#0f766e]"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-neutral-700 mb-1">
                        Grau de parentesco
                      </label>
                      <select
                        value={guardianRelationship}
                        onChange={(e) => setGuardianRelationship(e.target.value)}
                        className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-[#0f766e] cursor-pointer"
                      >
                        <option value="Mãe">Mãe</option>
                        <option value="Pai">Pai</option>
                        <option value="Avó/Avô">Avó / Avô</option>
                        <option value="Tutor Legal">Tutor Legal</option>
                        <option value="Irmão(ã) Maior">Irmão(ã) Maior de Idade</option>
                        <option value="Outro">Outro Responsável</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-neutral-700 mb-1">
                        Telefone principal / WhatsApp
                      </label>
                      <input
                        type="tel"
                        placeholder="Ex.: (11) 98765-4321"
                        value={guardianPhone}
                        onChange={(e) => setGuardianPhone(e.target.value)}
                        className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-xs text-neutral-900 font-mono tabular-nums focus:outline-none focus:border-[#0f766e]"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-neutral-700 mb-1">
                        Telefone de emergência secundário
                      </label>
                      <input
                        type="tel"
                        placeholder="Ex.: (11) 97654-3210"
                        value={emergencyPhone}
                        onChange={(e) => setEmergencyPhone(e.target.value)}
                        className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-xs text-neutral-900 font-mono tabular-nums focus:outline-none focus:border-[#0f766e]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">
                      Pessoas autorizadas a retirar o aluno (Mem0 Context Layer)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ex.: Avó Dona Maria Santos autorizada a buscar às terças e quintas; Tio Carlos Santos aos sábados."
                      value={pickupAuthorizedNames}
                      onChange={(e) => setPickupAuthorizedNames(e.target.value)}
                      className="w-full bg-white border border-neutral-300 rounded-lg p-2.5 text-xs text-neutral-900 focus:outline-none focus:border-[#0f766e]"
                    />
                    <p className="text-[11px] text-neutral-400 mt-1">
                      Essa informação é exibida instantaneamente na tela da portaria durante o scan de saída.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 3: PORTARIA, SAÚDE & CREDENCIAL QR */}
              {addModalTab === 'gate' && (
                <div className="space-y-4 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-neutral-700 mb-1">
                        Validade da credencial escolar
                      </label>
                      <input
                        type="date"
                        value={validUntil}
                        onChange={(e) => setValidUntil(e.target.value)}
                        className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-[#0f766e]"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-neutral-700 mb-1">
                        Status inicial de acesso
                      </label>
                      <select
                        value={initialStatus}
                        onChange={(e) => setInitialStatus(e.target.value as 'active' | 'blocked')}
                        className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-[#0f766e] cursor-pointer"
                      >
                        <option value="active">Liberado (Normal)</option>
                        <option value="blocked">Bloqueado preventivamente</option>
                      </select>
                    </div>
                  </div>

                  {initialStatus === 'blocked' && (
                    <div>
                      <label className="block font-medium text-rose-700 mb-1">
                        Motivo do bloqueio preventivo *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex.: Restrição judicial de custódia / Falta de documentação de transporte"
                        value={initialBlockReason}
                        onChange={(e) => setInitialBlockReason(e.target.value)}
                        className="w-full bg-white border border-rose-300 rounded-lg px-3 py-2 text-xs text-rose-900 focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">
                      Alertas de saúde / Restrições médicas (Mem0)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex.: Alergia severa a amendoim / Intolerância à lactose / Asma crônica"
                      value={medicalNotes}
                      onChange={(e) => setMedicalNotes(e.target.value)}
                      className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-[#0f766e]"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">
                      Observações operacionais de portaria
                    </label>
                    <input
                      type="text"
                      placeholder="Ex.: Autorizado a sair desacompanhado após 17h / Usa van escolar particular"
                      value={gateNotes}
                      onChange={(e) => setGateNotes(e.target.value)}
                      className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-[#0f766e]"
                    />
                  </div>

                  {/* QR Credential Preview Box */}
                  <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center gap-4">
                    {modalPreviewQr ? (
                      <img
                        src={modalPreviewQr}
                        alt="Preview QR Code"
                        className="w-20 h-20 rounded-lg border border-neutral-300 bg-white p-1 shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-neutral-200 rounded-lg flex items-center justify-center shrink-0">
                        <QrCode className="w-8 h-8 text-neutral-400" />
                      </div>
                    )}
                    <div className="space-y-1 min-w-0">
                      <div className="text-xs font-semibold text-neutral-900 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#0f766e]" />
                        <span>Credencial criptografada pronta para emissão</span>
                      </div>
                      <p className="text-[11px] text-neutral-500 leading-relaxed">
                        Ao salvar, o sistema gera o identificador <code className="text-[#0f766e] font-mono font-medium">ESCHZ:V1</code> vinculado à matrícula <strong className="font-mono">{enrollmentCode || '...'}</strong> com validação de leitura offline em &lt;15ms.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Navigation & Submit Controls */}
              <div className="pt-3 border-t border-neutral-200 flex items-center justify-between">
                <div>
                  {addModalTab === 'guardian' && (
                    <button
                      type="button"
                      onClick={() => setAddModalTab('student')}
                      className="px-3 py-1.5 rounded-lg border border-neutral-300 text-xs font-medium text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                    >
                      Voltar: Identificação
                    </button>
                  )}
                  {addModalTab === 'gate' && (
                    <button
                      type="button"
                      onClick={() => setAddModalTab('guardian')}
                      className="px-3 py-1.5 rounded-lg border border-neutral-300 text-xs font-medium text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                    >
                      Voltar: Responsáveis
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-3.5 py-1.5 rounded-lg border border-neutral-300 text-xs font-medium text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                  >
                    Cancelar
                  </button>

                  {addModalTab === 'student' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!fullName.trim() || !enrollmentCode.trim()) {
                          setAddError('Preencha ao menos o nome completo e a matrícula.');
                          return;
                        }
                        setAddError(null);
                        setAddModalTab('guardian');
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-[#0f766e] hover:bg-[#0d5f59] text-white text-xs font-medium transition-colors cursor-pointer"
                    >
                      Avançar: Responsáveis
                    </button>
                  )}

                  {addModalTab === 'guardian' && (
                    <button
                      type="button"
                      onClick={() => setAddModalTab('gate')}
                      className="px-3.5 py-1.5 rounded-lg bg-[#0f766e] hover:bg-[#0d5f59] text-white text-xs font-medium transition-colors cursor-pointer"
                    >
                      Avançar: Portaria & QR
                    </button>
                  )}

                  {addModalTab === 'gate' && (
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-[#0f766e] hover:bg-[#0d5f59] text-white text-xs font-semibold transition-colors duration-150 cursor-pointer shadow-xs"
                    >
                      Concluir e salvar aluno
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Carga em Massa via CSV */}
      {showCsvModal && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-2xl w-full p-5 shadow-lg space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
              <div>
                <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-[#0f766e]" />
                  Importação em massa via CSV
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Carregamento de cadastros escolares diretamente para o banco local.
                </p>
              </div>
              <button
                onClick={() => setShowCsvModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span>Colunas: <code className="font-mono tabular-nums text-neutral-700">matricula, nome, turma, responsavel, telefone</code></span>
              <button
                type="button"
                onClick={downloadSampleCsv}
                className="text-xs font-medium text-[#0f766e] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar modelo CSV</span>
              </button>
            </div>

            <div className="space-y-1">
              <textarea
                rows={4}
                value={csvRawText}
                onChange={(e) => handleParseCsv(e.target.value)}
                placeholder="2026-001,Lucas Silva Santos,1º Ano A,Marcos Silva,(11) 98888-1111&#10;2026-002,Beatriz Almeida Costa,1º Ano A,Renata Almeida,(11) 98888-2222"
                className="w-full bg-neutral-50 border border-neutral-300 rounded-lg p-2.5 text-xs font-mono text-neutral-900 focus:outline-none focus:border-[#0f766e]"
              />
            </div>

            {/* Validation Preview Table */}
            {csvPreviewRows.length > 0 && (
              <div className="space-y-1.5 flex-1 overflow-y-auto">
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span>Pré-visualização:</span>
                  <span>
                    {csvPreviewRows.filter((r) => r.valid).length} válidos / {csvPreviewRows.filter((r) => !r.valid).length} com inconsistência
                  </span>
                </div>

                <div className="border border-neutral-200 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-neutral-50 text-neutral-500 border-b border-neutral-200 font-medium">
                      <tr>
                        <th className="py-1.5 px-3">Status</th>
                        <th className="py-1.5 px-3">Matrícula</th>
                        <th className="py-1.5 px-3">Nome</th>
                        <th className="py-1.5 px-3">Turma</th>
                        <th className="py-1.5 px-3">Detalhe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {csvPreviewRows.map((row, idx) => (
                        <tr key={idx} className={row.valid ? 'bg-white' : 'bg-rose-50/50'}>
                          <td className="py-1.5 px-3">
                            {row.valid ? (
                              <span className="text-emerald-600 font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Válido
                              </span>
                            ) : (
                              <span className="text-rose-600 font-medium flex items-center gap-1">
                                <XCircle className="w-3.5 h-3.5" /> Erro
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 px-3 font-mono tabular-nums font-medium text-neutral-900">{row.raw[0]}</td>
                          <td className="py-1.5 px-3 text-neutral-900">{row.raw[1]}</td>
                          <td className="py-1.5 px-3 text-neutral-600">{row.raw[2]}</td>
                          <td className="py-1.5 px-3 text-neutral-500">
                            {row.valid ? 'Pronto para importar' : <span className="text-rose-600">{row.error}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-neutral-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowCsvModal(false)}
                className="px-3.5 py-1.5 rounded-lg border border-neutral-300 hover:bg-neutral-50 text-xs font-medium text-neutral-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={csvPreviewRows.filter((r) => r.valid).length === 0}
                onClick={handleCommitCsv}
                className="px-3.5 py-1.5 rounded-lg bg-[#0f766e] hover:bg-[#0d5f59] disabled:opacity-50 text-white text-xs font-medium transition-colors duration-150 cursor-pointer"
              >
                Confirmar importação ({csvPreviewRows.filter((r) => r.valid).length} registros)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Ficha Detalhada do Aluno com QR Code Integrado */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-lg w-full p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
              <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0f766e]" />
                Ficha completa do estudante
              </h3>
              <button
                onClick={() => setShowDetailModal(null)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <img
                src={
                  showDetailModal.photo_ref ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                }
                alt=""
                className="w-16 h-16 rounded-xl object-cover border border-neutral-200 shrink-0"
              />
              <div className="min-w-0">
                <h4 className="text-base font-semibold text-neutral-900 truncate">
                  {showDetailModal.full_name}
                </h4>
                {showDetailModal.preferred_name && (
                  <p className="text-xs text-neutral-500 italic">
                    Nome social: {showDetailModal.preferred_name}
                  </p>
                )}
                <div className="text-xs font-mono tabular-nums text-neutral-600 mt-0.5">
                  Matrícula: <strong>{showDetailModal.enrollment_code}</strong>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  {showDetailModal.status === 'blocked' ? (
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                      Acesso bloqueado
                    </span>
                  ) : showDetailModal.status === 'inactive' ? (
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200">
                      Matrícula inativa
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Acesso liberado
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200">
                    {classrooms.find((c) => c.id === showDetailModal.class_id)?.name || 'Sem turma'}
                  </span>
                </div>
              </div>
            </div>

            {/* Credencial QR Code Box */}
            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center gap-4">
              {detailQrDataUrl ? (
                <img
                  src={detailQrDataUrl}
                  alt="QR Code"
                  className="w-24 h-24 rounded-lg border border-neutral-300 bg-white p-1.5 shrink-0"
                />
              ) : (
                <div className="w-24 h-24 bg-neutral-200 rounded-lg flex items-center justify-center shrink-0">
                  <QrCode className="w-8 h-8 text-neutral-400" />
                </div>
              )}
              <div className="space-y-1.5 min-w-0">
                <div className="text-xs font-semibold text-neutral-900 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-[#0f766e]" />
                  <span>Credencial de Leitura Rápida</span>
                </div>
                <p className="text-[11px] text-neutral-500 font-mono break-all line-clamp-2">
                  {localDb.getActiveIdentifier(showDetailModal.id)?.raw_token || `ESCHZ:V1:${showDetailModal.id}:${showDetailModal.enrollment_code}`}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyToken(
                      localDb.getActiveIdentifier(showDetailModal.id)?.raw_token ||
                        `ESCHZ:V1:${showDetailModal.id}:${showDetailModal.enrollment_code}`
                    )
                  }
                  className="text-[11px] text-[#0f766e] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                >
                  {copiedToken ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedToken ? 'Token copiado!' : 'Copiar token de teste'}</span>
                </button>
              </div>
            </div>

            {/* Information Grid */}
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2 text-xs text-neutral-700">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Responsável legal:</span>
                <span className="font-medium text-neutral-900">
                  {showDetailModal.guardian_name || 'Não informado'} {showDetailModal.guardian_relationship ? `(${showDetailModal.guardian_relationship})` : ''}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Telefone do responsável:</span>
                <span className="font-mono tabular-nums text-neutral-800">
                  {showDetailModal.guardian_phone || 'Não informado'}
                </span>
              </div>
              {showDetailModal.emergency_phone && (
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Telefone de emergência:</span>
                  <span className="font-mono tabular-nums text-neutral-800">
                    {showDetailModal.emergency_phone}
                  </span>
                </div>
              )}
              {showDetailModal.birth_date && (
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Data de nascimento:</span>
                  <span className="font-mono tabular-nums text-neutral-800">
                    {showDetailModal.birth_date}
                  </span>
                </div>
              )}
              {showDetailModal.document_number && (
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Documento (RG/CPF):</span>
                  <span className="font-mono tabular-nums text-neutral-800">
                    {showDetailModal.document_number}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Validade da credencial:</span>
                <span className="font-mono tabular-nums text-neutral-800">
                  {showDetailModal.valid_until || '2026-12-31'}
                </span>
              </div>

              {showDetailModal.pickup_authorized_names && (
                <div className="pt-2 border-t border-neutral-200 text-teal-800">
                  <strong>Pessoas autorizadas a retirar:</strong> {showDetailModal.pickup_authorized_names}
                </div>
              )}

              {showDetailModal.medical_notes && (
                <div className="pt-2 border-t border-neutral-200 text-amber-800">
                  <strong>Avisos médicos / Alergias:</strong> {showDetailModal.medical_notes}
                </div>
              )}

              {showDetailModal.gate_notes && (
                <div className="pt-2 border-t border-neutral-200 text-neutral-700">
                  <strong>Instruções de portaria:</strong> {showDetailModal.gate_notes}
                </div>
              )}

              {showDetailModal.block_reason && (
                <div className="pt-2 border-t border-neutral-200 text-rose-700">
                  <strong>Motivo do bloqueio:</strong> {showDetailModal.block_reason}
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                onClick={() => setShowDetailModal(null)}
                className="px-4 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-xs font-medium text-neutral-700 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Bloqueio / Desbloqueio com Justificativa */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-md w-full p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
              <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                {showBlockModal.status === 'blocked' ? 'Desbloquear aluno' : 'Bloquear acesso na portaria'}
              </h3>
              <button
                onClick={() => setShowBlockModal(null)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-600">
              {showBlockModal.status === 'blocked'
                ? `Confirmar liberação de acesso para o aluno ${showBlockModal.full_name}?`
                : `Ao bloquear ${showBlockModal.full_name}, tentativas de scan na portaria dispararão aviso sonoro de bloqueio.`}
            </p>

            <form onSubmit={handleToggleBlock} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 mb-1">
                  Justificativa administrativa
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ex.: Pendência de autorização de saída / Restrição informada pela coordenação."
                  value={blockReasonInput}
                  onChange={(e) => setBlockReasonInput(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg p-2 text-xs text-neutral-900 focus:outline-none focus:border-[#0f766e]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setShowBlockModal(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-neutral-300 hover:bg-neutral-50 text-xs font-medium text-neutral-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-3.5 py-1.5 rounded-lg text-white text-xs font-medium transition-colors duration-150 cursor-pointer ${
                    showBlockModal.status === 'blocked'
                      ? 'bg-[#0f766e] hover:bg-[#0d5f59]'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {showBlockModal.status === 'blocked' ? 'Confirmar desbloqueio' : 'Confirmar bloqueio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
