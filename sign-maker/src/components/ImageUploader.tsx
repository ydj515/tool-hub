import React, {
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
  useEffect,
} from "react";
import { Upload } from "lucide-react";

export interface ImageUploaderRef {
  reset: () => void;
  download: () => void;
}

interface ImageUploaderProps {
  threshold: number;
}

const ImageUploader = forwardRef<ImageUploaderRef, ImageUploaderProps>(
  ({ threshold }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
    const [hasImage, setHasImage] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    useImperativeHandle(ref, () => ({
      reset: () => {
        setOriginalImage(null);
        setHasImage(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      },
      download: () => {
        if (!canvasRef.current || !hasImage) return;
        const dataUrl = canvasRef.current.toDataURL("image/png");
        const link = document.createElement("a");
        link.download = `extracted_signature_${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      },
    }));

    const processImage = (img: HTMLImageElement, currentThreshold: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      const container = containerRef.current;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const scale = Math.min((canvas.width - 40) / img.width, (canvas.height - 40) / img.height);
      const drawWidth = img.width * scale;
      const drawHeight = img.height * scale;
      const x = (canvas.width - drawWidth) / 2;
      const y = (canvas.height - drawHeight) / 2;
      ctx.drawImage(img, x, y, drawWidth, drawHeight);
      const imageData = ctx.getImageData(x, y, drawWidth, drawHeight);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (avg >= currentThreshold) {
          data[i + 3] = 0;
        } else {
          data[i] = 29; data[i + 1] = 37; data[i + 2] = 34;
        }
      }
      ctx.putImageData(imageData, x, y);
    };

    useEffect(() => {
      if (originalImage) processImage(originalImage, threshold);
    }, [originalImage, threshold]);

    const handleFileSelected = (file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => { setOriginalImage(img); setHasImage(true); };
        if (typeof event.target?.result === "string") img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("image/")) handleFileSelected(file);
    };

    return (
      <div
        ref={containerRef}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        onDrop={handleDrop}
        onClick={!hasImage ? () => fileInputRef.current?.click() : undefined}
        className="w-full rounded-lg overflow-hidden relative flex items-center justify-center transition-all"
        style={{
          height: "400px",
          background: isDragging ? "var(--surface-3)" : "var(--surface-2)",
          border: isDragging ? "2px dashed var(--green)" : "1px solid var(--line)",
          cursor: !hasImage ? "pointer" : "default",
        }}
      >
        {!hasImage && (
          <div className="absolute flex flex-col items-center gap-2 text-center pointer-events-none">
            <div
              className="w-12 h-12 rounded-full grid place-items-center"
              style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
            >
              <Upload size={20} style={{ color: "var(--muted)" }} />
            </div>
            <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
              클릭하거나 드래그하여 업로드
            </p>
            <p className="text-xs" style={{ color: "var(--muted)" }}>PNG, JPG, JPEG (최대 5MB)</p>
            <button
              className="mt-1 px-4 h-9 rounded-lg text-xs font-bold pointer-events-auto transition-colors"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                color: "var(--text)",
              }}
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            >
              파일 선택
            </button>
          </div>
        )}
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelected(f); }}
          accept="image/png, image/jpeg, image/jpg"
          className="hidden"
        />
        <canvas
          ref={canvasRef}
          className="block w-full h-full"
          style={{ opacity: hasImage ? 1 : 0 }}
        />
      </div>
    );
  },
);

export default ImageUploader;
