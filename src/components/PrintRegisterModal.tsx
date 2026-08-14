import React, { useState } from 'react';
import {
  Printer,
  X,
  Sliders,
  FileSpreadsheet,
  Columns,
  SquareCheck,
  Building,
  ChevronDown
} from 'lucide-react';
import { Training, Attendance, PrintSettings } from '../types';
import { PrintRegisterDocument } from './PrintRegisterDocument';

interface PrintRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  training: Training;
  attendances: Attendance[];
}

export const PrintRegisterModal: React.FC<PrintRegisterModalProps> = ({
  isOpen,
  onClose,
  training,
  attendances,
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

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ['연번', '성명', '소속/부서', '서명등록일시'];
    const rows = attendances.map((a, i) => [
      i + 1,
      `"${a.name.replace(/"/g, '""')}"`,
      `"${(a.department || '').replace(/"/g, '""')}"`,
      `"${new Date(a.signedAt).toLocaleString('ko-KR')}"`,
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
            {/* Settings Dropdown Toggle */}
            <button
              type="button"
              id="print-settings-toggle"
              onClick={() => setShowSettingsPanel(!showSettingsPanel)}
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
            training={training}
            attendances={attendances}
            settings={settings}
          />
        </div>
      </div>
    </div>
  );
};
