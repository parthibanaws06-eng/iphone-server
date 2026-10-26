export type MediaType = 'photo' | 'video';

export type DownloadStatus = 
  | 'cloud_only' 
  | 'queued' 
  | 'downloading' 
  | 'available' 
  | 'failed' 
  | 'paused';

export interface MediaLocation {
  latitude: number;
  longitude: number;
  placeName?: string;
}

export interface MediaAsset {
  id: string;
  remoteId?: string;
  cloudConnectionId?: string;
  cloudinaryAssetId?: string;
  publicId?: string;
  uri: string;
  thumbnailUri?: string;
  localPath?: string;
  filename: string;
  mediaType: MediaType;
  width: number;
  height: number;
  duration: number; // in seconds, 0 for photos
  fileSize: number; // in bytes
  createdAt: number; // epoch ms
  isFavorite: boolean;
  isDownloaded: boolean;
  isPrivate: boolean;
  downloadStatus: DownloadStatus;
  downloadProgress: number; // 0 to 1
  syncedAt?: number;
  location?: MediaLocation;
  tags?: string[];
  aiDescription?: string;
}

export interface Album {
  id: string;
  remoteId?: string;
  name: string;
  description?: string;
  coverAssetId?: string;
  coverUri?: string;
  mediaCount: number;
  isPrivate: boolean;
  cloudConnectionId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CloudConnection {
  id: string;
  displayName: string;
  cloudName: string;
  apiKey?: string;
  apiSecret?: string;
  defaultFolder?: string;
  color?: string;
  status: 'connected' | 'error' | 'syncing' | 'disconnected';
  lastSyncedAt?: number;
  mediaCount: number;
  storageBytes: number;
}


export interface FaceGroup {
  id: string;
  name: string;
  representativeAssetId?: string;
  representativeUri?: string;
  faceCount: number;
  createdAt: number;
}

export interface FaceEmbedding {
  id: string;
  faceGroupId?: string;
  mediaId: string;
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  embedding: number[];
}

export type MediaFilter = 
  | 'all' 
  | 'photos' 
  | 'videos' 
  | 'favorites' 
  | 'screenshots' 
  | 'recently_added' 
  | 'downloaded' 
  | 'cloud_only';

export interface StorageBreakdown {
  totalLocalBytes: number;
  offlineDownloadBytes: number;
  cacheBytes: number;
  cloudOnlyCount: number;
  downloadedCount: number;
  totalAssetsCount: number;
}
