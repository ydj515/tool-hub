import React, {
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
  useEffect,
} from "react";

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

    const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(
      null,
    );
    const [hasImage, setHasImage] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    useImperativeHandle(ref, () => ({
      reset: () => {
        setOriginalImage(null);
        setHasImage(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (canvas && ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
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

      // First, resize canvas to match the container, but maintain image aspect ratio
      const container = containerRef.current;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }

      // Clear background
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Calculate scaling to fit image nicely centrally in the canvas
      const scale = Math.min(
        (canvas.width - 40) / img.width,
        (canvas.height - 40) / img.height,
      );
      const drawWidth = img.width * scale;
      const drawHeight = img.height * scale;
      const x = (canvas.width - drawWidth) / 2;
      const y = (canvas.height - drawHeight) / 2;

      // Draw original image
      ctx.drawImage(img, x, y, drawWidth, drawHeight);

      // Extract pixel data and remove background based on threshold
      const imageData = ctx.getImageData(x, y, drawWidth, drawHeight);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Calculate perceptive luminance or simple average
        // Using simple average as it works well for black/white paper scans
        const avg = (r + g + b) / 3;

        // If the pixel is brighter than the threshold, it's considered background
        if (avg >= currentThreshold) {
          data[i + 3] = 0; // Set Alpha to 0 (transparent)
        } else {
          // Optional: enhance the remaining ink to be strictly black
          // Or leave it as original dark ink color.
          // Setting it to strict black for better signature contrast:
          data[i] = 15;
          data[i + 1] = 23;
          data[i + 2] = 42;
        }
      }

      // Put modified pixels back to the exact same area
      ctx.putImageData(imageData, x, y);
    };

    // Process whenever threshold or image changes
    useEffect(() => {
      if (originalImage) {
        processImage(originalImage, threshold);
      }
    }, [originalImage, threshold]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      handleFileSelected(file);
    };

    const handleFileSelected = (file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setOriginalImage(img);
          setHasImage(true);
        };
        if (typeof event.target?.result === "string") {
          img.src = event.target.result;
        }
      };
      reader.readAsDataURL(file);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("image/")) {
        handleFileSelected(file);
      }
    };

    const triggerFileInput = () => {
      fileInputRef.current?.click();
    };

    return (
      <div
        ref={containerRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!hasImage ? triggerFileInput : undefined}
        style={{
          width: "100%",
          height: "400px",
          backgroundColor: isDragging ? "#cbd5e1" : "#e2e8f0",
          borderRadius: "8px",
          overflow: "hidden",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: isDragging
            ? "inset 0 0 0 4px #3b82f6"
            : "inset 0 2px 4px rgba(0,0,0,0.05)",
          cursor: !hasImage ? "pointer" : "default",
          transition: "all 0.2s ease",
        }}
      >
        {!hasImage && (
          <div
            style={{
              position: "absolute",
              textAlign: "center",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1rem auto",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#64748b"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </div>
            <p
              style={{
                color: "#334155",
                fontWeight: "500",
                marginBottom: "0.25rem",
              }}
            >
              Click to upload or drag and drop
            </p>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "0.85rem",
                marginBottom: "1.5rem",
              }}
            >
              PNG, JPG, JPEG (Max. 5MB)
            </p>
            <button
              className="btn btn-secondary"
              onClick={(e) => {
                e.stopPropagation();
                triggerFileInput();
              }}
              style={{ pointerEvents: "auto" }}
            >
              Select Image
            </button>
          </div>
        )}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/png, image/jpeg, image/jpg"
          style={{ display: "none" }}
        />
        <canvas
          ref={canvasRef}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            opacity: hasImage ? 1 : 0,
          }}
        />
      </div>
    );
  },
);

export default ImageUploader;
