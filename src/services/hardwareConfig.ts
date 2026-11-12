// Hardware & External Camera Management Service
// Suporta Câmeras USB (WebRTC/UVC), Placas de Captura HDMI e Câmeras IP / CFTV Local

export type CameraSourceType = 'usb_webrtc' | 'ip_stream' | 'disabled';
export type CameraResolution = '480p' | '720p' | '1080p';

export interface HardwareConfig {
  cameraSourceType: CameraSourceType;
  preferredDeviceId: string | null;
  preferredDeviceLabel: string | null;
  resolution: CameraResolution;
  ipStreamUrl: string;
  mirrorVideo: boolean;
  beepOnScan: boolean;
  autoSwitchExternal: boolean;
  scannerSpeed: 'turbo' | 'standard';
}

export interface DetectedCamera {
  deviceId: string;
  label: string;
  isExternal: boolean;
  isCaptureCard: boolean;
  kind: MediaDeviceKind;
}

const STORAGE_KEY = 'portaria_hardware_config_v1';
const API_BASE = 'http://localhost:3002/api';

const DEFAULT_CONFIG: HardwareConfig = {
  cameraSourceType: 'usb_webrtc',
  preferredDeviceId: null,
  preferredDeviceLabel: null,
  resolution: '720p',
  ipStreamUrl: '',
  mirrorVideo: false,
  beepOnScan: true,
  autoSwitchExternal: true,
  scannerSpeed: 'turbo',
};

class HardwareConfigService {
  private config: HardwareConfig;
  private listeners: Set<() => void> = new Set();
  private hotplugListeners: Set<(cameras: DetectedCamera[]) => void> = new Set();

  constructor() {
    this.config = this.loadInitialConfig();
    this.initHotplugListener();
    this.syncFromBackend();
  }

  private loadInitialConfig(): HardwareConfig {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
          return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
        }
      }
    } catch {
      // Fallback to default
    }
    return { ...DEFAULT_CONFIG };
  }

  private async syncFromBackend() {
    try {
      const res = await fetch(`${API_BASE}/hardware/config`);
      if (res.ok) {
        const backendConfig = await res.json();
        this.config = { ...this.config, ...backendConfig };
        this.notify();
      }
    } catch {
      // Silent in offline mode
    }
  }

  private initHotplugListener() {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', async () => {
        const cameras = await this.detectCameras();
        this.hotplugListeners.forEach((fn) => fn(cameras));

        // Auto-switch to external USB camera if enabled and an external camera is connected
        if (this.config.autoSwitchExternal) {
          const externalCam = cameras.find((c) => c.isExternal);
          if (externalCam && externalCam.deviceId !== this.config.preferredDeviceId) {
            this.saveConfig({
              preferredDeviceId: externalCam.deviceId,
              preferredDeviceLabel: externalCam.label,
            });
          }
        }
      });
    }
  }

  public getConfig(): HardwareConfig {
    return { ...this.config };
  }

  public async saveConfig(updates: Partial<HardwareConfig>): Promise<HardwareConfig> {
    this.config = { ...this.config, ...updates };

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
      } catch {
        // LocalStorage fallback
      }
    }

    this.notify();

    // Persist to SQLite backend
    try {
      await fetch(`${API_BASE}/hardware/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.config),
      });
    } catch {
      // Offline fallback: saved locally
    }

    return { ...this.config };
  }

  public async detectCameras(): Promise<DetectedCamera[]> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      return [];
    }

    try {
      // Prompt permissions if needed to reveal labels
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');

      return videoInputs.map((device, idx) => {
        const rawLabel = device.label || `Câmera de Vídeo #${idx + 1}`;
        const labelLower = rawLabel.toLowerCase();

        // Categorize hardware type
        const isInternal =
          labelLower.includes('integrated') ||
          labelLower.includes('interna') ||
          labelLower.includes('built-in') ||
          labelLower.includes('front') ||
          labelLower.includes('traseira') ||
          labelLower.includes('facetime');

        const isCapture =
          labelLower.includes('capture') ||
          labelLower.includes('hdmi') ||
          labelLower.includes('cam link') ||
          labelLower.includes('elgato') ||
          labelLower.includes('uvc video') ||
          labelLower.includes('grabber');

        const isExternal = !isInternal && (
          isCapture ||
          labelLower.includes('usb') ||
          labelLower.includes('logitech') ||
          labelLower.includes('c920') ||
          labelLower.includes('brio') ||
          labelLower.includes('intelbras') ||
          labelLower.includes('webcam') ||
          labelLower.includes('droidcam') ||
          videoInputs.length > 1 && idx > 0
        );

        let formattedLabel = rawLabel;
        if (isCapture) {
          formattedLabel = `[Placa de Captura UVC] ${rawLabel}`;
        } else if (isExternal) {
          formattedLabel = `[USB Externa] ${rawLabel}`;
        } else if (isInternal) {
          formattedLabel = `[Integrada Notebook] ${rawLabel}`;
        }

        return {
          deviceId: device.deviceId,
          label: formattedLabel,
          isExternal,
          isCaptureCard: isCapture,
          kind: device.kind,
        };
      });
    } catch (err) {
      console.error('Falha ao listar câmeras:', err);
      return [];
    }
  }

  public async pingIpCamera(url: string): Promise<{
    ok: boolean;
    latencyMs: number;
    contentType?: string;
    message?: string;
    error?: string;
  }> {
    try {
      const res = await fetch(`${API_BASE}/hardware/camera/ping-stream?url=${encodeURIComponent(url)}`);
      return await res.json();
    } catch (err: any) {
      return {
        ok: false,
        latencyMs: -1,
        error: 'Backend local indisponível para testar conexão: ' + err.message,
      };
    }
  }

  public getProxyStreamUrl(rawUrl: string): string {
    if (!rawUrl) return '';
    // If it's already an HTTP image or MJPEG, route through backend proxy for CSP/CORS compliance
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      return `${API_BASE}/hardware/camera/proxy?url=${encodeURIComponent(rawUrl)}`;
    }
    return rawUrl;
  }

  public getResolutionConstraints(res: CameraResolution): { width: number; height: number } {
    switch (res) {
      case '1080p':
        return { width: 1920, height: 1080 };
      case '720p':
        return { width: 1280, height: 720 };
      case '480p':
      default:
        return { width: 640, height: 480 };
    }
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  public onHotplug(callback: (cameras: DetectedCamera[]) => void): () => void {
    this.hotplugListeners.add(callback);
    return () => this.hotplugListeners.delete(callback);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }
}

export const hardwareConfig = new HardwareConfigService();

