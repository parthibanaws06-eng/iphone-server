import { apiRequest } from './api';
import { MediaAsset } from '../types/media';

export interface SignedUploadParams {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder?: string;
}

export const CLOUDINARY_DEFAULT_CONFIG = {
  cloudName: 'dri7edc3h',
  apiKey: '625297454914865',
  apiSecret: 'bv6TBu9n72Cd9R_n5zu8_wGfRmY',
};

// Cross-platform Base64 encoder for Authorization header
function toBase64(input: string): string {
  if (typeof btoa === 'function') {
    try {
      return btoa(input);
    } catch {}
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let str = input;
  let output = '';
  for (
    let block = 0, charCode, idx = 0, map = chars;
    str.charAt(idx | 0) || ((map = '='), idx % 1);
    output += map.charAt(63 & (block >> (8 - (idx % 1) * 8)))
  ) {
    charCode = str.charCodeAt((idx += 3 / 4));
    if (charCode > 0xff) {
      throw new Error("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
    }
    block = (block << 8) | charCode;
  }
  return output;
}

export const CloudinaryService = {
  getOptimizedUrl(
    url: string,
    options: {
      width?: number;
      height?: number;
      crop?: string;
      quality?: string | number;
      format?: string;
      dpr?: string | number;
    } = {}
  ): string {
    if (!url || !url.includes('cloudinary.com')) {
      return url;
    }

    const transformations: string[] = [];
    if (options.width) transformations.push(`w_${options.width}`);
    if (options.height) transformations.push(`h_${options.height}`);
    if (options.crop) transformations.push(`c_${options.crop}`);
    if (options.dpr) transformations.push(`dpr_${options.dpr}`);
    transformations.push(`q_${options.quality || 'auto:best'}`);
    transformations.push(`f_${options.format || 'auto'}`);

    const transformString = transformations.join(',');
    return url.replace('/upload/', `/upload/${transformString}/`);
  },

  getHighResUrl(url: string): string {
    if (!url || !url.includes('cloudinary.com')) {
      return url;
    }
    if (url.includes('q_auto:best')) {
      return url;
    }
    return url.replace('/upload/', '/upload/q_auto:best,f_auto,dpr_auto,w_2560,c_limit/');
  },


  /**
   * 1. Check Cloudinary Connection Status
   */
  async checkConnection(credentials?: {
    cloudName?: string;
    apiKey?: string;
    apiSecret?: string;
  }): Promise<{ connected: boolean; message: string; accountName?: string }> {
    const cloudName = credentials?.cloudName || CLOUDINARY_DEFAULT_CONFIG.cloudName;
    const apiKey = credentials?.apiKey || CLOUDINARY_DEFAULT_CONFIG.apiKey;
    const apiSecret = credentials?.apiSecret || CLOUDINARY_DEFAULT_CONFIG.apiSecret;

    try {
      const auth = toBase64(`${apiKey}:${apiSecret}`);
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/ping`, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${auth}`,
        },
      });

      if (response.ok) {
        return {
          connected: true,
          message: `Connected to Cloudinary (${cloudName})`,
          accountName: cloudName,
        };
      } else {
        const text = await response.text().catch(() => '');
        return {
          connected: false,
          message: `Cloudinary returned ${response.status}: ${text || 'Authentication error'}`,
        };
      }
    } catch (err: any) {
      console.warn('[CloudinaryService] Connection check failed:', err);
      return {
        connected: false,
        message: err?.message || 'Network connection failed',
      };
    }
  },

  /**
   * 2. Fetch ALL Photos and Videos from Cloudinary with cursor pagination and progressive streaming
   */
  async fetchRemoteMedia(
    credentials?: {
      id?: string;
      cloudName?: string;
      apiKey?: string;
      apiSecret?: string;
      defaultFolder?: string;
    },
    onProgress?: (count: number, type: string) => void,
    onBatchFetched?: (batch: MediaAsset[]) => Promise<void> | void
  ): Promise<MediaAsset[]> {
    const connectionId = credentials?.id || 'conn-personal';
    const cloudName = credentials?.cloudName || CLOUDINARY_DEFAULT_CONFIG.cloudName;
    const apiKey = credentials?.apiKey || CLOUDINARY_DEFAULT_CONFIG.apiKey;
    const apiSecret = credentials?.apiSecret || CLOUDINARY_DEFAULT_CONFIG.apiSecret;

    const auth = toBase64(`${apiKey}:${apiSecret}`);
    const results: MediaAsset[] = [];

    // Helper to fetch all pages of images or videos with cursor pagination
    const fetchResources = async (
      resourceType: 'image' | 'video',
      maxPages = 25
    ): Promise<void> => {
      let nextCursor: string | undefined = undefined;
      let pageCount = 0;

      do {
        try {
          const cursorParam: string = nextCursor ? `&next_cursor=${encodeURIComponent(nextCursor)}` : '';
          const res: Response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/resources/${resourceType}?max_results=500${cursorParam}`,
            {
              headers: {
                Authorization: `Basic ${auth}`,
              },
            }
          );
          if (!res.ok) {
            console.warn(`[CloudinaryService] Failed fetching ${resourceType} page ${pageCount} from ${cloudName}: status ${res.status}`);
            break;
          }
          const data: any = await res.json();
          const items = data.resources || [];
          nextCursor = data.next_cursor;
          pageCount++;

          const pageAssets: MediaAsset[] = [];
          for (const r of items) {
            const isMockSample =
              r.public_id.startsWith('samples/') ||
              r.public_id.startsWith('cld-sample') ||
              r.public_id === 'main-sample';
            if (isMockSample) continue;

            // Filter out low-resolution preview thumbnail subdirectories (e.g. telegram_archive/thumbs/)
            // so we don't display tiny 180px thumbnail files as gallery photos
            if (r.public_id.includes('/thumbs/') || r.public_id.includes('/thumbnails/')) {
              continue;
            }

            const filename = r.public_id.split('/').pop() || r.public_id;

            if (resourceType === 'image') {
              const thumbnailUri = this.getOptimizedUrl(r.secure_url, {
                width: 720,
                height: 720,
                crop: 'fill',
                quality: 'auto:best',
                dpr: '2.0',
              });
              const highResUri = this.getHighResUrl(r.secure_url);
              pageAssets.push({
                id: `cld-${connectionId}-img-${r.asset_id || r.public_id.replace(/[^a-zA-Z0-9]/g, '_')}`,
                remoteId: r.public_id,
                cloudConnectionId: connectionId,
                cloudinaryAssetId: r.asset_id || r.public_id,
                publicId: r.public_id,
                uri: highResUri,
                thumbnailUri,
                filename,
                mediaType: 'photo',
                width: r.width || 0,
                height: r.height || 0,
                duration: 0,
                fileSize: r.bytes || 0,
                createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
                isFavorite: false,
                isDownloaded: false,
                isPrivate: false,
                downloadStatus: 'cloud_only',
                downloadProgress: 0,
              });
            } else {
              const thumbnailUri = r.secure_url.replace(/\.(mp4|mov|avi|webm)$/i, '.jpg');
              pageAssets.push({
                id: `cld-${connectionId}-vid-${r.asset_id || r.public_id.replace(/[^a-zA-Z0-9]/g, '_')}`,
                remoteId: r.public_id,
                cloudConnectionId: connectionId,
                cloudinaryAssetId: r.asset_id || r.public_id,
                publicId: r.public_id,
                uri: r.secure_url,
                thumbnailUri,
                filename,
                mediaType: 'video',
                width: r.width || 0,
                height: r.height || 0,
                duration: r.duration || 0,
                fileSize: r.bytes || 0,
                createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
                isFavorite: false,
                isDownloaded: false,
                isPrivate: false,
                downloadStatus: 'cloud_only',
                downloadProgress: 0,
              });
            }
          }

          results.push(...pageAssets);

          if (onProgress) {
            onProgress(results.length, resourceType);
          }

          // Progressively yield page for instant gallery display
          if (onBatchFetched && pageAssets.length > 0) {
            try {
              await onBatchFetched(pageAssets);
            } catch (err) {
              console.warn('[CloudinaryService] onBatchFetched callback error:', err);
            }
          }
        } catch (err) {
          console.warn(`[CloudinaryService] Error fetching ${resourceType}:`, err);
          break;
        }
      } while (nextCursor && pageCount < maxPages);
    };

    // First fetch photos page-by-page, then videos
    await fetchResources('image', 25);
    await fetchResources('video', 5);

    // Sort newest first
    results.sort((a, b) => b.createdAt - a.createdAt);
    return results;
  },

  async getSignedParameters(connectionId: string): Promise<SignedUploadParams> {
    return await apiRequest<SignedUploadParams>('/media/upload-signature', {
      method: 'POST',
      body: JSON.stringify({ connectionId }),
    });
  },

  async uploadMedia(
    fileUri: string,
    connectionId: string,
    mediaType: 'photo' | 'video' = 'photo',
    onProgress?: (progress: number) => void
  ): Promise<any> {
    const params = await this.getSignedParameters(connectionId);
    const endpoint = `https://api.cloudinary.com/v1_1/${params.cloudName}/${
      mediaType === 'video' ? 'video' : 'image'
    }/upload`;

    const formData = new FormData();
    formData.append('api_key', params.apiKey);
    formData.append('timestamp', params.timestamp.toString());
    formData.append('signature', params.signature);
    if (params.folder) formData.append('folder', params.folder);

    const filename = fileUri.split('/').pop() || `upload_${Date.now()}`;
    const match = /\.(\w+)$/.exec(filename);
    const ext = match ? match[1] : mediaType === 'video' ? 'mp4' : 'jpg';

    formData.append('file', {
      uri: fileUri,
      name: filename,
      type: mediaType === 'video' ? `video/${ext}` : `image/${ext}`,
    } as any);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', endpoint);

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            onProgress(e.loaded / e.total);
          }
        };
      }

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const result = JSON.parse(xhr.responseText);
          const registered = await apiRequest('/media/register', {
            method: 'POST',
            body: JSON.stringify({
              cloudConnectionId: connectionId,
              cloudinaryAssetId: result.asset_id,
              publicId: result.public_id,
              resourceType: result.resource_type,
              format: result.format,
              width: result.width,
              height: result.height,
              duration: result.duration || 0,
              fileSize: result.bytes,
              secureUrl: result.secure_url,
            }),
          });
          resolve(registered);
        } else {
          reject(new Error(`Cloudinary upload failed: ${xhr.responseText}`));
        }
      };

      xhr.onerror = () => reject(new Error('Cloudinary network upload error'));
      xhr.send(formData);
    });
  },
};
