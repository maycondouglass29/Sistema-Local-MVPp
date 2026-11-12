import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  DoorOpen,
  GraduationCap,
  BookOpen,
  Users2,
  ShieldCheck,
  CreditCard,
  FileSpreadsheet,
  Settings,
  ChevronDown,
  LogOut,
  X,
  CheckCircle2,
} from 'lucide-react';
import { localDb, SYSTEM_OPERATORS } from '../services/localDatabase';
import { SystemUser, UserRole } from '../types/database';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  pendingOutboxCount: number;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  group: 'operacao' | 'pedagogico' | 'administracao';
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  pendingOutboxCount,
}) => {
  const school = localDb.getSchool();
  const [currentOperator, setCurrentOperator] = useState<SystemUser>(localDb.currentOperator);
  const [showUserModal, setShowUserModal] = useState<boolean>(false);

  useEffect(() => {
    const handleDbUpdate = () => {
      setCurrentOperator(localDb.currentOperator);
    };
    return localDb.subscribe(handleDbUpdate);
  }, []);

  const allMenuItems: MenuItem[] = [
    // Operação básica (Porteiros, Inspetores, Coordenação, TI)
    { id: 'portaria', label: 'Portaria e Acesso', icon: DoorOpen, roles: ['operator', 'coordinator', 'admin'], group: 'operacao' },
    { id: 'carteirinhas', label: 'Emissão de Carteirinhas', icon: CreditCard, roles: ['operator', 'coordinator', 'admin'], group: 'operacao' },

    // Gestão Pedagógica (Coordenação e Administração)
    { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard, roles: ['coordinator', 'admin'], group: 'pedagogico' },
    { id: 'students', label: 'Cadastro de Alunos', icon: GraduationCap, roles: ['coordinator', 'admin'], group: 'pedagogico' },
    { id: 'turmas', label: 'Turmas e Séries', icon: BookOpen, roles: ['coordinator', 'admin'], group: 'pedagogico' },
    { id: 'responsaveis', label: 'Responsáveis e Avisos', icon: Users2, roles: ['coordinator', 'admin'], group: 'pedagogico' },
    { id: 'relatorios', label: 'Histórico de Frequência', icon: FileSpreadsheet, roles: ['coordinator', 'admin'], group: 'pedagogico' },

    // Administração & TI
    { id: 'usuarios', label: 'Controle de Usuários', icon: ShieldCheck, roles: ['admin'], group: 'administracao' },
    { id: 'configuracoes', label: 'Configurações e Banco', icon: Settings, roles: ['operator', 'coordinator', 'admin'], group: 'administracao' },
  ];

  // Filter items visible to current user's role
  const visibleMenuItems = allMenuItems.filter((item) =>
    item.roles.includes(currentOperator.role)
  );

  // Auto-redirect if current tab is not permitted for current role
  useEffect(() => {
    const isCurrentTabAllowed = visibleMenuItems.some((item) => item.id === currentTab);
    if (!isCurrentTabAllowed && visibleMenuItems.length > 0) {
      onTabChange(visibleMenuItems[0].id);
    }
  }, [currentOperator.role, currentTab]);

  const handleSwitchUser = (user: SystemUser) => {
    localDb.currentOperator = user;
    setCurrentOperator(user);
    setShowUserModal(false);
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'Administrador do Sistema';
      case 'coordinator':
        return 'Coordenação Pedagógica';
      case 'operator':
      default:
        return 'Operador de Portaria';
    }
  };

  const initials =
    currentOperator.name
      .split(' ')
      .filter((_, i, arr) => i === 0 || i === arr.length - 1)
      .map((n) => n[0])
      .join('')
      .toUpperCase() || 'OP';

  const operationItems = visibleMenuItems.filter((i) => i.group === 'operacao');
  const pedagogicalItems = visibleMenuItems.filter((i) => i.group === 'pedagogico');
  const adminItems = visibleMenuItems.filter((i) => i.group === 'administracao');

  return (
    <aside className="w-64 bg-[#142024] text-slate-200 flex flex-col justify-between select-none shrink-0 border-r border-[#0e171a] h-screen overflow-y-auto sticky top-0">
      <div>
        {/* Institutional School Brand Header */}
        <div className="p-4 pb-3 flex items-center gap-3 border-b border-[#1b2b30]">
          <div className="w-9 h-9 rounded-lg bg-[#0f766e] flex items-center justify-center text-white shrink-0">
            <svg
              className="w-5 h-5 stroke-current fill-none stroke-[1.75]"
              viewBox="0 0 24 24"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 21V9a8 8 0 0 1 16 0v12" />
              <path d="M9 21v-7a3 3 0 0 1 6 0v7" />
              <line x1="4" y1="21" x2="20" y2="21" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm tracking-tight text-white truncate">
              {school.name}
            </div>
            <div className="text-[11px] text-[#869ea5] truncate">
              Portaria Escolar Local-First
            </div>
          </div>
        </div>

        {/* Navigation Categories with Hallmark Sentence-Case */}
        <nav aria-label="Menu Lateral" className="px-2 pt-3 space-y-4">
          {/* 1. Operações de Portaria */}
          {operationItems.length > 0 && (
            <div className="space-y-0.5">
              <div className="px-3 py-1 text-xs font-medium text-[#7d98a0]">
                Operações de portaria
              </div>
              {operationItems.map((item) => {
                const isActive = currentTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`w-full h-9 flex items-center justify-between px-3 rounded-lg text-xs font-medium transition-colors duration-150 cursor-pointer ${
                      isActive
                        ? 'bg-[#1f3339] text-white border border-[#2b474f]'
                        : 'text-[#9cb5bc] hover:text-white hover:bg-[#19292e]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#2dd4bf]' : 'text-[#7d9da6]'}`} />
                      <span>{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* 2. Gestão Escolar */}
          {pedagogicalItems.length > 0 && (
            <div className="space-y-0.5">
              <div className="px-3 py-1 text-xs font-medium text-[#7d98a0]">
                Gestão escolar
              </div>
              {pedagogicalItems.map((item) => {
                const isActive = currentTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`w-full h-9 flex items-center justify-between px-3 rounded-lg text-xs font-medium transition-colors duration-150 cursor-pointer ${
                      isActive
                        ? 'bg-[#1f3339] text-white border border-[#2b474f]'
                        : 'text-[#9cb5bc] hover:text-white hover:bg-[#19292e]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#2dd4bf]' : 'text-[#7d9da6]'}`} />
                      <span>{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* 3. Administração & TI */}
          {adminItems.length > 0 && (
            <div className="space-y-0.5">
              <div className="px-3 py-1 text-xs font-medium text-[#7d98a0]">
                Administração do sistema
              </div>
              {adminItems.map((item) => {
                const isActive = currentTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`w-full h-9 flex items-center justify-between px-3 rounded-lg text-xs font-medium transition-colors duration-150 cursor-pointer ${
                      isActive
                        ? 'bg-[#1f3339] text-white border border-[#2b474f]'
                        : 'text-[#9cb5bc] hover:text-white hover:bg-[#19292e]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#2dd4bf]' : 'text-[#7d9da6]'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.id === 'configuracoes' && pendingOutboxCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-600 text-white font-mono tabular-nums">
                        {pendingOutboxCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </nav>
      </div>

      {/* Bottom Area: User Role and Session Status */}
      <div className="p-3 border-t border-[#1b2b30] space-y-2">
        {/* User Profile Bar */}
        <div
          onClick={() => setShowUserModal(true)}
          className="flex items-center justify-between p-2 rounded-lg bg-[#19292e] hover:bg-[#1e3238] border border-[#22383f] cursor-pointer transition-colors duration-150"
          title="Clique para alternar o papel do usuário"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-md bg-[#243c43] text-[#2dd4bf] font-bold text-xs flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="truncate text-left">
              <div className="text-xs font-semibold text-white truncate">
                {currentOperator.name}
              </div>
              <div className="text-[11px] text-[#869ea5] truncate">
                {getRoleLabel(currentOperator.role)}
              </div>
            </div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-[#7d9da6] shrink-0" />
        </div>
      </div>

      {/* Role Switcher Dialog */}
      {showUserModal && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-300 max-w-sm w-full p-5 shadow-lg space-y-3 text-neutral-900">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
              <div>
                <h3 className="font-semibold text-sm text-neutral-900">Alternar papel do usuário</h3>
                <p className="text-xs text-neutral-500">O menu lateral será ajustado conforme as permissões.</p>
              </div>
              <button 
                onClick={() => setShowUserModal(false)} 
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1.5 pt-1">
              {localDb.getUsers().map((u) => {
                const isSelected = u.id === currentOperator.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => handleSwitchUser(u)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors duration-150 flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'border-[#0f766e] bg-[#f0fdfa]'
                        : 'border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold text-neutral-900">{u.name}</div>
                      <div className="text-xs text-neutral-500">
                        {u.role === 'admin' && 'Administrador (Acesso completo)'}
                        {u.role === 'coordinator' && 'Coordenação (Gestão de alunos e turmas)'}
                        {u.role === 'operator' && 'Operador (Portaria e carteirinhas)'}
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-[#0f766e]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
