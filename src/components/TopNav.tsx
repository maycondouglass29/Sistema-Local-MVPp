import React, { useState, useEffect } from 'react';
import {
  Calendar,
  ChevronDown,
  HelpCircle,
  Lock,
  LogOut,
} from 'lucide-react';
import { localDb, SYSTEM_OPERATORS } from '../services/localDatabase';
import { SystemUser } from '../types/database';

interface TopNavProps {
  currentTabTitle: string;
  onOpenTour: () => void;
  onOpenLogin: () => void;
  onLogout?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ currentTabTitle, onOpenTour, onOpenLogin, onLogout }) => {
  const school = localDb.getSchool();
  const [currentOperator, setCurrentOperator] = useState<SystemUser>(localDb.currentOperator);

  useEffect(() => {
    return localDb.subscribe(() => {
      setCurrentOperator(localDb.currentOperator);
    });
  }, []);

  const now = new Date();
  const day = now.getDate();
  const monthShort = now.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
  const formattedDate = `${day} de ${monthShort}.`;

  const handleRoleChange = (userId: string) => {
    const op = localDb.getUsers().find((u) => u.id === userId);
    if (op) {
      localDb.currentOperator = op;
      setCurrentOperator(op);
    }
  };

  return (
    <header className="h-12 bg-white border-b border-neutral-200 px-6 flex items-center justify-between text-xs text-neutral-600 select-none shrink-0">
      {/* Left: Clean Breadcrumb */}
      <nav aria-label="Navegação Estrutural" className="flex items-center gap-2">
        <span className="text-neutral-500 font-medium">{school.name}</span>
        <span className="text-neutral-300">/</span>
        <span className="text-neutral-900 font-semibold">{currentTabTitle}</span>
      </nav>

      {/* Right Controls: Minimal, quiet, zero KPI badges */}
      <div className="flex items-center gap-3">
        {/* Help Button */}
        <button
          onClick={onOpenTour}
          className="text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 p-1.5 rounded-md transition-colors duration-150 cursor-pointer flex items-center gap-1.5 text-xs font-medium"
          title="Guia e atalhos desta tela"
          aria-label="Guia da tela"
        >
          <HelpCircle className="w-3.5 h-3.5 text-neutral-400" />
          <span className="hidden sm:inline">Ajuda</span>
        </button>

        {/* Change User / Auth Modal */}
        <button
          onClick={onOpenLogin}
          className="text-[#0f766e] bg-teal-50 hover:bg-teal-100/80 border border-teal-200/80 px-2.5 py-1 rounded-md transition-colors duration-150 cursor-pointer flex items-center gap-1.5 text-xs font-medium"
          title="Autenticar como outro usuário cadastrado"
        >
          <Lock className="w-3.5 h-3.5 text-[#0f766e]" />
          <span>Trocar Usuário</span>
        </button>

        <div className="h-4 w-px bg-neutral-200" />

        {/* Role Selector dropdown */}
        <div className="relative flex items-center bg-neutral-50 border border-neutral-200 rounded-md px-2.5 py-1 text-neutral-800 hover:border-neutral-300 transition-colors duration-150">
          <span className="text-[11px] text-neutral-500 mr-1.5">Perfil:</span>
          <select
            aria-label="Selecionar papel do usuário"
            value={currentOperator.id}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="bg-transparent text-xs font-medium text-neutral-800 focus:outline-none cursor-pointer pr-4 appearance-none"
          >
            {localDb.getUsers().map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role === 'admin' ? 'Admin' : u.role === 'coordinator' ? 'Coord' : 'Portaria'})
              </option>
            ))}
          </select>
          <ChevronDown className="w-3 h-3 text-neutral-400 pointer-events-none absolute right-2" />
        </div>

        {/* Current Date */}
        <div className="flex items-center gap-1.5 text-neutral-600 font-medium tabular-nums pl-1">
          <Calendar className="w-3.5 h-3.5 text-neutral-400" />
          <span>{formattedDate}</span>
        </div>

        {/* Logout Button if callback provided */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="text-neutral-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-md transition-colors duration-150 cursor-pointer flex items-center gap-1 text-xs"
            title="Sair da sessão e voltar à tela de login"
            aria-label="Sair do sistema"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        )}
      </div>
    </header>
  );
};
