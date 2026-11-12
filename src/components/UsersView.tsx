/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Search,
  KeyRound,
  Mail,
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
  Download,
  Copy,
  Check,
  Table as TableIcon,
  LayoutGrid,
  Ban,
  RefreshCw,
  Users,
  Shield,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { localDb } from '../services/localDatabase';
import { SystemUser, UserRole } from '../types/database';

export const UsersView: React.FC = () => {
  const [users, setUsers] = useState<SystemUser[]>(localDb.getUsers());
  const [currentOperator, setCurrentOperator] = useState<SystemUser>(localDb.currentOperator);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [showRbacMatrix, setShowRbacMatrix] = useState<boolean>(true);

  // Modal State: Create / Edit User
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formPassword, setFormPassword] = useState<string>('');
  const [formBadge, setFormBadge] = useState<string>('');
  const [formRole, setFormRole] = useState<UserRole>('operator');
  const [formStatus, setFormStatus] = useState<'active' | 'suspended'>('active');
  const [showFormPassword, setShowFormPassword] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Modal State: Quick Password Reset
  const [passwordResetUser, setPasswordResetUser] = useState<SystemUser | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(true);
  const [passwordResetError, setPasswordResetError] = useState<string | null>(null);

  // Delete Confirmation Modal
  const [userToDelete, setUserToDelete] = useState<SystemUser | null>(null);

  // Notifications & Copy state
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => {
      setUsers([...localDb.getUsers()]);
      setCurrentOperator(localDb.currentOperator);
    };
    refresh();
    return localDb.subscribe(refresh);
  }, []);

  const handleCopyText = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(identifier);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const generateStrongPassword = () => {
    const prefixes = ['Escola', 'Acesso', 'Portaria', 'Gestao', 'Horizonte'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const year = new Date().getFullYear();
    const symbols = ['@', '#', '$', '!'];
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const randomDigits = Math.floor(100 + Math.random() * 900);
    return `${prefix}${year}${symbol}${randomDigits}`;
  };

  const handleOpenCreateModal = () => {
    setEditingUserId(null);
    setFormName('');
    setFormEmail('');
    setFormPassword(generateStrongPassword());
    setFormBadge(`OP-0${users.length + 1}`);
    setFormRole('operator');
    setFormStatus('active');
    setShowFormPassword(true);
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
    setFormStatus(user.status || 'active');
    setShowFormPassword(false);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenPasswordResetModal = (user: SystemUser) => {
    setPasswordResetUser(user);
    setNewPasswordVal(generateStrongPassword());
    setShowNewPassword(true);
    setPasswordResetError(null);
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
          status: formStatus,
        });
        setFeedbackNotice(`Usuário "${formName}" atualizado com sucesso.`);
      } else {
        localDb.addUser({
          name: formName,
          email: formEmail,
          password: formPassword,
          badge_number: formBadge,
          role: formRole,
          status: formStatus,
        });
        setFeedbackNotice(`Novo usuário "${formName}" cadastrado com sucesso.`);
      }
      setIsModalOpen(false);
      setTimeout(() => setFeedbackNotice(null), 3500);
    } catch (err: any) {
      setFormError(err.message || 'Erro ao gravar usuário.');
    }
  };

  const handleConfirmPasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordResetUser) return;
    if (!newPasswordVal.trim() || newPasswordVal.trim().length < 4) {
      setPasswordResetError('A nova senha deve ter no mínimo 4 caracteres.');
      return;
    }

    try {
      localDb.updateUser(passwordResetUser.id, {
        password: newPasswordVal.trim(),
      });
      setFeedbackNotice(`Senha de "${passwordResetUser.name}" redefinida com sucesso.`);
      setPasswordResetUser(null);
      setTimeout(() => setFeedbackNotice(null), 3500);
    } catch (err: any) {
      setPasswordResetError(err.message || 'Erro ao redefinir senha.');
    }
  };

  const handleToggleStatus = (user: SystemUser) => {
    const nextStatus = user.status === 'suspended' ? 'active' : 'suspended';
    try {
      localDb.updateUser(user.id, { status: nextStatus });
      setFeedbackNotice(
        `Acesso de "${user.name}" ${nextStatus === 'active' ? 'reativado' : 'suspenso'}.`
      );
      setTimeout(() => setFeedbackNotice(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Não foi possível alterar o status do usuário.');
    }
  };

  const handleConfirmDelete = () => {
    if (!userToDelete) return;
    if (userToDelete.id === currentOperator.id) {
      alert('Não é permitido excluir o usuário da sessão ativa atual.');
      return;
    }
    try {
      localDb.deleteUser(userToDelete.id);
      setFeedbackNotice(`Usuário "${userToDelete.name}" removido do sistema.`);
      setUserToDelete(null);
      setTimeout(() => setFeedbackNotice(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Erro ao remover usuário.');
    }
  };

  const handleSwitchUser = (user: SystemUser) => {
    if (user.status === 'suspended') {
      alert('Este usuário está suspenso e não pode assumir a sessão ativa.');
      return;
    }
    localDb.currentOperator = user;
    setCurrentOperator(user);
    setFeedbackNotice(`Sessão alternada para ${user.name} (${user.role.toUpperCase()})`);
    setTimeout(() => setFeedbackNotice(null), 3000);
  };

  const handleExportCsv = () => {
    const headers = ['ID', 'Nome', 'E-mail', 'Cracha', 'Papel', 'Status', 'CriadoEm', 'UltimoAcesso'];
    const rows = users.map((u) => [
      u.id,
      `"${u.name.replace(/"/g, '""')}"`,
      u.email || '',
      u.badge_number,
      u.role,
      u.status || 'active',
      u.created_at || '',
      u.last_login_at || '',
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `usuarios_portaria_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filtered users calculation
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        u.badge_number.toLowerCase().includes(q);

      const matchesRole = selectedRole === 'all' || u.role === selectedRole;
      const userStatus = u.status || 'active';
      const matchesStatus = selectedStatus === 'all' || userStatus === selectedStatus;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, selectedRole, selectedStatus]);

  // Aggregate stats
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const coordCount = users.filter((u) => u.role === 'coordinator').length;
  const operatorCount = users.filter((u) => u.role === 'operator').length;
  const activeCount = users.filter((u) => (u.status || 'active') === 'active').length;

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'Administrador do Sistema';
      case 'coordinator':
        return 'Coordenação Pedagógica';
      case 'operator':
        return 'Operador de Portaria';
      default:
        return role;
    }
  };

  const getRoleBadgeClasses = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'coordinator':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'operator':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-neutral-100 text-neutral-700 border-neutral-200';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter((_, i, arr) => i === 0 || i === arr.length - 1)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
              Controle de Usuários e Acessos
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-neutral-100 border border-neutral-200 text-neutral-600">
              RBAC Local-First
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Gerenciamento de identidades institucionais, credenciais de acesso, privilégios RBAC e auditoria de operadores.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportCsv}
            className="border border-neutral-300 hover:bg-neutral-50 active:bg-neutral-100 text-neutral-700 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Exportar planilha CSV de operadores e credenciais"
          >
            <Download className="w-3.5 h-3.5 text-neutral-500" />
            <span>Exportar CSV</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="bg-[#0f766e] hover:bg-[#0d5f59] active:bg-[#0b4e49] text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>Cadastrar Novo Usuário</span>
          </button>
        </div>
      </div>

      {/* ── Global Feedback Notice ── */}
      {feedbackNotice && (
        <div
          role="status"
          className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-in fade-in duration-150 shadow-2xs"
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

      {/* ── KPI Executive Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Total Users */}
        <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-neutral-500">Total de Contas</span>
            <Users className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-900">{users.length}</div>
          <div className="text-[10px] text-neutral-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{activeCount} ativas &bull; SQLite WAL</span>
          </div>
        </div>

        {/* Admins */}
        <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-neutral-500">Administradores TI</span>
            <Shield className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-900">{adminCount}</div>
          <div className="text-[10px] text-purple-700 font-medium">Acesso Irrestrito / DB & CFTV</div>
        </div>

        {/* Coordinators */}
        <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-neutral-500">Coordenação</span>
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-900">{coordCount}</div>
          <div className="text-[10px] text-blue-700 font-medium">Alunos, Turmas e Relatórios</div>
        </div>

        {/* Operators */}
        <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-neutral-500">Operadores Portaria</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-900">{operatorCount}</div>
          <div className="text-[10px] text-emerald-700 font-medium">Leitor Barcode & Crachás</div>
        </div>
      </div>

      {/* ── Toolbar: Search, Filters & View Toggle ── */}
      <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search bar */}
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

          {/* Quick Role Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {[
              { id: 'all', label: `Todos (${users.length})` },
              { id: 'admin', label: `Admin (${adminCount})` },
              { id: 'coordinator', label: `Coordenação (${coordCount})` },
              { id: 'operator', label: `Portaria (${operatorCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedRole(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  selectedRole === tab.id
                    ? 'bg-[#0f766e] text-white shadow-2xs font-semibold'
                    : 'bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Status Filter & Mode Switcher */}
          <div className="flex items-center gap-2 shrink-0 border-t lg:border-t-0 pt-2 lg:pt-0">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 focus:outline-none focus:border-[#0f766e] cursor-pointer"
            >
              <option value="all">Status: Todos</option>
              <option value="active">Apenas Ativos</option>
              <option value="suspended">Apenas Suspensos</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-neutral-100 p-0.5 rounded-lg border border-neutral-200">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded text-neutral-600 transition-colors cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white text-neutral-900 shadow-2xs'
                    : 'hover:text-neutral-900'
                }`}
                title="Modo Cards de Credencial"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded text-neutral-600 transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-neutral-900 shadow-2xs'
                    : 'hover:text-neutral-900'
                }`}
                title="Modo Tabela Analítica"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content View: Cards or Table ── */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((u) => {
            const isCurrent = u.id === currentOperator.id;
            const isSuspended = u.status === 'suspended';

            return (
              <div
                key={u.id}
                className={`bg-white rounded-xl border p-4 flex flex-col justify-between space-y-4 transition-all shadow-2xs hover:shadow-sm ${
                  isCurrent
                    ? 'border-[#0f766e] ring-1 ring-[#0f766e]/30'
                    : isSuspended
                    ? 'border-neutral-200 opacity-70 bg-neutral-50/50'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="space-y-3.5">
                  {/* Top Bar of the Card: Avatar, Name, Badge, Active Pill */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-lg bg-[#142024] text-white flex items-center justify-center font-bold text-xs tracking-wider shrink-0 shadow-2xs">
                        {getInitials(u.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-semibold text-neutral-900 text-sm truncate">
                            {u.name}
                          </h3>
                        </div>
                        <div className="text-[11px] text-neutral-500 font-mono flex items-center gap-1.5">
                          <span>Crachá: <strong>{u.badge_number}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {isCurrent && (
                        <span className="text-[10px] font-medium text-[#0f766e] bg-teal-50 px-2 py-0.5 rounded border border-teal-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0f766e] animate-pulse" />
                          Sessão ativa
                        </span>
                      )}
                      {isSuspended ? (
                        <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 flex items-center gap-1">
                          <Ban className="w-2.5 h-2.5" />
                          Suspenso
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          Ativo
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Role & Scope Badges */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${getRoleBadgeClasses(u.role)}`}>
                        {getRoleLabel(u.role)}
                      </span>
                    </div>

                    {/* Permitted modules badges */}
                    <div className="flex flex-wrap gap-1 mt-2 text-[10px] text-neutral-600">
                      <span className="px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-200">Portaria</span>
                      <span className="px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-200">Crachás</span>
                      {u.role !== 'operator' && (
                        <>
                          <span className="px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-200">Alunos</span>
                          <span className="px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-200">Relatórios A4</span>
                        </>
                      )}
                      {u.role === 'admin' && (
                        <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-semibold">Config &amp; DB</span>
                      )}
                    </div>
                  </div>

                  {/* Credential Box with Copy action */}
                  <div className="text-xs text-neutral-700 bg-neutral-50 p-2.5 rounded-lg border border-neutral-200 space-y-1.5 font-mono">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span className="truncate">{u.email || 'Sem e-mail'}</span>
                      </div>
                      {u.email && (
                        <button
                          type="button"
                          onClick={() => handleCopyText(u.email!, `mail_${u.id}`)}
                          className="text-neutral-400 hover:text-neutral-700 p-0.5 rounded cursor-pointer transition-colors"
                          title="Copiar e-mail"
                        >
                          {copiedId === `mail_${u.id}` ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[11px] text-neutral-500 pt-1 border-t border-neutral-200/60">
                      <div className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span>Senha protegida</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenPasswordResetModal(u)}
                        className="text-[#0f766e] hover:underline text-[11px] font-sans font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <KeyRound className="w-3 h-3" />
                        <span>Trocar senha</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Action Buttons Footer */}
                <div className="border-t border-neutral-100 pt-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleSwitchUser(u)}
                    disabled={isCurrent || isSuspended}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-neutral-100 text-neutral-500 cursor-default'
                        : isSuspended
                        ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                        : 'bg-[#0f766e]/10 text-[#0f766e] hover:bg-[#0f766e]/20 active:bg-[#0f766e]/30 font-semibold'
                    }`}
                  >
                    {isCurrent ? 'Perfil em uso' : 'Usar na sessão'}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(u)}
                      className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                        isSuspended
                          ? 'text-emerald-700 hover:bg-emerald-50'
                          : 'text-neutral-400 hover:text-amber-700 hover:bg-amber-50'
                      }`}
                      title={isSuspended ? 'Reativar acesso' : 'Suspender acesso'}
                    >
                      <Ban className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(u)}
                      className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors cursor-pointer"
                      title="Editar cadastro"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setUserToDelete(u)}
                      disabled={isCurrent}
                      className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Excluir operador"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Table Mode ── */
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-700 border-b border-neutral-200 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Operador</th>
                  <th className="py-2.5 px-3">Crachá</th>
                  <th className="py-2.5 px-3">E-mail Institucional</th>
                  <th className="py-2.5 px-3">Papel / Nível</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Último Acesso</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredUsers.map((u, idx) => {
                  const isCurrent = u.id === currentOperator.id;
                  const isSuspended = u.status === 'suspended';

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-neutral-50/70 transition-colors ${
                        isCurrent ? 'bg-teal-50/40' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center font-mono text-neutral-400 text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-md bg-[#142024] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                            {getInitials(u.name)}
                          </div>
                          <div>
                            <div className="font-semibold text-neutral-900 flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isCurrent && (
                                <span className="w-2 h-2 rounded-full bg-[#0f766e]" title="Sessão ativa" />
                              )}
                            </div>
                            <div className="text-[10px] text-neutral-400 font-mono">ID: {u.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-medium text-neutral-800">
                        {u.badge_number}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-neutral-700">
                        <div className="flex items-center gap-1.5">
                          <span>{u.email || '—'}</span>
                          {u.email && (
                            <button
                              type="button"
                              onClick={() => handleCopyText(u.email!, `tbl_mail_${u.id}`)}
                              className="text-neutral-400 hover:text-neutral-700 p-0.5 cursor-pointer"
                              title="Copiar e-mail"
                            >
                              {copiedId === `tbl_mail_${u.id}` ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${getRoleBadgeClasses(u.role)}`}>
                          {getRoleLabel(u.role)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {isSuspended ? (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200">
                            Suspenso
                          </span>
                        ) : (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200">
                            Ativo
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-neutral-500 text-[11px]">
                        {u.last_login_at
                          ? new Date(u.last_login_at).toLocaleDateString('pt-BR')
                          : 'Nunca acessou'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleSwitchUser(u)}
                            disabled={isCurrent || isSuspended}
                            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                              isCurrent
                                ? 'bg-neutral-100 text-neutral-400 cursor-default'
                                : 'bg-[#0f766e]/10 text-[#0f766e] hover:bg-[#0f766e]/20'
                            }`}
                          >
                            {isCurrent ? 'Em uso' : 'Usar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenPasswordResetModal(u)}
                            className="p-1 text-neutral-500 hover:text-[#0f766e] hover:bg-neutral-100 rounded cursor-pointer"
                            title="Trocar Senha"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(u)}
                            className="p-1 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setUserToDelete(u)}
                            disabled={isCurrent}
                            className="p-1 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer disabled:opacity-30"
                            title="Excluir"
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
        </div>
      )}

      {filteredUsers.length === 0 && (
        <div className="p-12 text-center bg-white rounded-xl border border-neutral-200 text-neutral-500 text-xs space-y-1">
          <p className="font-semibold text-neutral-700">Nenhum usuário localizado</p>
          <p>Tente alterar o termo de busca ou limpar os filtros de papel e status.</p>
        </div>
      )}

      {/* ── Seção: Matriz de Permissões e Perfis de Acesso (RBAC) ── */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs overflow-hidden">
        <button
          type="button"
          onClick={() => setShowRbacMatrix(!showRbacMatrix)}
          className="w-full px-5 py-3.5 flex items-center justify-between bg-neutral-50 hover:bg-neutral-100/70 transition-colors cursor-pointer border-b border-neutral-200 text-left"
        >
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#0f766e]" />
            <div>
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
                Matriz Institucional de Permissões e Políticas RBAC
              </h3>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Diretrizes de privilégios para Operadores de Portaria, Coordenação Pedagógica e Administradores TI.
              </p>
            </div>
          </div>
          {showRbacMatrix ? (
            <ChevronUp className="w-4 h-4 text-neutral-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-neutral-500" />
          )}
        </button>

        {showRbacMatrix && (
          <div className="p-4 overflow-x-auto animate-in fade-in duration-150">
            <table className="w-full text-left text-xs border border-neutral-200 rounded-lg overflow-hidden">
              <thead className="bg-neutral-100 text-neutral-700 font-semibold text-[10px] uppercase border-b border-neutral-200">
                <tr>
                  <th className="py-2 px-3">Módulo / Funcionalidade</th>
                  <th className="py-2 px-3 text-center w-36">Operador Portaria</th>
                  <th className="py-2 px-3 text-center w-36">Coordenação</th>
                  <th className="py-2 px-3 text-center w-36">Administrador TI</th>
                  <th className="py-2 px-3 w-40">Garantia Local</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-[11px]">
                {[
                  {
                    module: 'Leitura de Crachá & Barcode sub-150ms',
                    op: true,
                    coord: true,
                    admin: true,
                    guarantee: 'Buffer teclado USB HID',
                  },
                  {
                    module: 'Laya Engine & Reconhecimento Facial',
                    op: true,
                    coord: true,
                    admin: true,
                    guarantee: 'Decisões sub-35ms locais',
                  },
                  {
                    module: 'Emissão de Carteirinhas (Badges Studio)',
                    op: true,
                    coord: true,
                    admin: true,
                    guarantee: 'Geração de PDF / Imagem',
                  },
                  {
                    module: 'Dashboard Geral & Indicadores de Presença',
                    op: false,
                    coord: true,
                    admin: true,
                    guarantee: 'Agregações em memória',
                  },
                  {
                    module: 'Cadastro e Edição de Alunos & Fotos',
                    op: false,
                    coord: true,
                    admin: true,
                    guarantee: 'SQLite local + foto Base64',
                  },
                  {
                    module: 'Gestão de Turmas, Séries e Horários',
                    op: false,
                    coord: true,
                    admin: true,
                    guarantee: 'Integridade referencial',
                  },
                  {
                    module: 'Histórico de Frequência & Retificações (RF-05)',
                    op: false,
                    coord: true,
                    admin: true,
                    guarantee: 'Auditoria não destrutiva',
                  },
                  {
                    module: 'Relatórios Oficiais para Impressão A4 / PDF',
                    op: false,
                    coord: true,
                    admin: true,
                    guarantee: 'Calibrado A4 com assinaturas',
                  },
                  {
                    module: 'Controle de Usuários, Senhas e Acessos',
                    op: false,
                    coord: false,
                    admin: true,
                    guarantee: 'RBAC com Hash de Sessão',
                  },
                  {
                    module: 'Configurações de Câmeras CFTV & Áudio',
                    op: false,
                    coord: false,
                    admin: true,
                    guarantee: 'WebRTC / USB / OBS UVC',
                  },
                  {
                    module: 'Console SQL Direto & PRAGMA WAL',
                    op: false,
                    coord: false,
                    admin: true,
                    guarantee: 'Proteção contra corrupção',
                  },
                ].map((row, idx) => (
                  <tr key={row.module} className={idx % 2 === 1 ? 'bg-neutral-50/60' : 'bg-white'}>
                    <td className="py-2 px-3 font-medium text-neutral-900">{row.module}</td>
                    <td className="py-2 px-3 text-center">
                      {row.op ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[10px]">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          Permitido
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-neutral-400 text-[10px]">
                          <X className="w-3 h-3 text-neutral-300" />
                          Bloqueado
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {row.coord ? (
                        <span className="inline-flex items-center gap-1 text-blue-700 font-semibold text-[10px]">
                          <Check className="w-3.5 h-3.5 text-blue-600" />
                          Permitido
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-neutral-400 text-[10px]">
                          <X className="w-3 h-3 text-neutral-300" />
                          Bloqueado
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="inline-flex items-center gap-1 text-purple-700 font-semibold text-[10px]">
                        <Check className="w-3.5 h-3.5 text-purple-600" />
                        Total (Admin)
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-[10px] text-neutral-500">
                      {row.guarantee}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL 1: Cadastrar / Editar Usuário ── */}
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
                  Preencha os dados institucionais para permissões e login
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
                  Nome Completo *:
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="ex: Maycon Douglas"
                  required
                  className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e]"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-neutral-700">
                  E-mail Institucional (Login de Acesso) *:
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="ex: operador@escola.local"
                    required
                    className="w-full bg-white border border-neutral-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e]"
                  />
                  <Mail className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2 pointer-events-none" />
                </div>
              </div>

              {/* Senha com botão de Gerar Senha Forte */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-neutral-700">
                    Senha de Acesso *:
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormPassword(generateStrongPassword())}
                    className="text-[#0f766e] hover:underline text-[11px] flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Sugerir Senha Forte</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showFormPassword ? 'text' : 'password'}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    required
                    className="w-full bg-white border border-neutral-300 rounded-lg pl-8 pr-8 py-1.5 text-xs text-neutral-900 font-mono focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e]"
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
                    Papel de Acesso *:
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as UserRole)}
                    className="w-full bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e]"
                  >
                    <option value="operator">Operador (Portaria)</option>
                    <option value="coordinator">Coordenação Pedagógica</option>
                    <option value="admin">Administrador TI</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-neutral-700">
                    Identificador / Crachá *:
                  </label>
                  <input
                    type="text"
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value)}
                    placeholder="ex: PORT-02"
                    required
                    className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-1.5 text-xs text-neutral-900 font-mono focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e]"
                  />
                </div>
              </div>

              {/* Status do Usuário */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-neutral-700">
                  Status da Conta:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormStatus('active')}
                    className={`py-1.5 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                      formStatus === 'active'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                        : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Ativo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormStatus('suspended')}
                    className={`py-1.5 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                      formStatus === 'suspended'
                        ? 'bg-rose-50 border-rose-300 text-rose-800 font-semibold'
                        : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    <Ban className="w-3.5 h-3.5 text-rose-600" />
                    <span>Suspenso</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
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

      {/* ── MODAL 2: Redefinição Rápida de Senha ── */}
      {passwordResetUser && (
        <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 w-full max-w-sm shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-50 text-[#0f766e] flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900">
                    Redefinir Senha
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    {passwordResetUser.name} ({passwordResetUser.email})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPasswordResetUser(null)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmPasswordReset} className="space-y-3 text-xs">
              {passwordResetError && (
                <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {passwordResetError}
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-neutral-700">Nova Senha:</label>
                  <button
                    type="button"
                    onClick={() => setNewPasswordVal(generateStrongPassword())}
                    className="text-[#0f766e] hover:underline text-[11px] flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Gerar Outra</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPasswordVal}
                    onChange={(e) => setNewPasswordVal(e.target.value)}
                    required
                    className="w-full bg-white border border-neutral-300 rounded-lg pl-8 pr-16 py-1.5 text-xs text-neutral-900 font-mono focus:outline-none focus:border-[#0f766e]"
                  />
                  <Lock className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2 pointer-events-none" />
                  <div className="absolute right-2 top-1.5 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleCopyText(newPasswordVal, 'reset_pwd')}
                      className="text-neutral-400 hover:text-neutral-700 p-0.5"
                      title="Copiar senha"
                    >
                      {copiedId === 'reset_pwd' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="text-neutral-400 hover:text-neutral-700 p-0.5"
                    >
                      {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-2 bg-neutral-50 rounded border border-neutral-200 text-[11px] text-neutral-600">
                A nova senha entrará em vigor imediatamente para login na portaria e no dashboard.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setPasswordResetUser(null)}
                  className="px-3 py-1.5 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-[#0f766e] hover:bg-[#0d5f59] text-white font-semibold cursor-pointer shadow-xs"
                >
                  Gravar Nova Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: Confirmar Exclusão ── */}
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
                <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                  Tem certeza que deseja remover o usuário <strong>{userToDelete.name}</strong> ({userToDelete.email})? Esta ação revogará permanentemente o acesso deste operador.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200">
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
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white cursor-pointer shadow-xs"
              >
                Sim, Excluir Operador
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
