import React, { useState } from 'react';
import { KeyRound, X, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { changeAdminPassword } from '../api';

interface AdminChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminChangePasswordModal: React.FC<AdminChangePasswordModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleResetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccessMessage(null);
  };

  const handleClose = () => {
    handleResetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!currentPassword) {
      setError('현재 비밀번호를 입력해 주세요.');
      return;
    }
    if (!newPassword || newPassword.trim().length < 4) {
      setError('새 비밀번호는 최소 4자리 이상 입력해 주세요.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('새 비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    try {
      setLoading(true);
      const res = await changeAdminPassword(currentPassword, newPassword.trim());
      setSuccessMessage(res.message || '관리자 비밀번호가 성공적으로 변경되었습니다.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || '비밀번호 변경 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-xl shadow-lg border border-slate-200 p-6 relative">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center text-[#1a5b6d]">
            <KeyRound className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            관리자 비밀번호 변경
          </h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          관리자 모드 접근 시 사용하는 비밀번호를 안전하게 변경합니다.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label
              htmlFor="current-admin-pwd"
              className="block text-xs text-slate-700 font-medium mb-1"
            >
              현재 비밀번호
            </label>
            <input
              id="current-admin-pwd"
              type="password"
              autoFocus
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="현재 비밀번호 (초기: 1234)"
              className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 focus:outline-hidden focus:border-[#1a5b6d] focus:ring-1 focus:ring-[#1a5b6d]"
            />
          </div>

          <div>
            <label
              htmlFor="new-admin-pwd"
              className="block text-xs text-slate-700 font-medium mb-1"
            >
              새 비밀번호
            </label>
            <input
              id="new-admin-pwd"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="새 비밀번호 (4자리 이상)"
              className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 focus:outline-hidden focus:border-[#1a5b6d] focus:ring-1 focus:ring-[#1a5b6d]"
            />
          </div>

          <div>
            <label
              htmlFor="confirm-admin-pwd"
              className="block text-xs text-slate-700 font-medium mb-1"
            >
              새 비밀번호 확인
            </label>
            <input
              id="confirm-admin-pwd"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="새 비밀번호 다시 입력"
              className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 focus:outline-hidden focus:border-[#1a5b6d] focus:ring-1 focus:ring-[#1a5b6d]"
            />
          </div>

          {/* Security Note */}
          <div className="p-2.5 rounded-md bg-slate-50 border border-slate-200 text-slate-600 text-[11px] flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-[#1a5b6d] shrink-0 mt-0.5" />
            <span>
              변경한 비밀번호는 서버 데이터베이스에 안전하게 저장되며, 소스 코드 파일에 기록되지 않습니다.
            </span>
          </div>

          {error && (
            <div className="p-2.5 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-2.5 rounded-md bg-green-50 border border-green-200 text-green-700 text-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 text-xs font-medium text-white bg-[#1a5b6d] hover:bg-[#144857] active:bg-[#0f3642] rounded-md transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? '변경 중...' : '비밀번호 변경'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
