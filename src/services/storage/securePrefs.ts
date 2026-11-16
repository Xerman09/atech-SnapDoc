import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { NormalizedStroke, ThemeMode } from '../../types/scanner';

const KEY_CONSENTED = 'snapdoc_user_consented';
const KEY_THEME_MODE = 'snapdoc_theme_mode';
const KEY_SAVED_SIGNATURE = 'snapdoc_saved_signature';

function webStorageGet(key: string): string | null {
  try {
    return typeof globalThis.localStorage !== 'undefined'
      ? globalThis.localStorage.getItem(key)
      : null;
  } catch {
    return null;
  }
}

function webStorageSet(key: string, value: string | null): void {
  try {
    if (typeof globalThis.localStorage === 'undefined') return;
    if (value === null) {
      globalThis.localStorage.removeItem(key);
    } else {
      globalThis.localStorage.setItem(key, value);
    }
  } catch {
    // Ignore storage quota/private mode errors
  }
}

export async function getStoredConsent(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return webStorageGet(KEY_CONSENTED) === 'true';
  }
  try {
    const val = await SecureStore.getItemAsync(KEY_CONSENTED);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function setStoredConsent(accepted: boolean): Promise<void> {
  if (Platform.OS === 'web') {
    webStorageSet(KEY_CONSENTED, accepted ? 'true' : null);
    return;
  }
  try {
    if (accepted) {
      await SecureStore.setItemAsync(KEY_CONSENTED, 'true');
    } else {
      await SecureStore.deleteItemAsync(KEY_CONSENTED);
    }
  } catch {
    // Ignore if unavailable
  }
}

export async function getStoredThemeMode(): Promise<ThemeMode | null> {
  const val =
    Platform.OS === 'web'
      ? webStorageGet(KEY_THEME_MODE)
      : await SecureStore.getItemAsync(KEY_THEME_MODE).catch(() => null);

  if (val === 'system' || val === 'light' || val === 'dark') {
    return val;
  }
  return null;
}

export async function setStoredThemeMode(mode: ThemeMode): Promise<void> {
  if (Platform.OS === 'web') {
    webStorageSet(KEY_THEME_MODE, mode);
    return;
  }
  try {
    await SecureStore.setItemAsync(KEY_THEME_MODE, mode);
  } catch {
    // Ignore if unavailable
  }
}

export async function getSavedSignature(): Promise<NormalizedStroke[]> {
  try {
    const raw =
      Platform.OS === 'web'
        ? webStorageGet(KEY_SAVED_SIGNATURE)
        : await SecureStore.getItemAsync(KEY_SAVED_SIGNATURE);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as NormalizedStroke[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function setSavedSignature(strokes: NormalizedStroke[]): Promise<void> {
  const payload = strokes.length > 0 ? JSON.stringify(strokes) : null;
  if (Platform.OS === 'web') {
    webStorageSet(KEY_SAVED_SIGNATURE, payload);
    return;
  }
  try {
    if (payload) {
      await SecureStore.setItemAsync(KEY_SAVED_SIGNATURE, payload);
    } else {
      await SecureStore.deleteItemAsync(KEY_SAVED_SIGNATURE);
    }
  } catch {
    // Ignore if unavailable
  }
}

export async function clearSecurePrefs(): Promise<void> {
  if (Platform.OS === 'web') {
    webStorageSet(KEY_CONSENTED, null);
    webStorageSet(KEY_THEME_MODE, null);
    webStorageSet(KEY_SAVED_SIGNATURE, null);
    return;
  }
  try {
    await SecureStore.deleteItemAsync(KEY_CONSENTED);
    await SecureStore.deleteItemAsync(KEY_THEME_MODE);
    await SecureStore.deleteItemAsync(KEY_SAVED_SIGNATURE);
  } catch {
    // Best-effort cleanup
  }
}
