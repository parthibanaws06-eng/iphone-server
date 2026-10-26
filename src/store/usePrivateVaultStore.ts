import { create } from 'zustand';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import { MediaAsset } from '../types/media';
import { MediaRepository } from '../database/repositories/mediaRepository';
import { triggerHaptic } from '../utils/haptics';

interface PrivateVaultState {
  isUnlocked: boolean;
  isAuthenticating: boolean;
  biometryType: string | null;
  privateMedia: MediaAsset[];
  lockTimeoutSeconds: number;
  lastActivityTime: number;

  // Actions
  checkBiometricSupport: () => Promise<void>;
  authenticate: () => Promise<boolean>;
  lock: () => void;
  loadPrivateMedia: () => Promise<void>;
  restoreFromPrivate: (ids: string[]) => Promise<void>;
  deletePrivateSelected: (ids: string[]) => Promise<void>;
  touchActivity: () => void;
}

export const usePrivateVaultStore = create<PrivateVaultState>((set, get) => ({
  isUnlocked: false,
  isAuthenticating: false,
  biometryType: null,
  privateMedia: [],
  lockTimeoutSeconds: 60,
  lastActivityTime: Date.now(),

  checkBiometricSupport: async () => {
    if (Platform.OS === 'web') {
      set({ biometryType: 'Passcode / Mock Biometrics' });
      return;
    }
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        set({ biometryType: 'Device Passcode' });
        return;
      }
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        set({ biometryType: 'Face ID' });
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        set({ biometryType: 'Touch ID / Fingerprint' });
      } else {
        set({ biometryType: 'Device Passcode' });
      }
    } catch {
      set({ biometryType: 'Device Passcode' });
    }
  },

  authenticate: async (): Promise<boolean> => {
    set({ isAuthenticating: true });

    if (Platform.OS === 'web') {
      triggerHaptic('success');
      set({ isUnlocked: true, isAuthenticating: false, lastActivityTime: Date.now() });
      await get().loadPrivateMedia();
      return true;
    }

    try {
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock PhotoVault Private Vault',
        fallbackLabel: 'Use Device Passcode',
        disableDeviceFallback: false,
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        triggerHaptic('success');
        set({
          isUnlocked: true,
          isAuthenticating: false,
          lastActivityTime: Date.now(),
        });
        await get().loadPrivateMedia();
        return true;
      } else {
        triggerHaptic('error');
        set({ isUnlocked: false, isAuthenticating: false });
        return false;
      }
    } catch (error) {
      console.error('[PrivateVault] Authentication error:', error);
      triggerHaptic('error');
      set({ isUnlocked: false, isAuthenticating: false });
      return false;
    }
  },

  lock: () => {
    set({ isUnlocked: false, privateMedia: [] });
  },

  loadPrivateMedia: async () => {
    if (!get().isUnlocked) return;
    const items = await MediaRepository.getAll({ includePrivate: true });
    set({ privateMedia: items });
  },

  restoreFromPrivate: async (ids: string[]) => {
    if (ids.length === 0) return;
    triggerHaptic('medium');
    await MediaRepository.setPrivateStatus(ids, false);
    set((state) => ({
      privateMedia: state.privateMedia.filter((m) => !ids.includes(m.id)),
    }));
  },

  deletePrivateSelected: async (ids: string[]) => {
    if (ids.length === 0) return;
    triggerHaptic('warning');
    await MediaRepository.delete(ids);
    set((state) => ({
      privateMedia: state.privateMedia.filter((m) => !ids.includes(m.id)),
    }));
  },

  touchActivity: () => {
    set({ lastActivityTime: Date.now() });
  },
}));
