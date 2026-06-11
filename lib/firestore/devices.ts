import { db, doc, getDoc, updateDoc, onSnapshot } from '../firebase';
import { runTransaction } from 'firebase/firestore';
import type { UserDevice } from '@/types';

const COLLECTION = 'users';
const MAX_DEVICES = 10;

/**
 * Registra o actualiza un dispositivo en el perfil del usuario.
 * Usa transacción para evitar condiciones de carrera (TOCTOU).
 */
export async function registerDevice(
  ownerId: string,
  device: Omit<UserDevice, 'createdAt' | 'lastActive'>
): Promise<void> {
  const userRef = doc(db, COLLECTION, ownerId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(userRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const devices: UserDevice[] = (data.devices || []) as UserDevice[];
    const now = Date.now();

    const existingIndex = devices.findIndex((d) => d.deviceId === device.deviceId);

    if (existingIndex >= 0) {
      devices[existingIndex] = {
        ...devices[existingIndex],
        ...device,
        lastActive: now,
      };
    } else {
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

    transaction.update(userRef, { devices });
  });
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
 * Usa transacción para evitar condiciones de carrera.
 */
export async function removeDevice(ownerId: string, deviceId: string): Promise<void> {
  const userRef = doc(db, COLLECTION, ownerId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(userRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const devices: UserDevice[] = (data.devices || []) as UserDevice[];
    const filtered = devices.filter((d) => d.deviceId !== deviceId);

    if (filtered.length !== devices.length) {
      transaction.update(userRef, { devices: filtered });
    }
  });
}

/**
 * Actualiza el lastActive de un dispositivo específico.
 * Usa transacción para evitar condiciones de carrera.
 */
export async function updateDeviceLastActive(
  ownerId: string,
  deviceId: string
): Promise<void> {
  const userRef = doc(db, COLLECTION, ownerId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(userRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const devices: UserDevice[] = (data.devices || []) as UserDevice[];
    const index = devices.findIndex((d) => d.deviceId === deviceId);

    if (index >= 0) {
      devices[index] = { ...devices[index], lastActive: Date.now(), isOnline: true };
      transaction.update(userRef, { devices });
    }
  });
}

/**
 * Marca un dispositivo como offline (cuando cierra sesión o pierde conexión).
 * Usa transacción para evitar condiciones de carrera.
 */
export async function markDeviceOffline(
  ownerId: string,
  deviceId: string
): Promise<void> {
  const userRef = doc(db, COLLECTION, ownerId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(userRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const devices: UserDevice[] = (data.devices || []) as UserDevice[];
    const index = devices.findIndex((d) => d.deviceId === deviceId);

    if (index >= 0) {
      devices[index] = { ...devices[index], isOnline: false };
      transaction.update(userRef, { devices });
    }
  });
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
 * Establece un dispositivo como admin y remueve admin de los demás.
 * Usa transacción para evitar condiciones de carrera.
 */
export async function setAdminDevice(ownerId: string, deviceId: string): Promise<void> {
  const userRef = doc(db, COLLECTION, ownerId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(userRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const devices: UserDevice[] = (data.devices || []) as UserDevice[];

    const updated = devices.map((d) => ({
      ...d,
      isAdmin: d.deviceId === deviceId,
    }));

    transaction.update(userRef, { devices: updated });
  });
}

/**
 * Verifica si un dispositivo es el admin.
 */
export async function isAdminDevice(ownerId: string, deviceId: string): Promise<boolean> {
  const devices = await getUserDevices(ownerId);
  const device = devices.find((d) => d.deviceId === deviceId);
  return device?.isAdmin === true;
}

/**
 * Obtiene el deviceId del dispositivo admin actual.
 */
export async function getAdminDevice(ownerId: string): Promise<string | null> {
  const devices = await getUserDevices(ownerId);
  const admin = devices.find((d) => d.isAdmin === true);
  return admin?.deviceId || null;
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
    () => {
      callback([]);
    }
  );
}

/**
 * Marca un dispositivo como que solicitó transferencia de admin.
 * Usa transacción para evitar condiciones de carrera.
 */
export async function requestAdminTransfer(
  ownerId: string,
  deviceId: string
): Promise<void> {
  const userRef = doc(db, COLLECTION, ownerId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(userRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const devices: UserDevice[] = (data.devices || []) as UserDevice[];
    const index = devices.findIndex((d) => d.deviceId === deviceId);

    if (index >= 0) {
      devices[index] = {
        ...devices[index],
        adminTransferRequestedAt: Date.now(),
        adminTransferVerified: false,
      };
      transaction.update(userRef, { devices });
    }
  });
}

/**
 * Marca un dispositivo como verificado para transferencia de admin.
 * Usa transacción para evitar condiciones de carrera.
 */
export async function verifyAdminTransfer(
  ownerId: string,
  deviceId: string
): Promise<void> {
  const userRef = doc(db, COLLECTION, ownerId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(userRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const devices: UserDevice[] = (data.devices || []) as UserDevice[];
    const index = devices.findIndex((d) => d.deviceId === deviceId);

    if (index >= 0) {
      devices[index] = {
        ...devices[index],
        adminTransferVerified: true,
      };
      transaction.update(userRef, { devices });
    }
  });
}

/**
 * Cancela una solicitud de transferencia de admin.
 * Usa transacción para evitar condiciones de carrera.
 */
export async function cancelAdminTransfer(
  ownerId: string,
  deviceId: string
): Promise<void> {
  const userRef = doc(db, COLLECTION, ownerId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(userRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const devices: UserDevice[] = (data.devices || []) as UserDevice[];
    const index = devices.findIndex((d) => d.deviceId === deviceId);

    if (index >= 0) {
      devices[index] = {
        ...devices[index],
        adminTransferRequestedAt: undefined,
        adminTransferVerified: undefined,
      };
      transaction.update(userRef, { devices });
    }
  });
}
