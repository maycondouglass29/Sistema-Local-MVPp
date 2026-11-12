/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  User,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lock,
  DoorOpen,
  GraduationCap,
  HardDrive,
  AlertCircle,
  X,
} from 'lucide-react';
import { SYSTEM_OPERATORS, localDb } from '../services/localDatabase';
import { SystemUser } from '../types/database';

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  canDismiss?: boolean;
  /** When true, renders as a full-screen auth gate instead of a floating modal */
  isGate?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  canDismiss = true,
  isGate = false,
}) => {
  const [email, setEmail] = useState<string>('admin@escola.local');
  const [password, setPassword] = useState<string>('admin123');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLoginSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const targetUser = SYSTEM_OPERATORS.find(
      (u) =>
        (u.email && u.email.toLowerCase() === email.trim().toLowerCase()) ||
        u.id.toLowerCase() === email.trim().toLowerCase()
    );

    if (!targetUser) {
      setErrorMessage('Usuário não encontrado. Use uma das credenciais de teste abaixo.');
      return;
    }

    if (targetUser.password && targetUser.password !== password.trim()) {
      setErrorMessage('Senha incorreta para este usuário de teste.');
      return;
    }

    // Authenticate
    localDb.currentOperator = targetUser;
    setSuccessNotice(`Autenticado com sucesso como ${targetUser.name} (${targetUser.role.toUpperCase()})`);

    setTimeout(() => {
      setSuccessNotice(null);
      if (onClose) onClose();
    }, 450);
  };

  const handleQuickLogin = (user: SystemUser) => {
    setEmail(user.email || '');
    setPassword(user.password || '');
    setErrorMessage(null);

    localDb.currentOperator = user;
    setSuccessNotice(`Sessão iniciada como ${user.name} (${user.role.toUpperCase()})`);

    setTimeout(() => {
      setSuccessNotice(null);
      if (onClose) onClose();
    }, 400);
  };

  // ── Gate mode: full-screen auth wall ──────────────────────────
  const wrapperCls = isGate
    ? 'fixed inset-0 z-50 flex items-center justify-center bg-[#0d1f24] p-4 min-h-screen select-none'
    : 'fixed inset-0 bg-neutral-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4';

  const cardCls = isGate
    ? 'relative bg-white rounded-2xl border border-neutral-200 w-full max-w-md shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200'
    : 'bg-white rounded-2xl border border-neutral-200 max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200';

  return (
    <div className={wrapperCls}>
      {/* Background decorations for gate mode */}
      {isGate && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#0f766e]/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#0f766e]/15 rounded-full blur-3xl" />
          <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-teal-900/20 rounded-full blur-2xl" />
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center text-[11px] text-neutral-400 font-mono select-none">
            Escola Horizonte &bull; Portaria Local-First &bull; MVP Demo &bull; Vercel
          </div>
        </div>
      )}
      <div className={cardCls}>
        {/* Institutional Header */}
        <div className="bg-gradient-to-r from-neutral-900 to-[#14282e] p-6 text-white relative">
          {canDismiss && onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg cursor-pointer transition-colors"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono font-medium mb-3">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>Ambiente Virtual de Demonstração &bull; Vercel MVP</span>
          </div>

          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Escola Horizonte</span>
          </h2>
          <p className="text-xs text-neutral-300 mt-1">
            Sistema Local-First de Portaria Escolar e Emissão de Carteirinhas
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* 1-Click Quick Demo Access Card */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 block">
              Acesso Rápido de Demonstração (1 Clique):
            </span>
            <div className="grid grid-cols-1 gap-2">
              {/* Profile 1: Admin */}
              <button
                type="button"
                onClick={() =>
                  handleQuickLogin(SYSTEM_OPERATORS.find((u) => u.role === 'admin')!)
                }
                className="p-2.5 rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100/80 transition-colors flex items-center justify-between text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    TI
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-neutral-900 flex items-center gap-1.5">
                      <span>Rafael Andrade (TI)</span>
                      <span className="text-[10px] bg-purple-200 text-purple-900 font-mono px-1.5 py-0.2 rounded font-bold">
                        ADMIN
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-500 font-mono">
                      admin@escola.local &bull; admin123
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-purple-700 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* Profile 2: Coordinator */}
              <button
                type="button"
                onClick={() =>
                  handleQuickLogin(SYSTEM_OPERATORS.find((u) => u.role === 'coordinator')!)
                }
                className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100/80 transition-colors flex items-center justify-between text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    CP
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-neutral-900 flex items-center gap-1.5">
                      <span>Prof. Marcos Rocha</span>
                      <span className="text-[10px] bg-amber-200 text-amber-900 font-mono px-1.5 py-0.2 rounded font-bold">
                        COORD
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-500 font-mono">
                      coordenacao@escola.local &bull; coord123
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-700 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* Profile 3: Operator */}
              <button
                type="button"
                onClick={() =>
                  handleQuickLogin(SYSTEM_OPERATORS.find((u) => u.role === 'operator')!)
                }
                className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/80 transition-colors flex items-center justify-between text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    OP
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-neutral-900 flex items-center gap-1.5">
                      <span>Marina Azevedo</span>
                      <span className="text-[10px] bg-emerald-200 text-emerald-900 font-mono px-1.5 py-0.2 rounded font-bold">
                        PORTARIA
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-500 font-mono">
                      portaria@escola.local &bull; portaria123
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-700 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-neutral-200" />
            <span className="shrink-0 mx-3 text-[10px] font-mono text-neutral-400 uppercase">
              Ou digite manualmente
            </span>
            <div className="flex-grow border-t border-neutral-200" />
          </div>

          {/* Manual Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-3.5">
            {errorMessage && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successNotice && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successNotice}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-medium text-neutral-700">
                Email institucional ou identificador:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ex: admin@escola.local"
                  required
                  className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-neutral-700">
                Senha de acesso:
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-white border border-neutral-300 rounded-lg pl-3 pr-9 py-2 text-xs text-neutral-900 focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#0f766e] hover:bg-[#0d5f59] text-white text-xs font-semibold py-2.5 rounded-lg transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5 mt-2"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Entrar no Sistema</span>
            </button>
          </form>

          {/* Footer note */}
          <div className="pt-2 text-center text-[11px] text-neutral-400">
            Escola Horizonte &bull; Modo Local-First &bull; SQLite WAL &bull; Laya Engine
          </div>
        </div>
      </div>
    </div>
  );
};

