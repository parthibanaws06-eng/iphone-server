import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as Network from 'expo-network';
import { Platform } from 'react-native';
import { MediaRepository } from '../database/repositories/mediaRepository';
import { MediaAsset } from '../types/media';

interface DownloadResult {
  localUri: string;
  savedToCameraRoll: boolean;
}

export const DownloadManager = {
  /**
   * Ensures the local PhotoVault storage directory exists
   */
  async ensureStorageDirectory(): Promise<string> {
    if ((Platform.OS as string) === 'web') return '/virtual-vault/';
    const baseDir = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
    const vaultDir = `${baseDir}PhotoVaultMedia/`;
    try {
      const dirInfo = await FileSystem.getInfoAsync(vaultDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(vaultDir, { intermediates: true });
      }
    } catch (e) {
      console.warn('[DownloadManager] Failed ensuring storage directory:', e);
    }
    return vaultDir;
  },

  /**
   * Download a single media asset to local vault storage & device Camera Roll
   */
  async downloadAsset(
    asset: MediaAsset,
    options: {
      wifiOnly?: boolean;
      saveToCameraRoll?: boolean;
      onProgress?: (progress: number) => void;
    } = {}
  ): Promise<DownloadResult> {
    if ((Platform.OS as string) === 'web') {
      await MediaRepository.updateDownloadStatus(asset.id, 'downloading', 0.5);
      options.onProgress?.(0.5);
      await new Promise((r) => setTimeout(r, 600));
      await MediaRepository.updateDownloadStatus(asset.id, 'available', 1, asset.uri);
      options.onProgress?.(1);
      return { localUri: asset.uri, savedToCameraRoll: false };
    }

    if (options.wifiOnly) {
      const network = await Network.getNetworkStateAsync();
      if (network.type !== Network.NetworkStateType.WIFI) {
        throw new Error('Wi-Fi only download setting enabled. Connect to Wi-Fi to proceed.');
      }
    }

    const dir = await this.ensureStorageDirectory();

    // Determine clean file extension
    let extension = asset.mediaType === 'video' ? 'mp4' : 'jpg';
    if (asset.filename && asset.filename.includes('.')) {
      const ext = asset.filename.split('.').pop()?.toLowerCase();
      if (ext && ext.length <= 5) {
        extension = ext;
      }
    } else if (asset.uri) {
      const match = asset.uri.match(/\.([a-zA-Z0-9]{3,4})(?:\?|$)/);
      if (match) {
        extension = match[1].toLowerCase();
      }
    }

    // Clean safe filename without slashes or illegal characters
    const safeId = (asset.id || `asset_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_');
    const localDestination = `${dir}${safeId}.${extension}`;

    try {
      await MediaRepository.updateDownloadStatus(asset.id, 'downloading', 0.2);
    } catch {}
    options.onProgress?.(0.2);

    try {
      // 1. Download file to local storage directory
      const downloadResult = await FileSystem.downloadAsync(asset.uri, localDestination);
      const localUri = downloadResult.uri;

      // 2. Save directly to iOS/Android Photos Camera Roll if allowed
      let savedToCameraRoll = false;
      if (options.saveToCameraRoll !== false && (Platform.OS as string) !== 'web') {
        try {
          const { status } = await MediaLibrary.requestPermissionsAsync();
          if (status === 'granted') {
            await MediaLibrary.saveToLibraryAsync(localUri);
            savedToCameraRoll = true;
          }
        } catch (mediaLibErr) {
          console.warn('[DownloadManager] Camera Roll save warning:', mediaLibErr);
        }
      }

      // 3. Update SQLite status to available
      try {
        await MediaRepository.updateDownloadStatus(asset.id, 'available', 1.0, localUri);
      } catch (dbErr) {
        console.warn('[DownloadManager] Status update deferred:', dbErr);
      }
      options.onProgress?.(1.0);

      return { localUri, savedToCameraRoll };
    } catch (error) {
      console.error('[DownloadManager] Download failed for asset:', asset.id, error);
      try {
        await MediaRepository.updateDownloadStatus(asset.id, 'failed', 0);
      } catch {}
      throw error;
    }
  },

  /**
   * Download a batch of media assets
   */
  async downloadBatch(
    assets: MediaAsset[],
    options: {
      wifiOnly?: boolean;
      saveToCameraRoll?: boolean;
      onAssetProgress?: (id: string, progress: number) => void;
    } = {}
  ): Promise<{ succeeded: number; failed: number }> {
    let succeeded = 0;
    let failed = 0;

    for (const asset of assets) {
      try {
        await this.downloadAsset(asset, {
          wifiOnly: options.wifiOnly,
          saveToCameraRoll: options.saveToCameraRoll,
          onProgress: (p) => options.onAssetProgress?.(asset.id, p),
        });
        succeeded++;
      } catch (err) {
        failed++;
        console.warn(`[DownloadManager] Batch item failed for ${asset.filename}:`, err);
      }
    }

    return { succeeded, failed };
  },
};
