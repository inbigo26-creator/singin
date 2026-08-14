import React, { useState } from 'react';
import { Lock, X, AlertCircle } from 'lucide-react';
import { verifyAdminPassword } from '../api';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('비밀번호를 입력해 주세요.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await verifyAdminPassword(password);
      localStorage.setItem('school_admin_auth', 'true');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || '비밀번호가 일치하지 않습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white max-w-sm w-full rounded-xl shadow-lg border border-slate-200 p-6 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1 text-slate-400 hover:text-slate-600 rounded"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-base font-bold text-slate-900 mb-1">
          관리자 로그인
        </h3>
        <p className="text-xs text-slate-500 mb-5">
          연수 등록 및 관리를 위해 비밀번호를 입력해 주세요.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-passcode" className="block text-xs text-slate-600 mb-1 font-medium">
              비밀번호
            </label>
            <div className="relative">
              <input
                id="admin-passcode"
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 (기본: 1234)"
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 focus:outline-hidden focus:border-[#1a5b6d] focus:ring-1 focus:ring-[#1a5b6d]"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              기본 비밀번호: 1234
            </p>
          </div>

          {error && (
            <div className="p-2.5 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 rounded-md bg-[#1a5b6d] hover:bg-[#144857] active:bg-[#0f3642] text-white text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? '확인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
};
