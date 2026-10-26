import { getDatabase } from '../sqlite';
import { MediaAsset, MediaFilter, StorageBreakdown } from '../../types/media';

const rowToAsset = (row: any): MediaAsset => ({
  id: row.id,
  remoteId: row.remote_id,
  cloudConnectionId: row.cloud_connection_id,
  cloudinaryAssetId: row.cloudinary_asset_id,
  publicId: row.public_id,
  uri: row.uri,
  thumbnailUri: row.thumbnail_uri || row.uri,
  localPath: row.local_path,
  filename: row.filename,
  mediaType: row.media_type as 'photo' | 'video',
  width: row.width,
  height: row.height,
  duration: row.duration,
  fileSize: row.file_size,
  createdAt: row.created_at,
  isFavorite: Boolean(row.is_favorite),
  isDownloaded: Boolean(row.is_downloaded),
  isPrivate: Boolean(row.is_private),
  downloadStatus: row.download_status || 'cloud_only',
  downloadProgress: row.download_progress || 0,
  syncedAt: row.synced_at,
  location: row.location_lat
    ? {
        latitude: row.location_lat,
        longitude: row.location_lng,
        placeName: row.location_name,
      }
    : undefined,
  tags: row.tags ? JSON.parse(row.tags) : undefined,
  aiDescription: row.ai_description,
});

let transactionQueue: Promise<any> = Promise.resolve();

function enqueueTransaction<T>(operation: () => Promise<T>): Promise<T> {
  const run = () => operation();
  const next = transactionQueue.then(run, run);
  transactionQueue = next.then(
    () => {},
    () => {}
  );
  return next;
}

async function executeWithRetry<T>(fn: () => Promise<T>, maxRetries = 4): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.includes('locked') || msg.includes('busy') || msg.includes('transaction')) {
        if (attempt === maxRetries) throw err;
        await new Promise((r) => setTimeout(r, 80 * attempt));
        continue;
      }
      throw err;
    }
  }
  return fn();
}

