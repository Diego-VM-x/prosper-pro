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

/**
 * Obtiene la IP pública del dispositivo con timeout de 2s.
 * Nunca bloquea el login por un fetch lento.
 */
export async function getPublicIP(): Promise<string | undefined> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch('https://api.ipify.org?format=json', {
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await res.json();
    return data.ip as string;
  } catch {
    return undefined;
  }
}

const SESSION_TOKEN_KEY = 'prosper_session_token';

/**
 * Genera un nuevo sessionToken y lo guarda en localStorage.
 * Cada login genera un token único para esta sesión.
 */
export function generateSessionToken(): string {
  const token = crypto.randomUUID();
  try {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  } catch {}
  return token;
}

/**
 * Obtiene el sessionToken de la sesión actual.
 */
export function getSessionToken(): string | null {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function storeSessionToken(token: string): void {
  try {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  } catch {}
}

export function clearSessionToken(): void {
  try {
    localStorage.removeItem(SESSION_TOKEN_KEY);
  } catch {}
}

/**
 * Obtiene la info del dispositivo para login/registro.
 * Reusa el sessionToken existente o genera uno nuevo si no existe.
 */
export async function getDeviceInfo(userId?: string) {
  const { browser, os, deviceType } = parseUA();
  const [deviceId, ipAddress] = await Promise.all([
    getDeviceId(userId),
    getPublicIP(),
  ]);
  let sessionToken = getSessionToken();
  if (!sessionToken) {
    sessionToken = generateSessionToken();
  }
  return {
    deviceId,
    deviceName: `${browser} en ${os}`,
    deviceType,
    browser,
    os,
    ipAddress,
    sessionToken,
  };
}

/**
 * Obtiene la info del dispositivo para el heartbeat.
 * Reusa el sessionToken existente sin generar uno nuevo.
 */
export async function getDeviceInfoForHeartbeat(userId?: string) {
  const { browser, os, deviceType } = parseUA();
  const deviceId = await getDeviceId(userId);
  return {
    deviceId,
    deviceName: `${browser} en ${os}`,
    deviceType,
    browser,
    os,
    sessionToken: getSessionToken(),
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
