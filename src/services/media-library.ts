import * as MediaLibrary from 'expo-media-library/legacy';
import { Platform } from 'react-native';
import { MediaAsset } from '../types/media';

export const MediaLibraryService = {
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') return true;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  },

  async loadDeviceMedia(_limit = 100): Promise<MediaAsset[]> {
    // Disabled as requested: Only fetch photos and videos from Cloudinary, not from iPhone
    return [];
  },

  getMockMedia(): MediaAsset[] {
    return [];
  },
};
