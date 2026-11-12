import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Lock,
  FileCheck,
} from 'lucide-react';
import { localDb } from '../services/localDatabase';
import { AuditLog } from '../types/database';

export const AuditTrailView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadData = () => {
    setLogs(localDb.getAuditLogs());
  };

  useEffect(() => {
    loadData();
    return localDb.subscribe(loadData);
  }, []);

  const filteredLogs = logs.filter((l) => {
    return (
      !searchQuery ||
      l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.actor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.entity_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.metadata_json && l.metadata_json.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const handleExportAuditCsv = () => {
    const headers = ['ID', 'Data_Hora', 'Ator', 'Acao', 'Tipo_Entidade', 'ID_Entidade', 'Metadados'];
    const rows = filteredLogs.map((l) => [
      l.id,
      l.occurred_at,
      `"${l.actor_name}"`,
      l.action,
      l.entity_type,
      l.entity_id || '',
      `"${(l.metadata_json || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auditoria_portaria_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Trilha de Auditoria & Conformidade LGPD (Seção 5.2)
          </h2>
          <p className="text-xs text-slate-400">
            Registro imutável de todas as intervenções de operadores, retificações e revogações de credenciais
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportAuditCsv}
            className="px-3.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exportar Trilha de Auditoria (.CSV)</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-2 text-xs">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Filtrar por ação, operador ou conteúdo dos metadados..."
          aria-label="Filtrar trilha de auditoria"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Data / Horário</th>
                <th className="py-2.5 px-4">Operador / Ator</th>
                <th className="py-2.5 px-4">Ação</th>
                <th className="py-2.5 px-4">Entidade</th>
                <th className="py-2.5 px-4">Metadados Auditáveis (JSON)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-medium text-slate-200">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-500">
                    Nenhum registro de auditoria encontrado.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-slate-300 whitespace-nowrap">
                      {new Date(log.occurred_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-white whitespace-nowrap">
                      {log.actor_name}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-400">
                      {log.entity_type}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-400 max-w-md truncate">
                      {log.metadata_json || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
