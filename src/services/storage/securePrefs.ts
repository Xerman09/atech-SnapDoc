import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { ThemeMode } from '../../types/scanner';

const KEY_CONSENTED = 'snapdoc_user_consented';
const KEY_THEME_MODE = 'snapdoc_theme_mode';

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

export async function clearSecurePrefs(): Promise<void> {
  if (Platform.OS === 'web') {
    webStorageSet(KEY_CONSENTED, null);
    webStorageSet(KEY_THEME_MODE, null);
    return;
  }
  try {
    await SecureStore.deleteItemAsync(KEY_CONSENTED);
    await SecureStore.deleteItemAsync(KEY_THEME_MODE);
  } catch {
    // Best-effort cleanup
  }
}
