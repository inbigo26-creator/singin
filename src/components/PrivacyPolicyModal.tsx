import React, { useState, useEffect } from 'react';
import { X, Shield, Edit3, Check, RotateCcw } from 'lucide-react';
import { fetchPrivacyPolicy, updatePrivacyPolicy } from '../api';
import { PrivacyPolicyConfig } from '../types';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose,
  isAdmin = false,
}) => {
  const [policy, setPolicy] = useState<PrivacyPolicyConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPolicy();
    } else {
      setIsEditing(false);
    }
  }, [isOpen]);

  const loadPolicy = async () => {
    try {
      setLoading(true);
      const data = await fetchPrivacyPolicy();
      setPolicy(data);
      setEditTitle(data.title || '개인정보처리방침');
      setEditContent(data.content || '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updatePrivacyPolicy({
        title: editTitle.trim() || '개인정보처리방침',
        content: editContent,
        updatedAt: new Date().toISOString(),
      });
      setIsEditing(false);
      await loadPolicy();
    } catch (err: any) {
      alert(err.message || '개인정보처리방침 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#1a5b6d]" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {policy?.title || '개인정보처리방침'}
              </h2>
              {policy?.updatedAt && (
                <p className="text-[11px] text-slate-400">
                  최근 업데이트: {new Date(policy.updatedAt).toLocaleDateString('ko-KR')}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && !isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-md transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>방침 수정/등록</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              개인정보처리방침을 불러오는 중입니다...
            </div>
          ) : isEditing ? (
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  방침 제목
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs font-medium text-slate-900 focus:outline-hidden focus:border-[#1a5b6d]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  방침 상세 내용
                </label>
                <textarea
                  rows={14}
                  required
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-xs font-sans text-slate-900 focus:outline-hidden focus:border-[#1a5b6d] leading-relaxed"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    if (policy) {
                      setEditTitle(policy.title);
                      setEditContent(policy.content);
                    }
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-md cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-[#1a5b6d] hover:bg-[#144857] disabled:opacity-50 text-white text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{saving ? '저장 중...' : '저장 완료'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap select-text bg-slate-50/60 p-4 rounded-lg border border-slate-100 font-sans">
              {policy?.content || '등록된 개인정보처리방침이 없습니다.'}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div>Version 1.0.0 (2026) · © INBIGO. All Rights Reserved.</div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-md transition-colors cursor-pointer font-medium"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
