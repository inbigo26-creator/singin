import React from 'react';
import { PenTool, Shield, LogOut } from 'lucide-react';

interface NavbarProps {
  currentView: 'admin' | 'sign';
  schoolName: string;
  isAdminAuthenticated: boolean;
  onSwitchToAdmin: () => void;
  onSwitchToSign: () => void;
  onOpenSettings?: () => void;
  onLogoutAdmin?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  schoolName,
  isAdminAuthenticated,
  onSwitchToAdmin,
  onSwitchToSign,
  onLogoutAdmin,
}) => {
  return (
    <header className="print:hidden bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            교직원 연수 전자서명
          </h1>
          <span className="text-xs text-slate-400">|</span>
          <span className="text-xs text-slate-600 font-medium">
            {schoolName || '인천비즈니스고등학교'}
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-medium">
            관리자
          </span>
        </div>

        {/* Right Navigation */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSwitchToSign}
            className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <PenTool className="w-3.5 h-3.5 text-slate-500" />
            <span>선생님 서명 화면</span>
          </button>

          {isAdminAuthenticated && onLogoutAdmin && (
            <button
              type="button"
              onClick={onLogoutAdmin}
              className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 px-2 py-1 transition-colors cursor-pointer"
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
