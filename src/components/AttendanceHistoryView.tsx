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
  Filter,
  UserCheck,
  LogOut,
  Layers,
  Sparkles,
  FileSpreadsheet,
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
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');

  const todayIso = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState<string>(todayIso);
  const [endDate, setEndDate] = useState<string>(todayIso);
  const [datePreset, setDatePreset] = useState<string>('today');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(12);

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
  const [includeClassBreakdown, setIncludeClassBreakdown] = useState<boolean>(true);
  const [includeHourlyDistribution, setIncludeHourlyDistribution] = useState<boolean>(true);
  const [includeStudentSummary, setIncludeStudentSummary] = useState<boolean>(true);
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

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setClassFilter('all');
    handleApplyPreset('today');
  };

  const hasActiveFilters = Boolean(
    searchQuery ||
    typeFilter !== 'all' ||
    classFilter !== 'all' ||
    datePreset !== 'today'
  );

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

  const handleSubmitManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualStudentId) {
      setManualError('Selecione um estudante.');
      return;
    }
    if (!manualReason.trim() || manualReason.trim().length < 5) {
      setManualError('A justificativa deve conter no mínimo 5 caracteres.');
      return;
    }

    try {
      const dateTimeStr = `${manualDate}T${manualTime}:00`;
      const event = localDb.recordManualAttendance({
        studentId: manualStudentId,
        eventType: manualEventType,
        occurredAt: new Date(dateTimeStr).toISOString(),
        reason: manualReason.trim(),
        guardianName: manualGuardianName.trim() || undefined,
      });

      const s = students.find((st) => st.id === manualStudentId);
      setManualSuccess(
        `Frequência manual de ${s?.full_name || 'aluno'} registrada com sucesso (#${event.id.slice(0, 8)}).`
      );
      setShowManualModal(false);
      setTimeout(() => setManualSuccess(null), 4000);
    } catch (err) {
      setManualError(String(err));
    }
  };

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

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
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
    <div className="p-6 max-w-7xl mx-auto space-y-5 select-none">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold text-neutral-900 tracking-tight flex items-center gap-2">
              Histórico de Frequência & Auditoria
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              SQLite WAL &bull; Imutável
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Registro cronológico auditado de entradas, saídas e retificações com rastreabilidade formal
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center bg-white border border-neutral-300 rounded-lg p-0.5 shadow-2xs">
            <button
              onClick={() => setViewMode('cards')}
              title="Visualizar em Linha do Tempo / Cards"
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-neutral-100 text-[#0f766e] font-semibold shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Linha do Tempo</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="Visualizar em Tabela"
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-neutral-100 text-[#0f766e] font-semibold shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tabela</span>
            </button>
          </div>

          <button
            onClick={handleExportCsv}
            className="bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-neutral-500" />
            <span>CSV</span>
          </button>

          <button
            onClick={() => setShowPdfModal(true)}
            className="bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-neutral-500" />
            <span>Imprimir A4</span>
          </button>

          <button
            onClick={handleOpenManualModal}
            className="bg-[#0f766e] hover:bg-[#0d5f59] text-white text-xs font-medium px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Lançar frequência</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {manualSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span className="font-medium">{manualSuccess}</span>
        </div>
      )}

      {correctionSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span className="font-medium">{correctionSuccess}</span>
        </div>
      )}

      {/* 2. Executive KPI Cards on TOP (High visual hierarchy) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span className="font-medium text-neutral-600">Eventos auditados</span>
            <span className="p-1 rounded bg-neutral-100 text-neutral-700">
              <Layers className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-neutral-900">
            {summaryStats.totalRecords}
          </div>
          <div className="text-[11px] text-neutral-400 border-t border-neutral-100 pt-1 font-mono">
            Armazenamento local SQLite
          </div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span className="font-medium text-neutral-600">Entradas confirmadas</span>
            <span className="p-1 rounded bg-emerald-50 text-emerald-700">
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-emerald-700">
            {summaryStats.totalEntries}
          </div>
          <div className="text-[11px] text-neutral-400 border-t border-neutral-100 pt-1 font-mono">
            Check-in na portaria
          </div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span className="font-medium text-neutral-600">Saídas liberadas</span>
            <span className="p-1 rounded bg-amber-50 text-amber-700">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-amber-700">
            {summaryStats.totalExits}
          </div>
          <div className="text-[11px] text-neutral-400 border-t border-neutral-100 pt-1 font-mono">
            Liberações validadas
          </div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span className="font-medium text-neutral-600">Retificações (RF-05)</span>
            <span className="p-1 rounded bg-sky-50 text-sky-700">
              <RotateCcw className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-neutral-900">
            {summaryStats.totalCorrections}
          </div>
          <div className="text-[11px] text-neutral-400 border-t border-neutral-100 pt-1 font-mono">
            Ajustes auditados
          </div>
        </div>
      </div>

      {/* 3. Consolidated Ergonomic Filter Bar */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-3.5 shadow-2xs">
        {/* Tier 1: Period Presets & Direct Date Range */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-neutral-100 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-neutral-600 font-semibold flex items-center gap-1.5 mr-1">
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
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  datePreset === p.id
                    ? 'bg-[#0f766e] text-white shadow-2xs font-semibold'
                    : 'bg-neutral-50 text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-neutral-50 px-2 py-1 rounded-lg border border-neutral-200">
              <span className="text-neutral-400 text-[11px]">De:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset('custom');
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs text-neutral-800 font-mono focus:outline-none cursor-pointer"
              />
              <span className="text-neutral-400 text-[11px]">Até:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset('custom');
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs text-neutral-800 font-mono focus:outline-none cursor-pointer"
              />
            </div>

            <span className="text-xs font-mono tabular-nums text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-lg font-medium">
              {filteredEvents.length} {filteredEvents.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>
        </div>

        {/* Tier 2: Search, Class, Event Type and Filter Reset */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 text-xs items-center">
          {/* Search Input (5 cols) */}
          <div className="lg:col-span-5 relative">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por estudante, matrícula ou operador..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-neutral-50/70 border border-neutral-300 rounded-lg pl-9 pr-8 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[#0f766e] focus:bg-white transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Class Filter (3 cols) */}
          <div className="lg:col-span-3">
            <select
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-neutral-50/70 border border-neutral-300 rounded-lg px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:border-[#0f766e] focus:bg-white transition-all cursor-pointer shadow-2xs"
            >
              <option value="all">Todas as turmas e séries</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.grade})
                </option>
              ))}
            </select>
          </div>

          {/* Event Type Filter (3 cols) */}
          <div className="lg:col-span-3">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-neutral-50/70 border border-neutral-300 rounded-lg px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:border-[#0f766e] focus:bg-white transition-all cursor-pointer shadow-2xs"
            >
              <option value="all">Todos os tipos de movimentação</option>
              <option value="entry">Apenas Entradas (Check-in)</option>
              <option value="exit">Apenas Saídas (Liberação)</option>
              <option value="correction">Apenas Retificações Auditadas</option>
            </select>
          </div>

          {/* Clear Filters (1 col) */}
          <div className="lg:col-span-1 flex justify-end">
            {hasActiveFilters ? (
              <button
                onClick={handleClearAllFilters}
                className="p-2 text-neutral-500 hover:text-rose-700 hover:bg-rose-50 border border-neutral-200 rounded-lg text-xs font-medium flex items-center justify-center transition-colors cursor-pointer w-full"
                title="Limpar todos os filtros aplicados"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="w-full text-center text-[10px] text-neutral-400 font-mono">
                Filtros
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Main Content Area: Timeline Flow (Cards) vs High-Density Table */}
      {viewMode === 'cards' ? (
        /* Enhanced Timeline Flow / Cards View */
        <div className="space-y-3">
          {paginatedEvents.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-neutral-200 p-12 text-center text-xs text-neutral-500">
              Nenhuma movimentação localizada com os filtros selecionados.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {paginatedEvents.map((ev) => {
                const stu = students.find((s) => s.id === ev.student_id);
                const c = stu ? classrooms.find((cl) => cl.id === stu.class_id) : null;
                const isEntry = ev.event_type === 'entry';
                const isExit = ev.event_type === 'exit';
                const isCorrection = ev.event_type === 'correction';

                return (
                  <div
                    key={ev.id}
                    className="bg-white rounded-xl border border-neutral-200 p-4 space-y-3 hover:border-neutral-300 hover:shadow-xs transition-all shadow-2xs flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Header: Student Info & Flow Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-100 border border-neutral-200 shrink-0">
                            {stu?.photo_ref ? (
                              <img
                                src={stu.photo_ref}
                                alt={stu.full_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-neutral-600 font-mono text-xs">
                                {stu?.full_name?.slice(0, 2).toUpperCase() || 'AL'}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-neutral-900 leading-snug">
                              {stu?.full_name || 'Estudante não identificado'}
                            </div>
                            <div className="text-[11px] text-neutral-500 font-mono">
                              Matrícula: {stu?.enrollment_code} &bull; {c?.name || 'Geral'}
                            </div>
                          </div>
                        </div>

                        {/* Direction Badge */}
                        {isEntry ? (
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-1 shrink-0">
                            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                            Entrada
                          </span>
                        ) : isExit ? (
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-1 shrink-0">
                            <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />
                            Saída
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-neutral-100 border border-neutral-200 text-neutral-700 flex items-center gap-1 shrink-0">
                            <RotateCcw className="w-3.5 h-3.5 text-neutral-500" />
                            Retificação
                          </span>
                        )}
                      </div>

                      {/* Time & Hardware Stamp */}
                      <div className="flex items-center justify-between text-xs text-neutral-500 pt-2 border-t border-neutral-100">
                        <span className="font-mono tabular-nums text-neutral-700 flex items-center gap-1.5 font-medium">
                          <Clock className="w-3.5 h-3.5 text-neutral-400" />
                          {new Date(ev.occurred_at_device).toLocaleTimeString('pt-BR')} &bull;{' '}
                          {new Date(ev.occurred_at_device).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-neutral-100 border border-neutral-200 font-mono text-[10px] uppercase font-semibold text-neutral-600">
                          {ev.source}
                        </span>
                      </div>

                      {/* Justification & Operator Notes */}
                      {(ev.notes || ev.correction_reason) && (
                        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-2.5 text-[11px] text-neutral-700 space-y-1">
                          <div className="font-semibold text-neutral-800 text-[10px] uppercase tracking-wide">
                            Justificativa registrada:
                          </div>
                          <div className="italic text-neutral-600 leading-relaxed">
                            &quot;{ev.notes || ev.correction_reason}&quot;
                          </div>
                          {ev.guardian_name && (
                            <div className="text-[10px] text-neutral-500 pt-1 border-t border-neutral-200/60">
                              Acompanhante: <strong className="text-neutral-700">{ev.guardian_name}</strong>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Card Actions Footer */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-neutral-100 text-xs">
                      <span className="font-mono text-[11px] text-neutral-500">
                        Op: {ev.operator_id}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setInspectingEvent(ev)}
                          className="px-2.5 py-1 rounded-md border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-neutral-500" />
                          <span>Detalhes</span>
                        </button>

                        {!isCorrection && (
                          <button
                            onClick={() => handleOpenCorrection(ev)}
                            title="Registrar retificação de evento (RF-05)"
                            className="px-2.5 py-1 rounded-md border border-neutral-200 hover:bg-neutral-50 text-[#0f766e] text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Retificar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* High-Density Tabular View */
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-200 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Horário / Data</th>
                  <th className="py-2.5 px-4">Estudante</th>
                  <th className="py-2.5 px-4">Matrícula</th>
                  <th className="py-2.5 px-4">Turma</th>
                  <th className="py-2.5 px-4">Movimentação</th>
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
                        <td className="py-2 px-4 font-mono tabular-nums text-neutral-700 whitespace-nowrap font-medium">
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
                              <div className="w-7 h-7 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center font-bold text-[10px] shrink-0 font-mono">
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
                            <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-1 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              Entrada
                            </span>
                          ) : isExit ? (
                            <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-1 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Saída
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-neutral-100 border border-neutral-200 text-neutral-700 flex items-center gap-1 w-fit">
                              <RotateCcw className="w-3 h-3 text-neutral-500" />
                              Retificação
                            </span>
                          )}
                        </td>

                        <td className="py-2 px-4 font-mono tabular-nums text-neutral-500 uppercase text-[10px]">
                          <span className="px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-200 font-semibold">
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
      )}

      {/* 5. Pagination Controls */}
      <div className="bg-white rounded-xl border border-neutral-200 p-3 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="text-neutral-500">Exibir por página:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-neutral-50 border border-neutral-300 rounded px-2 py-1 text-xs text-neutral-800 cursor-pointer focus:outline-none focus:border-[#0f766e]"
          >
            <option value="6">6 eventos</option>
            <option value="12">12 eventos</option>
            <option value="24">24 eventos</option>
            <option value="-1">Todos os registros</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-neutral-500 font-mono tabular-nums">
            Página {currentPage} de {totalPages} ({totalItems} itens)
          </span>

          <div className="flex items-center gap-1">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="p-1.5 rounded border border-neutral-300 hover:bg-neutral-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className="p-1.5 rounded border border-neutral-300 hover:bg-neutral-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: Frequência Manual */}
      {showManualModal && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-lg w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#0f766e]" />
                Registrar Frequência Manual (Exceção)
              </h3>
              <button
                onClick={() => setShowManualModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitManual} className="space-y-3.5 text-xs text-neutral-700">
              <div>
                <label className="block font-medium mb-1">Estudante:</label>
                <select
                  value={manualStudentId}
                  onChange={(e) => setManualStudentId(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg p-2 text-neutral-900 focus:outline-none focus:border-[#0f766e] cursor-pointer"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.enrollment_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Tipo de Evento:</label>
                  <select
                    value={manualEventType}
                    onChange={(e) => setManualEventType(e.target.value as any)}
                    className="w-full bg-white border border-neutral-300 rounded-lg p-2 text-neutral-900 focus:outline-none focus:border-[#0f766e] cursor-pointer"
                  >
                    <option value="entry">Entrada</option>
                    <option value="exit">Saída</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium mb-1">Horário:</label>
                  <input
                    type="time"
                    required
                    value={manualTime}
                    onChange={(e) => setManualTime(e.target.value)}
                    className="w-full bg-white border border-neutral-300 rounded-lg p-2 text-neutral-900 focus:outline-none focus:border-[#0f766e]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1">Acompanhante / Responsável presente:</label>
                <input
                  type="text"
                  placeholder="Nome do responsável que acompanhou (se houver)..."
                  value={manualGuardianName}
                  onChange={(e) => setManualGuardianName(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg p-2 text-neutral-900 focus:outline-none focus:border-[#0f766e]"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">
                  Justificativa administrativa obrigatória:
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ex: Aluno esqueceu carteirinha física; entrada autorizada pela coordenação..."
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg p-2 text-neutral-900 focus:outline-none focus:border-[#0f766e]"
                />
              </div>

              {manualError && (
                <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {manualError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50 font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#0f766e] hover:bg-[#0d5f59] text-white font-medium cursor-pointer shadow-xs"
                >
                  Gravar frequência
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Retificação Justificada (RF-05) */}
      {selectedEventForCorrection && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-lg w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-[#0f766e]" />
                Retificação de Registro de Portaria (RF-05)
              </h3>
              <button
                onClick={() => setSelectedEventForCorrection(null)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-500">
              O evento original permanecerá preservado no histórico imutável. Um novo evento de retificação será emitido e vinculado para fins de auditoria escolar.
            </p>

            <form onSubmit={handleSubmitCorrection} className="space-y-3 text-xs text-neutral-700">
              <div>
                <label className="block font-medium mb-1">
                  Justificativa administrativa (mínimo 8 caracteres):
                </label>
                <textarea
                  rows={3}
                  required
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="Ex: Leitura acidental do crachá duplicada ao despedir-se do colega..."
                  className="w-full bg-white border border-neutral-300 rounded-lg p-2 text-neutral-900 focus:outline-none focus:border-[#0f766e]"
                />
              </div>

              {correctionError && (
                <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {correctionError}
                </div>
              )}

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
                  className="px-4 py-1.5 rounded-lg bg-[#0f766e] hover:bg-[#0d5f59] text-white font-medium cursor-pointer shadow-xs"
                >
                  Confirmar retificação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Inspeção de Auditoria do Evento */}
      {inspectingEvent && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-md w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#0f766e]" />
                Auditoria de Evento Local
              </h3>
              <button
                onClick={() => setInspectingEvent(null)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-neutral-700 font-mono">
              <div className="p-2 bg-neutral-50 rounded border border-neutral-200 space-y-1">
                <div><strong>ID Evento:</strong> {inspectingEvent.id}</div>
                <div><strong>Estudante ID:</strong> {inspectingEvent.student_id}</div>
                <div><strong>Tipo:</strong> {inspectingEvent.event_type}</div>
                <div><strong>Horário Dispositivo:</strong> {inspectingEvent.occurred_at_device}</div>
                <div><strong>Horário UTC:</strong> {inspectingEvent.occurred_at_utc}</div>
                <div><strong>Dispositivo:</strong> {inspectingEvent.device_id}</div>
                <div><strong>Operador:</strong> {inspectingEvent.operator_id}</div>
                <div><strong>Origem Leitura:</strong> {inspectingEvent.source}</div>
                <div><strong>Hash Fonte:</strong> {inspectingEvent.source_value_hash || '—'}</div>
                <div><strong>Status Sincronização:</strong> {inspectingEvent.sync_state}</div>
              </div>

              {inspectingEvent.correction_of_id && (
                <div className="p-2 bg-purple-50 rounded border border-purple-200 text-purple-900">
                  <strong>Retificação do Evento:</strong> {inspectingEvent.correction_of_id}
                </div>
              )}
            </div>

            <div className="text-right pt-2 border-t border-neutral-200">
              <button
                onClick={() => setInspectingEvent(null)}
                className="px-3.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-xs font-medium text-neutral-700 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Relatório de Impressão A4 */}
      {showPdfModal && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-lg w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-2">
                <Printer className="w-4 h-4 text-[#0f766e]" />
                Configurar Relatório Formal A4
              </h3>
              <button
                onClick={() => setShowPdfModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-500">
              Selecione as seções formais que devem ser incluídas no documento impresso:
            </p>

            <div className="space-y-2 text-xs text-neutral-700 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeClassBreakdown}
                  onChange={(e) => setIncludeClassBreakdown(e.target.checked)}
                  className="rounded text-[#0f766e]"
                />
                <span>Incluir detalhamento por turma e quórum</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeHourlyDistribution}
                  onChange={(e) => setIncludeHourlyDistribution(e.target.checked)}
                  className="rounded text-[#0f766e]"
                />
                <span>Incluir gráfico de distribuição horária da portaria</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeStudentSummary}
                  onChange={(e) => setIncludeStudentSummary(e.target.checked)}
                  className="rounded text-[#0f766e]"
                />
                <span>Incluir relação nominal de estudantes e horários</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSignatures}
                  onChange={(e) => setIncludeSignatures(e.target.checked)}
                  className="rounded text-[#0f766e]"
                />
                <span>Incluir campos formais de assinatura (Direção, Coordenação e Portaria)</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => setShowPdfModal(false)}
                className="px-3.5 py-1.5 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50 text-xs font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                  setShowPdfModal(false);
                }}
                className="px-4 py-1.5 rounded-lg bg-[#0f766e] hover:bg-[#0d5f59] text-white text-xs font-medium cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir documento</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
