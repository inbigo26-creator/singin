import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Training } from '../types';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  training: Training;
}

export const QRModal: React.FC<QRModalProps> = ({
  isOpen,
  onClose,
  training,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const signUrl = `${window.location.origin}${window.location.pathname}?sign=${training.id}`;

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    QRCode.toCanvas(
      canvasRef.current,
      signUrl,
      {
        width: 280,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      },
      (error) => {
        if (error) console.error('QR code generation error:', error);
      }
    );
  }, [isOpen, signUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(signUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenNewTab = () => {
    window.open(signUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className={`bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col transition-all ${
          isFullscreen ? 'w-full h-full max-w-none max-h-none rounded-none' : 'w-full max-w-md'
        }`}
      >
        {/* Modal Top Bar */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              연수 서명 QR코드
            </h2>
            <p className="text-xs text-slate-500">교직원 스마트폰으로 스캔하여 서명합니다.</p>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md transition-colors cursor-pointer"
              title={isFullscreen ? '축소' : '화면 채우기'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col items-center justify-center text-center space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {training.title}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {training.date} {training.location ? `· ${training.location}` : ''}
            </p>
          </div>

          {/* QR Code Canvas */}
          <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
            <canvas ref={canvasRef} className="rounded block" />
          </div>

          <p className="text-xs text-slate-400">
            카메라 앱으로 QR 코드를 스캔하세요.
          </p>

          {/* Direct URL Share Box */}
          <div className="w-full bg-slate-50 border border-slate-200 rounded-md p-2 flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={signUrl}
              className="flex-1 bg-transparent text-xs text-slate-600 font-mono px-1 outline-hidden select-all"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-2.5 py-1 bg-[#1a5b6d] hover:bg-[#144857] text-white text-xs font-medium rounded transition-colors cursor-pointer flex items-center gap-1 shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>복사됨</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>링크 복사</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleOpenNewTab}
            className="text-xs text-[#1a5b6d] hover:underline flex items-center gap-1 font-medium cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>새 탭에서 서명창 열기</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-md transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
