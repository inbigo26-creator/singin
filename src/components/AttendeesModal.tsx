import React, { useState } from 'react';
import {
  X,
  Printer,
  Trash2,
  Search,
  CheckCircle2,
  Sparkles,
  Maximize2,
  Edit3,
  Check
} from 'lucide-react';
import { Training, Attendance } from '../types';
import { deleteAttendance, seedBulkAttendees, clearAllAttendances, updateTrainingNotes } from '../api';

interface AttendeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  training: Training;
  attendances: Attendance[];
  onRefresh: () => void;
  onOpenPrint: () => void;
}

export const AttendeesModal: React.FC<AttendeesModalProps> = ({
  isOpen,
  onClose,
  training,
  attendances,
  onRefresh,
  onOpenPrint,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'signed' | 'unsigned'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [previewSignature, setPreviewSignature] = useState<{ name: string; url: string } | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteInputValue, setNoteInputValue] = useState('');
  const [localNotes, setLocalNotes] = useState<Record<string, string>>(training.notes || {});

  if (!isOpen) return null;

  const targetStaff = training.targetStaff || [];
  const hasDesignatedStaff = targetStaff.length > 0;

  interface StaffAttendanceRow {
    id: string;
    code?: string;
    staffId?: string;
    attendanceId?: string;
    name: string;
    department: string;
    position?: string;
    signature?: string;
    signedAt?: string;
    isSigned: boolean;
    note?: string;
  }

  let combinedRows: StaffAttendanceRow[] = [];

  if (hasDesignatedStaff) {
    combinedRows = targetStaff.map((staff) => {
      const match = attendances.find(
        (a) => (a.staffId && a.staffId === staff.id) || a.name.trim() === staff.name.trim()
      );
      const note = localNotes[staff.id] || localNotes[staff.name] || match?.note || '';
      return {
        id: staff.id,
        code: staff.code,
        staffId: staff.id,
        attendanceId: match?.id,
        name: staff.name,
        department: staff.department,
        position: staff.position,
        signature: match?.signature,
        signedAt: match?.signedAt,
        isSigned: !!match,
        note,
      };
    });

    attendances.forEach((att) => {
      const alreadyIn = combinedRows.some(
        (r) => (att.staffId && r.staffId === att.staffId) || r.name.trim() === att.name.trim()
      );
      if (!alreadyIn) {
        const note = localNotes[att.id] || (att.staffId && localNotes[att.staffId]) || localNotes[att.name] || att.note || '';
        combinedRows.push({
          id: att.id,
          attendanceId: att.id,
          name: att.name,
          department: att.department || '교직원',
          position: att.position || '교사',
          signature: att.signature,
          signedAt: att.signedAt,
          isSigned: true,
          note,
        });
      }
    });
  } else {
    combinedRows = attendances.map((att) => {
      const note = localNotes[att.id] || (att.staffId && localNotes[att.staffId]) || localNotes[att.name] || att.note || '';
      return {
        id: att.id,
        attendanceId: att.id,
        name: att.name,
        department: att.department || '교직원',
        position: att.position || '교사',
        signature: att.signature,
        signedAt: att.signedAt,
        isSigned: true,
        note,
      };
    });
  }

  const signedCount = combinedRows.filter((r) => r.isSigned).length;
  const totalCount = combinedRows.length;
  const progressPercent = totalCount > 0 ? Math.round((signedCount / totalCount) * 100) : 0;

  const filteredRows = combinedRows.filter((row) => {
    const matchesSearch =
      row.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (row.code && row.code.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;
    if (filterMode === 'signed') return row.isSigned;
    if (filterMode === 'unsigned') return !row.isSigned;
    return true;
  });

  const handleSaveNote = async (id: string, newNote: string) => {
    const updated = { ...localNotes, [id]: newNote.trim() };
    setLocalNotes(updated);
    setEditingNoteId(null);
    try {
      await updateTrainingNotes(training.id, updated);
      onRefresh();
    } catch (err) {
      console.error('Failed to save note:', err);
    }
  };

  const NOTE_PRESETS = ['출장', '연가', '병가', '연수', '육아휴직', '대리참석'];

  const handleDelete = async (attendanceId: string, name: string) => {
    if (!window.confirm(`${name} 선생님의 서명 기록을 삭제하시겠습니까?`)) {
      return;
    }
    try {
      setDeletingId(attendanceId);
      await deleteAttendance(training.id, attendanceId);
      onRefresh();
    } catch (err: any) {
      alert(err.message || '서명 삭제에 실패했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSeedSampleAttendees = async () => {
    if (
      !window.confirm(
        '서명하지 않은 대상 교직원 전원에게 테스트용 전자서명을 일괄 자동 등록하시겠습니까?'
      )
    ) {
      return;
    }

    try {
      setBulkLoading(true);
      await seedBulkAttendees(training.id, 50);
      onRefresh();
    } catch (err: any) {
      alert(err.message || '일괄 서명 생성에 실패했습니다.');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (
      !window.confirm(
        '이 연수에 등록된 모든 서명을 초기화(삭제)하시겠습니까?\n이 작업은 되돌릴 수 없습니다.'
      )
    ) {
      return;
    }

    try {
      setBulkLoading(true);
      await clearAllAttendances(training.id);
      onRefresh();
    } catch (err: any) {
      alert(err.message || '서명 초기화에 실패했습니다.');
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white w-full max-w-3xl rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              서명 현황 관리
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {training.title} · {training.date}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenPrint}
              className="px-3 py-1.5 bg-[#1a5b6d] hover:bg-[#144857] text-white text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>A4 서명부 인쇄</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress & Stat Header */}
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-600 font-medium">
              서명 완료: <strong className="text-[#1a5b6d] font-bold">{signedCount}</strong> / {totalCount}명 ({progressPercent}%)
            </span>
          </div>

          {/* Quick Mock Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={bulkLoading}
              onClick={handleSeedSampleAttendees}
              className="text-xs text-slate-600 hover:text-slate-900 underline cursor-pointer"
              title="테스트용으로 미서명 교직원 전체 서명을 일괄 시뮬레이션합니다."
            >
              샘플 서명 일괄 등록
            </button>
            {signedCount > 0 && (
              <>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  disabled={bulkLoading}
                  onClick={handleClearAll}
                  className="text-xs text-red-600 hover:text-red-700 underline cursor-pointer"
                >
                  전체 서명 초기화
                </button>
              </>
            )}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="교직원 성명, 부서 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#1a5b6d]"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-center">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-slate-800 text-white font-medium'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              전체 ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('signed')}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                filterMode === 'signed'
                  ? 'bg-[#1a5b6d] text-white font-medium'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              서명 완료 ({signedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('unsigned')}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                filterMode === 'unsigned'
                  ? 'bg-slate-700 text-white font-medium'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              미서명 ({totalCount - signedCount})
            </button>
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
          {filteredRows.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              조건에 맞는 교직원이 없습니다.
            </div>
          ) : (
            filteredRows.map((row, idx) => (
              <div
                key={row.id || idx}
                className="p-3 hover:bg-slate-50 flex items-center justify-between gap-3 text-xs"
              >
                {/* Left Info */}
                <div className="flex items-center gap-3">
                  <span className="w-6 text-slate-400 text-[11px] text-right font-mono">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      {row.code && (
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-mono text-[10px] font-semibold border border-slate-200">
                          {row.code}
                        </span>
                      )}
                      <span className="font-bold text-slate-900 text-sm">{row.name}</span>
                      <span className="text-slate-500">{row.department}</span>
                      {row.position && (
                        <span className="text-slate-400 text-[11px]">({row.position})</span>
                      )}
                    </div>
                    {row.signedAt && (
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        서명 일시: {new Date(row.signedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Status & Actions */}
                <div className="flex items-center gap-2.5">
                  {/* Note (비고) badge or editor */}
                  <div className="relative">
                    {editingNoteId === row.id ? (
                      <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-1 shadow-sm">
                        <input
                          type="text"
                          value={noteInputValue}
                          onChange={(e) => setNoteInputValue(e.target.value)}
                          placeholder="비고 입력 (예: 출장)"
                          className="w-24 px-1.5 py-0.5 text-[11px] border border-slate-200 rounded focus:outline-none focus:border-[#1a5b6d]"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveNote(row.id, noteInputValue);
                            if (e.key === 'Escape') setEditingNoteId(null);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveNote(row.id, noteInputValue)}
                          className="p-1 bg-[#1a5b6d] text-white rounded hover:bg-[#144857] cursor-pointer"
                          title="저장"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingNoteId(null)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                          title="취소"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        {row.note ? (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingNoteId(row.id);
                              setNoteInputValue(row.note || '');
                            }}
                            className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 rounded font-medium text-[11px] hover:bg-amber-100 transition-colors cursor-pointer flex items-center gap-1"
                            title="비고 수정"
                          >
                            <span>비고: {row.note}</span>
                            <Edit3 className="w-2.5 h-2.5 opacity-60" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingNoteId(row.id);
                              setNoteInputValue('');
                            }}
                            className="px-1.5 py-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded text-[11px] transition-colors cursor-pointer"
                            title="비고(사유/메모) 입력"
                          >
                            + 비고
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {row.isSigned ? (
                    <>
                      {row.signature ? (
                        <button
                          type="button"
                          onClick={() => setPreviewSignature({ name: row.name, url: row.signature! })}
                          className="w-16 h-8 bg-white border border-slate-200 rounded p-1 hover:border-slate-400 transition-colors cursor-pointer flex items-center justify-center"
                          title="서명 크게 보기"
                        >
                          <img
                            src={row.signature}
                            alt="서명"
                            className="max-h-full max-w-full object-contain"
                          />
                        </button>
                      ) : (
                        <span className="text-emerald-700 font-medium">서명 완료</span>
                      )}

                      {row.attendanceId && (
                        <button
                          type="button"
                          disabled={deletingId === row.attendanceId}
                          onClick={() => handleDelete(row.attendanceId!, row.name)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                          title="서명 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-400 font-medium px-2 py-1 bg-slate-100 rounded text-[11px]">
                      미서명
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-md transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>

      {/* Signature Preview Modal */}
      {previewSignature && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full border border-slate-200 shadow-lg text-center space-y-4">
            <h4 className="text-sm font-bold text-slate-900">
              {previewSignature.name} 선생님 서명
            </h4>
            <div className="w-full h-40 border border-slate-200 rounded-lg p-2 bg-white flex items-center justify-center">
              <img
                src={previewSignature.url}
                alt="서명 원본"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <button
              type="button"
              onClick={() => setPreviewSignature(null)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-md cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
