import React, { useState, useEffect } from 'react';
import {
  Printer,
  X,
  Sliders,
  FileSpreadsheet,
  Columns,
  SquareCheck,
  Building,
  ChevronDown,
  Edit3,
  Check
} from 'lucide-react';
import { Training, Attendance, PrintSettings } from '../types';
import { PrintRegisterDocument } from './PrintRegisterDocument';
import { updateTrainingNotes, compareStaffNumber } from '../api';
import { executePrintDocument } from '../utils/printHtmlGenerator';

interface PrintRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  training: Training;
  attendances: Attendance[];
  onRefresh?: () => void;
}

export const PrintRegisterModal: React.FC<PrintRegisterModalProps> = ({
  isOpen,
  onClose,
  training,
  attendances,
  onRefresh,
}) => {
  const [settings, setSettings] = useState<PrintSettings>({
    layoutMode: 'auto',
    fontSize: 'auto',
    showApprovalLine: false,
    approvalTitles: ['담당', '부장', '교감', '교장'],
    showSchoolHeader: true,
    showMemo: false,
    schoolName: training.schoolName || '인천비즈니스고등학교',
  });

  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showNotesManager, setShowNotesManager] = useState(false);
  const [localNotes, setLocalNotes] = useState<Record<string, string>>(training.notes || {});
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');

  // Synchronize localNotes strictly when training changes
  useEffect(() => {
    setLocalNotes(training.notes || {});
    setEditingStaffId(null);
    setEditingNoteText('');
  }, [training.id, training.notes]);

  if (!isOpen) return null;

  const targetStaff = training.targetStaff || [];
  const staffListForNotes = targetStaff.length > 0
    ? targetStaff
    : attendances.map((a) => ({ id: a.id, name: a.name, department: a.department || '교직원' }));

  const handleSaveNote = async (id: string, noteText: string) => {
    const updated = { ...localNotes, [id]: noteText.trim() };
    setLocalNotes(updated);
    setEditingStaffId(null);
    try {
      await updateTrainingNotes(training.id, updated);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to save note:', err);
    }
  };

  const handlePrint = () => {
    const currentTrainingWithNotes = {
      ...training,
      notes: localNotes,
    };
    executePrintDocument(currentTrainingWithNotes, attendances, settings);
  };


  const handleExportCSV = () => {
    const sortedAttendances = [...attendances].sort((a, b) => {
      const staffA = targetStaff.find((s) => (a.staffId && s.id === a.staffId) || s.name.trim() === a.name.trim());
      const staffB = targetStaff.find((s) => (b.staffId && s.id === b.staffId) || s.name.trim() === b.name.trim());
      return compareStaffNumber(
        { code: staffA?.code, order: staffA?.order, name: a.name },
        { code: staffB?.code, order: staffB?.order, name: b.name }
      );
    });

    const headers = ['연번', '성명', '소속/부서', '서명등록일시', '비고'];
    const rows = sortedAttendances.map((a, i) => [
      i + 1,
      `"${a.name.replace(/"/g, '""')}"`,
      `"${(a.department || '').replace(/"/g, '""')}"`,
      `"${new Date(a.signedAt).toLocaleString('ko-KR')}"`,
      `"${((a.staffId && localNotes[a.staffId]) || localNotes[a.id] || localNotes[a.name] || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      '\uFEFF' +
      `연수명: ${training.title}\n일시: ${training.date}\n장소: ${training.location}\n총 참석인원: ${attendances.length}명\n\n` +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${training.title.replace(/[\/\s:]/g, '_')}_서명부.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentTraining = {
    ...training,
    notes: localNotes,
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:overflow-visible">
      {/* Container */}
      <div className="relative w-full max-w-5xl bg-slate-100 rounded-xl shadow-lg flex flex-col overflow-hidden print:bg-white print:rounded-none print:shadow-none print:max-w-none">
        {/* Top Control Bar (Hidden in Print) */}
        <div className="print:hidden bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">
              연수 서명부 인쇄 및 미리보기
            </h2>
            <p className="text-xs text-slate-500">
              A4 1페이지 최적화 ({attendances.length}명 서명 완료)
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Notes Manager Dropdown Toggle */}
            <button
              type="button"
              id="print-notes-toggle"
              onClick={() => {
                setShowNotesManager(!showNotesManager);
                if (showSettingsPanel) setShowSettingsPanel(false);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border flex items-center gap-1.5 transition-colors cursor-pointer ${
                showNotesManager
                  ? 'bg-amber-50 border-amber-400 text-amber-900 font-bold'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-600" />
              <span>비고 입력 ({Object.keys(localNotes).filter((k) => !!localNotes[k]).length})</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showNotesManager ? 'rotate-180' : ''}`} />
            </button>

            {/* Settings Dropdown Toggle */}
            <button
              type="button"
              id="print-settings-toggle"
              onClick={() => {
                setShowSettingsPanel(!showSettingsPanel);
                if (showNotesManager) setShowNotesManager(false);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border flex items-center gap-1.5 transition-colors cursor-pointer ${
                showSettingsPanel
                  ? 'bg-slate-100 border-slate-400 text-slate-900'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>서식 설정</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSettingsPanel ? 'rotate-180' : ''}`} />
            </button>

            {/* CSV Export */}
            <button
              type="button"
              id="export-csv-btn"
              onClick={handleExportCSV}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="참석자 명단 엑셀(CSV) 다운로드"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">엑셀 다운로드</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              id="trigger-print-btn"
              onClick={handlePrint}
              className="px-4 py-1.5 text-xs font-medium rounded-md bg-[#1a5b6d] hover:bg-[#144857] text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>A4 인쇄하기</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              id="close-print-modal-btn"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Collapsible Notes Editor Panel (Hidden in Print) */}
        {showNotesManager && (
          <div className="print:hidden bg-amber-50/70 border-b border-amber-200 p-4 shrink-0 max-h-64 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-900">
                  교직원별 비고(사유) 직접 입력
                </span>
                <span className="text-[11px] text-amber-700">
                  (출장, 연가, 병가, 연수 등 입력 시 서명부 비고란에 실시간 반영됩니다)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowNotesManager(false)}
                className="text-xs text-amber-800 hover:underline cursor-pointer"
              >
                완료
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {staffListForNotes.map((staff, idx) => {
                const currentNote = localNotes[staff.id] || localNotes[staff.name] || '';
                const isEditing = editingStaffId === staff.id;

                return (
                  <div
                    key={staff.id || idx}
                    className="bg-white border border-amber-200 rounded-lg p-2 flex items-center justify-between gap-2 shadow-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-slate-900 text-xs truncate block">{staff.name}</span>
                      <span className="text-[10px] text-slate-500 truncate block">{staff.department || '교직원'}</span>
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={editingNoteText}
                          onChange={(e) => setEditingNoteText(e.target.value)}
                          placeholder="비고 입력"
                          className="w-20 px-1.5 py-0.5 text-xs border border-amber-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveNote(staff.id, editingNoteText);
                            if (e.key === 'Escape') setEditingStaffId(null);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveNote(staff.id, editingNoteText)}
                          className="p-1 bg-amber-600 text-white rounded hover:bg-amber-700 cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingStaffId(staff.id);
                            setEditingNoteText(currentNote);
                          }}
                          className={`px-2 py-0.5 text-xs rounded font-medium cursor-pointer transition-colors ${
                            currentNote
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                          title="클릭하여 비고 수정"
                        >
                          {currentNote || '+ 비고'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Collapsible Print Settings Bar (Hidden in Print) */}
        {showSettingsPanel && (
          <div className="print:hidden bg-slate-50 border-b border-slate-200 p-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl">
              {/* Layout Mode */}
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <label className="font-bold text-slate-700 block mb-2 flex items-center gap-1.5">
                  <Columns className="w-3.5 h-3.5 text-slate-500" />
                  <span>서명부 열 구성</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, layoutMode: 'auto' })}
                    className={`py-1 px-2 rounded text-center border text-xs cursor-pointer ${
                      settings.layoutMode === 'auto'
                        ? 'bg-[#1a5b6d] text-white border-[#1a5b6d]'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    자동
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, layoutMode: '1col' })}
                    className={`py-1 px-2 rounded text-center border text-xs cursor-pointer ${
                      settings.layoutMode === '1col'
                        ? 'bg-[#1a5b6d] text-white border-[#1a5b6d]'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    1열 강제
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, layoutMode: '2col' })}
                    className={`py-1 px-2 rounded text-center border text-xs cursor-pointer ${
                      settings.layoutMode === '2col'
                        ? 'bg-[#1a5b6d] text-white border-[#1a5b6d]'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    2열 강제
                  </button>
                </div>
              </div>

              {/* Approval Line Toggle */}
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <label className="font-bold text-slate-700 block mb-2 flex items-center gap-1.5">
                  <SquareCheck className="w-3.5 h-3.5 text-slate-500" />
                  <span>결재란 (상단 우측)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer mb-1.5">
                  <input
                    type="checkbox"
                    checked={settings.showApprovalLine}
                    onChange={(e) => setSettings({ ...settings, showApprovalLine: e.target.checked })}
                    className="rounded text-[#1a5b6d] focus:ring-[#1a5b6d] w-4 h-4 cursor-pointer"
                  />
                  <span className="text-slate-700">결재란(담당-부장-교감-교장) 표시</span>
                </label>
              </div>

              {/* School Header & Memo */}
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <label className="font-bold text-slate-700 block mb-2 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-500" />
                  <span>기관명 & 부가정보</span>
                </label>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showSchoolHeader}
                      onChange={(e) => setSettings({ ...settings, showSchoolHeader: e.target.checked })}
                      className="rounded text-[#1a5b6d] focus:ring-[#1a5b6d] w-4 h-4 cursor-pointer"
                    />
                    <span className="text-slate-700">학교명 표시</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showMemo}
                      onChange={(e) => setSettings({ ...settings, showMemo: e.target.checked })}
                      className="rounded text-[#1a5b6d] focus:ring-[#1a5b6d] w-4 h-4 cursor-pointer"
                    />
                    <span className="text-slate-700">비고 요약 표시</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Document Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/60 print:p-0 print:bg-white print:overflow-visible flex justify-center">
          <PrintRegisterDocument
            training={currentTraining}
            attendances={attendances}
            settings={settings}
          />
        </div>
      </div>
    </div>
  );
};
