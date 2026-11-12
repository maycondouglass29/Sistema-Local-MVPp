import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
  RefreshCw,
  HardDrive,
  Clock,
  Shield,
  UserCheck,
} from 'lucide-react';
import { localDb, SYSTEM_OPERATORS } from '../services/localDatabase';
import { soundManager } from '../utils/sound';
import { UserRole } from '../types/database';

interface HeaderProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  pendingOutboxCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  pendingOutboxCount,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(soundManager.enabled);
  const [isOnline, setIsOnline] = useState<boolean>(localDb.isOnline);
  const [isSyncing, setIsSyncing] = useState<boolean>(localDb.isSyncing);
  const [currentOperator, setCurrentOperator] = useState(localDb.currentOperator);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsub = localDb.subscribe(() => {
      setIsOnline(localDb.isOnline);
      setIsSyncing(localDb.isSyncing);
      setCurrentOperator(localDb.currentOperator);
    });
    return unsub;
  }, []);

  const toggleSound = () => {
    soundManager.enabled = !soundEnabled;
    setSoundEnabled(soundManager.enabled);
  };

  const handleToggleOnline = () => {
    localDb.toggleOnline();
  };

  const handleManualSync = async () => {
    await localDb.processOutboxBatch();
  };

  const handleOperatorChange = (opId: string) => {
    const found = SYSTEM_OPERATORS.find((o) => o.id === opId);
    if (found) {
      localDb.currentOperator = found;
      setCurrentOperator(found);
    }
  };

  const navItems = [
    { id: 'terminal', label: 'Terminal Portaria', roleRequired: 'operator' as UserRole },
    { id: 'dashboard', label: 'Dashboard', roleRequired: 'coordinator' as UserRole },
    { id: 'badges', label: 'Carteirinhas QR', roleRequired: 'coordinator' as UserRole },
    { id: 'history', label: 'Presenças & Ajustes', roleRequired: 'coordinator' as UserRole },
    { id: 'students', label: 'Alunos & Carga CSV', roleRequired: 'admin' as UserRole },
    { id: 'outbox', label: 'Outbox & SQLite', roleRequired: 'admin' as UserRole },
    { id: 'audit', label: 'Auditoria LGPD', roleRequired: 'admin' as UserRole },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white select-none">
      {/* Top Bar: Station details, Connectivity, Operator Switcher */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Branding & Station */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-base shadow-sm">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm tracking-tight text-slate-100">
                  {localDb.getSchool().name}
                </span>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium">
                  LOCAL-FIRST
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                <span className="flex items-center gap-1 font-mono">
                  <HardDrive className="w-3 h-3 text-slate-400" />
                  Terminal #01 (SQLite WAL)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Controls: Clock, Sound, Network Toggle, Outbox Badge, Operator */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Live Clock */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700 font-mono text-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium">{timeStr}</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            aria-label={soundEnabled ? 'Silenciar alertas sonoros' : 'Ativar alertas sonoros'}
            title={soundEnabled ? 'Sons ativados' : 'Sons silenciados'}
            className={`p-1.5 rounded border transition-colors ${
              soundEnabled
                ? 'bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-700'
                : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Network State Toggle (Online/Offline simulator) */}
          <button
            onClick={handleToggleOnline}
            aria-label="Alternar conectividade da rede"
            title="Clique para simular queda ou retorno da internet"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border font-medium transition-all ${
              isOnline
                ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/60'
                : 'bg-amber-950/70 border-amber-600/80 text-amber-300 hover:bg-amber-900/70 animate-pulse'
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>Online (Sync Ativo)</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span>Offline (Fila Local)</span>
              </>
            )}
          </button>

          {/* Outbox Badge & Sync Trigger */}
          <button
            onClick={handleManualSync}
            disabled={!isOnline || isSyncing}
            title={
              pendingOutboxCount > 0
                ? `${pendingOutboxCount} evento(s) pendentes no Outbox`
                : 'Outbox sincronizado'
            }
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-mono transition-colors ${
              pendingOutboxCount > 0
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                : 'bg-slate-800/80 border-slate-700 text-slate-400'
            }`}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : ''}`}
            />
            <span>
              Outbox: <strong className="text-white">{pendingOutboxCount}</strong>
            </span>
          </button>

          {/* Operator / Role Selector */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 px-2 py-1 rounded">
            <UserCheck className="w-3.5 h-3.5 text-blue-400" />
            <select
              aria-label="Operador ativo"
              value={currentOperator.id}
              onChange={(e) => handleOperatorChange(e.target.value)}
              className="bg-transparent text-slate-200 text-xs font-medium focus:outline-none cursor-pointer"
            >
              {SYSTEM_OPERATORS.map((op) => (
                <option key={op.id} value={op.id} className="bg-slate-900 text-white">
                  {op.name} ({op.role === 'admin' ? 'TI Admin' : op.role === 'coordinator' ? 'Coordenação' : 'Portaria'})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav aria-label="Navegação Principal" className="max-w-7xl mx-auto px-4 flex space-x-1 overflow-x-auto scrollbar-none border-t border-slate-800/60">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`px-4 py-2.5 text-xs font-medium transition-colors whitespace-nowrap border-b-2 ${
                isActive
                  ? 'border-emerald-500 text-emerald-400 bg-slate-800/50'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
              }`}
            >
              {item.label}
              {item.id === 'outbox' && pendingOutboxCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-slate-950 font-bold font-mono">
                  {pendingOutboxCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
