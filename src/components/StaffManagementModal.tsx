import React, { useState, useEffect } from 'react';
import {
  X,
  Trash2,
  Edit2,
  Search,
  Plus
} from 'lucide-react';
import { Staff } from '../types';
import {
  fetchStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  bulkImportStaff,
  resetSampleStaff
} from '../api';

interface StaffManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStaffUpdated?: () => void;
}

export const StaffManagementModal: React.FC<StaffManagementModalProps> = ({
  isOpen,
  onClose,
  onStaffUpdated,
}) => {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  // Single Add / Edit Form State
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [deptInput, setDeptInput] = useState('1학년부');
  const [posInput, setPosInput] = useState('교사');
  const [formError, setFormError] = useState<string | null>(null);

  // Bulk Import Mode
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkMode, setBulkMode] = useState<'replace' | 'append'>('append');
  const [bulkError, setBulkError] = useState<string | null>(null);

  const loadStaff = async () => {
    try {
      setLoading(true);
      const data = await fetchStaff();
      setStaffList(data);
      if (onStaffUpdated) onStaffUpdated();
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStaff();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const departments = ['all', ...Array.from(new Set(staffList.map((s) => s.department).filter(Boolean)))];

  // Map to detect duplicate names
  const nameCounts: Record<string, number> = {};
  staffList.forEach((s) => {
    const key = s.name.trim();
    nameCounts[key] = (nameCounts[key] || 0) + 1;
  });

  const filteredStaff = staffList.filter((s) => {
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      (s.code && s.code.toLowerCase().includes(query)) ||
      s.name.toLowerCase().includes(query) ||
      s.department.toLowerCase().includes(query) ||
      (s.position && s.position.toLowerCase().includes(query));
    const matchesDept = selectedDepartment === 'all' || s.department === selectedDepartment;
    return matchesSearch && matchesDept;
  });

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      setFormError('성명을 입력해 주세요.');
      return;
    }

    try {
      setFormError(null);
      if (editingStaffId) {
        await updateStaff(editingStaffId, {
          code: codeInput.trim() || undefined,
          name: nameInput.trim(),
          department: deptInput.trim(),
          position: posInput.trim(),
        });
      } else {
        await createStaff({
          code: codeInput.trim() || undefined,
          name: nameInput.trim(),
          department: deptInput.trim(),
          position: posInput.trim(),
        });
      }

      setCodeInput('');
      setNameInput('');
      setEditingStaffId(null);
      await loadStaff();
    } catch (err: any) {
      setFormError(err.message || '저장에 실패했습니다.');
    }
  };

  const handleEditClick = (staff: Staff) => {
    setEditingStaffId(staff.id);
    setCodeInput(staff.code || '');
    setNameInput(staff.name);
    setDeptInput(staff.department);
    setPosInput(staff.position || '교사');
    setIsBulkOpen(false);
  };

  const handleCancelEdit = () => {
    setEditingStaffId(null);
    setCodeInput('');
    setNameInput('');
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    if (!window.confirm(`'${name}' 교직원을 명부에서 삭제하시겠습니까?`)) {
      return;
    }
    try {
      await deleteStaff(id);
      await loadStaff();
    } catch (err: any) {
      alert(err.message || '삭제에 실패했습니다.');
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkText.trim()) {
      setBulkError('교직원 데이터를 입력해 주세요.');
      return;
    }

    try {
      setBulkError(null);
      const lines = bulkText.split('\n').map((l) => l.trim()).filter(Boolean);
      const parsedStaff = lines.map((line, idx) => {
        const parts = line.split(/[,\t/ ]+/).map((p) => p.trim()).filter(Boolean);
        let code = '';
        let dept = '교무부';
        let name = '';
        let pos = '교사';

        // Check if first token is numeric or contains digits (code)
        if (parts.length === 1) {
          name = parts[0];
        } else if (parts.length === 2) {
          // Could be: "101 홍길동" or "교무부 홍길동"
          if (/^[0-9A-Za-z-]+$/.test(parts[0]) && !parts[0].includes('부') && !parts[0].includes('학년')) {
            code = parts[0];
            name = parts[1];
          } else {
            dept = parts[0];
            name = parts[1];
          }
        } else if (parts.length === 3) {
          // Could be: "101 교무부 홍길동" or "교무부 홍길동 교사"
          if (/^[0-9A-Za-z-]+$/.test(parts[0]) && !parts[0].includes('부') && !parts[0].includes('학년')) {
            code = parts[0];
            dept = parts[1];
            name = parts[2];
          } else {
            dept = parts[0];
            name = parts[1];
            pos = parts[2];
          }
        } else {
          // 4+ parts: "101 교무부 홍길동 교사"
          if (/^[0-9A-Za-z-]+$/.test(parts[0]) && !parts[0].includes('부') && !parts[0].includes('학년')) {
            code = parts[0];
            dept = parts[1];
            name = parts[2];
            pos = parts.slice(3).join(' ');
          } else {
            dept = parts[0];
            name = parts[1];
            pos = parts.slice(2).join(' ');
          }
        }

        if (!code) {
          code = String(100 + idx + 1);
        }

        return { code, name, department: dept, position: pos };
      });

      if (parsedStaff.length === 0) {
        setBulkError('유효한 데이터가 없습니다.');
        return;
      }

      await bulkImportStaff(parsedStaff, bulkMode);
      setBulkText('');
      setIsBulkOpen(false);
      await loadStaff();
    } catch (err: any) {
      setBulkError(err.message || '일괄 등록에 실패했습니다.');
    }
  };

  const handleResetDefaultStaff = async () => {
    if (!window.confirm('기본 교직원 25명 샘플 데이터(고유번호/동명이인 포함)로 복원하시겠습니까?')) {
      return;
    }
    try {
      await resetSampleStaff();
      await loadStaff();
    } catch (err: any) {
      alert(err.message || '초기화에 실패했습니다.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white w-full max-w-3xl rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              교직원 명부 관리
            </h2>
            <p className="text-xs text-slate-500">
              전체 등록된 교직원 총 {staffList.length}명
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toggle Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsBulkOpen(false);
                setEditingStaffId(null);
                setNameInput('');
              }}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                !isBulkOpen
                  ? 'bg-slate-800 text-white'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              개별 추가 및 수정
            </button>
            <button
              type="button"
              onClick={() => {
                setIsBulkOpen(true);
                setEditingStaffId(null);
              }}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                isBulkOpen
                  ? 'bg-[#1a5b6d] text-white'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              엑셀/텍스트 일괄 등록
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetDefaultStaff}
            className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
          >
            기본 교직원 50명 복원
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Section: Single Add / Edit */}
          {!isBulkOpen ? (
            <div className="bg-white p-4 border border-slate-200 rounded-lg">
              <h4 className="text-xs font-bold text-slate-800 mb-2.5">
                {editingStaffId ? '교직원 정보 수정' : '새 교직원 추가'}
              </h4>

              {formError && (
                <div className="p-2 mb-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSaveStaff} className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                <input
                  type="text"
                  placeholder="고유번호 (예: 101)"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-mono text-slate-900 focus:outline-hidden focus:border-[#1a5b6d]"
                />
                <input
                  type="text"
                  required
                  placeholder="성명 (예: 김민지)"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-[#1a5b6d]"
                />
                <input
                  type="text"
                  placeholder="부서/학년 (예: 1학년부)"
                  value={deptInput}
                  onChange={(e) => setDeptInput(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-hidden focus:border-[#1a5b6d]"
                />
                <input
                  type="text"
                  placeholder="직급 (예: 교사, 부장)"
                  value={posInput}
                  onChange={(e) => setPosInput(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-hidden focus:border-[#1a5b6d]"
                />

                <div className="flex items-center gap-1.5">
                  <button
                    type="submit"
                    className="flex-1 py-1.5 bg-[#1a5b6d] hover:bg-[#144857] text-white text-xs font-medium rounded-md transition-colors cursor-pointer"
                  >
                    {editingStaffId ? '수정 완료' : '추가하기'}
                  </button>
                  {editingStaffId && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-md cursor-pointer"
                    >
                      취소
                    </button>
                  )}
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white p-4 border border-slate-200 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800">
                  교직원 명단 텍스트/엑셀 일괄 붙여넣기
                </h4>
                <div className="flex items-center gap-2 text-xs">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="bulkMode"
                      value="append"
                      checked={bulkMode === 'append'}
                      onChange={() => setBulkMode('append')}
                    />
                    <span>기존 명단에 추가</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer text-red-600">
                    <input
                      type="radio"
                      name="bulkMode"
                      value="replace"
                      checked={bulkMode === 'replace'}
                      onChange={() => setBulkMode('replace')}
                    />
                    <span>기존 명단 전체 교체</span>
                  </label>
                </div>
              </div>

              {bulkError && (
                <div className="p-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
                  {bulkError}
                </div>
              )}

              <p className="text-[11px] text-slate-400">
                줄마다 <strong>‘고유번호 부서 성명 직급’</strong> 또는 <strong>‘부서 성명’</strong> 형식으로 붙여넣으세요. (예: 106 1학년부 김민지 교사)
              </p>

              <textarea
                rows={5}
                placeholder={`101 연구부 김진수 부장교사\n106 1학년부 김민지 교사\n402 4학년부 김민지 교사\n801 보건실 서준호 보건교사`}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-xs font-mono text-slate-900 focus:outline-hidden focus:border-[#1a5b6d]"
              />

              <button
                type="button"
                onClick={handleBulkSubmit}
                className="px-4 py-2 bg-[#1a5b6d] hover:bg-[#144857] text-white text-xs font-medium rounded-md transition-colors cursor-pointer"
              >
                일괄 등록 적용
              </button>
            </div>
          )}

          {/* Search and List */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  placeholder="고유번호, 성명, 부서 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#1a5b6d]"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>

              {departments.length > 1 && (
                <div className="flex flex-wrap items-center gap-1 text-xs">
                  {departments.map((dept) => (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => setSelectedDepartment(dept)}
                      className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                        selectedDepartment === dept
                          ? 'bg-[#1a5b6d] text-white font-medium'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {dept === 'all' ? '전체 부서' : dept}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto divide-y divide-slate-100">
              {filteredStaff.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  교직원이 없습니다.
                </div>
              ) : (
                filteredStaff.map((staff, idx) => {
                  const isDuplicate = (nameCounts[staff.name.trim()] || 0) > 1;
                  return (
                    <div
                      key={staff.id}
                      className="p-2.5 hover:bg-slate-50 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="w-5 text-slate-400 text-[11px] text-right font-mono">
                          {idx + 1}
                        </span>
                        {staff.code && (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-mono text-[10px] font-semibold border border-slate-200">
                            번호: {staff.code}
                          </span>
                        )}
                        <span className="font-bold text-slate-900">{staff.name}</span>
                        {isDuplicate && (
                          <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-medium">
                            동명이인
                          </span>
                        )}
                        <span className="text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/60">
                          {staff.department}
                        </span>
                        {staff.position && (
                          <span className="text-slate-400">({staff.position})</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditClick(staff)}
                          className="p-1 text-slate-400 hover:text-[#1a5b6d] rounded transition-colors cursor-pointer"
                          title="수정"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStaff(staff.id, staff.name)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
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
    </div>
  );
};
