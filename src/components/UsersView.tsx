/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Search,
  KeyRound,
  Mail,
  Badge,
  Edit2,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  X,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';
import { localDb } from '../services/localDatabase';
import { SystemUser, UserRole } from '../types/database';

export const UsersView: React.FC = () => {
  const [users, setUsers] = useState<SystemUser[]>(localDb.getUsers());
  const [currentOperator, setCurrentOperator] = useState<SystemUser>(localDb.currentOperator);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formPassword, setFormPassword] = useState<string>('');
  const [formBadge, setFormBadge] = useState<string>('');
  const [formRole, setFormRole] = useState<UserRole>('operator');
  const [showFormPassword, setShowFormPassword] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Delete Confirmation Modal
  const [userToDelete, setUserToDelete] = useState<SystemUser | null>(null);

  useEffect(() => {
    const refresh = () => {
      setUsers([...localDb.getUsers()]);
      setCurrentOperator(localDb.currentOperator);
    };
    refresh();
    return localDb.subscribe(refresh);
  }, []);

  const handleOpenCreateModal = () => {
    setEditingUserId(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormBadge(`OP-0${users.length + 1}`);
    setFormRole('operator');
    setShowFormPassword(false);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: SystemUser) => {
    setEditingUserId(user.id);
    setFormName(user.name);
    setFormEmail(user.email || '');
    setFormPassword(user.password || '');
    setFormBadge(user.badge_number);
    setFormRole(user.role);
    setShowFormPassword(false);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim()) {
      setFormError('Informe o nome completo do usuário.');
      return;
    }
    if (!formEmail.trim() || !formEmail.includes('@')) {
      setFormError('Informe um e-mail institucional válido.');
      return;
    }
    if (!formPassword.trim() || formPassword.trim().length < 4) {
      setFormError('A senha de acesso deve ter pelo menos 4 caracteres.');
      return;
    }
    if (!formBadge.trim()) {
      setFormError('Informe o número de crachá ou identificador.');
      return;
    }

    try {
      if (editingUserId) {
        localDb.updateUser(editingUserId, {
          name: formName,
          email: formEmail,
          password: formPassword,
          badge_number: formBadge,
          role: formRole,
        });
        setFeedbackNotice(`Usuário "${formName}" atualizado com sucesso.`);
      } else {
        localDb.addUser({
          name: formName,
          email: formEmail,
          password: formPassword,
          badge_number: formBadge,
          role: formRole,
        });
        setFeedbackNotice(`Novo usuário "${formName}" cadastrado com sucesso.`);
      }
      setIsModalOpen(false);
      setTimeout(() => setFeedbackNotice(null), 3500);
    } catch (err: any) {
      setFormError(err.message || 'Erro ao gravar usuário.');
    }
  };

  const handleConfirmDelete = () => {
    if (!userToDelete) return;
    try {
      localDb.deleteUser(userToDelete.id);
      setFeedbackNotice(`Usuário "${userToDelete.name}" removido.`);
      setUserToDelete(null);
      setTimeout(() => setFeedbackNotice(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Erro ao remover usuário.');
    }
  };

  const handleSwitchUser = (user: SystemUser) => {
    localDb.currentOperator = user;
    setCurrentOperator(user);
    setFeedbackNotice(`Sessão alternada para ${user.name} (${user.role.toUpperCase()})`);
    setTimeout(() => setFeedbackNotice(null), 3000);
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      u.badge_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'all' || u.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">
            Controle de Usuários e Acessos
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Gerencie os operadores, coordenadores e administradores autorizados a autenticar no sistema.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="bg-[#0f766e] hover:bg-[#0d5f59] active:bg-[#0b4e49] text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0 self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Cadastrar Novo Usuário</span>
        </button>
      </div>

      {/* Global Feedback Notice */}
      {feedbackNotice && (
        <div
          role="status"
          className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-in fade-in duration-150"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{feedbackNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-neutral-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, e-mail institucional ou crachá..."
            className="w-full bg-neutral-50 hover:bg-white focus:bg-white border border-neutral-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e] transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-medium text-neutral-500">Filtrar papel:</span>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 focus:outline-none focus:border-[#0f766e] cursor-pointer"
          >
            <option value="all">Todos os papéis ({users.length})</option>
            <option value="admin">Administrador</option>
            <option value="coordinator">Coordenação</option>
            <option value="operator">Operador de Portaria</option>
          </select>
        </div>
      </div>

      {/* Users Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((u) => {
          const isCurrent = u.id === currentOperator.id;

          return (
            <div
              key={u.id}
              className={`bg-white rounded-xl border p-4 flex flex-col justify-between space-y-4 transition-all shadow-xs ${
                isCurrent
                  ? 'border-[#0f766e] ring-1 ring-[#0f766e]/30'
                  : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <div className="space-y-3">
                {/* Badge and Active Session Pill */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200">
                    {u.badge_number}
                  </span>
                  {isCurrent && (
                    <span className="text-[11px] font-medium text-[#0f766e] bg-teal-50 px-2 py-0.5 rounded border border-teal-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0f766e]" />
                      Sessão ativa
                    </span>
                  )}
                </div>

                {/* Name, Role & Email */}
                <div>
                  <h3 className="font-semibold text-neutral-900 text-sm">{u.name}</h3>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    Papel:{' '}
                    <strong className="text-neutral-800 font-medium">
                      {u.role === 'admin'
                        ? 'Administrador do Sistema'
                        : u.role === 'coordinator'
                        ? 'Coordenação Pedagógica'
                        : 'Operador de Portaria'}
                    </strong>
                  </div>
                </div>

                {/* Credential Details */}
                <div className="text-xs text-neutral-600 bg-neutral-50 p-2.5 rounded-lg border border-neutral-200 space-y-1 font-mono">
                  <div className="flex items-center gap-1.5 text-neutral-700">
                    <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span className="truncate">{u.email || 'Sem e-mail cadastrado'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-neutral-500 text-[11px]">
                    <Lock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span>Senha configurada</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-neutral-100 pt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleSwitchUser(u)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    isCurrent
                      ? 'bg-neutral-100 text-neutral-600 cursor-default'
                      : 'border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                  }`}
                  disabled={isCurrent}
                >
                  {isCurrent ? 'Perfil em uso' : 'Usar na sessão'}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(u)}
                    className="p-1.5 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-md transition-colors cursor-pointer"
                    title="Editar dados e senha deste usuário"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setUserToDelete(u)}
                    className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                    title="Remover usuário"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredUsers.length === 0 && (
        <div className="p-8 text-center bg-white rounded-xl border border-neutral-200 text-neutral-500 text-xs">
          Nenhum usuário encontrado para os critérios de busca informados.
        </div>
      )}

      {/* Modal: Cadastrar / Editar Usuário */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-[#0f171a] px-5 py-4 text-white flex items-center justify-between border-b border-[#1f2d32]">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {editingUserId ? 'Editar Usuário do Sistema' : 'Cadastrar Novo Usuário'}
                </h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Preencha o e-mail institucional e a senha para autenticação
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveUser} className="p-5 space-y-3.5">
              {formError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Nome */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-neutral-700">
                  Nome Completo:
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="ex: Carlos Eduardo Lima"
                  required
                  className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e]"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-neutral-700">
                  E-mail Institucional (Login):
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="ex: carlos.lima@escola.local"
                    required
                    className="w-full bg-white border border-neutral-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e]"
                  />
                  <Mail className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2 pointer-events-none" />
                </div>
              </div>

              {/* Senha */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-neutral-700">
                  Senha de Acesso:
                </label>
                <div className="relative">
                  <input
                    type={showFormPassword ? 'text' : 'password'}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    required
                    className="w-full bg-white border border-neutral-300 rounded-lg pl-8 pr-8 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e]"
                  />
                  <Lock className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowFormPassword(!showFormPassword)}
                    tabIndex={-1}
                    className="absolute right-2.5 top-1.5 text-neutral-400 hover:text-neutral-600 p-0.5 cursor-pointer"
                  >
                    {showFormPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Grid: Papel e Crachá */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-neutral-700">
                    Papel de Acesso:
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as UserRole)}
                    className="w-full bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e]"
                  >
                    <option value="operator">Operador (Portaria)</option>
                    <option value="coordinator">Coordenação</option>
                    <option value="admin">Administrador TI</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-neutral-700">
                    Identificador / Crachá:
                  </label>
                  <input
                    type="text"
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value)}
                    placeholder="ex: PORT-03"
                    required
                    className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e]"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-neutral-300 text-xs font-medium text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#0f766e] hover:bg-[#0d5f59] text-xs font-semibold text-white cursor-pointer shadow-xs"
                >
                  {editingUserId ? 'Salvar Alterações' : 'Cadastrar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Delete */}
      {userToDelete && (
        <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 w-full max-w-sm shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">
                  Confirmar Exclusão
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Tem certeza que deseja remover o usuário <strong>{userToDelete.name}</strong> ({userToDelete.email})? Esta ação revogará imediatamente o acesso deste operador.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-3 py-1.5 rounded-lg border border-neutral-300 text-xs font-medium text-neutral-700 hover:bg-neutral-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white cursor-pointer shadow-xs"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
