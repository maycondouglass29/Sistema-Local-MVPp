/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  X,
  Building2,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { localDb } from '../services/localDatabase';
import { SystemUser } from '../types/database';

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  canDismiss?: boolean;
  /** When true, renders as full-screen institutional gate blocking the dashboard */
  isGate?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  canDismiss = true,
  isGate = false,
}) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const school = localDb.getSchool();

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    const result = localDb.authenticate(email, password);

    if (!result.success || !result.user) {
      setIsLoading(false);
      setErrorMessage(result.error || 'Credenciais inválidas. Verifique seu e-mail e senha.');
      return;
    }

    const authenticatedUser: SystemUser = result.user;
    setSuccessNotice(`Sessão autorizada: ${authenticatedUser.name}`);

    setTimeout(() => {
      setIsLoading(false);
      setSuccessNotice(null);
      if (onClose) onClose();
    }, 350);
  };

  const wrapperCls = isGate
    ? 'fixed inset-0 z-50 flex items-center justify-center bg-[#142024] p-4 min-h-screen select-none'
    : 'fixed inset-0 bg-neutral-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4';

  const cardCls =
    'relative bg-white rounded-xl border border-neutral-200/90 w-full max-w-md shadow-xl overflow-hidden z-10 transition-all';

  return (
    <div className={wrapperCls}>
      {/* Subtle institutional backdrop lines for gate mode */}
      {isGate && (
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'radial-gradient(#ffffff 1px, transparent 1px), radial-gradient(#ffffff 1px, #142024 1px)',
            backgroundSize: '32px 32px',
            backgroundPosition: '0 0, 16px 16px',
          }}
        />
      )}

      <div className={cardCls}>
        {/* Institutional Header */}
        <div className="bg-[#0f171a] px-6 py-5 text-white border-b border-[#1f2d32] relative">
          {canDismiss && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-md cursor-pointer transition-colors"
              title="Fechar"
              aria-label="Fechar janela de login"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0f766e] text-white flex items-center justify-center shrink-0 border border-teal-500/30 shadow-xs">
              <Building2 className="w-5 h-5 text-teal-50" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-white leading-tight">
                {school.name || 'Escola Horizonte'}
              </h2>
              <p className="text-[11px] text-neutral-400 mt-0.5 font-medium">
                Controle de Portaria &bull; Sistema Local-First
              </p>
            </div>
          </div>
        </div>

        {/* Login Form Body */}
        <div className="p-6">
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-neutral-900 tracking-tight">
              Acesso ao Sistema
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Informe seu e-mail institucional e senha previamente cadastrados.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {errorMessage && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-150"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {successNotice && (
              <div
                role="status"
                className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in duration-150"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">{successNotice}</span>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="user-email"
                className="block text-xs font-medium text-neutral-700"
              >
                E-mail institucional
              </label>
              <div className="relative">
                <input
                  id="user-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ex: maycon.fox150@gmail.com ou felipe@escola.local"
                  required
                  autoFocus
                  disabled={isLoading}
                  autoComplete="username"
                  className="w-full bg-white border border-neutral-300 rounded-lg pl-9 pr-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e] transition-colors disabled:bg-neutral-50"
                />
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="user-password"
                  className="block text-xs font-medium text-neutral-700"
                >
                  Senha de acesso
                </label>
              </div>
              <div className="relative">
                <input
                  id="user-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="w-full bg-white border border-neutral-300 rounded-lg pl-9 pr-9 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e] transition-colors disabled:bg-neutral-50"
                />
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute right-2.5 top-2 text-neutral-400 hover:text-neutral-600 p-0.5 rounded cursor-pointer transition-colors"
                  aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#0f766e] hover:bg-[#0d5f59] active:bg-[#0b4e49] text-white text-xs font-semibold py-2.5 rounded-lg transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2 mt-3 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span>Validando acesso...</span>
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5" />
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Institutional Security Notice */}
          <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400">
            <span>Terminal Local-First</span>
            <span className="font-mono text-neutral-400">SQLite WAL &bull; RBAC</span>
          </div>
        </div>
      </div>
    </div>
  );
};

