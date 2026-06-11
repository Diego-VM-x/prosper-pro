'use client';

/**
 * @file deviceInfo.ts
 * @description Utilidades para detectar información del dispositivo del usuario
 * (navegador, SO, tipo) y generar un deviceId persistente.
 */

const DEVICE_ID_KEY = 'prosper_device_id';
const DEVICE_ID_V2_KEY = 'prosper_device_id_v2';

/**
 * Genera un ID determinístico basado en la huella del navegador + SO + userId.
 * Usa SHA-256 para 256 bits de entropía, evitando colisiones.
 * Cada cuenta en el mismo dispositivo tiene un ID único.
 */
async function generateDeviceFingerprint(userId?: string): Promise<string> {
  const ua = navigator.userAgent;
  const platform = navigator.platform || '';
  const language = navigator.language || '';
  const screenRes = `${screen.width}x${screen.height}`;
  const colorDepth = screen.colorDepth;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';

  const raw = `${ua}|${platform}|${language}|${screenRes}|${colorDepth}|${tz}|${userId || ''}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `dev-${hashHex.slice(0, 24)}`;
}

/**
 * Obtiene o genera el deviceId para el usuario actual.
 * @param userId - UID de Firebase (opcional). Si se proporciona, el ID es único por cuenta+dispositivo.
 */
export async function getDeviceId(userId?: string): Promise<string> {
  const storageKey = userId ? `${DEVICE_ID_V2_KEY}_${userId}` : DEVICE_ID_KEY;
  try {
    let id = localStorage.getItem(storageKey);
    if (!id) {
      id = await generateDeviceFingerprint(userId);
      localStorage.setItem(storageKey, id);
    }
    return id;
  } catch {
    return generateDeviceFingerprint(userId);
  }
}

export function clearDeviceId(userId?: string): void {
  try {
    if (userId) {
      localStorage.removeItem(`${DEVICE_ID_V2_KEY}_${userId}`);
    }
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

export async function getDeviceInfo(userId?: string) {
  const { browser, os, deviceType } = parseUA();
  return {
    deviceId: await getDeviceId(userId),
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
