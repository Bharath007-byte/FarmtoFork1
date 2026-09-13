import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, X, Check, AlertCircle } from "lucide-react";

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  title?: string;
  isSelfie?: boolean;
}

export function CameraCaptureModal({
  isOpen,
  onClose,
  onCapture,
  title = "Capture Photo",
  isSelfie = false,
}: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    isSelfie ? "user" : "environment"
  );
  const [loading, setLoading] = useState(true);

  const startCamera = async (mode: "user" | "environment") => {
    setLoading(true);
    setCameraError(null);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported on this browser or device.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setLoading(false);
    } catch (err: any) {
      console.warn("Camera access error:", err);
      setLoading(false);
      setCameraError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Camera permission was denied. Please allow camera access in browser settings or use file upload."
          : err.message || "Unable to access camera on this device."
      );
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      setCapturedBlob(null);
      startCamera(facingMode);
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, facingMode]);

  const handleCapture = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Flip horizontally if front camera for natural mirror view
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        setCapturedImage(dataUrl);
        setCapturedBlob(blob);
      },
      "image/jpeg",
      0.92
    );
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setCapturedBlob(null);
    startCamera(facingMode);
  };

  const handleConfirm = () => {
    if (!capturedBlob) return;
    const filename = `${isSelfie ? "selfie" : "document"}_${Date.now()}.jpg`;
    const file = new File([capturedBlob], filename, { type: "image/jpeg" });
    onCapture(file);
    onClose();
  };

  const toggleFacingMode = () => {
    const nextMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-zinc-900 text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-emerald-400" />
            <h3 className="font-semibold text-zinc-100">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Viewfinder / Preview */}
        <div className="relative aspect-video w-full overflow-hidden bg-black">
          {cameraError ? (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center">
              <AlertCircle className="h-10 w-10 text-rose-400" />
              <p className="mt-3 text-sm text-zinc-300">{cameraError}</p>
              <button
                onClick={() => startCamera(facingMode)}
                className="mt-4 rounded-xl bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700"
              >
                Try Again
              </button>
            </div>
          ) : capturedImage ? (
            <img
              src={capturedImage}
              alt="Captured"
              className="h-full w-full object-contain"
            />
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className={`h-full w-full object-cover ${
                  facingMode === "user" ? "scale-x-[-1]" : ""
                }`}
              />
              {/* Frame Guide */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                {isSelfie ? (
                  <div className="h-44 w-36 rounded-full border-2 border-dashed border-emerald-400/70 shadow-[0_0_20px_rgba(16,185,129,0.3)]" />
                ) : (
                  <div className="h-48 w-72 rounded-xl border-2 border-dashed border-emerald-400/70 shadow-[0_0_20px_rgba(16,185,129,0.3)]" />
                )}
              </div>
              <div className="absolute bottom-2 left-0 right-0 text-center text-xs text-zinc-300 drop-shadow">
                {isSelfie
                  ? "Align your face inside the oval frame"
                  : "Align document clearly within the borders"}
              </div>
            </>
          )}

          {loading && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <RefreshCw className="h-8 w-8 animate-spin text-emerald-400" />
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between bg-zinc-950 px-6 py-4">
          {!capturedImage ? (
            <>
              <button
                type="button"
                onClick={toggleFacingMode}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Switch Camera
              </button>
              <button
                type="button"
                onClick={handleCapture}
                disabled={loading || !!cameraError}
                className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-white/30 bg-emerald-500 text-white shadow-lg transition hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <Camera className="h-6 w-6" />
              </button>
              <div className="w-24" /> {/* Spacer */}
            </>
          ) : (
            <div className="flex w-full items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleRetake}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800"
              >
                <RefreshCw className="h-4 w-4" />
                Retake
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-500"
              >
                <Check className="h-4 w-4" />
                Use Photo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
