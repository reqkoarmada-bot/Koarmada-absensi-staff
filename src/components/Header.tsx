import React, { useState } from 'react';
import { RefreshCw, Calendar, CheckSquare, Settings, Menu, X } from 'lucide-react';

interface HeaderProps {
  currentView: 'calendar' | 'daily' | 'config';
  onViewChange: (view: 'calendar' | 'daily' | 'config') => void;
  onOpenSync: () => void;
  isSyncing?: boolean;
}

const KOARMADA_LOGO_URL = 'https://commons.wikimedia.org/wiki/Special:FilePath/Koarmada_RI.svg';

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  onOpenSync,
  isSyncing = false,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="border-b border-slate-800 bg-[#0c0f17]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-md shadow-slate-950/30">
            <img
              src={KOARMADA_LOGO_URL}
              alt="Lambang resmi Koarmada RI"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">Absensi Koarmada</span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <button
            onClick={() => onViewChange('calendar')}
            className={`flex items-center gap-1.5 transition-colors ${
              currentView === 'calendar' ? 'text-indigo-400 font-bold' : 'hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Rekap & Kalender</span>
          </button>

          <button
            onClick={() => onViewChange('daily')}
            className={`flex items-center gap-1.5 transition-colors ${
              currentView === 'daily' ? 'text-indigo-400 font-bold' : 'hover:text-slate-200'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Absensi Hari Ini</span>
          </button>

          <button
            onClick={() => onViewChange('config')}
            className={`flex items-center gap-1.5 transition-colors ${
              currentView === 'config' ? 'text-indigo-400 font-bold' : 'hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Konfigurasi Bot</span>
          </button>
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-xl transition-all shadow-sm shadow-indigo-600/20 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sinkron Reaksi</span>
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label={mobileMenuOpen ? 'Tutup menu' : 'Buka menu'}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-[#0c0f17] px-4 py-3 space-y-1">
          <button
            onClick={() => {
              onViewChange('calendar');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg text-left ${
              currentView === 'calendar' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Rekap & Kalender</span>
          </button>

          <button
            onClick={() => {
              onViewChange('daily');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg text-left ${
              currentView === 'daily' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Absensi Hari Ini</span>
          </button>

          <button
            onClick={() => {
              onViewChange('config');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg text-left ${
              currentView === 'config' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Konfigurasi Bot</span>
          </button>
        </div>
      )}
    </header>
  );
};
