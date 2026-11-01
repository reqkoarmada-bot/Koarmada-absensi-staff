/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Member, BotConfig, AttendanceDay } from './types/attendance';
import {
  loadMembers,
  saveMembers,
  loadConfig,
  saveConfig,
  loadDays,
  saveDays,
} from './utils/storage';
import { Header } from './components/Header';
import { MonthlyCalendarView } from './components/MonthlyCalendarView';
import { DailyView } from './components/DailyView';
import { BotConfigView } from './components/BotConfigView';
import { DMWarningModal } from './components/DMWarningModal';
import { DiscordSyncModal } from './components/DiscordSyncModal';

export default function App() {
  const [members, setMembers] = useState<Member[]>(() => loadMembers());
  const [config, setConfig] = useState<BotConfig>(() => loadConfig());
  const [days, setDays] = useState<Record<string, AttendanceDay>>(() => loadDays(loadMembers()));

  const [currentView, setCurrentView] = useState<'calendar' | 'daily' | 'config'>('calendar');
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-31');
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(10);

  // Modals
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [dmTargetRecipients, setDmTargetRecipients] = useState<Member[] | null>(null);

  // Handlers for members & config
  const handleSaveConfig = (newConfig: BotConfig) => {
    setConfig(newConfig);
    saveConfig(newConfig);
  };

  const handleSaveMembers = (newMembers: Member[]) => {
    setMembers(newMembers);
    saveMembers(newMembers);
  };

  const handleSaveDays = (newDays: Record<string, AttendanceDay>) => {
    setDays(newDays);
    saveDays(newDays);
  };

  // Get active session for selected date
  const currentSession: AttendanceDay = days[selectedDate] || {
    date: selectedDate,
    presentIds: [],
  };

  // Toggle member attendance status on selected date
  const handleToggleStatus = (memberId: string) => {
    const presentSet = new Set(currentSession.presentIds || []);
    if (presentSet.has(memberId)) {
      presentSet.delete(memberId);
    } else {
      presentSet.add(memberId);
    }

    const updatedSession: AttendanceDay = {
      ...currentSession,
      presentIds: Array.from(presentSet),
      syncedAt: new Date().toISOString(),
    };

    const updatedDays = {
      ...days,
      [selectedDate]: updatedSession,
    };

    handleSaveDays(updatedDays);
  };

  // Callback when DM warnings are sent
  const handleDMSent = (memberIds: string[]) => {
    const sentSet = new Set([...(currentSession.dmSentIds || []), ...memberIds]);
    const updatedSession: AttendanceDay = {
      ...currentSession,
      dmSentIds: Array.from(sentSet),
    };
    handleSaveDays({
      ...days,
      [selectedDate]: updatedSession,
    });
  };

  // Callback when Discord reaction sync completes
  const handleSyncComplete = (syncedDay: AttendanceDay) => {
    const updatedDays = {
      ...days,
      [syncedDay.date]: syncedDay,
    };
    handleSaveDays(updatedDays);
  };

  const handlePopulateMonth = (newDays: Record<string, AttendanceDay>) => {
    const updated = { ...days, ...newDays };
    setDays(updated);
    saveDays(updated);
  };

  return (
    <div className="min-h-screen bg-[#0c0f17] text-slate-100 flex flex-col font-sans selection:bg-indigo-600/30 selection:text-indigo-200">
      {/* Header matching Screenshot 1 & 2 */}
      <Header
        currentView={currentView}
        onViewChange={setCurrentView}
        onOpenSync={() => setIsSyncModalOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {currentView === 'calendar' && (
          <MonthlyCalendarView
            members={members}
            days={days}
            config={config}
            currentYear={currentYear}
            currentMonth={currentMonth}
            onMonthChange={(y, m) => {
              setCurrentYear(y);
              setCurrentMonth(m);
            }}
            onOpenDMModal={(recipient) => setDmTargetRecipients([recipient])}
            onPopulateMonth={handlePopulateMonth}
          />
        )}

        {currentView === 'daily' && (
          <DailyView
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            members={members}
            session={currentSession}
            config={config}
            onToggleStatus={handleToggleStatus}
            onOpenSingleDM={(m) => setDmTargetRecipients([m])}
            onOpenBatchDM={(absentList) => setDmTargetRecipients(absentList)}
            onOpenSync={() => setIsSyncModalOpen(true)}
          />
        )}

        {currentView === 'config' && (
          <BotConfigView
            config={config}
            onSaveConfig={handleSaveConfig}
            members={members}
            onImportMembers={handleSaveMembers}
          />
        )}
      </main>

      {/* Modals */}
      <DMWarningModal
        isOpen={!!dmTargetRecipients && dmTargetRecipients.length > 0}
        onClose={() => setDmTargetRecipients(null)}
        recipients={dmTargetRecipients || []}
        config={config}
        selectedDate={selectedDate}
        onDMSent={handleDMSent}
      />

      <DiscordSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        config={config}
        members={members}
        selectedDate={selectedDate}
        onSyncComplete={handleSyncComplete}
      />
    </div>
  );
}
