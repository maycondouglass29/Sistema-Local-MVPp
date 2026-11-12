/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Download,
  Search,
  CheckCircle2,
  Edit3,
  Calendar,
  Printer,
  X,
  RotateCcw,
  Plus,
  Eye,
  Clock,
  User,
  ShieldCheck,
  FileText,
  ChevronLeft,
  ChevronRight,
  Table as TableIcon,
  LayoutGrid,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { localDb } from '../services/localDatabase';
import { AttendanceEvent, Student } from '../types/database';
import {
  filterAttendanceEvents,
  calculateReportSummary,
  ReportFilterCriteria,
} from '../utils/rules';

export const AttendanceHistoryView: React.FC = () => {
  const [events, setEvents] = useState<AttendanceEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const todayIso = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState<string>(todayIso);
  const [endDate, setEndDate] = useState<string>(todayIso);
  const [datePreset, setDatePreset] = useState<string>('today');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modals State
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [inspectingEvent, setInspectingEvent] = useState<AttendanceEvent | null>(null);
  const [selectedEventForCorrection, setSelectedEventForCorrection] = useState<AttendanceEvent | null>(null);
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [correctionError, setCorrectionError] = useState<string | null>(null);
  const [correctionSuccess, setCorrectionSuccess] = useState<string | null>(null);
  const [showPdfModal, setShowPdfModal] = useState<boolean>(false);

  // A4 Printable Report Options
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);
  const [includeNotes, setIncludeNotes] = useState<boolean>(true);
  const [reportOrientation, setReportOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Manual Attendance Form State
  const [manualStudentId, setManualStudentId] = useState<string>('');
  const [manualEventType, setManualEventType] = useState<'entry' | 'exit'>('entry');
  const [manualDate, setManualDate] = useState<string>(todayIso);
  const [manualTime, setManualTime] = useState<string>(
    new Date().toTimeString().slice(0, 5)
  );
  const [manualReason, setManualReason] = useState<string>('');
  const [manualGuardianName, setManualGuardianName] = useState<string>('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSuccess, setManualSuccess] = useState<string | null>(null);

  const students = localDb.getStudents();
  const classrooms = localDb.getClassrooms();
  const school = localDb.getSchool();
  const currentOperator = localDb.currentOperator;

  const loadEvents = () => {
    setEvents(localDb.getAttendanceEvents());
  };

  useEffect(() => {
    loadEvents();
    return localDb.subscribe(loadEvents);
  }, []);

  const handleApplyPreset = (preset: string) => {
    setDatePreset(preset);
    setCurrentPage(1);
    const now = new Date();

    if (preset === 'today') {
      const d = now.toISOString().slice(0, 10);
      setStartDate(d);
      setEndDate(d);
    } else if (preset === 'yesterday') {
      const y = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      setStartDate(y);
      setEndDate(y);
    } else if (preset === 'week') {
      const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      setStartDate(past7);
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      setStartDate(firstDay);
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  const criteria: ReportFilterCriteria = {
    startDate,
    endDate,
    classId: classFilter,
    eventType: typeFilter,
    searchQuery,
  };

  const filteredEvents = useMemo(() => {
    return filterAttendanceEvents(events, students, criteria);
  }, [events, students, criteria]);

  const summaryStats = useMemo(() => {
    return calculateReportSummary(filteredEvents);
  }, [filteredEvents]);

  // Pagination calculation
  const totalItems = filteredEvents.length;
  const totalPages = pageSize === -1 ? 1 : Math.ceil(totalItems / pageSize) || 1;

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedEvents = useMemo(() => {
    if (pageSize === -1) return filteredEvents;
    const start = (currentPage - 1) * pageSize;
    return filteredEvents.slice(start, start + pageSize);
  }, [filteredEvents, currentPage, pageSize]);

  // Handlers for Manual Attendance
  const handleOpenManualModal = () => {
    setManualStudentId(students.length > 0 ? students[0].id : '');
    setManualEventType('entry');
    setManualDate(new Date().toISOString().slice(0, 10));
    setManualTime(new Date().toTimeString().slice(0, 5));
    setManualReason('');
    setManualGuardianName('');
    setManualError(null);
    setShowManualModal(true);
  };

  const handleSubmitManualAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualStudentId) {
      setManualError('Selecione um estudante para registrar a frequência.');
      return;
    }
    if (!manualReason.trim() || manualReason.trim().length < 4) {
      setManualError('Informe uma justificativa válida com no mínimo 4 caracteres.');
      return;
    }

    try {
      const occurrenceDateTime = `${manualDate}T${manualTime}:00`;
      const created = localDb.recordManualAttendance({
        studentId: manualStudentId,
        eventType: manualEventType,
        occurredAt: occurrenceDateTime,
        reason: manualReason.trim(),
        guardianName: manualGuardianName.trim() || undefined,
      });

      setManualSuccess(
        `Frequência registrada com sucesso para o aluno (#${created.id.slice(0, 8)}).`
      );
      setShowManualModal(false);
      setTimeout(() => setManualSuccess(null), 4000);
    } catch (err) {
      setManualError(String(err));
    }
  };

  // Handlers for Correction (RF-05 Non-Destructive)
  const handleOpenCorrection = (event: AttendanceEvent) => {
    setSelectedEventForCorrection(event);
    setCorrectionReason('');
    setCorrectionError(null);
  };

  const handleSubmitCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventForCorrection) return;

    if (!correctionReason.trim() || correctionReason.trim().length < 8) {
      setCorrectionError('A justificativa de retificação deve conter no mínimo 8 caracteres.');
      return;
    }

    try {
      const correctionEvent = localDb.commitCorrection(
        selectedEventForCorrection.id,
        correctionReason.trim()
      );
      setCorrectionSuccess(
        `Retificação registrada com sucesso no registro (#${correctionEvent.id.slice(0, 8)}).`
      );
      setSelectedEventForCorrection(null);
      setCorrectionReason('');
      setCorrectionError(null);
      if (inspectingEvent?.id === selectedEventForCorrection.id) {
        setInspectingEvent(null);
      }
      setTimeout(() => setCorrectionSuccess(null), 4000);
    } catch (err) {
      setCorrectionError(String(err));
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'ID Evento',
      'Data/Hora',
      'Matrícula',
      'Aluno',
      'Turma',
      'Tipo',
      'Origem',
      'Operador',
      'Observação / Justificativa',
    ];

    const rows = filteredEvents.map((ev) => {
      const stu = students.find((s) => s.id === ev.student_id);
      const c = stu ? classrooms.find((cl) => cl.id === stu.class_id) : null;
      return [
        ev.id,
        ev.occurred_at_device,
        stu ? stu.enrollment_code : 'N/A',
        stu ? `"${stu.full_name}"` : 'Desconhecido',
        c ? `"${c.name}"` : 'N/A',
        ev.event_type,
        ev.source,
        ev.operator_id,
        ev.notes || ev.correction_reason ? `"${ev.notes || ev.correction_reason}"` : '',
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_frequencia_${startDate || 'inicio'}_ate_${endDate || 'fim'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 tracking-tight flex items-center gap-2">
            Histórico de Frequência
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Auditoria imutável de entradas, saídas e retificações de portaria com suporte a lançamentos manuais
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center bg-white border border-neutral-300 rounded-lg p-0.5 shadow-2xs">
            <button
              onClick={() => setViewMode('table')}
              title="Visualizar em Tabela"
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors duration-150 cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-neutral-100 text-neutral-900 font-semibold'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tabela</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              title="Visualizar em Linha do Tempo / Cards"
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors duration-150 cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-neutral-100 text-neutral-900 font-semibold'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Linha do Tempo</span>
            </button>
          </div>

          <button
            onClick={handleExportCsv}
            className="bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-medium px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors duration-150 cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-neutral-500" />
            <span className="hidden md:inline">Exportar</span> CSV
          </button>

          <button
            onClick={() => setShowPdfModal(true)}
            className="bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-medium px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors duration-150 cursor-pointer shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-neutral-500" />
            <span className="hidden md:inline">Imprimir</span>
          </button>

          <button
            onClick={handleOpenManualModal}
            className="bg-[#0f766e] hover:bg-[#0d5f59] text-white text-xs font-medium px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors duration-150 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Registrar frequência manual</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {manualSuccess && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{manualSuccess}</span>
        </div>
      )}

      {correctionSuccess && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{correctionSuccess}</span>
        </div>
      )}

      {/* Filter Panel */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-3 shadow-2xs">
        {/* Preset Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-2.5 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-500 font-medium mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#0f766e]" />
              Período:
            </span>
            {[
              { id: 'today', label: 'Hoje' },
              { id: 'yesterday', label: 'Ontem' },
              { id: 'week', label: 'Últimos 7 dias' },
              { id: 'month', label: 'Este mês' },
              { id: 'all', label: 'Todo o histórico' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => handleApplyPreset(p.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors duration-150 cursor-pointer ${
                  datePreset === p.id
                    ? 'bg-[#0f766e] text-white'
                    : 'bg-neutral-50 text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <span className="text-xs font-mono tabular-nums text-neutral-500">
            {filteredEvents.length} {filteredEvents.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        {/* Detailed Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              Data inicial
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset('custom');
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-[#0f766e]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              Data final
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDatePreset('custom');
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-[#0f766e]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              Filtrar por turma
            </label>
            <select
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 focus:outline-none focus:border-[#0f766e]"
            >
              <option value="all">Todas as turmas</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              Tipo de evento
            </label>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 focus:outline-none focus:border-[#0f766e]"
            >
              <option value="all">Todos os tipos</option>
              <option value="entry">Apenas entradas</option>
              <option value="exit">Apenas saídas</option>
              <option value="correction">Apenas retificações</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              Buscar estudante
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Nome ou matrícula..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-white border border-neutral-300 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[#0f766e]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-neutral-200 p-3.5 space-y-1 shadow-2xs">
          <div className="text-xs font-medium text-neutral-500">Total de registros</div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-neutral-900">
            {summaryStats.totalRecords}
          </div>
          <div className="text-[11px] text-neutral-400">Armazenados no SQLite Local</div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-3.5 space-y-1 shadow-2xs">
          <div className="text-xs font-medium text-neutral-500">Entradas</div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-emerald-700">
            {summaryStats.totalEntries}
          </div>
          <div className="text-[11px] text-neutral-400">Check-in de alunos</div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-3.5 space-y-1 shadow-2xs">
          <div className="text-xs font-medium text-neutral-500">Saídas</div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-amber-700">
            {summaryStats.totalExits}
          </div>
          <div className="text-[11px] text-neutral-400">Check-out de alunos</div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-3.5 space-y-1 shadow-2xs">
          <div className="text-xs font-medium text-neutral-500">Retificações (RF-05)</div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-neutral-800">
            {summaryStats.totalCorrections}
          </div>
          <div className="text-[11px] text-neutral-400">Ajustes manuais auditados</div>
        </div>
      </div>

      {/* Main Content Area: Table vs Cards */}
      {viewMode === 'table' ? (
        /* Events Table */
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-500 border-b border-neutral-200 font-medium">
                <tr>
                  <th className="py-2.5 px-4">Data / Hora</th>
                  <th className="py-2.5 px-4">Estudante</th>
                  <th className="py-2.5 px-4">Matrícula</th>
                  <th className="py-2.5 px-4">Turma</th>
                  <th className="py-2.5 px-4">Tipo</th>
                  <th className="py-2.5 px-4">Origem</th>
                  <th className="py-2.5 px-4">Operador</th>
                  <th className="py-2.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {paginatedEvents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-neutral-400">
                      Nenhum evento registrado no intervalo selecionado.
                    </td>
                  </tr>
                ) : (
                  paginatedEvents.map((ev) => {
                    const stu = students.find((s) => s.id === ev.student_id);
                    const c = stu ? classrooms.find((cl) => cl.id === stu.class_id) : null;
                    const isEntry = ev.event_type === 'entry';
                    const isExit = ev.event_type === 'exit';
                    const isCorrection = ev.event_type === 'correction';

                    return (
                      <tr
                        key={ev.id}
                        className="hover:bg-neutral-50/80 transition-colors duration-150 h-12"
                      >
                        <td className="py-2 px-4 font-mono tabular-nums text-neutral-600 whitespace-nowrap">
                          {new Date(ev.occurred_at_device).toLocaleString('pt-BR')}
                        </td>

                        <td className="py-2 px-4 font-medium text-neutral-900">
                          <div className="flex items-center gap-2">
                            {stu?.photo_ref ? (
                              <img
                                src={stu.photo_ref}
                                alt={stu.full_name}
                                className="w-7 h-7 rounded-full object-cover border border-neutral-200 shrink-0"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center font-bold text-[10px] shrink-0">
                                {stu?.full_name?.slice(0, 2).toUpperCase() || 'AL'}
                              </div>
                            )}
                            <div className="truncate max-w-[200px]">
                              <div>{stu?.full_name || 'Estudante não identificado'}</div>
                              {ev.notes && (
                                <div className="text-[10px] text-neutral-400 truncate italic">
                                  {ev.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-2 px-4 font-mono tabular-nums text-neutral-700">
                          {stu?.enrollment_code || '—'}
                        </td>

                        <td className="py-2 px-4 text-neutral-600">
                          {c?.name || 'Geral'}
                        </td>

                        <td className="py-2 px-4">
                          {isEntry ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-1 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              Entrada
                            </span>
                          ) : isExit ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 border border-amber-200 text-amber-700 flex items-center gap-1 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Saída
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 border border-neutral-200 text-neutral-700 flex items-center gap-1 w-fit">
                              <RotateCcw className="w-3 h-3 text-neutral-500" />
                              Retificação
                            </span>
                          )}
                        </td>

                        <td className="py-2 px-4 font-mono tabular-nums text-neutral-500 uppercase text-[10px]">
                          <span className="px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-200">
                            {ev.source}
                          </span>
                        </td>

                        <td className="py-2 px-4 font-mono tabular-nums text-neutral-500 text-[11px]">
                          {ev.operator_id}
                        </td>

                        <td className="py-2 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setInspectingEvent(ev)}
                              title="Ver auditoria e detalhes imutáveis"
                              className="p-1.5 rounded border border-neutral-200 hover:bg-neutral-100 text-neutral-600 transition-colors duration-150 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {!isCorrection && (
                              <button
                                onClick={() => handleOpenCorrection(ev)}
                                title="Criar retificação justificada para este evento (RF-05)"
                                className="p-1.5 rounded border border-neutral-200 hover:bg-neutral-100 text-neutral-600 transition-colors duration-150 cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-[#0f766e]" />
                              </button>
                            )}
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
      ) : (
        /* Timeline / Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {paginatedEvents.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl border border-neutral-200 p-12 text-center text-neutral-400">
              Nenhum evento registrado no intervalo selecionado.
            </div>
          ) : (
            paginatedEvents.map((ev) => {
              const stu = students.find((s) => s.id === ev.student_id);
              const c = stu ? classrooms.find((cl) => cl.id === stu.class_id) : null;
              const isEntry = ev.event_type === 'entry';
              const isExit = ev.event_type === 'exit';
              const isCorrection = ev.event_type === 'correction';

              return (
                <div
                  key={ev.id}
                  className="bg-white rounded-xl border border-neutral-200 p-4 space-y-3 hover:border-neutral-300 transition-all shadow-2xs flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    {/* Header: Student & Event Type */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        {stu?.photo_ref ? (
                          <img
                            src={stu.photo_ref}
                            alt={stu.full_name}
                            className="w-10 h-10 rounded-full object-cover border border-neutral-200 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {stu?.full_name?.slice(0, 2).toUpperCase() || 'AL'}
                          </div>
                        )}
                        <div>
                          <div className="text-xs font-semibold text-neutral-900 leading-snug">
                            {stu?.full_name || 'Estudante não identificado'}
                          </div>
                          <div className="text-[11px] text-neutral-500 font-mono">
                            {stu?.enrollment_code} &bull; {c?.name || 'Geral'}
                          </div>
                        </div>
                      </div>

                      {isEntry ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-1 shrink-0">
                          <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                          Entrada
                        </span>
                      ) : isExit ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 border border-amber-200 text-amber-700 flex items-center gap-1 shrink-0">
                          <ArrowUpRight className="w-3 h-3 text-amber-500" />
                          Saída
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 border border-neutral-200 text-neutral-700 flex items-center gap-1 shrink-0">
                          <RotateCcw className="w-3 h-3 text-neutral-500" />
                          Retificação
                        </span>
                      )}
                    </div>

                    {/* Event Timestamp and Source */}
                    <div className="flex items-center justify-between text-xs text-neutral-500 pt-1 border-t border-neutral-100">
                      <span className="font-mono tabular-nums text-neutral-600 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-neutral-400" />
                        {new Date(ev.occurred_at_device).toLocaleTimeString('pt-BR')} &bull;{' '}
                        {new Date(ev.occurred_at_device).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-neutral-50 border border-neutral-200 font-mono text-[10px] uppercase">
                        {ev.source}
                      </span>
                    </div>

                    {/* Justification / Notes badge */}
                    {(ev.notes || ev.correction_reason) && (
                      <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-2 text-[11px] text-neutral-700 space-y-0.5">
                        <div className="font-medium text-neutral-900 text-[10px] uppercase tracking-wide">
                          Justificativa / Observação:
                        </div>
                        <div className="italic text-neutral-600">
                          "{ev.notes || ev.correction_reason}"
                        </div>
                        {ev.guardian_name && (
                          <div className="text-[10px] text-neutral-500 pt-0.5">
                            Autorizado por: <strong>{ev.guardian_name}</strong>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Actions Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-xs">
                    <span className="font-mono text-[11px] text-neutral-400">
                      Op: {ev.operator_id}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setInspectingEvent(ev)}
                        className="px-2 py-1 rounded border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3 h-3 text-neutral-500" />
                        Detalhes
                      </button>
                      {!isCorrection && (
                        <button
                          onClick={() => handleOpenCorrection(ev)}
                          className="px-2 py-1 rounded border border-neutral-200 hover:bg-neutral-50 text-[#0f766e] text-xs flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          Retificar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Pagination Footer */}
      {totalItems > 0 && (
        <div className="bg-white rounded-xl border border-neutral-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-600 shadow-2xs">
          <div className="flex items-center gap-2">
            <span>
              Mostrando{' '}
              <strong className="text-neutral-900 font-mono">
                {pageSize === -1
                  ? 1
                  : Math.min((currentPage - 1) * pageSize + 1, totalItems)}
              </strong>{' '}
              a{' '}
              <strong className="text-neutral-900 font-mono">
                {pageSize === -1
                  ? totalItems
                  : Math.min(currentPage * pageSize, totalItems)}
              </strong>{' '}
              de <strong className="text-neutral-900 font-mono">{totalItems}</strong> eventos
            </span>

            <span className="text-neutral-300">|</span>

            <div className="flex items-center gap-1.5">
              <span>Por página:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-neutral-300 rounded px-1.5 py-0.5 text-xs text-neutral-800 focus:outline-none focus:border-[#0f766e]"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={-1}>Todos</option>
              </select>
            </div>
          </div>

          {pageSize !== -1 && totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded border border-neutral-300 hover:bg-neutral-50 disabled:opacity-30 disabled:pointer-events-none text-neutral-700 transition-colors cursor-pointer"
                title="Página anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => {
                  return (
                    p === 1 ||
                    p === totalPages ||
                    Math.abs(p - currentPage) <= 1
                  );
                })
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1];
                  const hasGap = prev && p - prev > 1;

                  return (
                    <React.Fragment key={p}>
                      {hasGap && <span className="px-1 text-neutral-400">...</span>}
                      <button
                        onClick={() => setCurrentPage(p)}
                        className={`w-7 h-7 rounded text-xs font-mono tabular-nums transition-colors cursor-pointer ${
                          currentPage === p
                            ? 'bg-[#0f766e] text-white font-semibold'
                            : 'border border-neutral-300 hover:bg-neutral-50 text-neutral-700'
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded border border-neutral-300 hover:bg-neutral-50 disabled:opacity-30 disabled:pointer-events-none text-neutral-700 transition-colors cursor-pointer"
                title="Próxima página"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Registrar Frequência Manual (CRUD Create) */}
      {showManualModal && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-lg w-full p-5 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
              <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#0f766e]" />
                Registrar Frequência Manual na Portaria
              </h3>
              <button
                onClick={() => setShowManualModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitManualAttendance} className="space-y-4 text-xs text-neutral-700">
              {/* Student Picker */}
              <div>
                <label className="block font-medium text-neutral-800 mb-1">
                  Estudante *
                </label>
                <select
                  value={manualStudentId}
                  onChange={(e) => setManualStudentId(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg px-2.5 py-2 text-xs text-neutral-900 focus:outline-none focus:border-[#0f766e]"
                  required
                >
                  <option value="">Selecione o estudante...</option>
                  {students.map((s) => {
                    const c = classrooms.find((cl) => cl.id === s.class_id);
                    return (
                      <option key={s.id} value={s.id}>
                        {s.full_name} ({s.enrollment_code} - {c?.name || 'Geral'})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Event Type Selectable Cards */}
              <div>
                <label className="block font-medium text-neutral-800 mb-1.5">
                  Tipo de Movimentação *
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setManualEventType('entry')}
                    className={`p-3 rounded-lg border text-left flex items-center justify-between transition-colors cursor-pointer ${
                      manualEventType === 'entry'
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 ring-1 ring-emerald-600/30'
                        : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-xs flex items-center gap-1.5">
                        <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                        Entrada (Check-in)
                      </div>
                      <div className="text-[11px] text-neutral-500 mt-0.5">
                        Acesso à instituição
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setManualEventType('exit')}
                    className={`p-3 rounded-lg border text-left flex items-center justify-between transition-colors cursor-pointer ${
                      manualEventType === 'exit'
                        ? 'border-amber-600 bg-amber-50/70 text-amber-900 ring-1 ring-amber-600/30'
                        : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-xs flex items-center gap-1.5">
                        <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />
                        Saída (Check-out)
                      </div>
                      <div className="text-[11px] text-neutral-500 mt-0.5">
                        Liberação de saída
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Date and Time Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-800 mb-1">
                    Data da ocorrência *
                  </label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                    required
                    className="w-full bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-[#0f766e]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-neutral-800 mb-1">
                    Horário *
                  </label>
                  <input
                    type="time"
                    value={manualTime}
                    onChange={(e) => setManualTime(e.target.value)}
                    required
                    className="w-full bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-[#0f766e]"
                  />
                </div>
              </div>

              {/* Reason with Quick Tags */}
              <div>
                <label className="block font-medium text-neutral-800 mb-1">
                  Justificativa administrativa *
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    'Atraso justificado',
                    'Consulta médica',
                    'Esqueceu crachá',
                    'Saída autorizada pelos pais',
                    'Atividade escolar externa',
                  ].map((tag) => (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => setManualReason(tag)}
                      className="px-2 py-0.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 rounded text-[11px] text-neutral-700 cursor-pointer transition-colors"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={2}
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  placeholder="Descreva o motivo do registro manual..."
                  required
                  className="w-full bg-white border border-neutral-300 rounded-lg p-2 text-xs text-neutral-900 focus:outline-none focus:border-[#0f766e]"
                />
              </div>

              {/* Authorized Guardian / Companion */}
              <div>
                <label className="block font-medium text-neutral-800 mb-1">
                  Responsável que autorizou / acompanhou (opcional)
                </label>
                <input
                  type="text"
                  value={manualGuardianName}
                  onChange={(e) => setManualGuardianName(e.target.value)}
                  placeholder="Ex: Carlos Costa (Pai) ou Mariana Duarte (Mãe)"
                  className="w-full bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-[#0f766e]"
                />
              </div>

              {manualError && (
                <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{manualError}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-neutral-200">
                <span className="text-[11px] text-neutral-400">
                  Operador: {currentOperator.name}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowManualModal(false)}
                    className="px-3.5 py-1.5 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50 text-xs font-medium cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-lg bg-[#0f766e] hover:bg-[#0d5f59] text-white text-xs font-medium cursor-pointer"
                  >
                    Gravar Frequência
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Inspeção de Auditoria do Evento (Read Detail) */}
      {inspectingEvent && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-lg w-full p-5 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
              <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#0f766e]" />
                Auditoria do Registro de Frequência
              </h3>
              <button
                onClick={() => setInspectingEvent(null)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              const stu = students.find((s) => s.id === inspectingEvent.student_id);
              const c = stu ? classrooms.find((cl) => cl.id === stu.class_id) : null;
              const isEntry = inspectingEvent.event_type === 'entry';
              const isExit = inspectingEvent.event_type === 'exit';

              return (
                <div className="space-y-3.5 text-xs text-neutral-700">
                  {/* Student Snapshot */}
                  <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                    {stu?.photo_ref ? (
                      <img
                        src={stu.photo_ref}
                        alt={stu.full_name}
                        className="w-12 h-12 rounded-full object-cover border border-neutral-300 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-neutral-200 text-neutral-700 flex items-center justify-center font-bold text-sm shrink-0">
                        {stu?.full_name?.slice(0, 2).toUpperCase() || 'AL'}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-sm text-neutral-900">
                        {stu?.full_name || 'Estudante não identificado'}
                      </div>
                      <div className="text-xs text-neutral-500 font-mono mt-0.5">
                        Matrícula: {stu?.enrollment_code} &bull; Turma: {c?.name || 'Geral'}
                      </div>
                    </div>
                  </div>

                  {/* Metadata Fields */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
                      <div className="text-[10px] text-neutral-500 uppercase tracking-wide">
                        Tipo de Evento
                      </div>
                      <div className="font-semibold text-neutral-900 mt-0.5 flex items-center gap-1.5">
                        {isEntry ? (
                          <span className="text-emerald-700 font-medium">Entrada (Check-in)</span>
                        ) : isExit ? (
                          <span className="text-amber-700 font-medium">Saída (Check-out)</span>
                        ) : (
                          <span className="text-neutral-700 font-medium">Retificação RF-05</span>
                        )}
                      </div>
                    </div>

                    <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
                      <div className="text-[10px] text-neutral-500 uppercase tracking-wide">
                        Origem da Leitura
                      </div>
                      <div className="font-mono text-neutral-900 mt-0.5 uppercase">
                        {inspectingEvent.source}
                      </div>
                    </div>

                    <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
                      <div className="text-[10px] text-neutral-500 uppercase tracking-wide">
                        Horário no Dispositivo
                      </div>
                      <div className="font-mono tabular-nums text-neutral-900 mt-0.5">
                        {new Date(inspectingEvent.occurred_at_device).toLocaleString('pt-BR')}
                      </div>
                    </div>

                    <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
                      <div className="text-[10px] text-neutral-500 uppercase tracking-wide">
                        Operador Responsável
                      </div>
                      <div className="font-mono text-neutral-900 mt-0.5">
                        {inspectingEvent.operator_id}
                      </div>
                    </div>
                  </div>

                  {/* Observações / Justificativa */}
                  {(inspectingEvent.notes || inspectingEvent.correction_reason) && (
                    <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200 space-y-1">
                      <div className="text-[10px] text-neutral-500 uppercase tracking-wide font-medium">
                        Justificativa / Motivo
                      </div>
                      <div className="italic text-neutral-800">
                        "{inspectingEvent.notes || inspectingEvent.correction_reason}"
                      </div>
                      {inspectingEvent.guardian_name && (
                        <div className="text-[11px] text-neutral-500 pt-0.5">
                          Autorizado por: <strong>{inspectingEvent.guardian_name}</strong>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Hash & UUID imutáveis */}
                  <div className="space-y-1 text-[11px] font-mono text-neutral-500 bg-neutral-50 p-2.5 rounded-lg border border-neutral-200">
                    <div>
                      <strong>UUIDv7:</strong> {inspectingEvent.id}
                    </div>
                    <div>
                      <strong>Device ID:</strong> {inspectingEvent.device_id} (Seq #{inspectingEvent.client_sequence})
                    </div>
                    {inspectingEvent.source_value_hash && (
                      <div className="truncate">
                        <strong>Integrity Hash:</strong> {inspectingEvent.source_value_hash}
                      </div>
                    )}
                    <div>
                      <strong>Status Outbox:</strong>{' '}
                      <span className="text-emerald-700 font-semibold uppercase">
                        {inspectingEvent.sync_state}
                      </span>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-200">
                    <button
                      onClick={() => setInspectingEvent(null)}
                      className="px-3.5 py-1.5 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50 text-xs font-medium cursor-pointer"
                    >
                      Fechar
                    </button>

                    {inspectingEvent.event_type !== 'correction' && (
                      <button
                        onClick={() => {
                          const ev = inspectingEvent;
                          setInspectingEvent(null);
                          handleOpenCorrection(ev);
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-[#0f766e] text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Retificar este evento
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* MODAL 3: Retificação Justificada (RF-05) */}
      {selectedEventForCorrection && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-lg w-full p-5 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
              <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-[#0f766e]" />
                Retificar Evento de Presença (RF-05)
              </h3>
              <button
                onClick={() => setSelectedEventForCorrection(null)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitCorrection} className="space-y-3.5 text-xs text-neutral-700">
              <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200 space-y-1">
                <div className="text-[10px] uppercase tracking-wide text-neutral-500 font-medium">
                  Evento de Origem a ser Retificado
                </div>
                <div className="text-neutral-900 font-semibold">
                  {students.find((s) => s.id === selectedEventForCorrection.student_id)?.full_name ||
                    'Estudante'}
                </div>
                <div className="text-neutral-500 font-mono text-[11px]">
                  Horário: {new Date(selectedEventForCorrection.occurred_at_device).toLocaleString('pt-BR')} &bull; Tipo: {selectedEventForCorrection.event_type.toUpperCase()}
                </div>
              </div>

              <div>
                <label className="block font-medium text-neutral-800 mb-1">
                  Motivo da retificação (mínimo 8 caracteres) *
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    'Leitura duplicada acidental',
                    'Entrada registrada como saída pelo operador',
                    'Identificação incorreta de crachá',
                    'Horário corrigido por solicitação da coordenação',
                  ].map((tag) => (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => setCorrectionReason(tag)}
                      className="px-2 py-0.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 rounded text-[11px] text-neutral-700 cursor-pointer transition-colors"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={3}
                  required
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="Ex: Aluno registrado em duplicidade por erro involuntário do operador no terminal..."
                  className="w-full bg-white border border-neutral-300 rounded-lg p-2 text-xs text-neutral-900 focus:outline-none focus:border-[#0f766e]"
                />
              </div>

              {correctionError && (
                <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {correctionError}
                </div>
              )}

              <div className="p-2.5 rounded bg-amber-50/70 border border-amber-200 text-amber-800 text-[11px] space-y-0.5">
                <strong>Aviso de Auditoria:</strong> O registro original não será apagado. Uma entrada corretiva vinculada será criada e sincronizada no histórico oficial.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setSelectedEventForCorrection(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50 font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-[#0f766e] hover:bg-[#0d5f59] text-white font-medium cursor-pointer"
                >
                  Confirmar Retificação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Relatório Oficial de Frequência para Impressão A4 */}
      {showPdfModal && (
        <div className="fixed inset-0 bg-neutral-900/70 backdrop-blur-xs z-50 flex flex-col items-center justify-start p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:overflow-visible">
          {/* Estilos calibrados para impressão A4 */}
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #printable-attendance-report, #printable-attendance-report * {
                visibility: visible !important;
              }
              #printable-attendance-report {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: none !important;
                margin: 0 !important;
                padding: 8mm 12mm !important;
                box-shadow: none !important;
                border: none !important;
                background: white !important;
                color: #111827 !important;
              }
              @page {
                size: ${reportOrientation === 'landscape' ? 'A4 landscape' : 'A4 portrait'};
                margin: 8mm 10mm;
              }
              .print-hide {
                display: none !important;
              }
              table {
                width: 100% !important;
                border-collapse: collapse !important;
                page-break-inside: auto !important;
              }
              tr {
                page-break-inside: avoid !important;
                page-break-after: auto !important;
              }
              thead {
                display: table-header-group !important;
              }
              tfoot {
                display: table-footer-group !important;
              }
              th, td {
                border: 1px solid #d1d5db !important;
              }
            }
          `}</style>

          {/* Barra de Ferramentas Superior (Oculta na Impressão) */}
          <div className="print-hide bg-white rounded-t-xl border border-neutral-300 border-b-0 max-w-4xl w-full p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0f766e]/10 text-[#0f766e] flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 text-sm">
                  Relatório Oficial de Frequência (Folha A4)
                </h3>
                <p className="text-[11px] text-neutral-500">
                  Pré-visualização fiel do documento pronto para impressão ou PDF
                </p>
              </div>
            </div>

            {/* Controles de Configuração da Folha */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center bg-neutral-100 rounded-lg p-0.5 border border-neutral-200">
                <button
                  type="button"
                  onClick={() => setReportOrientation('portrait')}
                  className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                    reportOrientation === 'portrait'
                      ? 'bg-white text-neutral-900 font-semibold shadow-2xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Retrato (A4)
                </button>
                <button
                  type="button"
                  onClick={() => setReportOrientation('landscape')}
                  className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                    reportOrientation === 'landscape'
                      ? 'bg-white text-neutral-900 font-semibold shadow-2xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Paisagem (A4)
                </button>
              </div>

              <label className="flex items-center gap-1.5 cursor-pointer text-neutral-700 select-none">
                <input
                  type="checkbox"
                  checked={includeSignatures}
                  onChange={(e) => setIncludeSignatures(e.target.checked)}
                  className="rounded text-[#0f766e] focus:ring-0"
                />
                <span>Assinaturas formais</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-neutral-700 select-none">
                <input
                  type="checkbox"
                  checked={includeNotes}
                  onChange={(e) => setIncludeNotes(e.target.checked)}
                  className="rounded text-[#0f766e] focus:ring-0"
                />
                <span>Observações</span>
              </label>

              <div className="flex items-center gap-2 border-l border-neutral-200 pl-3">
                <button
                  type="button"
                  onClick={() => setShowPdfModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50 font-medium cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 rounded-lg bg-[#0f766e] hover:bg-[#0d5f59] text-white font-medium flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir (A4 / PDF)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Área de Visualização da Folha A4 */}
          <div className="bg-neutral-200/90 p-4 sm:p-6 w-full max-w-4xl flex justify-center rounded-b-xl border border-neutral-300 border-t-0 shadow-lg overflow-y-auto max-h-[calc(90vh-80px)] print:bg-white print:p-0 print:border-none print:shadow-none print:max-h-none print:max-w-none">
            {/* Folha A4 Documento */}
            <div
              id="printable-attendance-report"
              className={`bg-white text-neutral-900 shadow-md border border-neutral-300 w-full p-8 sm:p-10 space-y-6 ${
                reportOrientation === 'landscape'
                  ? 'max-w-[297mm] min-h-[210mm]'
                  : 'max-w-[210mm] min-h-[297mm]'
              }`}
            >
              {/* 1. Cabeçalho Oficial Escolar */}
              <div className="border-b-2 border-neutral-800 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-base tracking-wider shrink-0">
                      EH
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-neutral-900 tracking-tight uppercase">
                        {school.name}
                      </h2>
                      <div className="text-xs text-neutral-600 font-medium">
                        Portaria Escolar Local-First &bull; Sistema de Controle de Acesso e Segurança
                      </div>
                      <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                        CNPJ: 12.345.678/0001-90 &bull; Rua das Acácias, 150 &bull; São Paulo, SP
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-[11px] font-mono border border-neutral-200 bg-neutral-50 p-2.5 rounded-lg space-y-0.5 shrink-0">
                    <div>
                      <strong className="text-neutral-500 uppercase text-[9px] block">Protocolo:</strong>
                      <span className="font-semibold text-neutral-900">
                        REL-FREQ-{todayIso.replace(/-/g, '')}-{filteredEvents.length.toString().padStart(3, '0')}
                      </span>
                    </div>
                    <div className="text-neutral-500 pt-0.5">
                      Emissão: <strong>{new Date().toLocaleString('pt-BR')}</strong>
                    </div>
                    <div className="text-neutral-500">
                      Operador: <strong>{currentOperator.name}</strong> ({currentOperator.role.toUpperCase()})
                    </div>
                  </div>
                </div>

                {/* Banner do Título */}
                <div className="mt-4 pt-3 border-t border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h1 className="text-sm font-bold text-neutral-900 tracking-wide uppercase">
                    Relatório Oficial de Frequência e Movimentação de Portaria
                  </h1>
                  <span className="text-xs font-mono text-neutral-500">
                    Filtro: {datePreset === 'today' ? 'Hoje' : datePreset === 'yesterday' ? 'Ontem' : datePreset === 'week' ? 'Últimos 7 dias' : datePreset === 'month' ? 'Este mês' : 'Personalizado'}
                  </span>
                </div>
              </div>

              {/* 2. Parâmetros e Filtros Apurados */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-neutral-50 border border-neutral-200 p-2.5 rounded-lg">
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Período Apurado</span>
                  <span className="font-medium text-neutral-900">
                    {startDate ? new Date(`${startDate}T00:00:00`).toLocaleDateString('pt-BR') : 'Início'} até{' '}
                    {endDate ? new Date(`${endDate}T00:00:00`).toLocaleDateString('pt-BR') : 'Hoje'}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Turma Filtrada</span>
                  <span className="font-medium text-neutral-900">
                    {classFilter === 'all'
                      ? 'Todas as Turmas'
                      : classrooms.find((c) => c.id === classFilter)?.name || 'Geral'}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Tipo de Registro</span>
                  <span className="font-medium text-neutral-900">
                    {typeFilter === 'all'
                      ? 'Todos (Entradas e Saídas)'
                      : typeFilter === 'entry'
                      ? 'Apenas Entradas'
                      : typeFilter === 'exit'
                      ? 'Apenas Saídas'
                      : 'Apenas Retificações'}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Total Consolidado</span>
                  <span className="font-medium text-neutral-900 font-mono">
                    {filteredEvents.length} registro(s)
                  </span>
                </div>
              </div>

              {/* 3. Quadro Executivo de Indicadores (KPIs no A4) */}
              <div className="grid grid-cols-5 gap-2 text-center border border-neutral-300 rounded-lg p-2.5 bg-neutral-50/50">
                <div className="p-1 border-r border-neutral-200">
                  <div className="text-[10px] text-neutral-500 uppercase font-semibold">Total Geral</div>
                  <div className="text-lg font-bold font-mono text-neutral-900 mt-0.5">
                    {summaryStats.totalRecords}
                  </div>
                </div>
                <div className="p-1 border-r border-neutral-200">
                  <div className="text-[10px] text-neutral-500 uppercase font-semibold">Entradas</div>
                  <div className="text-lg font-bold font-mono text-emerald-800 mt-0.5">
                    {summaryStats.totalEntries}
                  </div>
                </div>
                <div className="p-1 border-r border-neutral-200">
                  <div className="text-[10px] text-neutral-500 uppercase font-semibold">Saídas</div>
                  <div className="text-lg font-bold font-mono text-amber-800 mt-0.5">
                    {summaryStats.totalExits}
                  </div>
                </div>
                <div className="p-1 border-r border-neutral-200">
                  <div className="text-[10px] text-neutral-500 uppercase font-semibold">Retificações</div>
                  <div className="text-lg font-bold font-mono text-neutral-700 mt-0.5">
                    {summaryStats.totalCorrections}
                  </div>
                </div>
                <div className="p-1">
                  <div className="text-[10px] text-neutral-500 uppercase font-semibold">Alunos Únicos</div>
                  <div className="text-lg font-bold font-mono text-[#0f766e] mt-0.5">
                    {new Set(filteredEvents.map((e) => e.student_id)).size}
                  </div>
                </div>
              </div>

              {/* 4. Tabela Analítica Completa para Análise de Dados */}
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-neutral-800 uppercase tracking-wide flex items-center justify-between">
                  <span>Listagem Analítica de Ocorrências</span>
                  <span className="text-[10px] font-mono text-neutral-400">
                    Ordem cronológica reversa
                  </span>
                </div>

                <table className="w-full text-left text-[11px] border border-neutral-300">
                  <thead className="bg-neutral-100 text-neutral-700 border-b border-neutral-300 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="py-1.5 px-2 text-center w-8">#</th>
                      <th className="py-1.5 px-2.5">Horário / Data</th>
                      <th className="py-1.5 px-2.5">Matrícula</th>
                      <th className="py-1.5 px-3">Estudante</th>
                      <th className="py-1.5 px-2.5">Turma</th>
                      <th className="py-1.5 px-2 text-center">Movimento</th>
                      <th className="py-1.5 px-2 text-center">Origem</th>
                      <th className="py-1.5 px-2">Operador</th>
                      {includeNotes && (
                        <th className="py-1.5 px-3">Observação / Justificativa</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {filteredEvents.length === 0 ? (
                      <tr>
                        <td
                          colSpan={includeNotes ? 9 : 8}
                          className="py-8 text-center text-neutral-400 italic"
                        >
                          Nenhum evento registrado no intervalo selecionado.
                        </td>
                      </tr>
                    ) : (
                      filteredEvents.map((ev, index) => {
                        const stu = students.find((s) => s.id === ev.student_id);
                        const c = stu ? classrooms.find((cl) => cl.id === stu.class_id) : null;
                        const isEntry = ev.event_type === 'entry';
                        const isExit = ev.event_type === 'exit';

                        return (
                          <tr
                            key={ev.id}
                            className={`h-8 ${index % 2 === 1 ? 'bg-neutral-50/70' : 'bg-white'}`}
                          >
                            <td className="py-1.5 px-2 text-center font-mono text-neutral-400 text-[10px]">
                              {index + 1}
                            </td>
                            <td className="py-1.5 px-2.5 font-mono text-neutral-700 whitespace-nowrap">
                              <strong>{new Date(ev.occurred_at_device).toLocaleTimeString('pt-BR')}</strong>
                              <span className="text-[10px] text-neutral-400 ml-1">
                                {new Date(ev.occurred_at_device).toLocaleDateString('pt-BR')}
                              </span>
                            </td>
                            <td className="py-1.5 px-2.5 font-mono text-neutral-700 whitespace-nowrap">
                              {stu?.enrollment_code || '—'}
                            </td>
                            <td className="py-1.5 px-3 font-medium text-neutral-900">
                              {stu?.full_name || 'Não identificado'}
                            </td>
                            <td className="py-1.5 px-2.5 text-neutral-600 whitespace-nowrap">
                              {c?.name || 'Geral'}
                            </td>
                            <td className="py-1.5 px-2 text-center">
                              {isEntry ? (
                                <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold border border-emerald-300 text-emerald-800 bg-emerald-50">
                                  ENTRADA
                                </span>
                              ) : isExit ? (
                                <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold border border-amber-300 text-amber-800 bg-amber-50">
                                  SAÍDA
                                </span>
                              ) : (
                                <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold border border-neutral-300 text-neutral-700 bg-neutral-100">
                                  RETIFICAÇÃO
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 px-2 text-center font-mono text-[9px] uppercase text-neutral-500">
                              {ev.source}
                            </td>
                            <td className="py-1.5 px-2 font-mono text-[10px] text-neutral-600">
                              {ev.operator_id}
                            </td>
                            {includeNotes && (
                              <td className="py-1.5 px-3 text-[10px] text-neutral-600 italic">
                                {ev.notes || ev.correction_reason || '—'}
                                {ev.guardian_name && (
                                  <span className="block text-neutral-500 not-italic font-sans text-[9px]">
                                    (Autorizado: {ev.guardian_name})
                                  </span>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* 5. Termo de Conformidade e Assinaturas Formais */}
              {includeSignatures && (
                <div className="pt-6 space-y-6 break-inside-avoid">
                  <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg text-[10px] text-neutral-600 leading-relaxed">
                    <strong>DECLARAÇÃO DE CONFORMIDADE E AUDITORIA:</strong> Documento extraído da base de dados transacional offline SQLite WAL da instituição. Registros imutáveis protegidos com carimbo cronológico de dispositivo e hash criptográfico, em estrita observância à Lei Geral de Proteção de Dados (LGPD) e às diretrizes operacionais de segurança da portaria.
                  </div>

                  <div className="grid grid-cols-2 gap-10 pt-4 text-center">
                    <div className="space-y-1">
                      <div className="border-b border-neutral-400 w-3/4 mx-auto pb-1" />
                      <div className="text-xs font-semibold text-neutral-900">
                        {currentOperator.name}
                      </div>
                      <div className="text-[10px] text-neutral-500">
                        Operador de Portaria &bull; Matrícula {currentOperator.badge_number}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="border-b border-neutral-400 w-3/4 mx-auto pb-1" />
                      <div className="text-xs font-semibold text-neutral-900">
                        Coordenação Pedagógica / Direção
                      </div>
                      <div className="text-[10px] text-neutral-500">
                        Visto Institucional &bull; Carimbo Oficial
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. Rodapé do Documento */}
              <div className="border-t border-neutral-300 pt-3 flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                <div>
                  Escola Horizonte &bull; Sistema de Portaria Local-First &bull; Modo Offline
                </div>
                <div>
                  Página 1 de 1 &bull; Documento Oficial
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
