/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Phone,
  Mail,
  X,
  CheckCircle2,
  Edit3,
  AlertTriangle,
  Users,
  LayoutGrid,
  Table as TableIcon,
  MessageCircle,
  ExternalLink,
  UserCheck,
  ShieldCheck,
  Filter,
  GraduationCap,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { localDb } from '../services/localDatabase';
import { Guardian, Student } from '../types/database';

export const GuardiansView: React.FC = () => {
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [relationshipFilter, setRelationshipFilter] = useState<string>('all');
  
  // View mode: 'cards' is pre-selected by default
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

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

  const classrooms = localDb.getClassrooms();

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
      const q = searchQuery.toLowerCase().trim();
      const linkedStudentNames = g.student_ids
        .map((id) => students.find((s) => s.id === id)?.full_name.toLowerCase() || '')
        .join(' ');

      const matchesSearch =
        !q ||
        g.full_name.toLowerCase().includes(q) ||
        g.phone.includes(q) ||
        (g.email && g.email.toLowerCase().includes(q)) ||
        linkedStudentNames.includes(q);

      const matchesLinkFilter =
        filterType === 'all'
          ? true
          : filterType === 'linked'
          ? g.student_ids.length > 0
          : g.student_ids.length === 0;

      const matchesRelFilter =
        relationshipFilter === 'all' ||
        (g.relationship && g.relationship.toLowerCase() === relationshipFilter.toLowerCase());

      return matchesSearch && matchesLinkFilter && matchesRelFilter;
    });
  }, [guardians, students, searchQuery, filterType, relationshipFilter]);

  // Executive Metric Counts
  const totalGuardians = guardians.length;
  const withLinkedStudents = guardians.filter((g) => g.student_ids.length > 0).length;
  const withoutLinkedStudents = guardians.filter((g) => g.student_ids.length === 0).length;
  const verifiedPhones = guardians.filter((g) => g.phone && g.phone.replace(/\D/g, '').length >= 10).length;

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
    <div className="p-6 max-w-7xl mx-auto space-y-5 select-none">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold text-neutral-900 tracking-tight flex items-center gap-2">
              Responsáveis e Contatos Autorizados
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Portaria &bull; Autorização Segura
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Gestão de vínculos de parentesco, canais de emergência e permissões de retirada de estudantes
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View mode toggle: Cards pre-selected by default */}
          <div className="flex items-center bg-white border border-neutral-300 rounded-lg p-0.5 shadow-2xs">
            <button
              onClick={() => setViewMode('cards')}
              title="Visualizar em Cards"
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-neutral-100 text-[#0f766e] font-semibold shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="Visualizar em Lista / Tabela"
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-neutral-100 text-[#0f766e] font-semibold shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="bg-[#0f766e] hover:bg-[#0d5f59] text-white text-xs font-medium px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo responsável</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center gap-2 shadow-2xs">
          <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* 2. Top Executive KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span className="font-medium text-neutral-600">Total de responsáveis</span>
            <span className="p-1 rounded bg-neutral-100 text-neutral-700">
              <Users className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-neutral-900">
            {totalGuardians}
          </div>
          <div className="text-[11px] text-neutral-400 border-t border-neutral-100 pt-1 font-mono">
            Cadastros ativos no sistema
          </div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span className="font-medium text-neutral-600">Autorizados para retirada</span>
            <span className="p-1 rounded bg-emerald-50 text-emerald-700">
              <UserCheck className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-emerald-700">
            {withLinkedStudents}
          </div>
          <div className="text-[11px] text-neutral-400 border-t border-neutral-100 pt-1 font-mono">
            Com vínculo a estudantes
          </div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span className="font-medium text-neutral-600">Canais de emergência</span>
            <span className="p-1 rounded bg-sky-50 text-sky-700">
              <Phone className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-sky-700">
            {verifiedPhones}
          </div>
          <div className="text-[11px] text-neutral-400 border-t border-neutral-100 pt-1 font-mono">
            Telefones com WhatsApp
          </div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs">
            <span className="font-medium text-neutral-600">Vínculos pendentes</span>
            <span className="p-1 rounded bg-neutral-100 text-neutral-700">
              <ShieldCheck className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-neutral-800">
            {withoutLinkedStudents}
          </div>
          <div className="text-[11px] text-neutral-400 border-t border-neutral-100 pt-1 font-mono">
            Sem alunos associados
          </div>
        </div>
      </div>

      {/* 3. Ergonomic Filter Bar */}
      <div className="bg-white rounded-xl border border-neutral-200 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar responsável por nome, telefone, e-mail ou aluno vinculado..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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

          {/* Vínculo Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-neutral-50/70 border border-neutral-300 rounded-lg px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:border-[#0f766e] focus:bg-white transition-all cursor-pointer shadow-2xs"
          >
            <option value="all">Todos os cadastros</option>
            <option value="linked">Com estudantes vinculados</option>
            <option value="unlinked">Sem estudantes vinculados</option>
          </select>

          {/* Parentesco Filter */}
          <select
            value={relationshipFilter}
            onChange={(e) => setRelationshipFilter(e.target.value)}
            className="bg-neutral-50/70 border border-neutral-300 rounded-lg px-3 py-2 text-xs text-neutral-800 focus:outline-none focus:border-[#0f766e] focus:bg-white transition-all cursor-pointer shadow-2xs"
          >
            <option value="all">Todos os parentescos</option>
            <option value="mãe">Apenas Mães</option>
            <option value="pai">Apenas Pais</option>
            <option value="avó">Avós / Tutores</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {(searchQuery || filterType !== 'all' || relationshipFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterType('all');
                setRelationshipFilter('all');
              }}
              className="text-xs text-neutral-500 hover:text-rose-700 px-2.5 py-1 rounded-md border border-neutral-200 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              Limpar filtros
            </button>
          )}

          <span className="text-neutral-600 text-xs font-mono tabular-nums bg-neutral-100 px-2.5 py-1 rounded-lg font-medium">
            {filteredGuardians.length} {filteredGuardians.length === 1 ? 'responsável' : 'responsáveis'}
          </span>
        </div>
      </div>

      {/* 4. Content Area: Cards (Default) vs Lista (Table) */}
      {viewMode === 'cards' ? (
        /* High-End Cards Grid View */
        <div className="space-y-4">
          {filteredGuardians.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-neutral-200 p-12 text-center text-xs text-neutral-500">
              Nenhum responsável localizado com os filtros selecionados.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGuardians.map((g) => {
                const cleanPhone = g.phone ? g.phone.replace(/\D/g, '') : '';
                const linkedStudents = g.student_ids
                  .map((id) => students.find((s) => s.id === id))
                  .filter(Boolean) as Student[];

                const studentNamesStr = linkedStudents.map((s) => s.full_name).join(', ');
                const waMessage = encodeURIComponent(
                  `Olá ${g.full_name}, entramos em contato da Escola Horizonte a respeito de ${studentNamesStr || 'seu(s) dependente(s)'}.`
                );

                return (
                  <div
                    key={g.id}
                    className="bg-white rounded-xl border border-neutral-200 p-4 space-y-3.5 hover:border-neutral-300 hover:shadow-xs transition-all shadow-2xs flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Card Header: Avatar, Name, Relationship */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#0f766e]/10 text-[#0f766e] flex items-center justify-center font-bold text-sm border border-[#0f766e]/20 font-mono shrink-0">
                            {g.full_name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-neutral-900 leading-snug">
                              {g.full_name}
                            </div>
                            <div className="text-[11px] text-neutral-500 font-mono">
                              ID: {g.id}
                            </div>
                          </div>
                        </div>

                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200 shrink-0">
                          {g.relationship || 'Responsável'}
                        </span>
                      </div>

                      {/* Direct Contact Actions Strip */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-neutral-100">
                        {cleanPhone ? (
                          <>
                            <a
                              href={`https://wa.me/55${cleanPhone}?text=${waMessage}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                              title="Conversar no WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </a>

                            <a
                              href={`tel:${cleanPhone}`}
                              className="px-2.5 py-1.5 rounded-lg border border-neutral-300 hover:bg-neutral-50 text-neutral-700 font-medium text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                              title="Ligar para o telefone"
                            >
                              <Phone className="w-3 h-3 text-[#0f766e]" />
                              <span className="font-mono tabular-nums">{g.phone}</span>
                            </a>
                          </>
                        ) : (
                          <span className="text-[11px] text-neutral-400 italic">Sem telefone registrado</span>
                        )}

                        {g.email && (
                          <div
                            className="px-2 py-1 rounded bg-neutral-50 border border-neutral-200 text-neutral-600 text-[11px] flex items-center gap-1 truncate max-w-[200px]"
                            title={g.email}
                          >
                            <Mail className="w-3 h-3 text-neutral-400 shrink-0" />
                            <span className="truncate">{g.email}</span>
                          </div>
                        )}
                      </div>

                      {/* Linked Students Section */}
                      <div className="space-y-1.5 pt-2 border-t border-neutral-100">
                        <div className="flex items-center justify-between text-[11px] text-neutral-500 font-medium">
                          <span>Estudantes sob responsabilidade:</span>
                          <span className="font-mono tabular-nums">{linkedStudents.length}</span>
                        </div>

                        {linkedStudents.length === 0 ? (
                          <div className="p-2 rounded bg-neutral-50 border border-dashed border-neutral-200 text-[11px] text-neutral-400 text-center">
                            Nenhum aluno associado a este cadastro.
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {linkedStudents.map((stu) => {
                              const cls = classrooms.find((c) => c.id === stu.class_id);
                              return (
                                <div
                                  key={stu.id}
                                  className="p-2 rounded-lg border border-neutral-200 bg-neutral-50/70 flex items-center justify-between text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full overflow-hidden bg-neutral-200 shrink-0 border border-neutral-300">
                                      {stu.photo_ref ? (
                                        <img src={stu.photo_ref} alt={stu.full_name} className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center font-bold text-neutral-600 font-mono text-[9px]">
                                          {stu.full_name.slice(0, 2).toUpperCase()}
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <div className="font-semibold text-neutral-900 leading-tight">
                                        {stu.full_name}
                                      </div>
                                      <div className="text-[10px] text-neutral-500 font-mono">
                                        Matrícula: {stu.enrollment_code} &bull; {cls?.name || 'Turma'}
                                      </div>
                                    </div>
                                  </div>

                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 border border-emerald-200 text-emerald-800">
                                    Autorizado
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-neutral-100 text-xs">
                      <span className="text-[11px] text-neutral-400 font-mono">
                        Portaria Ativa
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(g)}
                          className="px-2.5 py-1 rounded-md border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#0f766e]" />
                          <span>Editar</span>
                        </button>

                        <button
                          onClick={() => setDeletingGuardian(g)}
                          className="p-1 rounded-md border border-neutral-200 hover:bg-rose-50 text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Excluir responsável"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* High-Density Tabular View (Lista) */
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-200 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Responsável</th>
                  <th className="py-2.5 px-4">Parentesco</th>
                  <th className="py-2.5 px-4">Canais de Contato</th>
                  <th className="py-2.5 px-4">Estudantes Vinculados</th>
                  <th className="py-2.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredGuardians.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-neutral-400">
                      Nenhum responsável encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredGuardians.map((g) => {
                    const cleanPhone = g.phone ? g.phone.replace(/\D/g, '') : '';
                    const linkedStudents = g.student_ids
                      .map((id) => students.find((s) => s.id === id))
                      .filter(Boolean) as Student[];

                    return (
                      <tr
                        key={g.id}
                        className="hover:bg-neutral-50/80 transition-colors duration-150 h-14"
                      >
                        <td className="py-2 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-[#0f766e]/10 text-[#0f766e] flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                              {g.full_name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-neutral-900">{g.full_name}</div>
                              <div className="text-[10px] text-neutral-400 font-mono">ID: {g.id}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-2 px-4 text-neutral-700">
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200">
                            {g.relationship || 'Responsável'}
                          </span>
                        </td>

                        <td className="py-2 px-4">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 font-mono text-neutral-800">
                              <Phone className="w-3 h-3 text-[#0f766e]" />
                              <span>{g.phone}</span>
                            </div>
                            {g.email && (
                              <div className="text-[11px] text-neutral-500 truncate max-w-[200px]">
                                {g.email}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-2 px-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {linkedStudents.length === 0 ? (
                              <span className="text-[11px] text-neutral-400 italic">Nenhum aluno</span>
                            ) : (
                              linkedStudents.map((stu) => (
                                <span
                                  key={stu.id}
                                  className="px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 text-neutral-800 border border-neutral-200"
                                >
                                  {stu.full_name}
                                </span>
                              ))
                            )}
                          </div>
                        </td>

                        <td className="py-2 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(g)}
                              className="p-1.5 rounded border border-neutral-200 hover:bg-neutral-100 text-neutral-600 transition-colors cursor-pointer"
                              title="Editar responsável"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-[#0f766e]" />
                            </button>

                            <button
                              onClick={() => setDeletingGuardian(g)}
                              className="p-1.5 rounded border border-neutral-200 hover:bg-rose-50 text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Excluir responsável"
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

      {/* MODAL 1: Adicionar Responsável */}
      {showAddModal && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-lg w-full p-5 shadow-xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#0f766e]" />
                Cadastrar Novo Responsável
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGuardian} className="space-y-3.5 text-xs text-neutral-700 overflow-y-auto pr-1 flex-1">
              <div>
                <label className="block font-medium mb-1">Nome Completo:</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo da Silva"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg p-2 text-neutral-900 focus:outline-none focus:border-[#0f766e]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Grau de Parentesco:</label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full bg-white border border-neutral-300 rounded-lg p-2 text-neutral-900 focus:outline-none focus:border-[#0f766e] cursor-pointer"
                  >
                    <option value="Mãe">Mãe</option>
                    <option value="Pai">Pai</option>
                    <option value="Avó">Avó</option>
                    <option value="Avô">Avô</option>
                    <option value="Tio(a)">Tio(a)</option>
                    <option value="Irmão(ã)">Irmão(ã) maior de idade</option>
                    <option value="Tutor Legal">Tutor Legal / Guardião</option>
                    <option value="Outro Autorizado">Outro Autorizado</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium mb-1">Telefone / WhatsApp:</label>
                  <input
                    type="text"
                    required
                    placeholder="(11) 98765-4321"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white border border-neutral-300 rounded-lg p-2 text-neutral-900 focus:outline-none focus:border-[#0f766e] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1">E-mail (Opcional):</label>
                <input
                  type="email"
                  placeholder="carlos.silva@exemplo.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg p-2 text-neutral-900 focus:outline-none focus:border-[#0f766e]"
                />
              </div>

              {/* Linked Students Multi-Select */}
              <div>
                <label className="block font-medium mb-1.5">
                  Vincular Estudantes (Autorização de Retirada na Portaria):
                </label>
                <div className="border border-neutral-200 rounded-lg p-2 space-y-1.5 max-h-40 overflow-y-auto bg-neutral-50/60">
                  {students.map((stu) => {
                    const isChecked = selectedStudentIds.includes(stu.id);
                    return (
                      <label
                        key={stu.id}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-white text-xs cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleStudentSelection(stu.id)}
                          className="rounded text-[#0f766e] focus:ring-0"
                        />
                        <span className="font-medium text-neutral-900">{stu.full_name}</span>
                        <span className="text-[11px] text-neutral-400 font-mono">({stu.enrollment_code})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50 font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#0f766e] hover:bg-[#0d5f59] text-white font-medium cursor-pointer shadow-xs"
                >
                  Salvar responsável
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Editar Responsável */}
      {editingGuardian && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-lg w-full p-5 shadow-xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <h3 className="font-semibold text-neutral-900 text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#0f766e]" />
                Editar Responsável: {editingGuardian.full_name}
              </h3>
              <button
                onClick={() => setEditingGuardian(null)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateGuardian} className="space-y-3.5 text-xs text-neutral-700 overflow-y-auto pr-1 flex-1">
              <div>
                <label className="block font-medium mb-1">Nome Completo:</label>
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
                  <label className="block font-medium mb-1">Grau de Parentesco:</label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full bg-white border border-neutral-300 rounded-lg p-2 text-neutral-900 focus:outline-none focus:border-[#0f766e] cursor-pointer"
                  >
                    <option value="Mãe">Mãe</option>
                    <option value="Pai">Pai</option>
                    <option value="Avó">Avó</option>
                    <option value="Avô">Avô</option>
                    <option value="Tio(a)">Tio(a)</option>
                    <option value="Irmão(ã)">Irmão(ã) maior de idade</option>
                    <option value="Tutor Legal">Tutor Legal / Guardião</option>
                    <option value="Outro Autorizado">Outro Autorizado</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium mb-1">Telefone / WhatsApp:</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white border border-neutral-300 rounded-lg p-2 text-neutral-900 focus:outline-none focus:border-[#0f766e] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1">E-mail:</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg p-2 text-neutral-900 focus:outline-none focus:border-[#0f766e]"
                />
              </div>

              {/* Linked Students Multi-Select */}
              <div>
                <label className="block font-medium mb-1.5">
                  Vincular Estudantes (Autorização de Retirada na Portaria):
                </label>
                <div className="border border-neutral-200 rounded-lg p-2 space-y-1.5 max-h-40 overflow-y-auto bg-neutral-50/60">
                  {students.map((stu) => {
                    const isChecked = selectedStudentIds.includes(stu.id);
                    return (
                      <label
                        key={stu.id}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-white text-xs cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleStudentSelection(stu.id)}
                          className="rounded text-[#0f766e] focus:ring-0"
                        />
                        <span className="font-medium text-neutral-900">{stu.full_name}</span>
                        <span className="text-[11px] text-neutral-400 font-mono">({stu.enrollment_code})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {errorMessage && (
                <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {errorMessage}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setEditingGuardian(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50 font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#0f766e] hover:bg-[#0d5f59] text-white font-medium cursor-pointer shadow-xs"
                >
                  Salvar alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Confirmação de Exclusão */}
      {deletingGuardian && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-sm w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 text-rose-600 font-semibold text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Confirmar Remoção</span>
            </div>

            <p className="text-xs text-neutral-600">
              Deseja remover o responsável <strong>{deletingGuardian.full_name}</strong>? Os vínculos com alunos cadastrados serão desassociados.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => setDeletingGuardian(null)}
                className="px-3.5 py-1.5 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50 text-xs font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium cursor-pointer shadow-xs"
              >
                Sim, remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
