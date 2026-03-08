import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Camera, Search, QrCode, Keyboard } from "lucide-react";

export default function TechScanPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [manualInput, setManualInput] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);

  const handleResult = useCallback((url: string) => {
    const trackMatch = url.match(/\/track\/([a-f0-9]+)/i);
    if (trackMatch) {
      // For technicians, go to the SO detail via track token
      navigate(`/track/${trackMatch[1]}`);
      return;
    }

    const soMatch = url.match(/^(OS-?\d+)$/i);
    if (soMatch) {
      toast({ title: "Busque a OS", description: `Pesquise "${soMatch[1]}" na fila.` });
      return;
    }

    const uuidMatch = url.match(/\/service-orders\/([0-9a-f-]{36})/i);
    if (uuidMatch) {
      navigate(`/tech/order/${uuidMatch[1]}`);
      return;
    }

    // Try as raw UUID
    const rawUuid = url.match(/^([0-9a-f-]{36})$/i);
    if (rawUuid) {
      navigate(`/tech/order/${rawUuid[1]}`);
      return;
    }

    toast({ title: "Código não reconhecido", variant: "destructive" });
  }, [navigate, toast]);

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const scanFrame = useCallback(() => {
    if (!scanningRef.current || !videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      requestAnimationFrame(scanFrame);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    if ("BarcodeDetector" in window) {
      const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
      detector.detect(canvas).then((barcodes: any[]) => {
        if (barcodes.length > 0) {
          stopCamera();
          handleResult(barcodes[0].rawValue);
          return;
        }
        if (scanningRef.current) requestAnimationFrame(scanFrame);
      }).catch(() => {
        if (scanningRef.current) requestAnimationFrame(scanFrame);
      });
    } else {
      toast({ title: "Scanner indisponível", description: "Use a entrada manual.", variant: "destructive" });
      stopCamera();
      setMode("manual");
    }
  }, [handleResult, stopCamera, toast]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      scanningRef.current = true;
      scanFrame();
    } catch {
      toast({ title: "Câmera indisponível", variant: "destructive" });
      setMode("manual");
    }
  }, [toast, scanFrame]);

  useEffect(() => {
    if (mode === "camera") startCamera();
    else stopCamera();
    return stopCamera;
  }, [mode, startCamera, stopCamera]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = manualInput.trim();
    if (!val) return;
    handleResult(val);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">Escanear QR Code</h1>

      <div className="flex gap-2">
        <Button size="sm" variant={mode === "camera" ? "default" : "outline"} onClick={() => setMode("camera")}>
          <Camera className="mr-1 h-4 w-4" /> Câmera
        </Button>
        <Button size="sm" variant={mode === "manual" ? "default" : "outline"} onClick={() => setMode("manual")}>
          <Keyboard className="mr-1 h-4 w-4" /> Manual
        </Button>
      </div>

      {mode === "camera" ? (
        <Card>
          <CardContent className="p-3">
            <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-40 h-40 border-2 border-primary/60 rounded-lg" />
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <p className="text-xs text-muted-foreground text-center mt-2">
              Aponte para o QR code da etiqueta
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-3">
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <Input
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Número da OS ou URL"
                autoFocus
              />
              <Button type="submit" className="w-full" size="sm">
                <Search className="mr-1 h-4 w-4" /> Buscar
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
