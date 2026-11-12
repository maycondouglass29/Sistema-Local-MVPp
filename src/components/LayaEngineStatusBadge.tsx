import React, { useState, useEffect } from 'react';
import { Cpu, Database, Brain, Activity } from 'lucide-react';
import { api } from '../services/apiClient';

export const LayaEngineStatusBadge: React.FC = () => {
  const [backendHealth, setBackendHealth] = useState<{
    status: string;
    engine: string;
    layaDecisionEngine: string;
    mem0MemoryLayer: string;
    counts?: {
      students: number;
      attendanceEvents: number;
      memories: number;
    };
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    const checkHealth = async () => {
      try {
        const health = await api.getHealth();
        if (mounted) setBackendHealth(health);
      } catch (err) {
        if (mounted) setBackendHealth(null);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 8000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (!backendHealth) {
    return (
      <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
        <Activity className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
        <span>Modo Contingência Web (IndexedDB)</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* SQLite WAL Mode */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#f0ede4] border border-[#dcd6c5] text-slate-700 text-[11px] font-medium">
        <Database className="w-3.5 h-3.5 text-emerald-700" />
        <span>SQLite WAL</span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
      </div>

      {/* Laya Engine */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#f0ede4] border border-[#dcd6c5] text-slate-700 text-[11px] font-medium" title="Decisão tipada não-autoregressiva sub-35ms">
        <Cpu className="w-3.5 h-3.5 text-[#347867]" />
        <span>Laya Engine</span>
        <span className="text-[10px] text-slate-500 font-mono">&lt;35ms</span>
      </div>

      {/* Mem0 Layer */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#f0ede4] border border-[#dcd6c5] text-slate-700 text-[11px] font-medium" title="Camada de memória contextual de alunos e responsáveis">
        <Brain className="w-3.5 h-3.5 text-sky-700" />
        <span>Mem0 Layer</span>
        <span className="text-[10px] bg-sky-100 text-sky-800 px-1 rounded font-mono">
          {backendHealth.counts?.memories || 0}
        </span>
      </div>
    </div>
  );
};

