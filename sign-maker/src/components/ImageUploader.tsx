/**
 * 이미지 업로드 후 배경을 제거해 서명만 추출하는 컴포넌트다.
 */
import React, {
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
  useEffect,
} from "react";
import { Upload } from "lucide-react";
import Button from "./ui/Button";

export interface ImageUploaderRef {
  reset: () => void;
  download: () => void;
}

interface ImageUploaderProps {
  threshold: number;
}

/**
 * 업로드한 이미지에서 밝기 임계값을 기준으로 배경을 제거한다.
 */
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
          data[i] = 23; data[i + 1] = 23; data[i + 2] = 23;
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
        className="upload-dropzone w-full rounded-xl overflow-hidden relative flex items-center justify-center transition-all"
        data-has-image={hasImage ? "true" : "false"}
        data-dragging={isDragging ? "true" : "false"}
      >
        {!hasImage && (
          <div className="absolute flex flex-col items-center gap-2 text-center pointer-events-none">
            <div className="upload-icon-box w-12 h-12 rounded-2xl grid place-items-center">
              <Upload size={20} />
            </div>
            <p className="upload-title text-sm font-semibold">
              클릭하거나 드래그하여 업로드해요
            </p>
            <p className="upload-hint text-xs">PNG, JPG, JPEG (최대 5MB)</p>
            <Button
              variant="secondary"
              className="mt-1 px-4 h-9 text-xs font-semibold pointer-events-auto"
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            >
              파일 선택
            </Button>
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
          className={`upload-preview-canvas block w-full h-full ${hasImage ? "is-visible" : ""}`}
        />
      </div>
    );
  },
);

export default ImageUploader;
