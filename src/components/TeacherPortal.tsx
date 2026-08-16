import React, { useState, useEffect, useRef } from 'react';
import { Lock, PenTool, RotateCcw } from 'lucide-react';
import { Staff, Training } from '../types';
import { trimAndOptimizeSignature } from '../utils/signatureUtils';
import {
  fetchTeacherTrainings,
  submitAttendance,
  deleteAttendance,
  fetchTraining,
  lookupStaff,
  TeacherTrainingItem
} from '../api';

interface TeacherPortalProps {
  onSwitchToAdmin: () => void;
  targetTrainingId?: string | null;
}

export const TeacherPortal: React.FC<TeacherPortalProps> = ({
  onSwitchToAdmin,
  targetTrainingId,
}) => {
  // Current specific training if loaded via direct link/QR
  const [directTraining, setDirectTraining] = useState<Training | null>(null);

  // Logged in teacher state
  const [teacherNameInput, setTeacherNameInput] = useState('');
  const [currentTeacher, setCurrentTeacher] = useState<Staff | null>(() => {
    const saved = localStorage.getItem('teacher_portal_name');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  // Candidate selection state for duplicate names (본인 확인 단계)
  const [candidates, setCandidates] = useState<Staff[] | null>(null);
  const [lookupQuery, setLookupQuery] = useState('');

  const [trainings, setTrainings] = useState<TeacherTrainingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Active signing state (when signing a specific training)
  const [activeSigningTraining, setActiveSigningTraining] = useState<TeacherTrainingItem | Training | null>(null);
  const [isSubmittingSign, setIsSubmittingSign] = useState(false);
  const [isCanvasDirty, setIsCanvasDirty] = useState(false);
  const [signSuccessMessage, setSignSuccessMessage] = useState<string | null>(null);

  // Canvas drawing refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // If targetTrainingId is present, fetch that training directly
  useEffect(() => {
    if (targetTrainingId) {
      fetchTraining(targetTrainingId)
        .then((data) => {
          setDirectTraining(data.training);
        })
        .catch((err) => console.error('Failed to load direct training:', err));
    }
  }, [targetTrainingId]);

  // Load trainings for teacher
  const loadTrainingsForTeacher = async (name: string, staffId?: string) => {
    try {
      setLoading(true);
      setLoginError(null);
      const data = await fetchTeacherTrainings(name, staffId);
      setCurrentTeacher(data.teacher);
      setTrainings(data.trainings);
      localStorage.setItem('teacher_portal_name', JSON.stringify(data.teacher));

      // If targetTrainingId was provided, automatically set active signing training if not already signed
      if (targetTrainingId) {
        const matched = data.trainings.find((t) => t.id === targetTrainingId);
        if (matched) {
          if (!matched.isSigned) {
            setActiveSigningTraining(matched);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setLoginError(err.message || '연수 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentTeacher?.name) {
      loadTrainingsForTeacher(currentTeacher.name, currentTeacher.id);
    }
  }, []);

  // Handle Login Submit -> Lookup teacher candidates to verify identity & handle duplicate names
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = teacherNameInput.trim();
    if (!clean) {
      setLoginError('성명을 입력해 주세요.');
      return;
    }

    try {
      setLoading(true);
      setLoginError(null);
      const lookupResult = await lookupStaff({ query: clean });
      
      if (lookupResult.candidates.length === 0) {
        setLoginError(`등록된 교직원 명부에서 '${clean}' 선생님을 찾을 수 없습니다. 고유번호 또는 성명을 다시 확인해 주세요.`);
        setCandidates(null);
        return;
      }

      setLookupQuery(clean);
      // If candidates exist, present the verification / selection step
      setCandidates(lookupResult.candidates);
    } catch (err: any) {
      setLoginError(err.message || '교직원 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Confirm Teacher Selection (본인 확인 완료)
  const handleSelectCandidate = async (staff: Staff) => {
    setCandidates(null);
    await loadTrainingsForTeacher(staff.name, staff.id);
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('teacher_portal_name');
    setCurrentTeacher(null);
    setCandidates(null);
    setTrainings([]);
    setTeacherNameInput('');
    setLoginError(null);
    setActiveSigningTraining(null);
    setSignSuccessMessage(null);
  };

  // Handle Delete Attendance
  const handleDeleteAttendance = async (trainingId: string, attendanceId: string) => {
    if (!window.confirm('서명을 삭제하시겠습니까? 삭제 후 다시 서명하실 수 있습니다.')) {
      return;
    }

    try {
      setLoading(true);
      await deleteAttendance(trainingId, attendanceId);
      if (currentTeacher) {
        await loadTrainingsForTeacher(currentTeacher.name, currentTeacher.id);
      }
      setSignSuccessMessage(null);
    } catch (err: any) {
      alert(err.message || '서명 삭제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // ==================== CANVAS SIGNING LOGIC ====================
  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(window.devicePixelRatio || 1, 2);

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000000'; // Deep solid black ink
    ctx.lineWidth = 4.8; // Bold, distinct ink stroke

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    setIsCanvasDirty(false);
  };

  useEffect(() => {
    if (activeSigningTraining) {
      const timer = setTimeout(() => {
        setupCanvas();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activeSigningTraining]);

  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const handleStartDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) {
      e.stopPropagation();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawingRef.current = true;
    const pos = getCanvasPos(e);
    lastPointRef.current = pos;

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();

    setIsCanvasDirty(true);
  };

  const handleDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current || !lastPointRef.current) return;
    if ('touches' in e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentPos = getCanvasPos(e);

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4.8;
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(currentPos.x, currentPos.y);
    ctx.stroke();

    lastPointRef.current = currentPos;
    setIsCanvasDirty(true);
  };

  const handleEndDraw = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    setIsCanvasDirty(false);
  };

  const handleSubmitSignature = async () => {
    if (!activeSigningTraining || !currentTeacher) return;
    if (!isCanvasDirty) {
      alert('화면에 서명을 작성해 주세요.');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      setIsSubmittingSign(true);
      // Automatically trim extra whitespace so the signature fills the document cell tightly and boldly
      const signatureDataUrl = trimAndOptimizeSignature(canvas);

      await submitAttendance(activeSigningTraining.id, {
        staffId: currentTeacher.id,
        name: currentTeacher.name,
        department: currentTeacher.department || '',
        position: currentTeacher.position || undefined,
        signature: signatureDataUrl,
      });

      setActiveSigningTraining(null);
      setSignSuccessMessage('서명이 정상적으로 제출되었습니다.');
      await loadTrainingsForTeacher(currentTeacher.name, currentTeacher.id);
    } catch (err: any) {
      alert(err.message || '서명 저장에 실패했습니다.');
    } finally {
      setIsSubmittingSign(false);
    }
  };

  // ==================== SCREEN 1: MINIMAL LOGIN (EXACT MATCH WITH USER DESIGN) ====================
  if (!currentTeacher) {
    // Current training metadata to display on top of card
    const displayTitle = directTraining ? directTraining.title : '2026학년도 교직원 역량강화 연수';
    const displayDate = directTraining
      ? `${directTraining.schoolName || '인천비즈니스고등학교'} 연수 · ${directTraining.date}`
      : '2026학년도 교직원 연수 · 2026년 8월 20일(목)';

    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans p-4 sm:p-8 flex flex-col">
        {/* Top Minimal Bar */}
        <div className="max-w-3xl w-full mx-auto flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              교직원 연수 전자서명
            </h1>
          </div>
          <button
            type="button"
            onClick={onSwitchToAdmin}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-2xs"
          >
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>관리자 로그인</span>
          </button>
        </div>

        {/* Card Container */}
        <div className="max-w-3xl w-full mx-auto bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs">
          <h2 className="text-xl font-bold text-slate-900 mb-2">서명하기</h2>
          <div className="text-base font-semibold text-slate-800 mb-1">
            {displayTitle}
          </div>
          <div className="text-xs text-slate-500 mb-5">
            {displayDate}
          </div>

          <hr className="border-slate-200 mb-6" />

          {loginError && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
              {loginError}
            </div>
          )}

          {/* STEP A: TEACHER CANDIDATE VERIFICATION (동명이인 본인 확인) */}
          {candidates && candidates.length > 0 ? (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-xs font-bold text-slate-800 mb-1">
                  본인 확인 (교직원 선택)
                </div>
                <p className="text-xs text-slate-500">
                  {candidates.length > 1
                    ? `동명이인 구분을 위해 본인의 소속 부서, 직급 등을 확인 후 선택해 주세요.`
                    : `검색된 교직원 정보가 본인이 맞는지 확인 후 선택해 주세요.`}
                </p>
              </div>

              <div className="space-y-2.5">
                {candidates.map((staff) => (
                  <div
                    key={staff.id}
                    className="p-3.5 border border-slate-200 rounded-lg bg-white hover:border-[#1a5b6d] hover:bg-slate-50/70 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      {staff.code && (
                        <span className="px-2 py-0.5 bg-slate-800 text-white rounded font-mono text-xs font-semibold">
                          고유번호: {staff.code}
                        </span>
                      )}
                      <span className="text-sm font-bold text-slate-900">
                        {staff.name} 선생님
                      </span>
                      <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        소속: {staff.department}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectCandidate(staff)}
                      className="px-4 py-2 bg-[#1a5b6d] hover:bg-[#144857] active:bg-[#0f3642] text-white text-xs font-medium rounded-md transition-colors cursor-pointer shrink-0"
                    >
                      선택 (서명 진행)
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-start">
                <button
                  type="button"
                  onClick={() => setCandidates(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  ← 다른 이름으로 다시 입력하기
                </button>
              </div>
            </div>
          ) : (
            /* STEP B: NAME INPUT (DEFAULT) */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-2">성명</label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={teacherNameInput}
                  onChange={(e) => setTeacherNameInput(e.target.value)}
                  placeholder=""
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:border-[#1a5b6d] focus:ring-1 focus:ring-[#1a5b6d] transition-colors"
                />
              </div>

              <p className="text-xs text-slate-400">
                성명을 입력한 뒤 부서, 성명을 확인하고 본인을 선택해주세요.
              </p>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !teacherNameInput.trim()}
                  className="px-5 py-2 bg-[#1a5b6d] hover:bg-[#144857] active:bg-[#0f3642] disabled:opacity-50 text-white font-medium text-sm rounded-md transition-colors cursor-pointer"
                >
                  {loading ? '확인 중...' : '확인'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ==================== SCREEN 2: ACTIVE SIGNING CANVAS (EDGE-TO-EDGE CLEAN CANVAS) ====================
  if (activeSigningTraining) {
    const trainingDate = activeSigningTraining.date || '';
    const trainingSchool = activeSigningTraining.schoolName || '교직원 연수';

    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans p-4 sm:p-8 flex flex-col">
        {/* Top Bar */}
        <div className="max-w-3xl w-full mx-auto flex items-center justify-between mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            전자서명
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600 font-medium">
              서명자: <strong>{currentTeacher.name}</strong> 선생님
              {currentTeacher.code && (
                <span className="ml-1 text-slate-400 font-mono">[{currentTeacher.code}]</span>
              )}
            </span>
            <button
              type="button"
              onClick={() => setActiveSigningTraining(null)}
              className="text-xs text-slate-400 hover:text-slate-700 underline cursor-pointer"
            >
              목록으로
            </button>
          </div>
        </div>

        {/* Signing Card */}
        <div className="max-w-3xl w-full mx-auto bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs space-y-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">서명하기</h2>
            <div className="text-base font-semibold text-slate-800 mb-1">
              {activeSigningTraining.title}
            </div>
            <div className="text-xs text-slate-500">
              {trainingSchool} · {trainingDate}
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Focused, Proportioned Signature Box */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700">
                서명란 (성명 정자 작성)
              </span>
              <button
                type="button"
                onClick={handleClearCanvas}
                disabled={!isCanvasDirty}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 disabled:opacity-40 disabled:hover:text-slate-500 underline cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>다시 쓰기 (지우기)</span>
              </button>
            </div>

            {/* Compact & clearly bounded signature pad */}
            <div className="relative w-full max-w-lg mx-auto h-48 sm:h-52 bg-white border-2 border-slate-700 rounded-xl overflow-hidden cursor-crosshair touch-none shadow-xs">
              <canvas
                ref={canvasRef}
                onMouseDown={handleStartDraw}
                onMouseMove={handleDraw}
                onMouseUp={handleEndDraw}
                onMouseLeave={handleEndDraw}
                onTouchStart={handleStartDraw}
                onTouchMove={handleDraw}
                onTouchEnd={handleEndDraw}
                className="w-full h-full block bg-white"
              />

              {/* Watermark & Guideline when empty */}
              {!isCanvasDirty && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 select-none p-4 text-center">
                  <div className="flex items-center gap-2 mb-1.5 bg-slate-50/90 px-3.5 py-1.5 rounded-full border border-slate-200 shadow-2xs">
                    <PenTool className="w-4 h-4 text-[#1a5b6d]" />
                    <span className="text-xs sm:text-sm font-bold text-slate-700">
                      여기에 이름을 큼직하게 꽉 차게 적어주세요
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    (칸에 꽉 차도록 크게 작성하셔야 인쇄 시 선명하게 출력됩니다)
                  </p>
                </div>
              )}
            </div>

            {/* Helpful Helper Text */}
            <p className="text-center text-[11px] text-slate-500 mt-2">
              ※ 사각 칸 안에 <strong>큼직하게 꽉 차게</strong> 성명을 작성해 주세요. (자동 여백 정리 및 고대비 보정이 적용됩니다.)
            </p>
          </div>

          {/* Submit Actions */}
          <div className="pt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveSigningTraining(null)}
              className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-sm font-medium rounded-md transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              type="button"
              disabled={isSubmittingSign || !isCanvasDirty}
              onClick={handleSubmitSignature}
              className="px-6 py-2 bg-[#1a5b6d] hover:bg-[#144857] active:bg-[#0f3642] disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors cursor-pointer"
            >
              {isSubmittingSign ? '제출 중...' : '서명 제출하기'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== SCREEN 3: TEACHER ASSIGNED TRAININGS LIST ====================
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans p-4 sm:p-8 flex flex-col">
      {/* Top Bar */}
      <div className="max-w-3xl w-full mx-auto flex items-center justify-between mb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          교직원 연수 전자서명
        </h1>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
          >
            선생님 변경 (로그아웃)
          </button>
          <span className="text-slate-300 text-xs">|</span>
          <button
            type="button"
            onClick={onSwitchToAdmin}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-2xs"
          >
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>관리자 로그인</span>
          </button>
        </div>
      </div>

      {/* Main Card */}
      <div className="max-w-3xl w-full mx-auto bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h2 className="text-xl font-bold text-slate-900">
                {currentTeacher.name} 선생님
              </h2>
              {currentTeacher.code && (
                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-mono text-xs font-semibold border border-slate-200">
                  번호: {currentTeacher.code}
                </span>
              )}
              <span className="text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">
                {currentTeacher.department} {currentTeacher.position ? `· ${currentTeacher.position}` : ''}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              배정된 연수의 서명 여부를 확인하고 서명을 진행해 주세요.
            </p>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            서명 완료 <strong className="text-[#1a5b6d]">{trainings.filter((t) => t.isSigned).length}</strong> / {trainings.length}건
          </div>
        </div>

        <hr className="border-slate-200" />

        {signSuccessMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-md">
            {signSuccessMessage}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">
            연수 정보를 불러오는 중입니다...
          </div>
        ) : trainings.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            현재 서명할 연수가 없습니다.
          </div>
        ) : (
          <div className="space-y-4">
            {trainings.map((training) => (
              <div
                key={training.id}
                className="border border-slate-200 rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition-colors"
              >
                <div className="space-y-1">
                  <div className="text-xs text-slate-500">
                    {training.date} {training.location ? `· ${training.location}` : ''}
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    {training.title}
                  </h3>
                  {training.isSigned && training.attendance && (
                    <div className="text-[11px] text-emerald-700 font-medium pt-1">
                      ✓ 서명 완료됨
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {training.isSigned && training.attendance ? (
                    <>
                      {training.attendance.signature && (
                        <div className="w-20 h-10 border border-slate-200 rounded bg-slate-50 flex items-center justify-center overflow-hidden p-1 mr-1">
                          <img
                            src={training.attendance.signature}
                            alt="서명 미리보기"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteAttendance(training.id, training.attendance!.id)}
                        className="px-3 py-1.5 border border-slate-300 hover:bg-red-50 hover:text-red-700 hover:border-red-300 text-slate-600 text-xs font-medium rounded-md transition-colors cursor-pointer"
                      >
                        삭제
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSignSuccessMessage(null);
                          setActiveSigningTraining(training);
                        }}
                        className="px-3 py-1.5 bg-[#1a5b6d] hover:bg-[#144857] text-white text-xs font-medium rounded-md transition-colors cursor-pointer"
                      >
                        수정
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSignSuccessMessage(null);
                        setActiveSigningTraining(training);
                      }}
                      className="px-4 py-2 bg-[#1a5b6d] hover:bg-[#144857] active:bg-[#0f3642] text-white text-xs sm:text-sm font-medium rounded-md transition-colors cursor-pointer"
                    >
                      서명하기
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
