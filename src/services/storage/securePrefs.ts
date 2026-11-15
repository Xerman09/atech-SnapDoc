import * as SecureStore from 'expo-secure-store';
import { ThemeMode } from '../../types/scanner';

const KEY_CONSENTED = 'snapdoc_user_consented';
const KEY_THEME_MODE = 'snapdoc_theme_mode';

export async function getStoredConsent(): Promise<boolean> {
  try {
    const val = await SecureStore.getItemAsync(KEY_CONSENTED);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function setStoredConsent(accepted: boolean): Promise<void> {
  try {
    if (accepted) {
      await SecureStore.setItemAsync(KEY_CONSENTED, 'true');
    } else {
      await SecureStore.deleteItemAsync(KEY_CONSENTED);
    }
  } catch {
    // Ignore if unavailable on web fallback
  }
}

export async function getStoredThemeMode(): Promise<ThemeMode | null> {
  try {
    const val = await SecureStore.getItemAsync(KEY_THEME_MODE);
    if (val === 'system' || val === 'light' || val === 'dark') {
      return val;
    }
    return null;
  } catch {
    return null;
  }
}

export async function setStoredThemeMode(mode: ThemeMode): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY_THEME_MODE, mode);
  } catch {
    // Ignore if unavailable on web fallback
  }
}

export async function clearSecurePrefs(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEY_CONSENTED);
    await SecureStore.deleteItemAsync(KEY_THEME_MODE);
  } catch {
    // Best-effort cleanup
  }
}
