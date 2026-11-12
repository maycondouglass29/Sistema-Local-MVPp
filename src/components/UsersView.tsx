import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { SYSTEM_OPERATORS, localDb } from '../services/localDatabase';
import { SystemUser, UserRole } from '../types/database';

export const UsersView: React.FC = () => {
  const [users] = useState<SystemUser[]>(SYSTEM_OPERATORS);
  const [currentOperator, setCurrentOperator] = useState<SystemUser>(localDb.currentOperator);

  const handleSwitchUser = (user: SystemUser) => {
    localDb.currentOperator = user;
    setCurrentOperator(user);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">
            Controle de Usuários e Permissões (RBAC)
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Hierarquia de acesso por papéis: Operador de Portaria, Coordenação e Administrador do Sistema
          </p>
        </div>
      </div>

      {/* RBAC Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {users.map((u) => {
          const isCurrent = u.id === currentOperator.id;

          return (
            <div
              key={u.id}
              className={`bg-white rounded-xl border p-4 flex flex-col justify-between space-y-4 ${
                isCurrent ? 'border-[#0f766e] ring-1 ring-[#0f766e]/30' : 'border-neutral-200'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono tabular-nums font-medium px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200">
                    {u.badge_number}
                  </span>
                  {isCurrent && (
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      Sessão atual
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-neutral-900 text-sm">{u.name}</h3>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    Papel:{' '}
                    <strong className="text-neutral-800">
                      {u.role === 'admin'
                        ? 'Administrador do Sistema'
                        : u.role === 'coordinator'
                        ? 'Coordenação Pedagógica'
                        : 'Operador de Portaria'}
                    </strong>
                  </div>
                </div>

                <div className="text-xs text-neutral-600 bg-neutral-50 p-3 rounded-lg border border-neutral-200 space-y-1">
                  <div className="font-medium text-neutral-800">Permissões de acesso:</div>
                  {u.role === 'admin' && (
                    <div className="text-neutral-500 leading-relaxed">
                      Acesso completo: cadastros, carga CSV, configurações do SQLite WAL, controle de usuários e auditoria.
                    </div>
                  )}
                  {u.role === 'coordinator' && (
                    <div className="text-neutral-500 leading-relaxed">
                      Gestão de turmas, alunos, responsáveis, emissão de relatórios diários e retificações justificadas.
                    </div>
                  )}
                  {u.role === 'operator' && (
                    <div className="text-neutral-500 leading-relaxed">
                      Terminal de portaria: validação ultrarrápida de entrada e saída por QR Code e busca simples.
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-neutral-100 pt-3 flex items-center justify-between">
                <span className="text-xs text-neutral-400 font-mono">Autenticação local</span>
                <button
                  onClick={() => handleSwitchUser(u)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 cursor-pointer ${
                    isCurrent
                      ? 'bg-[#0f766e] text-white'
                      : 'border border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  {isCurrent ? 'Perfil ativo' : 'Alternar perfil'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
