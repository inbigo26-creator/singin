import React from 'react';
import { PenTool, LogOut, KeyRound, Shield } from 'lucide-react';

interface NavbarProps {
  currentView: 'admin' | 'sign';
  schoolName: string;
  isAdminAuthenticated: boolean;
  onSwitchToAdmin: () => void;
  onSwitchToSign: () => void;
  onOpenSettings?: () => void;
  onOpenChangePassword?: () => void;
  onLogoutAdmin?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  schoolName,
  isAdminAuthenticated,
  onSwitchToSign,
  onOpenChangePassword,
  onLogoutAdmin,
}) => {
  return (
    <header className="print:hidden bg-white border-b border-slate-200 sticky top-0 z-40 shadow-2xs">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2">
        {/* Brand */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 shrink">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-[#1a5b6d] shrink-0" />
            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
              {schoolName || '인천비즈니스고'}
            </h1>
          </div>
          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] sm:text-xs font-semibold border border-slate-200 shrink-0">
            관리자
          </span>
        </div>

        {/* Right Navigation Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Switch to Teacher Mode Button */}
          <button
            type="button"
            onClick={onSwitchToSign}
            className="text-[11px] sm:text-xs text-slate-700 hover:text-slate-900 flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title="선생님 서명 화면으로 이동"
          >
            <PenTool className="w-3.5 h-3.5 text-[#1a5b6d]" />
            <span className="font-medium hidden xs:inline">선생님 화면</span>
            <span className="font-medium xs:hidden">서명화면</span>
          </button>

          {/* Change Admin Password */}
          {isAdminAuthenticated && onOpenChangePassword && (
            <button
              type="button"
              onClick={onOpenChangePassword}
              className="text-[11px] sm:text-xs text-slate-700 hover:text-slate-900 flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="관리자 비밀번호 변경"
            >
              <KeyRound className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden md:inline font-medium">비번 변경</span>
            </button>
          )}

          {/* Admin Logout Button */}
          {isAdminAuthenticated && onLogoutAdmin && (
            <button
              type="button"
              onClick={onLogoutAdmin}
              className="text-[11px] sm:text-xs text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="관리자 로그아웃"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>로그아웃</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};


