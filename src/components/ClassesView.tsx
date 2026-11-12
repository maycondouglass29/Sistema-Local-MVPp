/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Users,
  Clock,
  X,
  CheckCircle2,
  Edit3,
  Trash2,
  AlertTriangle,
  Search,
  GraduationCap,
} from 'lucide-react';
import { localDb } from '../services/localDatabase';
import { ClassRoom, Student } from '../types/database';

export const ClassesView: React.FC = () => {
  const [classrooms, setClassrooms] = useState<ClassRoom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingClass, setEditingClass] = useState<ClassRoom | null>(null);
  const [deletingClass, setDeletingClass] = useState<ClassRoom | null>(null);

  // Form State (Create / Edit)
  const [className, setClassName] = useState<string>('');
  const [grade, setGrade] = useState<string>('Ensino Médio');
  const [shift, setShift] = useState<'morning' | 'afternoon' | 'integral'>('morning');

  // Messages
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = () => {
    setClassrooms(localDb.getClassrooms());
    setStudents(localDb.getStudents());
  };

  useEffect(() => {
    loadData();
    return localDb.subscribe(loadData);
  }, []);

  const filteredClassrooms = useMemo(() => {
    return classrooms.filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.grade.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [classrooms, searchQuery]);

  const handleOpenAddModal = () => {
    setClassName('');
    setGrade('Ensino Médio');
    setShift('morning');
    setErrorMessage(null);
    setShowAddModal(true);
  };

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim()) return;

    localDb.addClassroom(className.trim(), grade, shift);
    setShowAddModal(false);
    setClassName('');
    setSuccessMessage(`Turma "${className}" criada com sucesso.`);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  const handleOpenEditModal = (c: ClassRoom) => {
    setEditingClass(c);
    setClassName(c.name);
    setGrade(c.grade);
    setShift(c.shift);
    setErrorMessage(null);
  };

  const handleUpdateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass || !className.trim()) return;

    try {
      localDb.updateClassroom(editingClass.id, {
        name: className.trim(),
        grade,
        shift,
      });
      setSuccessMessage(`Turma "${className}" atualizada com sucesso.`);
      setEditingClass(null);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err) {
      setErrorMessage(String(err));
    }
  };

  const handleDeleteClass = () => {
    if (!deletingClass) return;

    const res = localDb.deleteClassroom(deletingClass.id);
    if (!res.success) {
      setErrorMessage(res.message || 'Erro ao excluir turma.');
      setDeletingClass(null);
      setTimeout(() => setErrorMessage(null), 5000);
      return;
    }

    setSuccessMessage(`Turma "${deletingClass.name}" excluída com sucesso.`);
    setDeletingClass(null);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 tracking-tight flex items-center gap-2">
            Turmas e Séries
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Gestão completa de salas, séries e turnos escolares para controle de acesso na portaria
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Buscar turma ou série..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white border border-neutral-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[#0f766e] w-48 sm:w-56"
            />
          </div>

          <button
            onClick={handleOpenAddModal}
            className="bg-[#0f766e] hover:bg-[#0d5f59] text-white font-medium text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors duration-150 cursor-pointer shadow-2xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova turma</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Top Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-xl border border-neutral-200 p-3.5 space-y-1 shadow-2xs">
          <div className="text-xs font-medium text-neutral-500">Total de turmas</div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-neutral-900">
            {classrooms.length}
          </div>
          <div className="text-[11px] text-neutral-400">Salas cadastradas</div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-3.5 space-y-1 shadow-2xs">
          <div className="text-xs font-medium text-neutral-500">Total de estudantes</div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-neutral-900">
            {students.length}
          </div>
          <div className="text-[11px] text-neutral-400">Matrículas ativas e gerais</div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-3.5 space-y-1 shadow-2xs">
          <div className="text-xs font-medium text-neutral-500">Média por turma</div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-neutral-900">
            {classrooms.length > 0
              ? (students.length / classrooms.length).toFixed(1)
              : '0'}
          </div>
          <div className="text-[11px] text-neutral-400">Estudantes por sala</div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-3.5 space-y-1 shadow-2xs">
          <div className="text-xs font-medium text-neutral-500">Turnos operacionais</div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-emerald-700">
            {new Set(classrooms.map((c) => c.shift)).size}
          </div>
          <div className="text-[11px] text-neutral-400">Manhã, Tarde e Integral</div>
        </div>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClassrooms.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl border border-neutral-200 p-12 text-center text-neutral-400">
            Nenhuma turma encontrada para a busca "{searchQuery}".
          </div>
        ) : (
          filteredClassrooms.map((c) => {
            const classStudents = students.filter(
              (s) => s.class_id === c.id && !s.deleted_at
            );
            const activeStudents = classStudents.filter((s) => s.status === 'active');

            return (
              <div
                key={c.id}
                className="bg-white rounded-xl border border-neutral-200 p-4.5 flex flex-col justify-between space-y-4 hover:border-neutral-300 transition-all duration-150 shadow-2xs"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200 flex items-center gap-1">
                      <GraduationCap className="w-3 h-3 text-neutral-500" />
                      {c.grade}
                    </span>
                    <span className="text-xs text-neutral-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-neutral-400" />
                      {c.shift === 'morning'
                        ? 'Manhã (07:00)'
                        : c.shift === 'afternoon'
                        ? 'Tarde (13:00)'
                        : 'Integral'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-neutral-900">
                      {c.name}
                    </h3>
                    <div className="text-xs font-mono text-neutral-400 mt-0.5">
                      ID: {c.id}
                    </div>
                  </div>
                </div>

                <div className="border-t border-neutral-100 pt-3 flex items-center justify-between text-xs text-neutral-600">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-neutral-400" />
                    <span>
                      <strong className="text-neutral-900 font-mono tabular-nums">
                        {classStudents.length}
                      </strong>{' '}
                      matriculados
                    </span>
                    <span className="font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 text-[10px]">
                      {activeStudents.length} ativos
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(c)}
                      title="Editar dados da turma"
                      className="p-1.5 rounded border border-neutral-200 hover:bg-neutral-100 text-neutral-600 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#0f766e]" />
                    </button>
                    <button
                      onClick={() => setDeletingClass(c)}
                      title="Excluir turma"
                      className="p-1.5 rounded border border-neutral-200 hover:bg-rose-50 text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer"
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

      {/* Modal 1: Nova Turma */}
      {showAddModal && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-md w-full p-5 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
              <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#0f766e]" />
                Criar Nova Turma
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-3.5 text-xs text-neutral-700">
              <div>
                <label className="block text-neutral-800 font-medium mb-1">
                  Nome da turma *
                </label>
                <input
                  type="text"
                  required
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="Ex: 1º Ano C"
                  className="w-full bg-white border border-neutral-300 rounded-lg p-2 text-neutral-900 focus:outline-none focus:border-[#0f766e]"
                />
              </div>

              <div>
                <label className="block text-neutral-800 font-medium mb-1">
                  Segmento / Série *
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg p-2 text-neutral-900 focus:outline-none focus:border-[#0f766e]"
                >
                  <option value="Ensino Médio">Ensino Médio</option>
                  <option value="Fundamental II">Ensino Fundamental II</option>
                  <option value="Fundamental I">Ensino Fundamental I</option>
                  <option value="Educação Infantil">Educação Infantil</option>
                </select>
              </div>

              <div>
                <label className="block text-neutral-800 font-medium mb-1">
                  Turno de funcionamento *
                </label>
                <select
                  value={shift}
                  onChange={(e) =>
                    setShift(e.target.value as 'morning' | 'afternoon' | 'integral')
                  }
                  className="w-full bg-white border border-neutral-300 rounded-lg p-2 text-neutral-900 focus:outline-none focus:border-[#0f766e]"
                >
                  <option value="morning">Manhã (07:00 - 12:30)</option>
                  <option value="afternoon">Tarde (13:00 - 18:30)</option>
                  <option value="integral">Integral (07:00 - 17:30)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50 font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-[#0f766e] hover:bg-[#0d5f59] text-white font-medium cursor-pointer"
                >
                  Salvar Turma
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Editar Turma */}
      {editingClass && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-md w-full p-5 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
              <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#0f766e]" />
                Editar Turma ({editingClass.name})
              </h3>
              <button
                onClick={() => setEditingClass(null)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateClass} className="space-y-3.5 text-xs text-neutral-700">
              <div>
                <label className="block text-neutral-800 font-medium mb-1">
                  Nome da turma *
                </label>
                <input
                  type="text"
                  required
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg p-2 text-neutral-900 focus:outline-none focus:border-[#0f766e]"
                />
              </div>

              <div>
                <label className="block text-neutral-800 font-medium mb-1">
                  Segmento / Série *
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg p-2 text-neutral-900 focus:outline-none focus:border-[#0f766e]"
                >
                  <option value="Ensino Médio">Ensino Médio</option>
                  <option value="Fundamental II">Ensino Fundamental II</option>
                  <option value="Fundamental I">Ensino Fundamental I</option>
                  <option value="Educação Infantil">Educação Infantil</option>
                </select>
              </div>

              <div>
                <label className="block text-neutral-800 font-medium mb-1">
                  Turno de funcionamento *
                </label>
                <select
                  value={shift}
                  onChange={(e) =>
                    setShift(e.target.value as 'morning' | 'afternoon' | 'integral')
                  }
                  className="w-full bg-white border border-neutral-300 rounded-lg p-2 text-neutral-900 focus:outline-none focus:border-[#0f766e]"
                >
                  <option value="morning">Manhã (07:00 - 12:30)</option>
                  <option value="afternoon">Tarde (13:00 - 18:30)</option>
                  <option value="integral">Integral (07:00 - 17:30)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setEditingClass(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50 font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-[#0f766e] hover:bg-[#0d5f59] text-white font-medium cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Confirmar Exclusão de Turma */}
      {deletingClass && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-sm w-full p-5 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
              <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Excluir Turma
              </h3>
              <button
                onClick={() => setDeletingClass(null)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-neutral-700 space-y-2">
              <p>
                Tem certeza que deseja excluir a turma{' '}
                <strong className="text-neutral-900">{deletingClass.name}</strong>?
              </p>
              {(() => {
                const count = students.filter(
                  (s) => s.class_id === deletingClass.id && !s.deleted_at
                ).length;
                if (count > 0) {
                  return (
                    <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[11px]">
                      Atenção: Existem <strong>{count}</strong> estudante(s) vinculados a esta turma. A exclusão será bloqueada até que sejam remanejados.
                    </div>
                  );
                }
                return (
                  <p className="text-[11px] text-neutral-500">
                    Esta turma não possui alunos vinculados e pode ser removida com segurança.
                  </p>
                );
              })()}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200">
              <button
                onClick={() => setDeletingClass(null)}
                className="px-3.5 py-1.5 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50 text-xs font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteClass}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium cursor-pointer"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
