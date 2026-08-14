import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Calendar,
  MapPin,
  Users,
  UserCheck,
  CheckCircle2,
  FileText,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  School
} from 'lucide-react';
import { Training } from '../types';
import { SignatureCanvas } from './SignatureCanvas';
import { fetchTraining, submitAttendance } from '../api';

interface StaffSignPageProps {
  trainingId: string;
  onNavigateToAdmin?: () => void;
}

export const StaffSignPage: React.FC<StaffSignPageProps> = ({
  trainingId,
  onNavigateToAdmin,
}) => {
  const [training, setTraining] = useState<Training | null>(null);
  const [existingAttendees, setExistingAttendees] = useState<{ name: string; signedAt: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedAttendee, setSubmittedAttendee] = useState<{ name: string; signedAt: string; signature: string } | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Load training details
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchTraining(trainingId);
      setTraining(data.training);
      setExistingAttendees(data.attendances.map((a) => ({ name: a.name, signedAt: a.signedAt })));
    } catch (err: any) {
      setError(err.message || '연수 정보를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [trainingId]);

  // Check duplicate when name changes
  const handleNameChange = (val: string) => {
    setName(val);
    const trimmed = val.trim();
    if (trimmed && existingAttendees.some((a) => a.name.toLowerCase() === trimmed.toLowerCase())) {
      setDuplicateWarning(`‘${trimmed}’ 선생님의 서명이 이미 등록되어 있습니다. 동명이인이시라면 계속 진행하시고, 이미 서명하셨다면 재서명하지 않으셔도 됩니다.`);
    } else {
      setDuplicateWarning(null);
    }
  };

  // Submit Signature
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('성명을 입력해 주세요.');
      return;
    }
    if (!signatureData) {
      alert('서명 패드에 직접 서명을 입력해 주세요.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const result = await submitAttendance(trainingId, {
        name: name.trim(),
        department: department.trim() || undefined,
        signature: signatureData,
      });

      // Confetti burst
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#2563eb', '#3b82f6', '#10b981', '#f59e0b'],
      });

      setSubmittedAttendee({
        name: result.attendance.name,
        signedAt: result.attendance.signedAt,
        signature: result.attendance.signature,
      });
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || '서명 저장에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForAnotherPerson = () => {
    setName('');
    setDepartment('');
    setSignatureData(null);
    setIsSuccess(false);
    setSubmittedAttendee(null);
    setDuplicateWarning(null);
    loadData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-600 font-medium text-sm">연수 정보를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  if (error && !training) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full p-8 rounded-3xl shadow-sm border border-slate-200 text-center">
          <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">연수 정보를 찾을 수 없습니다</h2>
          <p className="text-sm text-slate-600 mb-6">{error}</p>
          {onNavigateToAdmin && (
            <button
              onClick={onNavigateToAdmin}
              className="w-full py-3 px-4 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors"
            >
              관리자 페이지로 이동
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        {/* Top School Brand Badge */}
        <header className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-2 text-slate-700">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <School className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">교직원 연수 출석 서명</p>
              <h1 className="text-sm font-bold text-slate-800">{training?.schoolName || '학교 연수 관리'}</h1>
            </div>
          </div>
          {onNavigateToAdmin && (
            <button
              onClick={onNavigateToAdmin}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
            >
              관리자 모드
            </button>
          )}
        </header>

        {/* Training Header Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden mb-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 px-6 py-6 text-white relative">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-blue-100 text-xs font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>전자 서명 등록</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug">
              {training?.title}
            </h2>
          </div>

          {/* Training Info Meta Details */}
          <div className="p-6 bg-slate-50/50 border-b border-slate-100 space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 shrink-0 mt-0.5">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <span className="text-xs font-semibold text-slate-500 block">일시</span>
                <span className="font-semibold text-slate-900">{training?.date}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 shrink-0 mt-0.5">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <span className="text-xs font-semibold text-slate-500 block">장소</span>
                <span className="font-semibold text-slate-900">{training?.location}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600 shrink-0 mt-0.5">
                  <Users className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <span className="text-xs font-semibold text-slate-500 block">연수 대상</span>
                  <span className="font-medium text-slate-800">{training?.target}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600 shrink-0 mt-0.5">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <span className="text-xs font-semibold text-slate-500 block">담당자</span>
                  <span className="font-medium text-slate-800">{training?.manager}</span>
                </div>
              </div>
            </div>

            {training?.memo && (
              <div className="flex items-start gap-3 pt-2 border-t border-slate-200/60">
                <div className="p-2 rounded-xl bg-slate-100 text-slate-500 shrink-0 mt-0.5">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <span className="text-xs font-semibold text-slate-500 block">비고</span>
                  <span className="text-xs text-slate-700 leading-relaxed">{training.memo}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Signature Form / Completion State */}
        <AnimatePresence mode="wait">
          {!isSuccess ? (
            <motion.div
              key="sign-form"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-7"
            >
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  <h3 className="text-base font-bold text-slate-900">참석자 성명 입력</h3>
                </div>
                <p className="text-xs text-slate-500 ml-8">본인의 성명과 소속(직위/부서)을 입력해 주세요.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name Input (Required) */}
                  <div className="sm:col-span-1">
                    <label htmlFor="staff-name-input" className="block text-xs font-bold text-slate-700 mb-1.5">
                      성명 <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="staff-name-input"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="성명을 입력하세요 (예: 홍길동)"
                      className="w-full px-4 py-3 text-base rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium placeholder:text-slate-400"
                    />
                  </div>

                  {/* Department Input (Optional) */}
                  <div className="sm:col-span-1">
                    <label htmlFor="staff-dept-input" className="block text-xs font-bold text-slate-700 mb-1.5">
                      소속 / 학년·부서 <span className="text-slate-400 font-normal">(선택)</span>
                    </label>
                    <input
                      id="staff-dept-input"
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="예: 3학년부, 교무부, 전담"
                      className="w-full px-4 py-3 text-base rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Duplicate Name Warning Notice */}
                {duplicateWarning && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5"
                  >
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{duplicateWarning}</span>
                  </motion.div>
                )}

                {/* Signature Pad Step */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                        2
                      </div>
                      <h3 className="text-base font-bold text-slate-900">전자 서명</h3>
                    </div>
                    <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                      터치 또는 마우스 서명
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 ml-8 mb-3">
                    아래 박스에 정자 또는 서명 형태로 직접 기명 서명해 주세요.
                  </p>

                  <SignatureCanvas
                    onSignatureChange={(data) => setSignatureData(data)}
                    height={180}
                  />
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit Action Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    id="submit-signature-btn"
                    disabled={submitting || !name.trim() || !signatureData}
                    className="w-full py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-base shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>서명 저장 중...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5" />
                        <span>서명 완료하기</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </button>
                  <p className="text-center text-[11px] text-slate-400 mt-2.5">
                    서명 제출 시 본 연수 참석 서명부에 안전하게 등록됩니다.
                  </p>
                </div>
              </form>
            </motion.div>
          ) : (
            /* Success Completion Card */
            <motion.div
              key="sign-success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-8 text-center"
            >
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50/50">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <h3 className="text-2xl font-extrabold text-slate-900 mb-1">
                서명이 완료되었습니다
              </h3>
              <p className="text-sm font-medium text-slate-600 mb-6">
                <strong className="text-blue-600 font-bold">{submittedAttendee?.name}</strong> 선생님의 연수 참석 서명이 정상적으로 등록되었습니다.
              </p>

              {/* Signature Preview Card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 max-w-sm mx-auto mb-6 text-left">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2 border-b border-slate-200 pb-2">
                  <span className="font-semibold text-slate-700">참석 등록 내역</span>
                  <span>{submittedAttendee?.signedAt ? new Date(submittedAttendee.signedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-slate-600">성명 : <strong className="text-slate-900 text-sm">{submittedAttendee?.name}</strong></span>
                  {department && <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium">{department}</span>}
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-2 flex items-center justify-center h-20">
                  {submittedAttendee?.signature && (
                    <img
                      src={submittedAttendee.signature}
                      alt="등록된 서명"
                      className="max-h-16 max-w-full object-contain"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-3 max-w-sm mx-auto">
                <button
                  type="button"
                  id="reset-for-next-btn"
                  onClick={handleResetForAnotherPerson}
                  className="w-full py-3 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 active:bg-slate-100 flex items-center justify-center gap-2 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>다른 선생님 서명하기 (기기 공유 시)</span>
                </button>

                <p className="text-xs text-slate-400">
                  창을 닫으셔도 서명 내역이 안전하게 보관됩니다.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
