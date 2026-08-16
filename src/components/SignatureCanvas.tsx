import React, { useRef, useEffect, useState, useCallback } from 'react';
import { RotateCcw, PenTool, Check } from 'lucide-react';
import { trimAndOptimizeSignature } from '../utils/signatureUtils';

interface SignatureCanvasProps {
  onSignatureChange?: (dataUrl: string | null) => void;
  height?: number;
}

export const SignatureCanvas: React.FC<SignatureCanvasProps> = ({
  onSignatureChange,
  height = 160,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#000000'); // Pure solid black
  const [strokeWidth, setStrokeWidth] = useState(4.5);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize canvas with retina scaling
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = Math.max(window.devicePixelRatio || 1, 2);

    // Set display size (css pixels)
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${height}px`;

    // Set actual size in memory (scaled for retina)
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
    }
  }, [height, strokeColor, strokeWidth]);

  useEffect(() => {
    setupCanvas();
    const handleResize = () => {
      if (!hasDrawn) {
        setupCanvas();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setupCanvas, hasDrawn]);

  // Helper to extract canvas point relative to element
  const getCanvasPoint = (e: React.MouseEvent | React.TouchEvent | TouchEvent | MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else if ('clientX' in e) {
      return {
        x: (e as MouseEvent).clientX - rect.left,
        y: (e as MouseEvent).clientY - rect.top,
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const point = getCanvasPoint(e);
    lastPointRef.current = point;
    setIsDrawing(true);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.beginPath();
      ctx.arc(point.x, point.y, strokeWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = strokeColor;
      ctx.fill();
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPointRef.current) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentPoint = getCanvasPoint(e);

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);

    const midX = (lastPointRef.current.x + currentPoint.x) / 2;
    const midY = (lastPointRef.current.y + currentPoint.y) / 2;
    ctx.quadraticCurveTo(lastPointRef.current.x, lastPointRef.current.y, midX, midY);
    ctx.stroke();

    lastPointRef.current = currentPoint;

    if (!hasDrawn) {
      setHasDrawn(true);
    }
  };

  const endDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    lastPointRef.current = null;

    // Export auto-trimmed canvas data
    const canvas = canvasRef.current;
    if (canvas && onSignatureChange) {
      const dataUrl = trimAndOptimizeSignature(canvas);
      onSignatureChange(dataUrl);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.max(window.devicePixelRatio || 1, 2);
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    setHasDrawn(false);
    if (onSignatureChange) {
      onSignatureChange(null);
    }
  };

  // Prevent touch scrolling on mobile while touching canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const preventTouch = (e: TouchEvent) => {
      if (e.target === canvas) {
        e.preventDefault();
      }
    };

    canvas.addEventListener('touchstart', preventTouch, { passive: false });
    canvas.addEventListener('touchmove', preventTouch, { passive: false });
    canvas.addEventListener('touchend', preventTouch, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', preventTouch);
      canvas.removeEventListener('touchmove', preventTouch);
      canvas.removeEventListener('touchend', preventTouch);
    };
  }, []);

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center">
      <div
        ref={containerRef}
        className="relative w-full rounded-xl bg-white border-2 border-slate-700 hover:border-[#1a5b6d] focus-within:border-[#1a5b6d] transition-colors shadow-xs overflow-hidden"
        style={{ touchAction: 'none' }}
      >
        <canvas
          ref={canvasRef}
          id="signature-pad-canvas"
          className="cursor-crosshair w-full block bg-transparent"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={endDrawing}
        />

        {/* Watermark & Guideline when canvas is empty */}
        {!hasDrawn && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 select-none p-3 text-center">
            <div className="flex items-center gap-1.5 mb-1 bg-slate-50 px-3 py-1 rounded-full border border-slate-200 shadow-2xs">
              <PenTool className="w-3.5 h-3.5 text-[#1a5b6d]" />
              <span className="text-xs font-bold text-slate-700">이곳에 이름을 큼직하게 꽉 차게 서명</span>
            </div>
            <p className="text-[11px] text-slate-400">네모 칸에 꽉 차도록 크게 작성해 주세요</p>
          </div>
        )}
      </div>

      {/* Signature Toolbar */}
      <div className="w-full flex items-center justify-between mt-2.5 px-1 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          {/* Pen Color Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              id="color-black-btn"
              onClick={() => setStrokeColor('#000000')}
              className={`w-5 h-5 rounded-full bg-black flex items-center justify-center transition-all ${
                strokeColor === '#000000' ? 'ring-2 ring-[#1a5b6d] scale-110' : 'opacity-70 hover:opacity-100'
              }`}
              title="검정색 펜"
            >
              {strokeColor === '#000000' && <Check className="w-3 h-3 text-white" />}
            </button>
            <button
              type="button"
              id="color-navy-btn"
              onClick={() => setStrokeColor('#0f2b48')}
              className={`w-5 h-5 rounded-full bg-[#0f2b48] flex items-center justify-center transition-all ${
                strokeColor === '#0f2b48' ? 'ring-2 ring-[#1a5b6d] scale-110' : 'opacity-70 hover:opacity-100'
              }`}
              title="청남색 펜"
            >
              {strokeColor === '#0f2b48' && <Check className="w-3 h-3 text-white" />}
            </button>
          </div>

          <span className="text-[11px] text-slate-400">※ 진하고 선명한 잉크 적용</span>
        </div>

        {/* Clear Button */}
        <button
          type="button"
          id="clear-signature-btn"
          onClick={handleClear}
          disabled={!hasDrawn}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <RotateCcw className="w-3 h-3" />
          <span>다시 쓰기</span>
        </button>
      </div>
    </div>
  );
};
