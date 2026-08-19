import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Users,
  CheckSquare,
  Square,
  ArrowUp,
  ArrowDown,
  ArrowDownAZ,
  Sparkles,
} from 'lucide-react';
import { Training, Staff } from '../types';
import { createTraining, updateTraining, fetchStaff, compareStaffNumber } from '../api';

interface TrainingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  trainingToEdit?: Training | null;
  onSuccess: (savedTraining: Training) => void;
  defaultSchoolName?: string;
}

const TRAINING_PRESETS = [
  {
    title: '2026학년도 교직원 생성형 AI 및 에듀테크 교수학습 역량 강화 연수',
    date: '2026. 8. 20.(목)',
    location: '본관 3층 컴퓨터실',
    target: '전 교직원',
    manager: '연구부장',
    memo: '노트북 및 태블릿 지참, 실습 위주 진행',
  },
  {
    title: '2026학년도 2학기 학교폭력 예방 및 학생 생활지도 교원 연수',
    date: '2026. 8. 27.(목)',
    location: '본관 2층 시청각실',
    target: '전 교원 (담임 및 교과전담)',
    manager: '생활안전부장',
    memo: '법정 의무 연수(1시간) 이수 인정',
  },
  {
    title: '2026학년도 청렴 교육 및 공직자 이해충돌방지법 교직원 연수',
    date: '2026. 9. 3.(목)',
    location: '교무실',
    target: '전 교직원 (교원 및 행정실 직원)',
    manager: '교무기획부장',
    memo: '연수 자료 사전 배부 완료',
  },
  {
    title: '2026학년도 교원 교육활동 보호(교권 보호) 및 심리 정서 지원 연수',
    date: '2026. 9. 10.(목)',
    location: '시청각실',
    target: '전 교원',
    manager: '교감',
    memo: '전문 강사 초빙 연수',
  },
];

