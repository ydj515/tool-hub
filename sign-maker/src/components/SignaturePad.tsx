import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import { getStroke } from "perfect-freehand";

type Point = [number, number, number];

export interface Stroke {
  id: string;
  points: Point[];
  isBeautified: boolean;
}

export interface SignaturePadRef {
  clear: () => void;
  download: () => void;
}

const getSvgPathFromStroke = (stroke: number[][]) => {
  if (!stroke.length) return "";
  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ["M", ...stroke[0], "Q"],
  );
  d.push("Z");
  return d.join(" ");
};

const SignaturePad = forwardRef<SignaturePadRef>( (_props, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [countdown, setCountdown] = useState<number>(0);

    useImperativeHandle(ref, () => ({
      clear: () => {
        setStrokes([]);
        setCurrentStroke(null);
      },
      download: () => {
        if (!canvasRef.current) return;
        const dataUrl = canvasRef.current.toDataURL("image/png");
        const link = document.createElement("a");
        link.download = `signature_${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      },
    }));

    useEffect(() => {
      const handleResize = () => {
        if (!canvasRef.current || !containerRef.current) return;
        const canvas = canvasRef.current;
        const container = containerRef.current;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        drawAll();
      };
      window.addEventListener("resize", handleResize);
      handleResize();
      return () => window.removeEventListener("resize", handleResize);
    }, []);

    const beautifyOptions = {
      size: 6,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
      easing: (t: number) => t,
      start: { taper: 0, easing: (t: number) => t, cap: true },
      end: { taper: 50, easing: (t: number) => t, cap: true },
    };

    const drawAll = useCallback(() => {
      if (!canvasRef.current) return;
      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes;
      allStrokes.forEach((stroke) => {
        if (stroke.points.length === 0) return;
        if (stroke.isBeautified) {
          const strokePoints = getStroke(stroke.points, beautifyOptions);
          const pathData = getSvgPathFromStroke(strokePoints);
          const path = new Path2D(pathData);
          ctx.fillStyle = "#1d2522";
          ctx.fill(path);
        } else {
          ctx.strokeStyle = "#1d2522";
          ctx.lineWidth = 1.5;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          stroke.points.forEach((point, i) => {
            if (i === 0) ctx.moveTo(point[0], point[1]);
            else ctx.lineTo(point[0], point[1]);
          });
          ctx.stroke();
        }
      });
    }, [strokes, currentStroke]);

    useEffect(() => { drawAll(); }, [drawAll]);

    useEffect(() => {
      const hasUnbeautified = strokes.some((s) => !s.isBeautified);
      if (!isDrawing && hasUnbeautified) {
        setCountdown(3);
        const id = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(id);
              setStrokes((ps) => ps.map((s) => ({ ...s, isBeautified: true })));
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        return () => clearInterval(id);
      } else {
        setCountdown(0);
      }
    }, [isDrawing, strokes]);

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
      setIsDrawing(true);
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const pressure = e.pressure !== 0 ? e.pressure : 0.5;
      setCurrentStroke({ id: Date.now().toString(), points: [[x, y, pressure]], isBeautified: false });
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !currentStroke) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const pressure = e.pressure !== 0 ? e.pressure : 0.5;
      setCurrentStroke((prev) => prev ? { ...prev, points: [...prev.points, [x, y, pressure]] } : prev);
    };

    const handlePointerUp = () => {
      setIsDrawing(false);
      if (currentStroke) {
        setStrokes((prev) => [...prev, currentStroke]);
        setCurrentStroke(null);
      }
    };

    return (
      <div
        ref={containerRef}
        className="w-full rounded-lg overflow-hidden relative"
        style={{
          height: "400px",
          background: "#ffffff",
          border: "1px solid var(--line)",
        }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="block w-full h-full cursor-crosshair"
          style={{ touchAction: "none" }}
        />
        {countdown > 0 && (
          <div
            className="absolute bottom-2.5 right-2.5 px-2 py-1 rounded-full text-xs font-bold pointer-events-none animate-pulse"
            style={{ background: "var(--green)", color: "#f8fff9" }}
          >
            Beautifying in {countdown}…
          </div>
        )}
      </div>
    );
  },
);

export default SignaturePad;
