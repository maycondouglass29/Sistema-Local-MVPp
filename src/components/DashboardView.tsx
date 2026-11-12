/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  UserCheck,
  UserX,
  LogOut,
  Layers,
  Download,
  Phone,
  X,
  Search,
  Printer,
  FileSpreadsheet,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  HeartPulse,
  Filter,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  MessageCircle,
  Users,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { localDb } from '../services/localDatabase';
import { Student, ClassRoom, AttendanceEvent } from '../types/database';

export const DashboardView: React.FC = () => {
  const [, setTick] = useState(0);
  const [showAbsenteesModal, setShowAbsenteesModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showClassDetailModal, setShowClassDetailModal] = useState<ClassRoom | null>(null);
  const [showDemoFeedNotice, setShowDemoFeedNotice] = useState<string | null>(null);

  // Filters
  const [shiftFilter, setShiftFilter] = useState<'all' | 'morning' | 'afternoon'>('all');
  const [gradeFilter, setGradeFilter] = useState<'all' | 'medio' | 'fundamental'>('all');
  const [absentSearchQuery, setAbsentSearchQuery] = useState('');
  const [absentClassFilter, setAbsentClassFilter] = useState('all');

  useEffect(() => {
    return localDb.subscribe(() => setTick((t) => t + 1));
  }, []);

  const todayStr = new Date().toISOString().slice(0, 10);
  const formattedTodayDate = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const students = localDb.getStudents();
  const classrooms = localDb.getClassrooms();
  const rawEvents = localDb.getAttendanceEvents();

  // Events filtered for today
  const todayEvents = useMemo(() => {
    return rawEvents
      .filter((e) => e.occurred_at_device.startsWith(todayStr))
      .sort((a, b) => new Date(b.occurred_at_device).getTime() - new Date(a.occurred_at_device).getTime());
  }, [rawEvents, todayStr]);

  // Compute Active Students and presence
  const activeStudents = useMemo(() => {
    return students.filter((s) => s.status === 'active' && !s.deleted_at);
  }, [students]);

  // Map each student's current status today
  const studentStatusMap = useMemo(() => {
    const map = new Map<string, { status: 'present' | 'exited' | 'absent'; lastEvent?: AttendanceEvent }>();

    activeStudents.forEach((stu) => {
      const stuEvents = todayEvents
        .filter((e) => e.student_id === stu.id && !e.correction_of_id)
        .sort((a, b) => new Date(b.occurred_at_device).getTime() - new Date(a.occurred_at_device).getTime());

      if (stuEvents.length > 0) {
        const lastEv = stuEvents[0];
        if (lastEv.event_type === 'entry') {
          map.set(stu.id, { status: 'present', lastEvent: lastEv });
        } else if (lastEv.event_type === 'exit') {
          map.set(stu.id, { status: 'exited', lastEvent: lastEv });
        } else {
          map.set(stu.id, { status: 'absent' });
        }
      } else {
        map.set(stu.id, { status: 'absent' });
      }
    });

    return map;
  }, [activeStudents, todayEvents]);

  // Apply Shift & Grade filters to students
  const filteredActiveStudents = useMemo(() => {
    return activeStudents.filter((stu) => {
      const cls = classrooms.find((c) => c.id === stu.class_id);
      if (shiftFilter !== 'all') {
        const clsShift = cls?.grade.toLowerCase().includes('fundamental') ? 'afternoon' : 'morning';
        if (clsShift !== shiftFilter) return false;
      }
      if (gradeFilter !== 'all') {
        if (gradeFilter === 'medio' && !cls?.grade.toLowerCase().includes('médio')) return false;
        if (gradeFilter === 'fundamental' && !cls?.grade.toLowerCase().includes('fundamental')) return false;
      }
      return true;
    });
  }, [activeStudents, classrooms, shiftFilter, gradeFilter]);

  // Primary Metrics
  const totalStudents = filteredActiveStudents.length;
  const presentCount = filteredActiveStudents.filter((s) => studentStatusMap.get(s.id)?.status === 'present').length;
  const exitedCount = filteredActiveStudents.filter((s) => studentStatusMap.get(s.id)?.status === 'exited').length;
  const absentStudents = filteredActiveStudents.filter((s) => studentStatusMap.get(s.id)?.status === 'absent');
  const absentCount = absentStudents.length;

  const occupancyRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;
  const attendanceRate = totalStudents > 0 ? Math.round(((presentCount + exitedCount) / totalStudents) * 100) : 0;

  const totalEntriesToday = todayEvents.filter((e) => e.event_type === 'entry' && !e.correction_of_id).length;
  const totalExitsToday = todayEvents.filter((e) => e.event_type === 'exit' && !e.correction_of_id).length;
  const totalCorrectionsToday = todayEvents.filter((e) => e.event_type === 'correction').length;
  const pendingOutbox = localDb.getPendingOutboxCount();

  // Hourly Flow Distribution (06:00 to 18:00)
  const hoursMap = useMemo(() => {
    const map: { [hour: string]: { entry: number; exit: number } } = {};
    for (let i = 6; i <= 18; i++) {
      map[`${String(i).padStart(2, '0')}:00`] = { entry: 0, exit: 0 };
    }
    todayEvents.forEach((ev) => {
      const h = new Date(ev.occurred_at_device).getHours();
      const key = `${String(h).padStart(2, '0')}:00`;
      if (map[key]) {
        if (ev.event_type === 'entry' && !ev.correction_of_id) map[key].entry += 1;
        if (ev.event_type === 'exit' && !ev.correction_of_id) map[key].exit += 1;
      }
    });
    return map;
  }, [todayEvents]);

  // Find peak hour
  const peakHour = useMemo(() => {
    let max = -1;
    let peakStr = '07:00';
    Object.entries(hoursMap).forEach(([h, counts]) => {
      const total = counts.entry + counts.exit;
      if (total > max) {
        max = total;
        peakStr = h;
      }
    });
    return { hour: peakStr, count: max };
  }, [hoursMap]);

  // Class breakdown statistics
  const classStats = useMemo(() => {
    return classrooms.map((c) => {
      const classStudents = activeStudents.filter((s) => s.class_id === c.id);
      const present = classStudents.filter((s) => studentStatusMap.get(s.id)?.status === 'present').length;
      const exited = classStudents.filter((s) => studentStatusMap.get(s.id)?.status === 'exited').length;
      const absent = classStudents.filter((s) => studentStatusMap.get(s.id)?.status === 'absent').length;
      const rate = classStudents.length > 0 ? Math.round((present / classStudents.length) * 100) : 0;
      return {
        classRoom: c,
        total: classStudents.length,
        present,
        exited,
        absent,
        rate,
      };
    });
  }, [classrooms, activeStudents, studentStatusMap]);

  // Active Critical Medical & Security Alerts in School
  const presentAlerts = useMemo(() => {
    return activeStudents
      .filter((s) => studentStatusMap.get(s.id)?.status === 'present')
      .filter((s) => s.id === 'stu_004' || s.id === 'stu_001' || s.block_reason);
  }, [activeStudents, studentStatusMap]);

  // Filtered Absent Students for Modal
  const filteredAbsentList = useMemo(() => {
    return absentStudents.filter((s) => {
      const q = absentSearchQuery.toLowerCase().trim();
      const matchSearch =
        !q || s.full_name.toLowerCase().includes(q) || s.enrollment_code.toLowerCase().includes(q);
      const matchClass = absentClassFilter === 'all' || s.class_id === absentClassFilter;
      return matchSearch && matchClass;
    });
  }, [absentStudents, absentSearchQuery, absentClassFilter]);

  // Export Daily CSV
  const handleExportCsv = () => {
    const headers = [
      'Matrícula',
      'Nome Completo',
      'Turma',
      'Segmento',
      'Status Atual Hoje',
      'Último Registro',
      'Nome Responsável',
      'Telefone Responsável',
    ];

    const rows = activeStudents.map((s) => {
      const cls = classrooms.find((c) => c.id === s.class_id);
      const statusInfo = studentStatusMap.get(s.id);
      const statusText =
        statusInfo?.status === 'present'
          ? 'Presente no Recinto'
          : statusInfo?.status === 'exited'
          ? 'Já Liberado (Saída)'
          : 'Ausente';
      const lastTime = statusInfo?.lastEvent
        ? new Date(statusInfo.lastEvent.occurred_at_device).toLocaleTimeString('pt-BR')
        : 'Sem registro';

      return [
        s.enrollment_code,
        `"${s.full_name}"`,
        `"${cls?.name || 'Sem turma'}"`,
        `"${cls?.grade || 'Geral'}"`,
        statusText,
        lastTime,
        `"${s.guardian_name || ''}"`,
        `"${s.guardian_phone || ''}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `frequencia_escolar_horizonte_${todayStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Seed Realistic Morning Sample Data if day is empty
  const handleSeedSampleDay = () => {
    const now = new Date();
    const studentsToEnter = activeStudents.slice(0, 8);

    studentsToEnter.forEach((stu, i) => {
      // Stagger times between 07:05 and 07:22
      const eventDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 5 + i * 2, 10 + i * 4);
      localDb.commitAttendanceScan(
        stu.id,
        'entry',
        i % 2 === 0 ? 'qr' : 'barcode',
        stu.enrollment_code
      );
    });

    setShowDemoFeedNotice('Amostra de movimentação matutina gerada com sucesso no banco SQLite!');
    setTimeout(() => setShowDemoFeedNotice(null), 4000);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 select-none">
      {/* Toast Notification */}
      {showDemoFeedNotice && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span className="font-medium">{showDemoFeedNotice}</span>
          </div>
          <button onClick={() => setShowDemoFeedNotice(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Header & Operational Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">
              Painel Geral de Frequência
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Ao vivo &bull; Portaria Ativa
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1 capitalize flex items-center gap-2">
            <span>{formattedTodayDate}</span>
            <span>&bull;</span>
            <span className="font-mono text-neutral-600">SQLite WAL &bull; Laya Engine &bull; Modo Local-First</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {todayEvents.length === 0 && (
            <button
              onClick={handleSeedSampleDay}
              className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Gera registros matutinos para demonstração e análise de gráficos"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Carregar amostra matutina</span>
            </button>
          )}

          <button
            onClick={() => setShowAbsenteesModal(true)}
            className="bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-medium px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <UserX className="w-3.5 h-3.5 text-rose-600" />
            <span>Alunos ausentes ({absentCount})</span>
          </button>

          <button
            onClick={() => setShowExportModal(true)}
            className="bg-[#0f766e] hover:bg-[#0d5f59] text-white text-xs font-medium px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar relatórios</span>
          </button>
        </div>
      </div>

      {/* 2. Executive KPIs Row (4px grid, high clarity) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: Alunos no Prédio */}
        <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span className="font-medium text-neutral-600">No recinto escolar</span>
            <span className="p-1 rounded bg-emerald-50 text-[#0f766e]">
              <UserCheck className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 pt-0.5">
            <span className="text-2xl font-semibold font-mono tabular-nums text-neutral-900">{presentCount}</span>
            <span className="text-xs text-neutral-500 font-mono">/ {totalStudents} alunos</span>
          </div>
          <div className="text-[11px] text-neutral-500 flex items-center justify-between pt-1 border-t border-neutral-100">
            <span>Taxa de ocupação</span>
            <span className="font-semibold text-emerald-800 font-mono tabular-nums">{occupancyRate}%</span>
          </div>
        </div>

        {/* KPI 2: Saídas Registradas */}
        <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span className="font-medium text-neutral-600">Saídas concluídas</span>
            <span className="p-1 rounded bg-amber-50 text-amber-700">
              <LogOut className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 pt-0.5">
            <span className="text-2xl font-semibold font-mono tabular-nums text-neutral-900">{exitedCount}</span>
            <span className="text-xs text-neutral-500 font-mono">liberações</span>
          </div>
          <div className="text-[11px] text-neutral-500 flex items-center justify-between pt-1 border-t border-neutral-100">
            <span>Passaram pela catraca</span>
            <span className="font-medium text-neutral-700 font-mono tabular-nums">{totalExitsToday} reg.</span>
          </div>
        </div>

        {/* KPI 3: Alunos Ausentes */}
        <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span className="font-medium text-neutral-600">Alunos ausentes</span>
            <span className="p-1 rounded bg-rose-50 text-rose-700">
              <UserX className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 pt-0.5">
            <span className="text-2xl font-semibold font-mono tabular-nums text-neutral-900">{absentCount}</span>
            <span className="text-xs text-neutral-500 font-mono">sem entrada</span>
          </div>
          <div className="text-[11px] text-neutral-500 flex items-center justify-between pt-1 border-t border-neutral-100">
            <span>Assiduidade global</span>
            <button
              onClick={() => setShowAbsenteesModal(true)}
              className="text-[#0f766e] font-semibold hover:underline cursor-pointer flex items-center gap-0.5"
            >
              <span>Ver lista</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* KPI 4: Alertas e Segurança */}
        <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span className="font-medium text-neutral-600">Alertas de acolhimento</span>
            <span className="p-1 rounded bg-sky-50 text-sky-700">
              <HeartPulse className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 pt-0.5">
            <span className="text-2xl font-semibold font-mono tabular-nums text-neutral-900">
              {presentAlerts.length}
            </span>
            <span className="text-xs text-neutral-500 font-mono">em sala agora</span>
          </div>
          <div className="text-[11px] text-neutral-500 flex items-center justify-between pt-1 border-t border-neutral-100">
            <span>Cuidados especiais</span>
            <span className="font-medium text-neutral-700 font-mono">Médicos / Busca</span>
          </div>
        </div>

        {/* KPI 5: Integridade Operacional Local */}
        <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-1 shadow-2xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span className="font-medium text-neutral-600">Fila local Outbox</span>
            <span className="p-1 rounded bg-neutral-100 text-neutral-700">
              <Layers className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 pt-0.5">
            <span className="text-2xl font-semibold font-mono tabular-nums text-neutral-900">{pendingOutbox}</span>
            <span className="text-xs text-neutral-500 font-mono">pendentes</span>
          </div>
          <div className="text-[11px] text-neutral-500 flex items-center justify-between pt-1 border-t border-neutral-100">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              SQLite WAL
            </span>
            <span className="font-mono text-emerald-800 font-medium">&lt; 1ms latência</span>
          </div>
        </div>
      </div>

      {/* 3. Ergonomic Filter Bar */}
      <div className="bg-white rounded-xl border border-neutral-200 p-3 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-center gap-2 text-neutral-600 font-medium">
          <Filter className="w-3.5 h-3.5 text-[#0f766e]" />
          <span>Segmentação e Filtros de Visualização:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Turno */}
          <div className="flex items-center bg-neutral-100 p-0.5 rounded-lg border border-neutral-200">
            <button
              onClick={() => setShiftFilter('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                shiftFilter === 'all' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Todos os Turnos
            </button>
            <button
              onClick={() => setShiftFilter('morning')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                shiftFilter === 'morning' ? 'bg-white text-[#0f766e] shadow-2xs font-semibold' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Manhã (07h – 12h30)
            </button>
            <button
              onClick={() => setShiftFilter('afternoon')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                shiftFilter === 'afternoon' ? 'bg-white text-[#0f766e] shadow-2xs font-semibold' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Tarde (13h – 18h)
            </button>
          </div>

          {/* Segmento */}
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value as any)}
            className="bg-neutral-50 border border-neutral-300 rounded-lg px-2.5 py-1 text-xs text-neutral-800 focus:outline-none focus:border-[#0f766e] cursor-pointer"
          >
            <option value="all">Todos os Segmentos</option>
            <option value="medio">Ensino Médio</option>
            <option value="fundamental">Ensino Fundamental II</option>
          </select>
        </div>
      </div>

      {/* 4. Main Analytical Grid: Hourly Flow (7 cols) + Class Breakdown (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Hourly Flow Chart Card */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-neutral-200 p-5 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-100">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#0f766e]" />
                Fluxo de Portaria por Horário
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Volume de movimentação nas catracas entre 06:00 e 18:00
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-neutral-700 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#0f766e]" />
                Entradas ({totalEntriesToday})
              </span>
              <span className="flex items-center gap-1.5 text-neutral-700 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                Saídas ({totalExitsToday})
              </span>
            </div>
          </div>

          {/* Graphical Bars */}
          <div className="space-y-2 pt-1">
            <div className="h-44 flex items-end gap-1.5 pb-2 px-1 border-b border-neutral-200 bg-neutral-50/60 rounded-lg p-2">
              {Object.entries(hoursMap).map(([hour, counts]) => {
                const totalInHour = counts.entry + counts.exit;
                const maxVal = Math.max(...Object.values(hoursMap).map((c) => c.entry + c.exit), 6);
                const isPeak = hour === peakHour.hour && peakHour.count > 0;

                return (
                  <div key={hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className="w-full flex items-end justify-center gap-0.5 h-32">
                      <div
                        style={{ height: `${Math.max((counts.entry / maxVal) * 100, counts.entry > 0 ? 10 : 2)}%` }}
                        className={`w-1/2 rounded-t transition-all duration-150 group-hover:brightness-90 ${
                          counts.entry > 0 ? 'bg-[#0f766e]' : 'bg-neutral-200/50'
                        }`}
                      />
                      <div
                        style={{ height: `${Math.max((counts.exit / maxVal) * 100, counts.exit > 0 ? 10 : 2)}%` }}
                        className={`w-1/2 rounded-t transition-all duration-150 group-hover:brightness-90 ${
                          counts.exit > 0 ? 'bg-amber-500' : 'bg-neutral-200/50'
                        }`}
                      />
                    </div>
                    <span
                      className={`text-[10px] font-mono tabular-nums ${
                        isPeak ? 'font-bold text-[#0f766e]' : 'text-neutral-400'
                      }`}
                    >
                      {hour.slice(0, 2)}h
                    </span>

                    {/* Tooltip */}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-neutral-900 text-white text-[10px] px-2.5 py-1 rounded shadow-md pointer-events-none whitespace-nowrap z-20 font-mono tabular-nums">
                      {hour} &bull; {counts.entry} ent. / {counts.exit} saí.
                    </div>
                  </div>
                );
              })}
            </div>

            {/* School Schedule Windows Legend */}
            <div className="grid grid-cols-3 gap-2 text-[11px] text-neutral-500 pt-1">
              <div className="p-2 rounded bg-neutral-50 border border-neutral-200 text-center">
                <span className="font-semibold text-neutral-800 block">07:00 – 07:30</span>
                <span>Pico de acolhimento manhã</span>
              </div>
              <div className="p-2 rounded bg-neutral-50 border border-neutral-200 text-center">
                <span className="font-semibold text-neutral-800 block">11:45 – 13:00</span>
                <span>Troca de turno / Almoço</span>
              </div>
              <div className="p-2 rounded bg-neutral-50 border border-neutral-200 text-center">
                <span className="font-semibold text-neutral-800 block">17:00 – 18:00</span>
                <span>Dispersão e encerramento</span>
              </div>
            </div>
          </div>
        </div>

        {/* Breakdown by Classroom Card */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-neutral-200 p-5 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0f766e]" />
                Presença por Turma e Série
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">Quórum de sala em tempo real</p>
            </div>
            <span className="text-[11px] font-mono text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded">
              {classStats.length} turmas ativas
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {classStats.map((cs) => (
              <div
                key={cs.classRoom.id}
                onClick={() => setShowClassDetailModal(cs.classRoom)}
                className="p-3 rounded-lg border border-neutral-200 hover:border-[#0f766e] bg-neutral-50 hover:bg-white transition-all duration-150 cursor-pointer space-y-2 group shadow-2xs"
              >
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-neutral-900 group-hover:text-[#0f766e] transition-colors">
                      {cs.classRoom.name}
                    </span>
                    <span className="text-[11px] text-neutral-500 ml-2 font-mono">
                      {cs.classRoom.grade}
                    </span>
                  </div>
                  <div className="text-neutral-600 font-mono tabular-nums text-xs flex items-center gap-1.5">
                    <span className="font-bold text-neutral-900">{cs.present}</span>/{cs.total}
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                        cs.rate >= 80
                          ? 'bg-emerald-100 text-emerald-800'
                          : cs.rate >= 50
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {cs.rate}%
                    </span>
                  </div>
                </div>

                {/* Progress Multi-Bar: Presentes (Verde) | Saíram (Âmbar) | Ausentes (Neutro) */}
                <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${cs.total > 0 ? (cs.present / cs.total) * 100 : 0}%` }}
                    className="bg-[#0f766e] h-full"
                    title={`Presentes: ${cs.present}`}
                  />
                  <div
                    style={{ width: `${cs.total > 0 ? (cs.exited / cs.total) * 100 : 0}%` }}
                    className="bg-amber-500 h-full"
                    title={`Já saíram: ${cs.exited}`}
                  />
                  <div
                    style={{ width: `${cs.total > 0 ? (cs.absent / cs.total) * 100 : 0}%` }}
                    className="bg-neutral-300 h-full"
                    title={`Ausentes: ${cs.absent}`}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-0.5">
                  <span>{cs.present} em sala &bull; {cs.absent} ausentes</span>
                  <span className="text-[#0f766e] group-hover:underline flex items-center gap-0.5 font-medium">
                    Ver chamada <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 flex items-center justify-between text-xs text-neutral-600">
            <span>Retificações formais hoje:</span>
            <span className="font-mono tabular-nums font-semibold text-neutral-800">
              {totalCorrectionsToday} registradas
            </span>
          </div>
        </div>
      </div>

      {/* 5. Bottom Grid: Live Gate Stream & Care Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Live Gate Feed (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-neutral-200 p-5 space-y-3.5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#0f766e]" />
                Últimas Passagens Registradas na Portaria
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">Histórico cronológico imutável com carimbo UTC/Local</p>
            </div>
            <span className="text-[11px] font-mono text-neutral-500">
              Total hoje: {todayEvents.length}
            </span>
          </div>

          <div className="space-y-2">
            {todayEvents.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500 bg-neutral-50 rounded-lg border border-dashed border-neutral-200">
                Nenhum evento registrado hoje até o momento. Bipe uma carteirinha na Portaria ou clique em &quot;Carregar amostra matutina&quot;.
              </div>
            ) : (
              todayEvents.slice(0, 5).map((ev) => {
                const stu = students.find((s) => s.id === ev.student_id);
                const cls = classrooms.find((c) => c.id === stu?.class_id);
                const isEntry = ev.event_type === 'entry';
                const timeStr = new Date(ev.occurred_at_device).toLocaleTimeString('pt-BR');

                return (
                  <div
                    key={ev.id}
                    className="p-3 rounded-lg border border-neutral-200 bg-neutral-50/70 hover:bg-white flex items-center justify-between text-xs transition-colors shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-200 shrink-0 border border-neutral-300">
                        {stu?.photo_ref ? (
                          <img src={stu.photo_ref} alt={stu.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-neutral-600 font-mono text-[10px]">
                            {stu?.full_name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-neutral-900">{stu?.full_name || 'Estudante'}</div>
                        <div className="text-[11px] text-neutral-500 font-mono">
                          Matrícula: {stu?.enrollment_code} &bull; {cls?.name || 'Turma'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <div className="font-mono font-semibold text-neutral-800">{timeStr}</div>
                        <span className="text-[10px] text-neutral-400 font-mono uppercase">
                          Leitor {ev.source}
                        </span>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 ${
                          isEntry
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                            : 'bg-amber-100 text-amber-900 border border-amber-200'
                        }`}
                      >
                        {isEntry ? <UserCheck className="w-3 h-3 text-emerald-700" /> : <LogOut className="w-3 h-3 text-amber-700" />}
                        {isEntry ? 'Entrada' : 'Saída'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Protection & Medical Care Alerts (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-neutral-200 p-5 space-y-3.5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-sky-700" />
                Acolhimento & Alertas Ativos
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">Estudantes no recinto com cuidados especiais</p>
            </div>
            <span className="text-[11px] font-mono text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full font-medium">
              {presentAlerts.length} identificados
            </span>
          </div>

          <div className="space-y-2.5">
            {presentAlerts.length === 0 ? (
              <div className="p-6 text-center text-xs text-neutral-500 bg-neutral-50 rounded-lg border border-dashed border-neutral-200">
                Nenhum estudante com alerta médico ou restrição cadastral presente no momento.
              </div>
            ) : (
              presentAlerts.map((stu) => {
                const cls = classrooms.find((c) => c.id === stu.class_id);
                return (
                  <div
                    key={stu.id}
                    className="p-3 rounded-lg border border-sky-200 bg-sky-50/50 space-y-1.5 text-xs shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-neutral-900">{stu.full_name}</div>
                      <span className="font-mono text-[10px] bg-sky-100 text-sky-900 font-semibold px-2 py-0.5 rounded">
                        {cls?.name}
                      </span>
                    </div>
                    <div className="text-[11px] text-sky-900 bg-white/80 p-2 rounded border border-sky-100">
                      {stu.id === 'stu_004' && '⚠️ Alergia severa a amendoim e castanhas. Kit antialérgico na enfermaria.'}
                      {stu.id === 'stu_001' && 'ℹ️ Autorização especial de retirada: Apenas avó materna Renata Silva.'}
                      {stu.block_reason && `⚠️ ${stu.block_reason}`}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-0.5 font-mono">
                      <span>Responsável: {stu.guardian_name}</span>
                      <span>{stu.guardian_phone}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: Alunos Ausentes & Busca Ativa */}
      {showAbsenteesModal && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-2xl w-full p-5 shadow-xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div>
                <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-2">
                  <UserX className="w-4 h-4 text-rose-600" />
                  Alunos Ausentes Hoje ({absentCount})
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Estudantes sem registro de entrada na portaria nesta data letiva ({todayStr})
                </p>
              </div>
              <button
                onClick={() => setShowAbsenteesModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar ausente por nome ou matrícula..."
                  value={absentSearchQuery}
                  onChange={(e) => setAbsentSearchQuery(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg pl-9 pr-3 py-2 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-[#0f766e]"
                />
              </div>

              <select
                value={absentClassFilter}
                onChange={(e) => setAbsentClassFilter(e.target.value)}
                className="bg-white border border-neutral-300 rounded-lg px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:border-[#0f766e] cursor-pointer"
              >
                <option value="all">Todas as turmas</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {filteredAbsentList.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-500">
                  Nenhum estudante ausente encontrado para este filtro.
                </div>
              ) : (
                filteredAbsentList.map((stu) => {
                  const cls = classrooms.find((c) => c.id === stu.class_id);
                  const cleanPhone = stu.guardian_phone?.replace(/\D/g, '') || '';
                  const waMessage = encodeURIComponent(
                    `Olá ${stu.guardian_name || 'Sr(a)'}, a Escola Horizonte informa que o(a) aluno(a) ${stu.full_name} (Matrícula: ${stu.enrollment_code}) ainda não registrou entrada na portaria hoje (${todayStr}). Em caso de dúvidas, favor contatar a coordenação.`
                  );

                  return (
                    <div
                      key={stu.id}
                      className="p-3 rounded-lg border border-neutral-200 bg-neutral-50/70 hover:bg-white flex items-center justify-between text-xs transition-colors duration-150"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-200 shrink-0 border border-neutral-300">
                          {stu.photo_ref ? (
                            <img src={stu.photo_ref} alt={stu.full_name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-neutral-600 font-mono text-[10px]">
                              {stu.full_name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-neutral-900">{stu.full_name}</div>
                          <div className="text-[11px] text-neutral-500 font-mono">
                            Matrícula: {stu.enrollment_code} &bull; {cls?.name || 'Sem turma'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {stu.guardian_phone ? (
                          <>
                            <a
                              href={`https://wa.me/55${cleanPhone}?text=${waMessage}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Enviar aviso de ausência via WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </a>
                            <a
                              href={`tel:${cleanPhone}`}
                              className="px-2.5 py-1.5 rounded-lg border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-medium text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                              title="Ligar para responsável"
                            >
                              <Phone className="w-3 h-3 text-[#0f766e]" />
                              <span>Ligar</span>
                            </a>
                          </>
                        ) : (
                          <span className="text-[11px] text-neutral-400">Sem telefone</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-neutral-200 flex items-center justify-between">
              <button
                onClick={handleExportCsv}
                className="text-xs text-[#0f766e] font-semibold hover:underline flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar lista (.CSV)</span>
              </button>
              <button
                onClick={() => setShowAbsenteesModal(false)}
                className="px-4 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-xs font-medium text-neutral-700 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Exportação Consolidada */}
      {showExportModal && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-md w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-2">
                <Download className="w-4 h-4 text-[#0f766e]" />
                Exportar Relatório Diário de Frequência
              </h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-500">
              Escolha o formato institucional para prestação de contas da data de hoje ({todayStr}):
            </p>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => {
                  handleExportCsv();
                  setShowExportModal(false);
                }}
                className="w-full p-3 rounded-lg border border-neutral-200 hover:border-[#0f766e] bg-neutral-50 hover:bg-white text-left flex items-center justify-between transition-colors duration-150 cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-emerald-50 text-[#0f766e] flex items-center justify-center">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-neutral-900">Planilha Completa (.CSV)</div>
                    <div className="text-[11px] text-neutral-500">
                      Inclui presentes, ausentes, horários e responsáveis
                    </div>
                  </div>
                </div>
                <Download className="w-4 h-4 text-[#0f766e]" />
              </button>

              <button
                onClick={() => {
                  window.print();
                  setShowExportModal(false);
                }}
                className="w-full p-3 rounded-lg border border-neutral-200 hover:border-[#0f766e] bg-neutral-50 hover:bg-white text-left flex items-center justify-between transition-colors duration-150 cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-sky-50 text-sky-700 flex items-center justify-center">
                    <Printer className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-neutral-900">Imprimir Resumo (PDF/A4)</div>
                    <div className="text-[11px] text-neutral-500">
                      Layout formatado para a coordenação pedagógica e direção
                    </div>
                  </div>
                </div>
                <Printer className="w-4 h-4 text-sky-700" />
              </button>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-3.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-xs font-medium text-neutral-700 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Detalhamento da Turma (Chamada Rápida) */}
      {showClassDetailModal && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-lg w-full p-5 shadow-xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div>
                <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#0f766e]" />
                  Chamada da Turma: {showClassDetailModal.name}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {showClassDetailModal.grade} &bull; Turno {showClassDetailModal.shift === 'morning' ? 'Matutino' : 'Vespertino'}
                </p>
              </div>
              <button
                onClick={() => setShowClassDetailModal(null)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {activeStudents
                .filter((s) => s.class_id === showClassDetailModal.id)
                .map((stu) => {
                  const statusInfo = studentStatusMap.get(stu.id);
                  const isPresent = statusInfo?.status === 'present';
                  const isExited = statusInfo?.status === 'exited';

                  return (
                    <div
                      key={stu.id}
                      className="p-3 rounded-lg border border-neutral-200 bg-neutral-50 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-neutral-900">{stu.full_name}</div>
                        <div className="text-[11px] text-neutral-500 font-mono">
                          Matrícula: {stu.enrollment_code}
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold ${
                          isPresent
                            ? 'bg-emerald-100 text-emerald-900'
                            : isExited
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-rose-100 text-rose-900'
                        }`}
                      >
                        {isPresent ? 'Em Sala' : isExited ? 'Já Saiu' : 'Ausente'}
                      </span>
                    </div>
                  );
                })}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setShowClassDetailModal(null)}
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
