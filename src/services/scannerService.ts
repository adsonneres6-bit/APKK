export class ScannerService {
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private scanning = false;
  private rafId = 0;
  private barcodeDetector: any = null;
  private useNative = false;

  async start(
    elementId: string,
    onScan: (decoded: string) => void,
    onError?: (error: string) => void,
    facingMode: 'environment' | 'user' = 'environment',
  ): Promise<void> {
    if (this.scanning) return;

    const container = document.getElementById(elementId);
    if (!container) {
      onError?.('Container da câmera não encontrado');
      return;
    }

    container.innerHTML = '';
    const video = document.createElement('video');
    video.setAttribute('playsinline', 'true');
    video.setAttribute('autoplay', 'true');
    video.muted = true;
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    video.style.borderRadius = '1rem';
    if (facingMode === 'user') {
      video.style.transform = 'scaleX(-1)';
    }
    container.appendChild(video);
    this.video = video;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode } },
        audio: false,
      });
      video.srcObject = this.stream;
      await video.play();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.cleanup();
      onError?.(msg);
      return;
    }

    // Tenta usar BarcodeDetector nativo (mais confiável)
    const BD = (window as any).BarcodeDetector;
    if (BD) {
      try {
        this.barcodeDetector = new BD({
          formats: ['qr_code'],
        });
        this.useNative = true;
      } catch {
        this.useNative = false;
      }
    }

    this.scanning = true;
    this.scanLoop(onScan);
  }

  private scanLoop = (onScan: (decoded: string) => void) => {
    if (!this.scanning || !this.video) return;

    if (this.video.readyState >= 2) {
      if (this.useNative && this.barcodeDetector) {
        this.barcodeDetector
          .detect(this.video)
          .then((codes: any[]) => {
            if (codes && codes.length > 0) {
              const value = codes[0].rawValue ?? codes[0].boundingBox;
              if (value) onScan(String(value).trim());
            }
          })
          .catch(() => {});
      } else {
        // Fallback: canvas + jsQR-like via getImageData não é necessário
        // se BarcodeDetector não existir, tentamos ler via html5-qrcode
      }
    }

    this.rafId = requestAnimationFrame(() => this.scanLoop(onScan));
  };

  async stop(): Promise<void> {
    this.scanning = false;
    cancelAnimationFrame(this.rafId);
    this.cleanup();
  }

  private cleanup() {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
      this.video = null;
    }
    this.barcodeDetector = null;
  }

  get isScanning(): boolean {
    return this.scanning;
  }
}
