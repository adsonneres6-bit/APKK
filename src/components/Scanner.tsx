import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, ScanLine, SwitchCamera, Volume2, VolumeX } from 'lucide-react';
import { ScannerService } from '../services/scannerService';

interface ScannerProps {
  onScan: (decoded: string) => void;
  onError: (msg: string) => void;
  lastSequence: string | null;
  alreadyRead: boolean;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
}

const SCAN_DELAY_MS = 3500;

export function Scanner({ onScan, onError, lastSequence, alreadyRead, voiceEnabled, onToggleVoice }: ScannerProps) {
  const scannerRef = useRef<ScannerService | null>(null);
  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const lastScanRef = useRef(0);
  const lastCodeRef = useRef<string | null>(null);

  useEffect(() => {
    scannerRef.current = new ScannerService();
    return () => {
      scannerRef.current?.stop();
    };
  }, []);

  const startCamera = async (mode: 'environment' | 'user') => {
    setStarting(true);
    try {
      await scannerRef.current?.start(
        'qr-reader',
        (decoded) => {
          const now = Date.now();
          if (decoded === lastCodeRef.current && now - lastScanRef.current < 500) return;
          if (now - lastScanRef.current < SCAN_DELAY_MS) return;
          lastScanRef.current = now;
          lastCodeRef.current = decoded;
          setCooldown(true);
          onScan(decoded);
          setTimeout(() => setCooldown(false), SCAN_DELAY_MS);
        },
        (err) => onError(err),
        mode,
      );
      setActive(true);
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setStarting(false);
    }
  };

  const handleStart = async () => {
    await startCamera(facingMode);
  };

  const handleStop = async () => {
    await scannerRef.current?.stop();
    setActive(false);
  };

  const handleSwitchCamera = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    if (active) {
      await scannerRef.current?.stop();
      setActive(false);
      setFacingMode(nextMode);
      await startCamera(nextMode);
    } else {
      setFacingMode(nextMode);
    }
  };

  return (
    <div className="space-y-3">
      {/* Área da câmera */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 dark:border-slate-700" style={{ height: '35vh' }}>
        <div
          id="qr-reader"
          style={{ width: '100%', height: '100%', minHeight: '200px' }}
        />
        {!active && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
            <ScanLine className="h-10 w-10" />
            <p className="text-sm">Câmera desligada</p>
          </div>
        )}
        {active && cooldown && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-1.5 text-xs font-medium text-white backdrop-blur">
          </div>
        )}
        {active && (
          <div className="absolute top-3 right-3 z-10 flex gap-2">
            <button
              onClick={onToggleVoice}
              className={`flex items-center justify-center rounded-xl p-2.5 backdrop-blur transition-colors ${
                voiceEnabled
                  ? 'bg-black/60 text-white hover:bg-black/80'
                  : 'bg-black/60 text-slate-400 hover:bg-black/80'
              }`}
              title={voiceEnabled ? 'Desativar voz' : 'Ativar voz'}
            >
              {voiceEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </button>
            <button
              onClick={handleSwitchCamera}
              disabled={starting}
              className="flex items-center justify-center rounded-xl bg-black/60 p-2.5 text-white backdrop-blur transition-colors hover:bg-black/80 disabled:opacity-50"
              title={facingMode === 'environment' ? 'Trocar para frontal' : 'Trocar para traseira'}
            >
              <SwitchCamera className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* Botão abrir/fechar câmera */}
      <button
        onClick={active ? handleStop : handleStart}
        disabled={starting}
        className={`flex w-full items-center justify-center gap-3 rounded-xl px-6 py-3.5 text-base font-semibold text-white transition-colors active:scale-[0.98] disabled:opacity-50 ${
          active
            ? 'bg-red-500 hover:bg-red-600'
            : 'bg-brand-600 hover:bg-brand-700'
        }`}
      >
        {starting ? (
          <>
            <ScanLine className="h-5 w-5 animate-pulse" />
            Iniciando...
          </>
        ) : active ? (
          <>
            <CameraOff className="h-5 w-5" />
           Encerrar Leitura
          </>
        ) : (
          <>
            <Camera className="h-5 w-5" />
            Iniciar Leitura
          </>
        )}
      </button>

      {/* Card fixo de última sequência */}
      <div
        className={`sticky top-[72px] z-30 rounded-2xl p-4 shadow-lg transition-colors ${
          alreadyRead
            ? 'bg-gradient-to-br from-amber-500 to-amber-600'
            : 'bg-gradient-to-br from-brand-600 to-brand-800'
        }`}
      >
        <p
          className={`text-xs font-semibold uppercase tracking-wider ${
            alreadyRead ? 'text-amber-50' : 'text-brand-100'
          }`}
        >
          Última sequência
        </p>
        <div className="mt-1 flex items-baseline gap-3">
          <p className="text-4xl font-extrabold text-white tabular-nums">
            {lastSequence ?? '—'}
          </p>
          {alreadyRead && (
            <span className="rounded-lg bg-white/25 px-2.5 py-1 text-sm font-bold text-white">
              Já Lido
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