export const TrainingFormModal: React.FC<TrainingFormModalProps> = ({
  isOpen,
  onClose,
  trainingToEdit,
  onSuccess,
  defaultSchoolName = '인천비즈니스고등학교',
}) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [target, setTarget] = useState('전 교직원');
  const [manager, setManager] = useState('');
  const [schoolName, setSchoolName] = useState(defaultSchoolName);
  const [memo, setMemo] = useState('');

  // Target staff selection (Preserves explicit order)
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [staffSearchTerm, setStaffSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'staff'>('info');
  const [staffViewFilter, setStaffViewFilter] = useState<'all' | 'selectedOnly'>('all');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStaff() {
      try {
        const staffList = await fetchStaff();
        setAllStaff(staffList);
        if (!trainingToEdit) {
          setSelectedStaffIds(staffList.map((s) => s.id));
        }
      } catch (err) {
        console.error('Failed to fetch staff list:', err);
      }
    }
    if (isOpen) {
      loadStaff();
    }
  }, [isOpen, trainingToEdit]);

  useEffect(() => {
    if (trainingToEdit) {
      setTitle(trainingToEdit.title);
      setDate(trainingToEdit.date);
      setLocation(trainingToEdit.location || '교내');
      setTarget(trainingToEdit.target || '전 교직원');
      setManager(trainingToEdit.manager || '연수 담당자');
      setSchoolName(trainingToEdit.schoolName || defaultSchoolName);
      setMemo(trainingToEdit.memo || '');
      if (trainingToEdit.targetStaffIds && trainingToEdit.targetStaffIds.length > 0) {
        setSelectedStaffIds(trainingToEdit.targetStaffIds);
      } else if (allStaff.length > 0) {
        setSelectedStaffIds(allStaff.map((s) => s.id));
      }
    } else {
      setTitle('');
      setDate('2026. 8. 20.(목)');
      setLocation('본관 3층 컴퓨터실');
      setTarget('전 교직원');
      setManager('연구부장');
      setSchoolName(defaultSchoolName);
      setMemo('');
      if (allStaff.length > 0) {
        setSelectedStaffIds(allStaff.map((s) => s.id));
      }
    }
    setActiveTab('info');
    setStaffViewFilter('all');
    setError(null);
  }, [trainingToEdit, isOpen, defaultSchoolName, allStaff]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: typeof TRAINING_PRESETS[0]) => {
    setTitle(preset.title);
    setDate(preset.date);
    setLocation(preset.location);
    setTarget(preset.target);
    setManager(preset.manager);
    setMemo(preset.memo);
  };

  // Helper to sort a list of staff IDs by staff code/order/name
  const sortStaffIdsByCode = (ids: string[]) => {
    const idSet = new Set(ids);
    return allStaff
      .filter((s) => idSet.has(s.id))
      .sort((a, b) => compareStaffNumber(a, b))
      .map((s) => s.id);
  };

  const handleToggleStaff = (staffId: string) => {
    if (selectedStaffIds.includes(staffId)) {
      setSelectedStaffIds(selectedStaffIds.filter((id) => id !== staffId));
    } else {
      // Add staff maintaining teacher code order by default
      const combined = [...selectedStaffIds, staffId];
      setSelectedStaffIds(sortStaffIdsByCode(combined));
    }
  };

  const handleSelectAllStaff = () => {
    setSelectedStaffIds(allStaff.map((s) => s.id));
  };

  const handleDeselectAllStaff = () => {
    setSelectedStaffIds([]);
  };

  const handleSortByStaffCode = () => {
    setSelectedStaffIds(sortStaffIdsByCode(selectedStaffIds));
  };

  // Group departments: all before '행정계장', and group from '행정계장' onwards into '기타'
  const allDepartments: string[] = Array.from(new Set(allStaff.map((s) => s.department).filter(Boolean)));
  const adminChiefIndex = allDepartments.findIndex((d) => 
    d === '행정계장' || d.includes('행정계장') || d === '주무관' || d === '실무사' || d === '조리' || d === '시설' || d === '당직' || d === '배움터지킴이'
  );

  let primaryDepartments: string[] = [];
  let etcDepartments: string[] = [];

  if (adminChiefIndex !== -1) {
    primaryDepartments = allDepartments.slice(0, adminChiefIndex);
    etcDepartments = allDepartments.slice(adminChiefIndex);
  } else {
    primaryDepartments = allDepartments;
    etcDepartments = [];
  }

  const handleSelectByDepartment = (dept: string) => {
    const deptStaffIds = allStaff.filter((s) => s.department === dept).map((s) => s.id);
    const existing = new Set(selectedStaffIds);
    const newItems = deptStaffIds.filter((id) => !existing.has(id));
    const combined = [...selectedStaffIds, ...newItems];
    setSelectedStaffIds(sortStaffIdsByCode(combined));
  };

  const handleSelectEtcDepartment = () => {
    const etcDeptSet = new Set(etcDepartments);
    const etcStaffIds = allStaff
      .filter((s) => etcDeptSet.has(s.department) || (!primaryDepartments.includes(s.department) && s.department !== ''))
      .map((s) => s.id);
    const existing = new Set(selectedStaffIds);
    const newItems = etcStaffIds.filter((id) => !existing.has(id));
    const combined = [...selectedStaffIds, ...newItems];
    setSelectedStaffIds(sortStaffIdsByCode(combined));
  };

  // Reordering functions for print order
  const handleMoveStaff = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= selectedStaffIds.length) return;

    const updated = [...selectedStaffIds];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setSelectedStaffIds(updated);
  };

  let filteredStaff: Staff[] = [];
  if (staffViewFilter === 'selectedOnly') {
    // Show in explicit selected order
    filteredStaff = selectedStaffIds
      .map((id) => allStaff.find((s) => s.id === id))
      .filter((s): s is Staff => !!s)
      .filter((s) => {
        return (
          s.name.toLowerCase().includes(staffSearchTerm.toLowerCase()) ||
          s.department.toLowerCase().includes(staffSearchTerm.toLowerCase()) ||
          (s.code && s.code.toLowerCase().includes(staffSearchTerm.toLowerCase())) ||
          (s.position && s.position.toLowerCase().includes(staffSearchTerm.toLowerCase()))
        );
      });
  } else {
    // Show entire staff list in natural staff code order
    filteredStaff = allStaff.filter((s) => {
      return (
        s.name.toLowerCase().includes(staffSearchTerm.toLowerCase()) ||
        s.department.toLowerCase().includes(staffSearchTerm.toLowerCase()) ||
        (s.code && s.code.toLowerCase().includes(staffSearchTerm.toLowerCase())) ||
        (s.position && s.position.toLowerCase().includes(staffSearchTerm.toLowerCase()))
      );
    });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('연수 주제를 입력해 주세요.');
      setActiveTab('info');
      return;
    }
    if (!date.trim()) {
      setError('연수 날짜를 입력해 주세요.');
      setActiveTab('info');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const finalTargetIds = selectedStaffIds.length > 0 ? selectedStaffIds : allStaff.map((s) => s.id);

      const payload = {
        title: title.trim(),
        date: date.trim(),
        location: location.trim() || '교내',
        target: target.trim() || (finalTargetIds.length === allStaff.length ? '전 교직원' : `지정 교직원 (${finalTargetIds.length}명)`),
        manager: manager.trim() || '연수 담당자',
        schoolName: schoolName.trim() || defaultSchoolName,
        memo: memo.trim(),
        targetStaffIds: finalTargetIds,
      };

      let result: Training;
      if (trainingToEdit) {
        result = await updateTraining(trainingToEdit.id, payload);
      } else {
        result = await createTraining(payload);
      }

      onSuccess(result);
      onClose();
    } catch (err: any) {
      setError(err.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {trainingToEdit ? '연수 정보 수정' : '새 연수 등록'}
            </h2>
            <p className="text-xs text-slate-500">
              연수 주제와 일정, 서명 대상 선생님을 설정합니다.
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-5 pt-2 gap-4 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`pb-2.5 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'info'
                ? 'border-[#1a5b6d] text-[#1a5b6d] font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            기본 정보 입력
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`pb-2.5 transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'staff'
                ? 'border-[#1a5b6d] text-[#1a5b6d] font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>서명 대상 선생님 지정</span>
            <span className="px-1.5 py-0.5 bg-[#e6f4f7] text-[#1a5b6d] font-bold rounded text-[11px]">
              {selectedStaffIds.length}명
            </span>
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
            {error}
          </div>
        )}

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {activeTab === 'info' ? (
            <>
              {/* Preset quick buttons */}
              {!trainingToEdit && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>자주 쓰는 연수 예시 불러오기</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {TRAINING_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        className="text-left text-xs px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer"
                      >
                        {preset.title.slice(0, 22)}...
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs text-slate-600 mb-1 font-medium">
                  연수 주제 (제목) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 2026학년도 교직원 생성형 AI 활용 연수"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-hidden focus:border-[#1a5b6d] focus:ring-1 focus:ring-[#1a5b6d]"
                />
              </div>

              {/* Date & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-600 mb-1 font-medium">
                    일시 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    placeholder="예: 2026. 8. 20.(목) 15:30"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-hidden focus:border-[#1a5b6d] focus:ring-1 focus:ring-[#1a5b6d]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1 font-medium">
                    장소
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="예: 본관 3층 컴퓨터실"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-hidden focus:border-[#1a5b6d] focus:ring-1 focus:ring-[#1a5b6d]"
                  />
                </div>
              </div>

              {/* Target & Manager */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-600 mb-1 font-medium">
                    대상 설명
                  </label>
                  <input
                    type="text"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder="예: 전 교직원 또는 담임교사"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-hidden focus:border-[#1a5b6d] focus:ring-1 focus:ring-[#1a5b6d]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1 font-medium">
                    담당자 / 부서
                  </label>
                  <input
                    type="text"
                    value={manager}
                    onChange={(e) => setManager(e.target.value)}
                    placeholder="예: 연구부장"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-hidden focus:border-[#1a5b6d] focus:ring-1 focus:ring-[#1a5b6d]"
                  />
                </div>
              </div>

              {/* Target Staff Callout Banner */}
              <div className="bg-[#f0f9fb] border border-[#bce3ec] rounded-lg p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#1a5b6d]/10 flex items-center justify-center text-[#1a5b6d] shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      서명 대상 교직원: <span className="text-[#1a5b6d] font-black">{selectedStaffIds.length}명</span> 지정됨
                    </p>
                    <p className="text-[11px] text-slate-500">
                      선생님이 로그인하면 지정된 연수만 조회되며, 인쇄 시 선생님 번호 순서대로 자동 정렬되어 출력됩니다.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('staff')}
                  className="px-3 py-1.5 bg-[#1a5b6d] hover:bg-[#144857] text-white text-xs font-medium rounded-md cursor-pointer transition-colors shrink-0"
                >
                  대상자 선택
                </button>
              </div>

              {/* Memo */}
              <div>
                <label className="block text-xs text-slate-600 mb-1 font-medium">
                  연수 비고 및 준비물 (선택)
                </label>
                <textarea
                  rows={2}
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="예: 개인 태블릿 지참, 연수 자료 사전 배부"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-hidden focus:border-[#1a5b6d] focus:ring-1 focus:ring-[#1a5b6d]"
                />
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {/* Staff Target Header Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <div className="text-xs text-slate-900 font-bold">
                    총 {allStaff.length}명 중 <span className="text-[#1a5b6d]">{selectedStaffIds.length}명</span> 서명 대상 지정됨
                  </div>
                  <p className="text-[11px] text-slate-500">
                    * 기본적으로 선생님 연번(번호) 순으로 출력되며, '선택된 인원만'에서 ▲▼ 버튼으로 수동 순서 조정이 가능합니다.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSortByStaffCode}
                    className="px-2.5 py-1 text-xs bg-white border border-slate-300 text-slate-700 rounded hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                    title="선생님 연번(번호) 오름차순으로 순서 재정렬"
                  >
                    <ArrowDownAZ className="w-3.5 h-3.5 text-[#1a5b6d]" />
                    <span>연번순 정렬</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectAllStaff}
                    className="px-2.5 py-1 text-xs bg-white border border-slate-300 text-slate-700 rounded hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
                    <span>전체 선택</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAllStaff}
                    className="px-2.5 py-1 text-xs bg-white border border-slate-300 text-slate-700 rounded hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5 text-slate-500" />
                    <span>전체 해제</span>
                  </button>
                </div>
              </div>

              {/* Department shortcuts */}
              {(primaryDepartments.length > 0 || etcDepartments.length > 0) && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-slate-500 mr-1 font-medium">부서별 일괄 추가:</span>
                  {primaryDepartments.map((dept) => (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => handleSelectByDepartment(dept)}
                      className="px-2.5 py-1 text-xs bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700 font-medium transition-colors cursor-pointer"
                    >
                      +{dept}
                    </button>
                  ))}
                  {etcDepartments.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSelectEtcDepartment}
                      className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-slate-800 font-semibold transition-colors cursor-pointer"
                    >
                      +기타
                    </button>
                  )}
                </div>
              )}

              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="교직원 성명 또는 부서 검색..."
                    value={staffSearchTerm}
                    onChange={(e) => setStaffSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#1a5b6d]"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => setStaffViewFilter('all')}
                    className={`px-2.5 py-1 rounded transition-colors cursor-pointer font-medium ${
                      staffViewFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    전체 보기 ({allStaff.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStaffViewFilter('selectedOnly')}
                    className={`px-2.5 py-1 rounded transition-colors cursor-pointer font-medium ${
                      staffViewFilter === 'selectedOnly'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    선택된 인원만 ({selectedStaffIds.length})
                  </button>
                </div>
              </div>

              {/* Staff Grid */}
              <div className="border border-slate-200 rounded-lg max-h-72 overflow-y-auto divide-y divide-slate-100">
                {filteredStaff.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    조건에 해당하는 교직원이 없습니다.
                  </div>
                ) : (
                  filteredStaff.map((staff) => {
                    const selectedIndex = selectedStaffIds.indexOf(staff.id);
                    const isChecked = selectedIndex !== -1;

                    return (
                      <div
                        key={staff.id}
                        className={`flex items-center justify-between p-2.5 hover:bg-slate-50 transition-colors text-xs ${
                          isChecked ? 'bg-[#f8fcfe]' : ''
                        }`}
                      >
                        <label className="flex items-center gap-2.5 cursor-pointer flex-1 mr-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleStaff(staff.id)}
                            className="w-4 h-4 rounded text-[#1a5b6d] focus:ring-[#1a5b6d] cursor-pointer"
                          />
                          {isChecked && (
                            <span className="w-5 h-5 rounded-full bg-[#1a5b6d] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                              {selectedIndex + 1}
                            </span>
                          )}
                          {staff.code && (
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-mono text-[10px] font-semibold border border-slate-200">
                              {staff.code}
                            </span>
                          )}
                          <span className="font-semibold text-slate-900">{staff.name}</span>
                          <span className="text-slate-500">{staff.department}</span>
                        </label>

                        <div className="flex items-center gap-1 shrink-0">
                          {isChecked ? (
                            <>
                              <span className="text-[11px] font-medium text-[#1a5b6d] mr-1">
                                {selectedIndex + 1}번 지정
                              </span>
                              {staffViewFilter === 'selectedOnly' && (
                                <div className="flex items-center gap-0.5">
                                  <button
                                    type="button"
                                    disabled={selectedIndex === 0}
                                    onClick={() => handleMoveStaff(selectedIndex, 'up')}
                                    className="p-1 hover:bg-slate-200 disabled:opacity-30 rounded text-slate-600 cursor-pointer"
                                    title="위로 이동"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={selectedIndex === selectedStaffIds.length - 1}
                                    onClick={() => handleMoveStaff(selectedIndex, 'down')}
                                    className="p-1 hover:bg-slate-200 disabled:opacity-30 rounded text-slate-600 cursor-pointer"
                                    title="아래로 이동"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              제외됨
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Footer Controls inside form */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-medium rounded-md transition-colors cursor-pointer"
            >
              취소
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#1a5b6d] hover:bg-[#144857] active:bg-[#0f3642] disabled:opacity-50 text-white text-xs font-medium rounded-md transition-colors cursor-pointer"
            >
              {submitting ? '저장 중...' : trainingToEdit ? '수정 완료' : '연수 등록하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
