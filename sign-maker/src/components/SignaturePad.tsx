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

interface SignaturePadProps {}

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

const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
  (_props, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [countdown, setCountdown] = useState<number>(0);

    // Expose clear and download functions to parent
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

    // Resize canvas to fit container
    useEffect(() => {
      const handleResize = () => {
        if (!canvasRef.current || !containerRef.current) return;
        const canvas = canvasRef.current;
        const container = containerRef.current;

        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        drawAll(); // Redraw immediately on resize
      };

      window.addEventListener("resize", handleResize);
      handleResize(); // Initial size

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

      // Clear canvas
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes;

      allStrokes.forEach((stroke) => {
        if (stroke.points.length === 0) return;

        if (stroke.isBeautified) {
          // Draw beautified path using perfect-freehand
          const strokePoints = getStroke(stroke.points, beautifyOptions);
          const pathData = getSvgPathFromStroke(strokePoints);
          const path = new Path2D(pathData);
          ctx.fillStyle = "#0f172a"; // Ink color
          ctx.fill(path);
        } else {
          // Draw raw jagged path
          ctx.strokeStyle = "#0f172a";
          ctx.lineWidth = 1.5;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          stroke.points.forEach((point, i) => {
            if (i === 0) {
              ctx.moveTo(point[0], point[1]);
            } else {
              ctx.lineTo(point[0], point[1]);
            }
          });
          ctx.stroke();
        }
      });
    }, [strokes, currentStroke]);

    useEffect(() => {
      drawAll();
    }, [drawAll]);

    // 3-second Beautify Timer with Countdown
    useEffect(() => {
      const hasUnbeautified = strokes.some((s) => !s.isBeautified);

      if (!isDrawing && hasUnbeautified) {
        setCountdown(3);
        const intervalId = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(intervalId);
              setStrokes((prevStrokes) =>
                prevStrokes.map((s) => ({ ...s, isBeautified: true })),
              );
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        return () => clearInterval(intervalId);
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

      const newStroke: Stroke = {
        id: Date.now().toString(),
        points: [[x, y, pressure]],
        isBeautified: false,
      };
      setCurrentStroke(newStroke);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !currentStroke) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const pressure = e.pressure !== 0 ? e.pressure : 0.5;

      setCurrentStroke((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          points: [...prev.points, [x, y, pressure]],
        };
      });
    };

    const handlePointerUp = (_e: React.PointerEvent<HTMLCanvasElement>) => {
      setIsDrawing(false);
      if (currentStroke) {
        setStrokes((prev) => [...prev, currentStroke]);
        setCurrentStroke(null);
      }
    };

    return (
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "400px",
          backgroundColor: "#f8fafc", // Light canvas surface
          borderRadius: "8px",
          overflow: "hidden",
          position: "relative",
          boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)",
        }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            touchAction: "none",
            display: "block",
            width: "100%",
            height: "100%",
            cursor: "crosshair",
          }}
        />

        {/* Visual cue for processing */}
        {countdown > 0 && (
          <div
            style={{
              position: "absolute",
              bottom: "10px",
              right: "10px",
              background: "rgba(59, 130, 246, 0.9)",
              color: "white",
              padding: "4px 8px",
              borderRadius: "12px",
              fontSize: "0.75rem",
              pointerEvents: "none",
              animation: "pulse 1s infinite ease-in-out",
            }}
          >
            Beautifying in {countdown}...
          </div>
        )}
        <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
      </div>
    );
  },
);

export default SignaturePad;
