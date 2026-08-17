import React, { useState, useEffect } from 'react';
import {
  X,
  Trash2,
  Edit2,
  Search,
  CheckSquare,
  Square
} from 'lucide-react';
import { Staff } from '../types';
import {
  fetchStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  batchDeleteStaff,
  bulkImportStaff
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
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);

  // Single Add / Edit Form State
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [deptInput, setDeptInput] = useState('');
  const [posInput, setPosInput] = useState('');
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
      setSelectedStaffIds([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Extract unique departments in natural order
  const rawDepartments: string[] = Array.from(new Set(staffList.map((s) => s.department).filter(Boolean) as string[]));
  
  // Find where '행정계장' or support roles start
  const adminChiefIdx = rawDepartments.findIndex((d) => 
    d === '행정계장' || d.includes('행정계장') || d === '주무관' || d === '실무사' || d === '조리' || d === '시설' || d === '당직' || d === '배움터지킴이'
  );

  let primaryDepartments: string[] = [];
  let etcDepartments: string[] = [];

  if (adminChiefIdx !== -1) {
    primaryDepartments = rawDepartments.slice(0, adminChiefIdx);
    etcDepartments = rawDepartments.slice(adminChiefIdx);
  } else {
    primaryDepartments = rawDepartments;
    etcDepartments = [];
  }

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

    let matchesDept = false;
    if (selectedDepartment === 'all') {
      matchesDept = true;
    } else if (selectedDepartment === 'etc') {
      matchesDept = etcDepartments.includes(s.department) || (!primaryDepartments.includes(s.department));
    } else {
      matchesDept = s.department === selectedDepartment;
    }

    return matchesSearch && matchesDept;
  });

  // Select / Deselect All logic
  const handleToggleSelectAll = () => {
    const currentFilteredIds = filteredStaff.map((s) => s.id);
    const allSelected = currentFilteredIds.every((id) => selectedStaffIds.includes(id));

    if (allSelected) {
      // Deselect currently filtered items
      setSelectedStaffIds(selectedStaffIds.filter((id) => !currentFilteredIds.includes(id)));
    } else {
      // Select all currently filtered items
      const combined = Array.from(new Set([...selectedStaffIds, ...currentFilteredIds]));
      setSelectedStaffIds(combined);
    }
  };

  const handleSelectAll = () => {
    setSelectedStaffIds(filteredStaff.map((s) => s.id));
  };

  const handleDeselectAll = () => {
    setSelectedStaffIds([]);
  };

  const handleToggleStaff = (id: string) => {
    if (selectedStaffIds.includes(id)) {
      setSelectedStaffIds(selectedStaffIds.filter((item) => item !== id));
    } else {
      setSelectedStaffIds([...selectedStaffIds, id]);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedStaffIds.length === 0) return;
    if (!window.confirm(`선택한 ${selectedStaffIds.length}명의 교직원을 명부에서 일괄 삭제하시겠습니까?`)) {
      return;
    }
    try {
      await batchDeleteStaff(selectedStaffIds);
      setSelectedStaffIds([]);
      await loadStaff();
    } catch (err: any) {
      alert(err.message || '일괄 삭제에 실패했습니다.');
    }
  };

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
          name: nameInput.trim(),
          department: deptInput.trim(),
          position: posInput.trim() || undefined,
        });
      } else {
        // Auto-assign sequential number
        const maxNumericCode = staffList.reduce((max, s) => {
          const num = parseInt(s.code || '', 10);
          return !isNaN(num) && num > max ? num : max;
        }, 0);
        const autoCode = maxNumericCode > 0 ? String(maxNumericCode + 1) : String(staffList.length + 1);

        await createStaff({
          code: autoCode,
          name: nameInput.trim(),
          department: deptInput.trim(),
          position: posInput.trim() || undefined,
        });
      }

      setCodeInput('');
      setNameInput('');
      setDeptInput('');
      setPosInput('');
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
    setPosInput(staff.position || '');
    setIsBulkOpen(false);
  };

  const handleCancelEdit = () => {
    setEditingStaffId(null);
    setCodeInput('');
    setNameInput('');
    setDeptInput('');
    setPosInput('');
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    if (!window.confirm(`'${name}' 교직원을 명부에서 삭제하시겠습니까?`)) {
      return;
    }
    try {
      await deleteStaff(id);
      setSelectedStaffIds((prev) => prev.filter((item) => item !== id));
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
        let pos = '';

        // Check if first token is numeric or contains digits (code)
        if (parts.length === 1) {
          name = parts[0];
        } else if (parts.length === 2) {
          if (/^[0-9A-Za-z-]+$/.test(parts[0]) && !parts[0].includes('부') && !parts[0].includes('학년')) {
            code = parts[0];
            name = parts[1];
          } else {
            dept = parts[0];
            name = parts[1];
          }
        } else if (parts.length === 3) {
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

        return { code, name, department: dept, position: pos || undefined };
      });

      if (parsedStaff.length === 0) {
        setBulkError('유효한 데이터가 없습니다.');
        return;
      }

      await bulkImportStaff(parsedStaff, bulkMode);
      setBulkText('');
      setIsBulkOpen(false);
      setSelectedStaffIds([]);
      await loadStaff();
    } catch (err: any) {
      setBulkError(err.message || '일괄 등록에 실패했습니다.');
    }
  };

  const isAllCurrentSelected =
    filteredStaff.length > 0 &&
    filteredStaff.every((s) => selectedStaffIds.includes(s.id));

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
                setCodeInput('');
                setNameInput('');
                setDeptInput('');
                setPosInput('');
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

          {selectedStaffIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 font-medium">
                {selectedStaffIds.length}명 선택됨
              </span>
              <button
                type="button"
                onClick={handleBatchDelete}
                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>선택 삭제 ({selectedStaffIds.length}명)</span>
              </button>
            </div>
          )}
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

              <form onSubmit={handleSaveStaff} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <input
                  type="text"
                  required
                  placeholder="성명 (예: 김인비)"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-[#1a5b6d]"
                />
                <input
                  type="text"
                  placeholder="부서/학년 (예: 1학년부, 교무부 등)"
                  value={deptInput}
                  onChange={(e) => setDeptInput(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-hidden focus:border-[#1a5b6d]"
                />
                <input
                  type="text"
                  placeholder="직급 (예: 교사 - 미입력 가능)"
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
                줄마다 <strong>‘고유번호 부서 성명’</strong> 또는 <strong>‘부서 성명’</strong> 형식으로 붙여넣으세요. (예: 106 1학년부 김민지)
              </p>

              <textarea
                rows={5}
                placeholder={`101 교육과정연구부 김진수\n102 생활안전부 박미영\n106 1학년부 김민지`}
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

          {/* Search, Filter chips and List */}
          <div className="space-y-3">
            {/* Search Input & Select/Deselect All Toolbar */}
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

              <div className="flex items-center gap-1.5 self-end sm:self-auto text-xs">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded text-xs flex items-center gap-1 cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
                  <span>전체 선택</span>
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 text-slate-500" />
                  <span>전체 해제</span>
                </button>
              </div>
            </div>

            {/* Department Filter Chips */}
            {(primaryDepartments.length > 0 || etcDepartments.length > 0) && (
              <div className="flex flex-wrap items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedDepartment('all')}
                  className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                    selectedDepartment === 'all'
                      ? 'bg-[#1a5b6d] text-white font-bold shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  전체 부서
                </button>

                {primaryDepartments.map((dept) => (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => setSelectedDepartment(dept)}
                    className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                      selectedDepartment === dept
                        ? 'bg-[#1a5b6d] text-white font-bold shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {dept}
                  </button>
                ))}

                {etcDepartments.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedDepartment('etc')}
                    className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                      selectedDepartment === 'etc'
                        ? 'bg-[#1a5b6d] text-white font-bold shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    기타
                  </button>
                )}
              </div>
            )}

            {/* Staff List */}
            <div className="border border-slate-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto divide-y divide-slate-100">
              {filteredStaff.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  해당 조건의 교직원이 없습니다.
                </div>
              ) : (
                filteredStaff.map((staff, idx) => {
                  const isDuplicate = (nameCounts[staff.name.trim()] || 0) > 1;
                  const isChecked = selectedStaffIds.includes(staff.id);

                  return (
                    <div
                      key={staff.id}
                      className={`p-2.5 hover:bg-slate-50 flex items-center justify-between gap-3 text-xs transition-colors ${
                        isChecked ? 'bg-[#f0f9fb]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5 flex-wrap flex-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleStaff(staff.id)}
                            className="w-4 h-4 rounded text-[#1a5b6d] focus:ring-[#1a5b6d] cursor-pointer"
                          />
                          <span className="w-5 text-slate-400 text-[11px] text-right font-mono">
                            {idx + 1}
                          </span>
                        </label>

                        {staff.code && (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-mono text-[10px] font-semibold border border-slate-200">
                            {staff.code}
                          </span>
                        )}
                        <span className="font-bold text-slate-900">{staff.name}</span>
                        <span className="text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/60">
                          {staff.department}
                        </span>
                        {staff.position && (
                          <span className="text-slate-400">({staff.position})</span>
                        )}
                        {isDuplicate && (
                          <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-medium">
                            동명이인
                          </span>
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
        <div className="p-4 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {filteredStaff.length}명 표시 중 (전체 {staffList.length}명)
          </div>
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
