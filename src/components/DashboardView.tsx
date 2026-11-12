import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { localDb } from '../services/localDatabase';
import { Student, ClassRoom, AttendanceEvent } from '../types/database';

export const DashboardView: React.FC = () => {
  const [, setTick] = useState(0);
  const [showAbsenteesModal, setShowAbsenteesModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
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
  const events = localDb.getAttendanceEvents().filter((e) =>
    e.occurred_at_device.startsWith(todayStr)
  );

  // Compute Present vs Absent
  const presentStudentIds = new Set<string>();
  const exitedStudentIds = new Set<string>();

  students.forEach((stu) => {
    const stuEvents = events
      .filter((e) => e.student_id === stu.id && !e.correction_of_id)
      .sort((a, b) => new Date(b.occurred_at_device).getTime() - new Date(a.occurred_at_device).getTime());

    if (stuEvents.length > 0) {
      if (stuEvents[0].event_type === 'entry') {
        presentStudentIds.add(stu.id);
      } else if (stuEvents[0].event_type === 'exit') {
        exitedStudentIds.add(stu.id);
      }
    }
  });

  const activeStudents = students.filter((s) => s.status === 'active');
  const totalStudents = activeStudents.length;
  const totalPresent = presentStudentIds.size;
  const totalExited = exitedStudentIds.size;
  const absentStudents = activeStudents.filter(
    (s) => !presentStudentIds.has(s.id) && !exitedStudentIds.has(s.id)
  );
  const totalAbsent = absentStudents.length;
  const presencePercent = totalStudents > 0 ? Math.round(((totalPresent + totalExited) / totalStudents) * 100) : 0;

  const totalEntriesToday = events.filter((e) => e.event_type === 'entry' && !e.correction_of_id).length;
  const totalExitsToday = events.filter((e) => e.event_type === 'exit' && !e.correction_of_id).length;
  const totalCorrectionsToday = events.filter((e) => e.event_type === 'correction').length;
  const pendingOutbox = localDb.getPendingOutboxCount();

  // Hourly distribution
  const hoursMap: { [hour: string]: { entry: number; exit: number } } = {};
  for (let i = 6; i <= 18; i++) {
    hoursMap[`${String(i).padStart(2, '0')}:00`] = { entry: 0, exit: 0 };
  }
  events.forEach((ev) => {
    const h = new Date(ev.occurred_at_device).getHours();
    const key = `${String(h).padStart(2, '0')}:00`;
    if (hoursMap[key]) {
      if (ev.event_type === 'entry' && !ev.correction_of_id) hoursMap[key].entry += 1;
      if (ev.event_type === 'exit' && !ev.correction_of_id) hoursMap[key].exit += 1;
    }
  });

  // Class by class statistics
  const classStats = classrooms.map((c) => {
    const classStudents = activeStudents.filter((s) => s.class_id === c.id);
    const presentCount = classStudents.filter((s) => presentStudentIds.has(s.id)).length;
    const rate = classStudents.length > 0 ? Math.round((presentCount / classStudents.length) * 100) : 0;
    return {
      classRoom: c,
      total: classStudents.length,
      present: presentCount,
      rate,
    };
  });

  const filteredAbsentStudents = absentStudents.filter((s) => {
    const matchesSearch =
      s.full_name.toLowerCase().includes(absentSearchQuery.toLowerCase()) ||
      s.enrollment_code.toLowerCase().includes(absentSearchQuery.toLowerCase());
    const matchesClass = absentClassFilter === 'all' || s.class_id === absentClassFilter;
    return matchesSearch && matchesClass;
  });

  const exportDailyCsv = () => {
    const headers = ['Matrícula', 'Aluno', 'Turma', 'Status Hoje', 'Responsável', 'Telefone'];
    const rows = activeStudents.map((s) => {
      const isPres = presentStudentIds.has(s.id);
      const isExit = exitedStudentIds.has(s.id);
      const status = isPres ? 'Presente' : isExit ? 'Já Saiu' : 'Ausente';
      const c = classrooms.find((cl) => cl.id === s.class_id);
      return [
        s.enrollment_code,
        `"${s.full_name}"`,
        `"${c?.name || 'N/A'}"`,
        status,
        `"${s.guardian_name || ''}"`,
        `"${s.guardian_phone || ''}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_frequencia_${todayStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">
            Painel Geral de Frequência
          </h1>
          <p className="text-xs text-neutral-500 mt-1 capitalize">
            {formattedTodayDate} &bull; Banco local SQLite (WAL)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAbsenteesModal(true)}
            className="bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-medium px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors duration-150 cursor-pointer"
          >
            <UserX className="w-3.5 h-3.5 text-neutral-500" />
            <span>Alunos ausentes ({totalAbsent})</span>
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            className="bg-[#0f766e] hover:bg-[#0d5f59] text-white text-xs font-medium px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors duration-150 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar relatório</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Presentes */}
        <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-1">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span className="font-medium">Alunos presentes</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-neutral-900">{totalPresent}</div>
          <div className="text-xs text-neutral-500 flex items-center justify-between pt-1">
            <span>No recinto escolar</span>
            <span className="font-medium text-emerald-700 font-mono tabular-nums">{presencePercent}%</span>
          </div>
        </div>

        {/* Saídas */}
        <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-1">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span className="font-medium">Saídas registradas</span>
            <LogOut className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-neutral-900">{totalExitsToday}</div>
          <div className="text-xs text-neutral-500 pt-1">
            Liberações validadas
          </div>
        </div>

        {/* Ausentes */}
        <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-1">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span className="font-medium">Alunos ausentes</span>
            <UserX className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-neutral-900">{totalAbsent}</div>
          <div className="text-xs text-neutral-500 flex items-center justify-between pt-1">
            <span>Sem registro de entrada</span>
            <button
              onClick={() => setShowAbsenteesModal(true)}
              className="text-xs text-[#0f766e] font-medium hover:underline cursor-pointer"
            >
              Listar
            </button>
          </div>
        </div>

        {/* SQLite Local Sync */}
        <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-1">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span className="font-medium">Eventos em fila</span>
            <Layers className="w-4 h-4 text-neutral-600" />
          </div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-neutral-900">{pendingOutbox}</div>
          <div className="text-xs text-neutral-500 flex items-center gap-1.5 pt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span>Operação local (SQLite WAL)</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Hourly Flow & Turmas Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Hourly Flow Chart Card (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-neutral-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">
                Fluxo de portaria por horário
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">Entradas e saídas registradas na data de hoje</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-neutral-700 font-medium">
                <span className="w-2.5 h-2.5 rounded bg-[#0f766e]" />
                Entradas
              </span>
              <span className="flex items-center gap-1.5 text-neutral-700 font-medium">
                <span className="w-2.5 h-2.5 rounded bg-amber-500" />
                Saídas
              </span>
            </div>
          </div>

          {/* Bar Diagram */}
          <div className="pt-2 border-t border-neutral-100 space-y-2">
            <div className="h-40 flex items-end gap-2 pt-4 pb-2 px-1 border-b border-neutral-200">
              {Object.entries(hoursMap).map(([hour, counts]) => {
                const totalInHour = counts.entry + counts.exit;
                const maxVal = Math.max(...Object.values(hoursMap).map((c) => c.entry + c.exit), 8);

                return (
                  <div key={hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className="w-full flex items-end justify-center gap-0.5 h-28">
                      <div
                        style={{ height: `${Math.max((counts.entry / maxVal) * 100, counts.entry > 0 ? 8 : 2)}%` }}
                        className="w-1/2 bg-[#0f766e] rounded-t transition-opacity duration-150 group-hover:opacity-85"
                      />
                      <div
                        style={{ height: `${Math.max((counts.exit / maxVal) * 100, counts.exit > 0 ? 8 : 2)}%` }}
                        className="w-1/2 bg-amber-500 rounded-t transition-opacity duration-150 group-hover:opacity-85"
                      />
                    </div>
                    <span className="text-[10px] font-mono tabular-nums text-neutral-400">{hour.slice(0, 2)}h</span>

                    {/* Tooltip */}
                    <div className="absolute -top-9 opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-neutral-900 text-white text-[10px] px-2 py-1 rounded shadow pointer-events-none whitespace-nowrap z-10 font-mono tabular-nums">
                      {hour}: {counts.entry} ent. / {counts.exit} saí.
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-xs text-neutral-500 pt-1">
              <span>06:00 (Início)</span>
              <span>Pico matutino: 07:00 – 07:30</span>
              <span>18:00 (Encerramento)</span>
            </div>
          </div>
        </div>

        {/* Breakdown by Class Card (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-neutral-200 p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">
              Presença por turma
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">Percentual de alunos em sala no momento</p>
          </div>

          <div className="space-y-3 pt-2 border-t border-neutral-100">
            {classStats.map((cs) => (
              <div key={cs.classRoom.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-neutral-900">{cs.classRoom.name}</span>
                  <span className="text-neutral-500 font-mono tabular-nums text-xs">
                    <strong className="text-neutral-800">{cs.present}</strong>/{cs.total} ({cs.rate}%)
                  </span>
                </div>
                <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      cs.rate >= 80 ? 'bg-[#0f766e]' : cs.rate >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${cs.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 flex items-center justify-between text-xs text-neutral-600">
            <span>Correções manuais hoje:</span>
            <span className="font-mono tabular-nums font-semibold text-neutral-800">{totalCorrectionsToday} registradas</span>
          </div>
        </div>
      </div>

      {/* MODAL 1: Ausentes do Dia */}
      {showAbsenteesModal && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-2xl w-full p-5 shadow-lg space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div>
                <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-2">
                  <UserX className="w-4 h-4 text-rose-600" />
                  Alunos ausentes na data de hoje ({totalAbsent})
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Estudantes sem registro de entrada na portaria hoje.
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
                className="bg-white border border-neutral-300 rounded-lg px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:border-[#0f766e]"
              >
                <option value="all">Todas as turmas</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Absent List */}
            <div className="overflow-y-auto flex-1 space-y-1.5 pr-1">
              {filteredAbsentStudents.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-500">
                  Nenhum aluno ausente com os filtros informados.
                </div>
              ) : (
                filteredAbsentStudents.map((stu) => {
                  const c = classrooms.find((cl) => cl.id === stu.class_id);
                  return (
                    <div
                      key={stu.id}
                      className="p-3 rounded-lg border border-neutral-200 bg-neutral-50 flex items-center justify-between text-xs hover:bg-white transition-colors duration-150"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-md bg-neutral-200 text-neutral-700 font-semibold flex items-center justify-center font-mono tabular-nums text-xs">
                          {stu.full_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-neutral-900">{stu.full_name}</div>
                          <div className="text-xs text-neutral-500 font-mono tabular-nums">
                            Matrícula: {stu.enrollment_code} &bull; {c?.name || 'Sem turma'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        {stu.guardian_name ? (
                          <div className="text-xs text-neutral-600">
                            <span className="font-medium text-neutral-800">{stu.guardian_name}</span>
                            <div className="text-xs text-neutral-500 flex items-center gap-1 justify-end font-mono tabular-nums">
                              <Phone className="w-3 h-3 text-[#0f766e]" />
                              {stu.guardian_phone}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-400">Sem responsável vinculado</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-neutral-200 flex items-center justify-between">
              <button
                onClick={exportDailyCsv}
                className="text-xs text-[#0f766e] font-medium hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar lista (.CSV)</span>
              </button>
              <button
                onClick={() => setShowAbsenteesModal(false)}
                className="px-3.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-xs font-medium text-neutral-700 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Exportação do Dia */}
      {showExportModal && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-md w-full p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-2">
                <Download className="w-4 h-4 text-[#0f766e]" />
                Exportar relatório diário
              </h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-500">
              Selecione o formato para consolidar as movimentações da data de hoje ({todayStr}):
            </p>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => {
                  exportDailyCsv();
                  setShowExportModal(false);
                }}
                className="w-full p-3 rounded-lg border border-neutral-200 hover:border-[#0f766e] bg-neutral-50 hover:bg-white text-left flex items-center justify-between transition-colors duration-150 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-emerald-50 text-[#0f766e] flex items-center justify-center">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-medium text-xs text-neutral-900">Planilha Completa (.CSV)</div>
                    <div className="text-xs text-neutral-500">
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
                className="w-full p-3 rounded-lg border border-neutral-200 hover:border-[#0f766e] bg-neutral-50 hover:bg-white text-left flex items-center justify-between transition-colors duration-150 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-sky-50 text-sky-700 flex items-center justify-center">
                    <Printer className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-medium text-xs text-neutral-900">Imprimir Resumo (PDF/A4)</div>
                    <div className="text-xs text-neutral-500">
                      Layout formatado para a coordenação pedagógica
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
    </div>
  );
};
