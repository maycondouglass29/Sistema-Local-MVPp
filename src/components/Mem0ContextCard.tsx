import React from 'react';
import { ShieldAlert, HeartPulse, UserCheck, Info } from 'lucide-react';

interface MemoryItem {
  id: string;
  category: string;
  content: string;
  importance_score?: number;
}

interface Mem0ContextCardProps {
  criticalAlerts?: MemoryItem[];
  authorizedPickups?: MemoryItem[];
  generalNotes?: MemoryItem[];
}

export const Mem0ContextCard: React.FC<Mem0ContextCardProps> = ({
  criticalAlerts = [],
  authorizedPickups = [],
  generalNotes = [],
}) => {
  const hasContent =
    criticalAlerts.length > 0 || authorizedPickups.length > 0 || generalNotes.length > 0;

  if (!hasContent) {
    return (
      <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-2.5 text-xs text-neutral-500 flex items-center gap-2">
        <Info className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
        <span>Mem0: Nenhuma observação médica ou restrição judicial cadastrada para este aluno.</span>
      </div>
    );
  }

  const totalMemories = criticalAlerts.length + authorizedPickups.length + generalNotes.length;

  return (
    <div className="space-y-2 mt-3 pt-2 border-t border-neutral-100">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-600">
          Contexto de segurança e saúde (Mem0)
        </span>
        <span className="text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded font-mono tabular-nums border border-neutral-200">
          {totalMemories} {totalMemories === 1 ? 'registro ativo' : 'registros ativos'}
        </span>
      </div>

      {/* Critical Medical / Custody Alerts */}
      {criticalAlerts.map((alert) => (
        <div
          key={alert.id}
          className="bg-amber-50 border-l-3 border-amber-600 border-y border-r border-amber-200 rounded-r-lg p-3 text-left"
        >
          <div className="flex items-start gap-2.5">
            {alert.category === 'health_medical' ? (
              <HeartPulse className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-rose-700 mt-0.5 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-amber-950">
                  {alert.category === 'health_medical' ? 'Alerta de saúde e alergias' : 'Restrição judicial de custódia'}
                </span>
                <span className="text-[10px] bg-amber-200 text-amber-900 font-medium px-1.5 py-0.2 rounded">
                  Atenção prioritária
                </span>
              </div>
              <p className="text-xs text-amber-900 mt-1 font-medium leading-relaxed">
                {alert.content}
              </p>
            </div>
          </div>
        </div>
      ))}

      {/* Authorized Temporary Pickups */}
      {authorizedPickups.map((auth) => (
        <div
          key={auth.id}
          className="bg-emerald-50 border-l-3 border-emerald-600 border-y border-r border-emerald-200 rounded-r-lg p-2.5 text-xs text-emerald-950 text-left"
        >
          <div className="flex items-start gap-2">
            <UserCheck className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold block text-xs text-emerald-900">
                Autorização de retirada por terceiros
              </span>
              <p className="mt-0.5 text-emerald-900 leading-relaxed">{auth.content}</p>
            </div>
          </div>
        </div>
      ))}

      {/* General / Extracurricular notes */}
      {generalNotes.map((note) => (
        <div
          key={note.id}
          className="bg-neutral-50 border border-neutral-200 rounded-lg p-2.5 text-xs text-neutral-700 flex items-start gap-2 text-left"
        >
          <Info className="w-3.5 h-3.5 text-neutral-400 mt-0.5 shrink-0" />
          <span className="leading-relaxed">{note.content}</span>
        </div>
      ))}
    </div>
  );
};
