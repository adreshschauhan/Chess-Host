declare global {
  interface Window {
    __APP_CONFIG__?: {
      publicUrl?: string;
    };
  }
}

export function getPublicUrl(): string {
  const fromRuntime = window.__APP_CONFIG__?.publicUrl?.trim();
  if (fromRuntime) return fromRuntime;
  return window.location.origin;
}
