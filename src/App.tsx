/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { TerminalView } from './components/TerminalView';
import { DashboardView } from './components/DashboardView';
import { BadgesStudioView } from './components/BadgesStudioView';
import { AttendanceHistoryView } from './components/AttendanceHistoryView';
import { StudentsView } from './components/StudentsView';
import { GuardiansView } from './components/GuardiansView';
import { ClassesView } from './components/ClassesView';
import { UsersView } from './components/UsersView';
import { OutboxSyncView } from './components/OutboxSyncView';
import { GuidedTourModal } from './components/GuidedTourModal';
import { LoginModal } from './components/LoginModal';
import { localDb } from './services/localDatabase';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('portaria');
  const [pendingOutboxCount, setPendingOutboxCount] = useState<number>(0);
  const [showTourModal, setShowTourModal] = useState<boolean>(false);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);

  // ── Auth gate ────────────────────────────────────────────────
  // On first load always require authentication; sessionStorage keeps the
  // session alive across hot-reloads during development but resets on tab close.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return window.sessionStorage.getItem('escola_auth') === '1';
    } catch {
      return false;
    }
  });

  const handleAuthSuccess = () => {
    try {
      window.sessionStorage.setItem('escola_auth', '1');
    } catch { /* noop */ }
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    try {
      window.sessionStorage.removeItem('escola_auth');
    } catch { /* noop */ }
    setIsAuthenticated(false);
  };
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (params.get('login') === 'true') {
        setShowLoginModal(true);
      }
      const validTabs = [
        'dashboard',
        'portaria',
        'students',
        'turmas',
        'responsaveis',
        'usuarios',
        'carteirinhas',
        'relatorios',
        'configuracoes',
      ];
      if (tabParam && validTabs.includes(tabParam)) {
        setCurrentTab(tabParam);
      }
    }

    const updateState = () => {
      setPendingOutboxCount(localDb.getPendingOutboxCount());
    };
    updateState();
    const unsubDb = localDb.subscribe(updateState);

    const handleAppNavigate = (e: Event) => {
      const customEvent = e as CustomEvent<{ tab: string; persona?: string }>;
      if (customEvent.detail?.tab) {
        setCurrentTab(customEvent.detail.tab);
        if (customEvent.detail.persona) {
          window.sessionStorage.setItem('preferred_config_persona', customEvent.detail.persona);
        }
      }
    };
    window.addEventListener('app-navigate', handleAppNavigate);

    return () => {
      unsubDb();
      window.removeEventListener('app-navigate', handleAppNavigate);
    };
  }, []);

  const tabTitles: { [key: string]: string } = {
    dashboard: 'Visão geral',
    portaria: 'Portaria',
    students: 'Alunos',
    turmas: 'Turmas',
    responsaveis: 'Responsáveis',
    usuarios: 'Usuários',
    carteirinhas: 'Carteirinhas',
    relatorios: 'Relatórios',
    configuracoes: 'Configurações',
  };

  // ── Auth Gate: render full-screen login before the dashboard ──
  if (!isAuthenticated) {
    return (
      <LoginModal
        isOpen={true}
        canDismiss={false}
        onClose={handleAuthSuccess}
        isGate={true}
      />
    );
  }

  return (
    <div className="h-screen bg-[#f4f5f7] flex font-sans text-neutral-900 antialiased overflow-hidden selection:bg-[#0f766e] selection:text-white">
      {/* Dark Slate-Teal Sidebar (Fixed & Independent) */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        pendingOutboxCount={pendingOutboxCount}
      />

      {/* Main Content Area (Independent Scroll Container) */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Navbar */}
        <TopNav
          currentTabTitle={tabTitles[currentTab] || 'Portaria'}
          onOpenTour={() => setShowTourModal(true)}
          onOpenLogin={() => setShowLoginModal(true)}
          onLogout={handleLogout}
        />

        {/* View Surface with separate scroll */}
        <main className="flex-1 overflow-y-auto min-h-0">
          {currentTab === 'responsaveis' && <GuardiansView />}
          {currentTab === 'portaria' && <TerminalView />}
          {currentTab === 'dashboard' && <DashboardView />}
          {currentTab === 'students' && <StudentsView />}
          {currentTab === 'turmas' && <ClassesView />}
          {currentTab === 'usuarios' && <UsersView />}
          {currentTab === 'carteirinhas' && <BadgesStudioView />}
          {currentTab === 'relatorios' && <AttendanceHistoryView />}
          {currentTab === 'configuracoes' && <OutboxSyncView />}
        </main>

        {/* Production Institutional Footer */}
        <footer className="h-9 bg-white border-t border-neutral-200 px-6 text-[11px] text-neutral-500 flex items-center justify-between shrink-0 select-none">
          <div>
            Portaria Escolar Local-First &bull; Modo de Operação Offline
          </div>
          <div className="font-mono tabular-nums text-neutral-400">
            SQLite WAL &bull; Laya Engine &bull; Mem0 Layer &bull; v1.0.0
          </div>
        </footer>
      </div>

      {/* Interactive Guided Tour Modal accessible everywhere */}
      <GuidedTourModal
        isOpen={showTourModal}
        onClose={() => setShowTourModal(false)}
        currentTab={currentTab}
      />

      {/* Change-profile modal (optional, opened from TopNav) */}
      <LoginModal
        isOpen={showLoginModal}
        canDismiss={true}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  );
}
