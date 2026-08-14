import React, { useRef, useEffect, useState, useCallback } from 'react';
import { RotateCcw, PenTool, Check, Eraser } from 'lucide-react';

interface SignatureCanvasProps {
  onSignatureChange?: (dataUrl: string | null) => void;
  height?: number;
}

export const SignatureCanvas: React.FC<SignatureCanvasProps> = ({
  onSignatureChange,
  height = 200,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#1e293b'); // Deep slate black
  const [strokeWidth, setStrokeWidth] = useState(3.5);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize canvas with retina scaling
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

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
      // If user resizes before drawing, adjust canvas
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

    // Smooth quadratic curve to midpoint
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

    // Export current canvas data
    const canvas = canvasRef.current;
    if (canvas && onSignatureChange) {
      const dataUrl = canvas.toDataURL('image/png');
      onSignatureChange(dataUrl);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
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
    <div className="w-full flex flex-col items-center">
      <div
        ref={containerRef}
        className="relative w-full rounded-2xl bg-white border-2 border-dashed border-slate-300 hover:border-blue-400 focus-within:border-blue-500 transition-colors shadow-inner overflow-hidden"
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
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 select-none">
            <div className="flex items-center gap-2 mb-3 bg-slate-50/80 px-3 py-1.5 rounded-full border border-slate-200/60 shadow-xs">
              <PenTool className="w-4 h-4 text-blue-500 animate-pulse" />
              <span className="text-sm font-medium text-slate-600">이곳에 손가락이나 마우스로 서명해 주세요</span>
            </div>
            <div className="w-4/5 border-b border-dashed border-slate-200 mt-2" />
          </div>
        )}

        {/* Bottom indicator line for professional look */}
        <div className="absolute bottom-4 left-8 right-8 border-b border-slate-200/80 pointer-events-none flex justify-end">
          <span className="text-[11px] text-slate-300 select-none pb-0.5">(서명 / (인))</span>
        </div>
      </div>

      {/* Signature Toolbar */}
      <div className="w-full flex items-center justify-between mt-3 px-1 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          {/* Pen Color Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              id="color-black-btn"
              onClick={() => setStrokeColor('#1e293b')}
              className={`w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center transition-all ${
                strokeColor === '#1e293b' ? 'ring-2 ring-blue-500 scale-110' : 'opacity-70 hover:opacity-100'
              }`}
              title="검정색 펜"
            >
              {strokeColor === '#1e293b' && <Check className="w-3 h-3 text-white" />}
            </button>
            <button
              type="button"
              id="color-navy-btn"
              onClick={() => setStrokeColor('#1e40af')}
              className={`w-6 h-6 rounded-full bg-blue-800 flex items-center justify-center transition-all ${
                strokeColor === '#1e40af' ? 'ring-2 ring-blue-500 scale-110' : 'opacity-70 hover:opacity-100'
              }`}
              title="청남색 펜"
            >
              {strokeColor === '#1e40af' && <Check className="w-3 h-3 text-white" />}
            </button>
          </div>

          {/* Stroke thickness */}
          <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg">
            <button
              type="button"
              id="stroke-thin-btn"
              onClick={() => setStrokeWidth(2.5)}
              className={`px-2 py-0.5 rounded font-medium ${strokeWidth === 2.5 ? 'bg-white shadow-xs text-blue-600 font-semibold' : 'text-slate-500'}`}
            >
              보통
            </button>
            <button
              type="button"
              id="stroke-bold-btn"
              onClick={() => setStrokeWidth(4.5)}
              className={`px-2 py-0.5 rounded font-medium ${strokeWidth === 4.5 ? 'bg-white shadow-xs text-blue-600 font-semibold' : 'text-slate-500'}`}
            >
              굵게
            </button>
          </div>
        </div>

        {/* Clear Button */}
        <button
          type="button"
          id="clear-signature-btn"
          onClick={handleClear}
          disabled={!hasDrawn}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>다시 쓰기</span>
        </button>
      </div>
    </div>
  );
};