export const MediaRepository = {
  async getAll(options: {
    filter?: MediaFilter;
    includePrivate?: boolean;
    search?: string;
    cloudConnectionId?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<MediaAsset[]> {
    const db = await getDatabase();
    const conditions: string[] = [];
    const params: any[] = [];

    // Privacy isolation: Private items are NEVER returned unless explicitly requested
    if (!options.includePrivate) {
      conditions.push('is_private = 0');
    } else {
      conditions.push('is_private = 1');
    }

    if (options.cloudConnectionId) {
      conditions.push('cloud_connection_id = ?');
      params.push(options.cloudConnectionId);
    }

    if (options.filter) {
      switch (options.filter) {
        case 'photos':
          conditions.push("media_type = 'photo'");
          break;
        case 'videos':
          conditions.push("media_type = 'video'");
          break;
        case 'favorites':
          conditions.push('is_favorite = 1');
          break;
        case 'downloaded':
          conditions.push("download_status = 'available'");
          break;
        case 'cloud_only':
          conditions.push("download_status = 'cloud_only'");
          break;
        case 'screenshots':
          conditions.push("(filename LIKE '%screenshot%' OR tags LIKE '%screenshot%')");
          break;
        case 'recently_added':
          // Handled via ordering
          break;
      }
    }

    if (options.search && options.search.trim()) {
      const q = `%${options.search.trim().toLowerCase()}%`;
      conditions.push(
        '(LOWER(filename) LIKE ? OR LOWER(public_id) LIKE ? OR LOWER(location_name) LIKE ? OR LOWER(ai_description) LIKE ? OR LOWER(tags) LIKE ?)'
      );
      params.push(q, q, q, q, q);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limitClause = options.limit ? `LIMIT ${options.limit} OFFSET ${options.offset || 0}` : '';
    const sql = `SELECT * FROM media_assets ${whereClause} ORDER BY created_at DESC ${limitClause};`;

    try {
      const rows = await db.getAllAsync(sql, params);
      return rows.map(rowToAsset);
    } catch (err) {
      console.warn('[MediaRepo] Query fallback on empty database:', err);
      return [];
    }
  },

  async getById(id: string): Promise<MediaAsset | null> {
    const db = await getDatabase();
    try {
      const row = await db.getFirstAsync('SELECT * FROM media_assets WHERE id = ?;', [id]);
      return row ? rowToAsset(row) : null;
    } catch {
      return null;
    }
  },

  async upsert(asset: MediaAsset): Promise<void> {
    const db = await getDatabase();
    const sql = `
      INSERT INTO media_assets (
        id, remote_id, cloud_connection_id, cloudinary_asset_id, public_id,
        uri, thumbnail_uri, local_path, filename, media_type,
        width, height, duration, file_size, created_at,
        is_favorite, is_downloaded, is_private, download_status,
        download_progress, synced_at, location_lat, location_lng, location_name, tags, ai_description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        remote_id = excluded.remote_id,
        cloud_connection_id = excluded.cloud_connection_id,
        cloudinary_asset_id = excluded.cloudinary_asset_id,
        public_id = excluded.public_id,
        uri = excluded.uri,
        thumbnail_uri = excluded.thumbnail_uri,
        local_path = excluded.local_path,
        filename = excluded.filename,
        media_type = excluded.media_type,
        width = excluded.width,
        height = excluded.height,
        duration = excluded.duration,
        file_size = excluded.file_size,
        is_favorite = excluded.is_favorite,
        is_downloaded = excluded.is_downloaded,
        is_private = excluded.is_private,
        download_status = excluded.download_status,
        download_progress = excluded.download_progress,
        synced_at = excluded.synced_at,
        location_lat = excluded.location_lat,
        location_lng = excluded.location_lng,
        location_name = excluded.location_name,
        tags = excluded.tags,
        ai_description = excluded.ai_description;
    `;

    await db.runAsync(sql, [
      asset.id,
      asset.remoteId || null,
      asset.cloudConnectionId || null,
      asset.cloudinaryAssetId || null,
      asset.publicId || null,
      asset.uri,
      asset.thumbnailUri || asset.uri,
      asset.localPath || null,
      asset.filename,
      asset.mediaType,
      asset.width || 0,
      asset.height || 0,
      asset.duration || 0,
      asset.fileSize || 0,
      asset.createdAt,
      asset.isFavorite ? 1 : 0,
      asset.isDownloaded ? 1 : 0,
      asset.isPrivate ? 1 : 0,
      asset.downloadStatus || 'cloud_only',
      asset.downloadProgress || 0,
      asset.syncedAt || null,
      asset.location?.latitude || null,
      asset.location?.longitude || null,
      asset.location?.placeName || null,
      asset.tags ? JSON.stringify(asset.tags) : null,
      asset.aiDescription || null,
    ]);
  },

  async upsertMany(assets: MediaAsset[]): Promise<void> {
    if (!assets || assets.length === 0) return;
    const db = await getDatabase();

    const sql = `
      INSERT INTO media_assets (
        id, remote_id, cloud_connection_id, cloudinary_asset_id, public_id,
        uri, thumbnail_uri, local_path, filename, media_type,
        width, height, duration, file_size, created_at,
        is_favorite, is_downloaded, is_private, download_status,
        download_progress, synced_at, location_lat, location_lng, location_name, tags, ai_description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        remote_id = excluded.remote_id,
        cloud_connection_id = excluded.cloud_connection_id,
        cloudinary_asset_id = excluded.cloudinary_asset_id,
        public_id = excluded.public_id,
        uri = excluded.uri,
        thumbnail_uri = excluded.thumbnail_uri,
        local_path = excluded.local_path,
        filename = excluded.filename,
        media_type = excluded.media_type,
        width = excluded.width,
        height = excluded.height,
        duration = excluded.duration,
        file_size = excluded.file_size,
        is_favorite = excluded.is_favorite,
        is_downloaded = excluded.is_downloaded,
        is_private = excluded.is_private,
        download_status = excluded.download_status,
        download_progress = excluded.download_progress,
        synced_at = excluded.synced_at,
        location_lat = excluded.location_lat,
        location_lng = excluded.location_lng,
        location_name = excluded.location_name,
        tags = excluded.tags,
        ai_description = excluded.ai_description;
    `;

    return enqueueTransaction(async () => {
      const BATCH_SIZE = 100;
      for (let i = 0; i < assets.length; i += BATCH_SIZE) {
        const batch = assets.slice(i, i + BATCH_SIZE);
        await executeWithRetry(async () => {
          let transactionSucceeded = false;

          if (typeof db.withTransactionAsync === 'function') {
            try {
              await db.withTransactionAsync(async () => {
                for (const asset of batch) {
                  await db.runAsync(sql, [
                    asset.id,
                    asset.remoteId || null,
                    asset.cloudConnectionId || null,
                    asset.cloudinaryAssetId || null,
                    asset.publicId || null,
                    asset.uri,
                    asset.thumbnailUri || asset.uri,
                    asset.localPath || null,
                    asset.filename,
                    asset.mediaType,
                    asset.width || 0,
                    asset.height || 0,
                    asset.duration || 0,
                    asset.fileSize || 0,
                    asset.createdAt,
                    asset.isFavorite ? 1 : 0,
                    asset.isDownloaded ? 1 : 0,
                    asset.isPrivate ? 1 : 0,
                    asset.downloadStatus || 'cloud_only',
                    asset.downloadProgress || 0,
                    asset.syncedAt || null,
                    asset.location?.latitude || null,
                    asset.location?.longitude || null,
                    asset.location?.placeName || null,
                    asset.tags ? JSON.stringify(asset.tags) : null,
                    asset.aiDescription || null,
                  ]);
                }
              });
              transactionSucceeded = true;
            } catch (txnErr: any) {
              console.warn('[MediaRepo] Transaction error, resetting and falling back:', txnErr?.message);
              await db.execAsync('ROLLBACK;').catch(() => {});
            }
          }

          if (!transactionSucceeded) {
            for (const asset of batch) {
              await this.upsert(asset).catch(() => {});
            }
          }
        });

        // Brief 5ms yield between chunks so user clicks/actions never experience lock contention
        if (i + BATCH_SIZE < assets.length) {
          await new Promise((r) => setTimeout(r, 5));
        }
      }
    });
  },

  async toggleFavorite(id: string, isFavorite: boolean): Promise<void> {
    const db = await getDatabase();
    await executeWithRetry(async () => {
      await db.runAsync('UPDATE media_assets SET is_favorite = ? WHERE id = ?;', [
        isFavorite ? 1 : 0,
        id,
      ]);
    });
  },

  async updateDownloadStatus(
    id: string,
    status: string,
    progress: number,
    localPath?: string
  ): Promise<void> {
    const db = await getDatabase();
    await executeWithRetry(async () => {
      if (localPath) {
        await db.runAsync(
          'UPDATE media_assets SET download_status = ?, download_progress = ?, local_path = ?, is_downloaded = 1 WHERE id = ?;',
          [status, progress, localPath, id]
        );
      } else {
        await db.runAsync(
          'UPDATE media_assets SET download_status = ?, download_progress = ? WHERE id = ?;',
          [status, progress, id]
        );
      }
    });
  },

  async setPrivateStatus(ids: string[], isPrivate: boolean): Promise<void> {
    if (ids.length === 0) return;
    const db = await getDatabase();
    const placeholders = ids.map(() => '?').join(',');
    await executeWithRetry(async () => {
      await db.runAsync(
        `UPDATE media_assets SET is_private = ? WHERE id IN (${placeholders});`,
        [isPrivate ? 1 : 0, ...ids]
      );
    });
  },

  async delete(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await getDatabase();
    const placeholders = ids.map(() => '?').join(',');
    await executeWithRetry(async () => {
      await db.runAsync(`DELETE FROM media_assets WHERE id IN (${placeholders});`, ids);
    });
  },

  async purgeAllMockAndSampleData(): Promise<void> {
    const db = await getDatabase();
    try {
      await db.execAsync(`
        DELETE FROM media_assets WHERE uri LIKE '%unsplash%' OR thumbnail_uri LIKE '%unsplash%' OR id LIKE 'mock-%' OR id LIKE 'sample-%' OR id LIKE 'asset-%' OR cloudinary_asset_id LIKE 'cld-%' OR public_id LIKE '%/thumbs/%' OR public_id LIKE '%/thumbnails/%';
        DELETE FROM face_groups WHERE id LIKE 'face-%' OR id LIKE 'mock-%' OR (representative_asset_id IS NOT NULL AND representative_asset_id NOT IN (SELECT id FROM media_assets));
      `);
    } catch (e) {
      // Ignore if table not created yet
    }
  },

  async clearAllMedia(): Promise<void> {
    const db = await getDatabase();
    await db.execAsync(`
      DELETE FROM media_assets;
      DELETE FROM face_groups;
      DELETE FROM albums WHERE id NOT IN ('album-favorites');
    `);
  },

  async getStorageBreakdown(): Promise<StorageBreakdown> {
    const db = await getDatabase();
    try {
      const stats = await db.getFirstAsync(`
        SELECT 
          COUNT(*) as total_count,
          SUM(CASE WHEN download_status = 'available' THEN file_size ELSE 0 END) as downloaded_bytes,
          SUM(CASE WHEN is_downloaded = 1 THEN file_size ELSE 0 END) as local_bytes,
          SUM(CASE WHEN download_status = 'cloud_only' THEN 1 ELSE 0 END) as cloud_only_count,
          SUM(CASE WHEN download_status = 'available' THEN 1 ELSE 0 END) as downloaded_count
        FROM media_assets;
      `);

      return {
        totalLocalBytes: stats?.local_bytes || 0,
        offlineDownloadBytes: stats?.downloaded_bytes || 0,
        cacheBytes: Math.round((stats?.downloaded_bytes || 0) * 0.15), // estimated cache
        cloudOnlyCount: stats?.cloud_only_count || 0,
        downloadedCount: stats?.downloaded_count || 0,
        totalAssetsCount: stats?.total_count || 0,
      };
    } catch {
      return {
        totalLocalBytes: 0,
        offlineDownloadBytes: 0,
        cacheBytes: 0,
        cloudOnlyCount: 0,
        downloadedCount: 0,
        totalAssetsCount: 0,
      };
    }
  },

  async getMediaCounts(): Promise<{
    photos: number;
    videos: number;
    favorites: number;
    downloaded: number;
    screenshots: number;
    privateCount: number;
  }> {
    const db = await getDatabase();
    try {
      const row: any = await db.getFirstAsync(`
        SELECT 
          SUM(CASE WHEN media_type = 'photo' AND is_private = 0 THEN 1 ELSE 0 END) as photos,
          SUM(CASE WHEN media_type = 'video' AND is_private = 0 THEN 1 ELSE 0 END) as videos,
          SUM(CASE WHEN is_favorite = 1 AND is_private = 0 THEN 1 ELSE 0 END) as favorites,
          SUM(CASE WHEN (download_status = 'available' OR is_downloaded = 1) AND is_private = 0 THEN 1 ELSE 0 END) as downloaded,
          SUM(CASE WHEN (filename LIKE '%screenshot%' OR tags LIKE '%screenshot%') AND is_private = 0 THEN 1 ELSE 0 END) as screenshots,
          SUM(CASE WHEN is_private = 1 THEN 1 ELSE 0 END) as private_count
        FROM media_assets;
      `);
      return {
        photos: row?.photos || 0,
        videos: row?.videos || 0,
        favorites: row?.favorites || 0,
        downloaded: row?.downloaded || 0,
        screenshots: row?.screenshots || 0,
        privateCount: row?.private_count || 0,
      };
    } catch {
      return { photos: 0, videos: 0, favorites: 0, downloaded: 0, screenshots: 0, privateCount: 0 };
    }
  },

  async getCountsByCloudConnection(): Promise<Record<string, number>> {
    const db = await getDatabase();
    try {
      const rows: any[] = await db.getAllAsync(`
        SELECT cloud_connection_id, COUNT(*) as count
        FROM media_assets
        WHERE is_private = 0 AND cloud_connection_id IS NOT NULL
        GROUP BY cloud_connection_id;
      `);
      const map: Record<string, number> = {};
      for (const r of rows) {
        if (r.cloud_connection_id) {
          map[r.cloud_connection_id] = r.count;
        }
      }
      return map;
    } catch {
      return {};
    }
  },
};

export const mediaRepository = MediaRepository;
