/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  ChevronDown,
  Trash2,
  GraduationCap,
  Phone,
  Mail,
  X,
  CheckCircle2,
  Edit3,
  AlertTriangle,
  UserCheck,
  Users,
} from 'lucide-react';
import { localDb } from '../services/localDatabase';
import { Guardian, Student } from '../types/database';

export const GuardiansView: React.FC = () => {
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingGuardian, setEditingGuardian] = useState<Guardian | null>(null);
  const [deletingGuardian, setDeletingGuardian] = useState<Guardian | null>(null);

  // Form State
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [relationship, setRelationship] = useState<string>('Mãe');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = () => {
    setGuardians(localDb.getGuardians());
    setStudents(localDb.getStudents());
  };

  useEffect(() => {
    loadData();
    return localDb.subscribe(loadData);
  }, []);

  const filteredGuardians = useMemo(() => {
    return guardians.filter((g) => {
      const matchesSearch =
        g.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.phone.includes(searchQuery) ||
        (g.email && g.email.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesFilter =
        filterType === 'all'
          ? true
          : filterType === 'linked'
          ? g.student_ids.length > 0
          : g.student_ids.length === 0;

      return matchesSearch && matchesFilter;
    });
  }, [guardians, searchQuery, filterType]);

  const handleOpenAddModal = () => {
    setFullName('');
    setPhone('');
    setEmail('');
    setRelationship('Mãe');
    setSelectedStudentIds([]);
    setErrorMessage(null);
    setShowAddModal(true);
  };

  const handleCreateGuardian = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    localDb.addGuardian({
      full_name: fullName.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      relationship,
      student_ids: selectedStudentIds,
    });

    setShowAddModal(false);
    setSuccessMessage('Responsável cadastrado com sucesso.');
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  const handleOpenEditModal = (g: Guardian) => {
    setEditingGuardian(g);
    setFullName(g.full_name);
    setPhone(g.phone);
    setEmail(g.email || '');
    setRelationship(g.relationship || 'Mãe');
    setSelectedStudentIds([...g.student_ids]);
    setErrorMessage(null);
  };

  const handleUpdateGuardian = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGuardian || !fullName.trim()) return;

    try {
      localDb.updateGuardian(editingGuardian.id, {
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        relationship,
        student_ids: selectedStudentIds,
      });

      setSuccessMessage(`Responsável "${fullName}" atualizado com sucesso.`);
      setEditingGuardian(null);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err) {
      setErrorMessage(String(err));
    }
  };

  const handleConfirmDelete = () => {
    if (!deletingGuardian) return;

    localDb.deleteGuardian(deletingGuardian.id);
    setSuccessMessage(`Responsável "${deletingGuardian.full_name}" removido.`);
    setDeletingGuardian(null);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  const toggleStudentSelection = (studentId: string) => {
    if (selectedStudentIds.includes(studentId)) {
      setSelectedStudentIds(selectedStudentIds.filter((id) => id !== studentId));
    } else {
      setSelectedStudentIds([...selectedStudentIds, studentId]);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 tracking-tight flex items-center gap-2">
            Responsáveis e Contatos Autorizados
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Vínculos de contato, autorizações de retirada na portaria e parentesco dos alunos
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="bg-[#0f766e] hover:bg-[#0d5f59] text-white font-medium text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors duration-150 self-start sm:self-auto cursor-pointer shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Novo responsável</span>
        </button>
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

      {/* Top Metrics Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-xl border border-neutral-200 p-3.5 space-y-1 shadow-2xs">
          <div className="text-xs font-medium text-neutral-500">Total de responsáveis</div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-neutral-900">
            {guardians.length}
          </div>
          <div className="text-[11px] text-neutral-400">Cadastros no sistema</div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-3.5 space-y-1 shadow-2xs">
          <div className="text-xs font-medium text-neutral-500">Com alunos vinculados</div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-emerald-700">
            {guardians.filter((g) => g.student_ids.length > 0).length}
          </div>
          <div className="text-[11px] text-neutral-400">Autorizados para retirada</div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-3.5 space-y-1 shadow-2xs">
          <div className="text-xs font-medium text-neutral-500">Sem alunos vinculados</div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-neutral-600">
            {guardians.filter((g) => g.student_ids.length === 0).length}
          </div>
          <div className="text-[11px] text-neutral-400">Cadastros pendentes</div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-3.5 space-y-1 shadow-2xs">
          <div className="text-xs font-medium text-neutral-500">Telefones ativos</div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-[#0f766e]">
            {guardians.filter((g) => g.phone && g.phone.length > 5).length}
          </div>
          <div className="text-[11px] text-neutral-400">Canais de emergência</div>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-2xs">
        {/* Filter Bar */}
        <div className="p-3 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar responsável por nome, telefone ou e-mail..."
                aria-label="Buscar responsáveis"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-neutral-300 rounded-lg pl-9 pr-3 py-1.5 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[#0f766e] transition-colors duration-150"
              />
            </div>

            {/* Filter Dropdown */}
            <div className="relative">
              <select
                aria-label="Filtrar responsáveis"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-700 pr-7 focus:outline-none focus:border-[#0f766e] appearance-none cursor-pointer"
              >
                <option value="all">Todos os cadastros</option>
                <option value="linked">Com estudantes vinculados</option>
                <option value="unlinked">Sem estudantes vinculados</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400 pointer-events-none absolute right-2 top-2" />
            </div>
          </div>

          <div className="text-neutral-500 text-xs font-mono tabular-nums">
            {filteredGuardians.length} {filteredGuardians.length === 1 ? 'registro' : 'registros'}
          </div>
        </div>

        {/* Content Body */}
        {filteredGuardians.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto mb-2.5 border border-neutral-200">
              <Search className="w-5 h-5 stroke-[1.75]" />
            </div>
            <h3 className="font-semibold text-neutral-900 text-sm">
              Nenhum responsável encontrado
            </h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-0.5">
              Cadastre responsáveis para associá-los aos alunos e definir autorizações de retirada na portaria.
            </p>
            <button
              onClick={handleOpenAddModal}
              className="mt-3.5 px-3.5 py-1.5 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 font-medium text-xs inline-flex items-center gap-1.5 transition-colors duration-150 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#0f766e]" />
              <span>Cadastrar responsável</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-50 text-neutral-500 border-b border-neutral-200 font-medium">
                <tr>
                  <th className="py-2.5 px-4">Responsável</th>
                  <th className="py-2.5 px-4">Parentesco</th>
                  <th className="py-2.5 px-4">Contato</th>
                  <th className="py-2.5 px-4">Estudantes vinculados</th>
                  <th className="py-2.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-800">
                {filteredGuardians.map((g) => {
                  const linkedStudents = students.filter(
                    (s) => g.student_ids.includes(s.id) && !s.deleted_at
                  );

                  return (
                    <tr
                      key={g.id}
                      className="hover:bg-neutral-50/80 transition-colors duration-150 h-13"
                    >
                      <td className="py-2 px-4 font-medium text-neutral-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center font-bold text-xs shrink-0 border border-neutral-200">
                            {g.full_name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div>{g.full_name}</div>
                            <div className="text-[10px] font-mono text-neutral-400">
                              ID: {g.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-2 px-4">
                        <span className="px-2 py-0.5 rounded text-xs bg-neutral-100 text-neutral-700 border border-neutral-200">
                          {g.relationship}
                        </span>
                      </td>

                      <td className="py-2 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-neutral-800 font-mono tabular-nums">
                            <Phone className="w-3 h-3 text-[#0f766e]" />
                            <span>{g.phone || 'Sem telefone'}</span>
                          </div>
                          {g.email && (
                            <div className="flex items-center gap-1.5 text-neutral-500 text-[11px]">
                              <Mail className="w-3 h-3 text-neutral-400" />
                              <span>{g.email}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-2 px-4">
                        {linkedStudents.length === 0 ? (
                          <span className="text-neutral-400 text-xs italic">
                            Nenhum estudante vinculado
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {linkedStudents.map((s) => (
                              <span
                                key={s.id}
                                className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 text-xs font-medium flex items-center gap-1 border border-neutral-200"
                              >
                                <GraduationCap className="w-3 h-3 text-[#0f766e]" />
                                <span>{s.full_name}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="py-2 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditModal(g)}
                            title="Editar dados do responsável"
                            className="p-1.5 rounded border border-neutral-200 hover:bg-neutral-100 text-neutral-600 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-[#0f766e]" />
                          </button>
                          <button
                            onClick={() => setDeletingGuardian(g)}
                            title="Excluir responsável"
                            className="p-1.5 rounded border border-neutral-200 hover:bg-rose-50 text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal 1: Novo Responsável */}
      {showAddModal && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-lg w-full p-5 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
              <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#0f766e]" />
                Cadastrar Novo Responsável
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGuardian} className="space-y-3.5 text-xs text-neutral-700">
              <div>
                <label className="block text-neutral-800 font-medium mb-1">
                  Nome completo *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: Ana Maria Silveira"
                  className="w-full bg-white border border-neutral-300 rounded-lg p-2 text-neutral-900 focus:outline-none focus:border-[#0f766e]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-800 font-medium mb-1">
                    Grau de parentesco *
                  </label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full bg-white border border-neutral-300 rounded-lg p-2 text-neutral-900 focus:outline-none focus:border-[#0f766e]"
                  >
                    <option value="Mãe">Mãe</option>
                    <option value="Pai">Pai</option>
                    <option value="Avó / Avô">Avó / Avô</option>
                    <option value="Tio / Tia">Tio / Tia</option>
                    <option value="Irmão / Irmã">Irmão / Irmã</option>
                    <option value="Tutor Legal">Tutor Legal</option>
                    <option value="Outro Autorizado">Outro Autorizado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-800 font-medium mb-1">
                    Telefone para contato *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ex: (11) 98765-4321"
                    className="w-full bg-white border border-neutral-300 rounded-lg p-2 text-neutral-900 font-mono tabular-nums focus:outline-none focus:border-[#0f766e]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-800 font-medium mb-1">
                  E-mail (opcional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ex: ana.silveira@email.com"
                  className="w-full bg-white border border-neutral-300 rounded-lg p-2 text-neutral-900 focus:outline-none focus:border-[#0f766e]"
                />
              </div>

              <div>
                <label className="block text-neutral-800 font-medium mb-1">
                  Vincular a estudantes:
                </label>
                <div className="max-h-36 overflow-y-auto border border-neutral-200 rounded-lg p-2 space-y-1 bg-neutral-50">
                  {students.map((s) => {
                    const isChecked = selectedStudentIds.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-white cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleStudentSelection(s.id)}
                          className="rounded text-[#0f766e] focus:ring-0"
                        />
                        <span className="font-medium text-neutral-900">{s.full_name}</span>
                        <span className="text-neutral-400 font-mono tabular-nums">
                          ({s.enrollment_code})
                        </span>
                      </label>
                    );
                  })}
                </div>
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
                  Salvar Responsável
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Editar Responsável */}
      {editingGuardian && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-lg w-full p-5 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
              <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#0f766e]" />
                Editar Responsável ({editingGuardian.full_name})
              </h3>
              <button
                onClick={() => setEditingGuardian(null)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateGuardian} className="space-y-3.5 text-xs text-neutral-700">
              <div>
                <label className="block text-neutral-800 font-medium mb-1">
                  Nome completo *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg p-2 text-neutral-900 focus:outline-none focus:border-[#0f766e]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-800 font-medium mb-1">
                    Grau de parentesco *
                  </label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full bg-white border border-neutral-300 rounded-lg p-2 text-neutral-900 focus:outline-none focus:border-[#0f766e]"
                  >
                    <option value="Mãe">Mãe</option>
                    <option value="Pai">Pai</option>
                    <option value="Avó / Avô">Avó / Avô</option>
                    <option value="Tio / Tia">Tio / Tia</option>
                    <option value="Irmão / Irmã">Irmão / Irmã</option>
                    <option value="Tutor Legal">Tutor Legal</option>
                    <option value="Outro Autorizado">Outro Autorizado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-800 font-medium mb-1">
                    Telefone para contato *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white border border-neutral-300 rounded-lg p-2 text-neutral-900 font-mono tabular-nums focus:outline-none focus:border-[#0f766e]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-800 font-medium mb-1">
                  E-mail (opcional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg p-2 text-neutral-900 focus:outline-none focus:border-[#0f766e]"
                />
              </div>

              <div>
                <label className="block text-neutral-800 font-medium mb-1">
                  Vincular a estudantes:
                </label>
                <div className="max-h-36 overflow-y-auto border border-neutral-200 rounded-lg p-2 space-y-1 bg-neutral-50">
                  {students.map((s) => {
                    const isChecked = selectedStudentIds.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-white cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleStudentSelection(s.id)}
                          className="rounded text-[#0f766e] focus:ring-0"
                        />
                        <span className="font-medium text-neutral-900">{s.full_name}</span>
                        <span className="text-neutral-400 font-mono tabular-nums">
                          ({s.enrollment_code})
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setEditingGuardian(null)}
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

      {/* Modal 3: Confirmar Exclusão de Responsável */}
      {deletingGuardian && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-sm w-full p-5 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
              <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Excluir Responsável
              </h3>
              <button
                onClick={() => setDeletingGuardian(null)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-neutral-700 space-y-2">
              <p>
                Tem certeza que deseja excluir o cadastro de{' '}
                <strong className="text-neutral-900">
                  {deletingGuardian.full_name}
                </strong>
                ?
              </p>
              <p className="text-[11px] text-neutral-500">
                Os vínculos com os alunos serão desfeitos na portaria.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200">
              <button
                onClick={() => setDeletingGuardian(null)}
                className="px-3.5 py-1.5 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50 text-xs font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
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
