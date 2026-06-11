'use client';

/**
 * @file deviceInfo.ts
 * @description Utilidades para detectar información del dispositivo del usuario
 * (navegador, SO, tipo) y generar un deviceId persistente.
 */

const DEVICE_ID_KEY = 'prosper_device_id';

/**
 * Genera un ID determinístico basado en la huella del navegador + SO.
 * Esto evita duplicados cuando el mismo dispositivo crea múltiples sesiones.
 */
function generateDeviceFingerprint(): string {
  const ua = navigator.userAgent;
  const platform = navigator.platform || '';
  const language = navigator.language || '';
  const screenRes = `${screen.width}x${screen.height}`;
  const colorDepth = screen.colorDepth;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';

  // Crear un hash simple del string combinado
  const raw = `${ua}|${platform}|${language}|${screenRes}|${colorDepth}|${tz}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convertir a 32bit
  }
  // Convertir a hex positivo y tomar los primeros 16 chars
  const hashHex = Math.abs(hash).toString(16).padStart(8, '0');
  return `dev-${hashHex}`;
}

export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = generateDeviceFingerprint();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    // Fallback si localStorage no está disponible
    return generateDeviceFingerprint();
  }
}

export function clearDeviceId(): void {
  try {
    localStorage.removeItem(DEVICE_ID_KEY);
  } catch {}
}

function parseUA(): {
  browser: string;
  os: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
} {
  const ua = navigator.userAgent;
  let browser = 'Desconocido';
  let os = 'Desconocido';
  let deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'unknown';

  // Detectar OS
  if (/Windows NT 10/.test(ua)) os = 'Windows 10/11';
  else if (/Windows NT 6\.3/.test(ua)) os = 'Windows 8.1';
  else if (/Windows NT 6\.2/.test(ua)) os = 'Windows 8';
  else if (/Windows NT 6\.1/.test(ua)) os = 'Windows 7';
  else if (/Mac OS X/.test(ua) || /macOS/.test(ua)) os = 'macOS';
  else if (/iPhone/.test(ua)) os = 'iOS';
  else if (/iPad/.test(ua)) os = 'iPadOS';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/Linux/.test(ua)) os = 'Linux';
  else if (/CrOS/.test(ua)) os = 'Chrome OS';

  // Detectar navegador
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/OPR\//.test(ua) || /Opera/.test(ua)) browser = 'Opera';
  else if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) browser = 'Chrome';
  else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = 'Safari';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/SamsungBrowser\//.test(ua)) browser = 'Samsung Internet';

  // Detectar tipo de dispositivo
  if (/iPad|Android(?!.*Mobile)|Tablet/.test(ua)) deviceType = 'tablet';
  else if (/Mobi|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/.test(ua)) deviceType = 'mobile';
  else if (/Windows|Mac|Linux|CrOS/.test(ua)) deviceType = 'desktop';

  return { browser, os, deviceType };
}

export function getDeviceInfo() {
  const { browser, os, deviceType } = parseUA();
  return {
    deviceId: getDeviceId(),
    deviceName: `${browser} en ${os}`,
    deviceType,
    browser,
    os,
  };
}

export function getDeviceIcon(deviceType: string): string {
  switch (deviceType) {
    case 'desktop': return 'Monitor';
    case 'mobile': return 'Smartphone';
    case 'tablet': return 'Tablet';
    default: return 'Cpu';
  }
}
