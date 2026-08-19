import React, { useState } from 'react';
import {
  Plus,
  QrCode,
  Users,
  Printer,
  Edit2,
  Trash2,
  Search,
  ExternalLink,
  Copy,
  Check,
  UserCheck
} from 'lucide-react';
import { Training } from '../types';
import { parseTrainingDateTimestamp } from '../api';

interface AdminTrainingListProps {
  trainings: Training[];
  onOpenCreate: () => void;
  onOpenEdit: (training: Training) => void;
  onDelete: (training: Training) => void;
  onOpenAttendees: (training: Training) => void;
  onOpenQR: (training: Training) => void;
  onOpenPrint: (training: Training) => void;
  onNavigateToSign: (trainingId: string) => void;
  onOpenStaffManagement?: () => void;
}

export const AdminTrainingList: React.FC<AdminTrainingListProps> = ({
  trainings,
  onOpenCreate,
  onOpenEdit,
  onDelete,
  onOpenAttendees,
  onOpenQR,
  onOpenPrint,
  onNavigateToSign,
  onOpenStaffManagement,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredTrainings = trainings
    .filter(
      (t) =>
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.location && t.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.manager && t.manager.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      const timeA = parseTrainingDateTimestamp(a.date);
      const timeB = parseTrainingDateTimestamp(b.date);
      if (timeA !== timeB) {
        return timeA - timeB;
      }
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });

  const handleCopyLink = (trainingId: string) => {
    const url = `${window.location.origin}${window.location.pathname}?sign=${trainingId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(trainingId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="bg-white p-6 sm:p-7 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-1">
            연수 및 서명부 관리
          </h2>
          <p className="text-xs text-slate-500">
            등록된 연수 총 {trainings.length}건 · 연수를 등록하고 선생님들의 전자서명을 관리합니다.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenStaffManagement && (
            <button
              type="button"
              onClick={onOpenStaffManagement}
              className="px-3.5 py-2 rounded-md bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-medium text-xs sm:text-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-slate-500" />
              <span>교직원 명부</span>
            </button>
          )}

          <button
            type="button"
            id="btn-create-new-training"
            onClick={onOpenCreate}
            className="px-4 py-2 rounded-md bg-[#1a5b6d] hover:bg-[#144857] active:bg-[#0f3642] text-white font-medium text-xs sm:text-sm transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>새 연수 등록</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="연수명, 장소, 담당자 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-md text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#1a5b6d] focus:ring-1 focus:ring-[#1a5b6d] transition-colors"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        <div className="text-xs text-slate-500 self-end sm:self-center">
          검색 {filteredTrainings.length}건
        </div>
      </div>

      {/* Trainings List */}
      {filteredTrainings.length === 0 ? (
        <div className="p-12 bg-white rounded-xl border border-slate-200 text-center flex flex-col items-center justify-center">
          <p className="text-sm font-medium text-slate-700 mb-1">
            {searchTerm ? '검색 결과가 없습니다.' : '등록된 연수가 없습니다.'}
          </p>
          <p className="text-xs text-slate-400 mb-4">
            {searchTerm ? '다른 검색어를 입력해 보세요.' : '새 연수를 등록하여 전자 서명을 수집하세요.'}
          </p>
          {!searchTerm && (
            <button
              type="button"
              onClick={onOpenCreate}
              className="px-3.5 py-1.5 rounded-md bg-[#1a5b6d] hover:bg-[#144857] text-white text-xs font-medium transition-colors cursor-pointer"
            >
              새 연수 등록하기
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTrainings.map((training) => {
            const signedCount = training.attendanceCount || 0;
            const totalCount = training.totalTargetCount || training.targetStaffIds?.length || 0;

            return (
              <div
                key={training.id}
                className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs hover:border-slate-300 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-5"
              >
                {/* Left Info */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs text-slate-500">
                    <span className="font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                      {training.date}
                    </span>
                    {training.location && (
                      <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60 truncate">
                        장소: {training.location}
                      </span>
                    )}
                    {training.manager && (
                      <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60 truncate">
                        담당: {training.manager}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug break-keep">
                    {training.title}
                  </h3>

                  <div className="text-xs text-slate-600 flex items-center gap-2 sm:gap-3 flex-wrap">
                    <span className="truncate">대상: {training.target || '전 교직원'}</span>
                    <span className="text-slate-300">|</span>
                    <span className="font-bold text-[#1a5b6d] bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200 shrink-0">
                      서명 {signedCount}{totalCount > 0 ? `/${totalCount}` : ''}명 완료
                    </span>
                    {totalCount > 0 && totalCount > signedCount && (
                      <span className="font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 shrink-0">
                        미서명 {totalCount - signedCount}명
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Actions */}
                <div className="pt-2 lg:pt-0 border-t border-slate-100 lg:border-t-0 flex items-center justify-between lg:justify-end gap-1.5 sm:gap-2 flex-wrap shrink-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onOpenAttendees(training)}
                      className="px-3 sm:px-3.5 py-1.5 bg-[#1a5b6d] hover:bg-[#144857] active:bg-[#0f3642] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>서명현황</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenQR(training)}
                      className="px-2.5 sm:px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs whitespace-nowrap"
                    >
                      <QrCode className="w-3.5 h-3.5 text-slate-500" />
                      <span>QR</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenPrint(training)}
                      className="px-2.5 sm:px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs whitespace-nowrap"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-500" />
                      <span>A4 인쇄</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopyLink(training.id)}
                      className="p-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-600 rounded-lg transition-colors cursor-pointer shadow-2xs"
                      title="선생님 서명 링크 복사"
                    >
                      {copiedId === training.id ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onNavigateToSign(training.id)}
                      className="p-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-600 rounded-lg transition-colors cursor-pointer shadow-2xs"
                      title="서명 화면 열기"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>

                    <span className="text-slate-200 hidden sm:inline">|</span>

                    <button
                      type="button"
                      onClick={() => onOpenEdit(training)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="수정"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDelete(training)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
