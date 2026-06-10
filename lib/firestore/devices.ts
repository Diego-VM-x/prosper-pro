import { db, doc, getDoc, updateDoc, onSnapshot } from '../firebase';
import type { UserDevice } from '@/types';

const COLLECTION = 'users';
const MAX_DEVICES = 10;

/**
 * Registra o actualiza un dispositivo en el perfil del usuario.
 * Si el dispositivo ya existe (mismo deviceId), actualiza lastActive.
 * Si hay más de MAX_DEVICES, elimina el más antiguo.
 */
export async function registerDevice(
  ownerId: string,
  device: Omit<UserDevice, 'createdAt' | 'lastActive'>
): Promise<void> {
  const userRef = doc(db, COLLECTION, ownerId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;

  const data = snap.data();
  const devices: UserDevice[] = (data.devices || []) as UserDevice[];
  const now = Date.now();

  const existingIndex = devices.findIndex((d) => d.deviceId === device.deviceId);

  if (existingIndex >= 0) {
    // Actualizar dispositivo existente
    devices[existingIndex] = {
      ...devices[existingIndex],
      ...device,
      lastActive: now,
    };
  } else {
    // Agregar nuevo dispositivo
    devices.push({
      ...device,
      createdAt: now,
      lastActive: now,
    });
  }

  // Limpiar dispositivos antiguos si excede el límite
  if (devices.length > MAX_DEVICES) {
    devices.sort((a, b) => a.lastActive - b.lastActive);
    devices.splice(0, devices.length - MAX_DEVICES);
  }

  await updateDoc(userRef, { devices });
}

/**
 * Obtiene la lista de dispositivos del usuario.
 */
export async function getUserDevices(ownerId: string): Promise<UserDevice[]> {
  const snap = await getDoc(doc(db, COLLECTION, ownerId));
  if (!snap.exists()) return [];
  const data = snap.data();
  return (data.devices || []) as UserDevice[];
}

/**
 * Elimina un dispositivo de la lista del usuario.
 */
export async function removeDevice(ownerId: string, deviceId: string): Promise<void> {
  const userRef = doc(db, COLLECTION, ownerId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;

  const data = snap.data();
  const devices: UserDevice[] = (data.devices || []) as UserDevice[];
  const filtered = devices.filter((d) => d.deviceId !== deviceId);

  if (filtered.length !== devices.length) {
    await updateDoc(userRef, { devices: filtered });
  }
}

/**
 * Actualiza el lastActive de un dispositivo específico.
 */
export async function updateDeviceLastActive(
  ownerId: string,
  deviceId: string
): Promise<void> {
  const userRef = doc(db, COLLECTION, ownerId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;

  const data = snap.data();
  const devices: UserDevice[] = (data.devices || []) as UserDevice[];
  const index = devices.findIndex((d) => d.deviceId === deviceId);

  if (index >= 0) {
    devices[index] = { ...devices[index], lastActive: Date.now() };
    await updateDoc(userRef, { devices });
  }
}

/**
 * Verifica si un deviceId sigue estando registrado para el usuario.
 */
export async function isDeviceRegistered(
  ownerId: string,
  deviceId: string
): Promise<boolean> {
  const devices = await getUserDevices(ownerId);
  return devices.some((d) => d.deviceId === deviceId);
}

/**
 * Subscribe en tiempo real a los cambios de dispositivos del usuario.
 */
export function subscribeToDevices(
  ownerId: string,
  callback: (devices: UserDevice[]) => void
) {
  return onSnapshot(
    doc(db, COLLECTION, ownerId),
    (snap) => {
      if (!snap.exists()) {
        callback([]);
        return;
      }
      const data = snap.data();
      callback((data.devices || []) as UserDevice[]);
    },
    (error) => {
      console.error('subscribeToDevices error:', error);
      callback([]);
    }
  );
}
