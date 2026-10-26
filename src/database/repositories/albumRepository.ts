import { getDatabase } from '../sqlite';
import { Album, MediaAsset } from '../../types/media';

export const AlbumRepository = {
  async getAll(options: { includePrivate?: boolean; cloudConnectionId?: string } = {}): Promise<Album[]> {
    const db = await getDatabase();
    const albums: Album[] = [];

    // 1. Load manual albums
    let where = options.includePrivate ? 'WHERE a.is_private = 1' : 'WHERE a.is_private = 0';
    if (options.cloudConnectionId) {
      where += ` AND (a.cloud_connection_id = '${options.cloudConnectionId}' OR a.cloud_connection_id IS NULL)`;
    }
    const sql = `
      SELECT 
        a.*, 
        COUNT(ai.media_id) as media_count,
        m.uri as cover_uri
      FROM albums a
      LEFT JOIN album_items ai ON a.id = ai.album_id
      LEFT JOIN media_assets m ON a.cover_asset_id = m.id
      ${where}
      GROUP BY a.id
      ORDER BY a.updated_at DESC;
    `;

    try {
      const rows = await db.getAllAsync(sql);
      albums.push(
        ...rows.map((r: any) => ({
          id: r.id,
          remoteId: r.remote_id,
          name: r.name,
          description: r.description,
          coverAssetId: r.cover_asset_id,
          coverUri: r.cover_uri,
          mediaCount: r.media_count || 0,
          isPrivate: Boolean(r.is_private),
          cloudConnectionId: r.cloud_connection_id,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }))
      );
    } catch {}

    // 2. Auto-discover Cloudinary folder albums for non-private view
    if (!options.includePrivate) {
      try {
        const connWhere = options.cloudConnectionId ? `AND cloud_connection_id = '${options.cloudConnectionId}'` : '';
        const folderRows = await db.getAllAsync(`
          SELECT 
            SUBSTR(public_id, 1, INSTR(public_id, '/') - 1) as folder_name,
            COUNT(id) as media_count,
            MAX(created_at) as latest_created,
            (SELECT thumbnail_uri FROM media_assets m2 
             WHERE m2.public_id LIKE (SUBSTR(m.public_id, 1, INSTR(m.public_id, '/') - 1) || '/%')
             ${connWhere}
             ORDER BY m2.created_at DESC LIMIT 1) as cover_uri
          FROM media_assets m
          WHERE public_id LIKE '%/%' AND is_private = 0 AND public_id NOT LIKE 'samples/%' ${connWhere}
          GROUP BY folder_name
          ORDER BY media_count DESC;
        `);

        for (const f of folderRows) {
          if (!f.folder_name) continue;
          albums.push({
            id: `cld-folder-${f.folder_name}`,
            name: f.folder_name,
            description: `Cloud Vault Album`,
            coverUri: f.cover_uri,
            mediaCount: f.media_count || 0,
            isPrivate: false,
            createdAt: f.latest_created || Date.now(),
            updatedAt: f.latest_created || Date.now(),
          });
        }
      } catch (err) {
        console.warn('[AlbumRepo] Folder auto-discovery warning:', err);
      }
    }

    return albums;
  },

  async getById(id: string): Promise<{ album: Album; items: MediaAsset[] } | null> {
    const db = await getDatabase();
    try {
      // 1. Dynamic Favorites Album
      if (id === 'album-favorites') {
        const favRows = await db.getAllAsync(`
          SELECT * FROM media_assets 
          WHERE is_favorite = 1 AND is_private = 0
          ORDER BY created_at DESC;
        `);
        const items: MediaAsset[] = favRows.map((r: any) => ({
          id: r.id,
          remoteId: r.remote_id,
          cloudConnectionId: r.cloud_connection_id,
          cloudinaryAssetId: r.cloudinary_asset_id,
          publicId: r.public_id,
          uri: r.uri,
          thumbnailUri: r.thumbnail_uri || r.uri,
          localPath: r.local_path,
          filename: r.filename,
          mediaType: r.media_type,
          width: r.width,
          height: r.height,
          duration: r.duration,
          fileSize: r.file_size,
          createdAt: r.created_at,
          isFavorite: true,
          isDownloaded: Boolean(r.is_downloaded),
          isPrivate: false,
          downloadStatus: r.download_status,
          downloadProgress: r.download_progress,
        }));

        const album: Album = {
          id: 'album-favorites',
          name: 'Favorites',
          description: 'Your favorite photos and videos',
          coverUri: items[0]?.thumbnailUri || items[0]?.uri,
          mediaCount: items.length,
          isPrivate: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        return { album, items };
      }

      // 2. Cloudinary Folder Album
      if (id.startsWith('cld-folder-')) {
        const folderName = id.replace('cld-folder-', '');
        const folderItemsRows = await db.getAllAsync(`
          SELECT * FROM media_assets 
          WHERE public_id LIKE ? AND is_private = 0
          ORDER BY created_at DESC;
        `, [`${folderName}/%`]);

        const items: MediaAsset[] = folderItemsRows.map((r: any) => ({
          id: r.id,
          remoteId: r.remote_id,
          cloudConnectionId: r.cloud_connection_id,
          cloudinaryAssetId: r.cloudinary_asset_id,
          publicId: r.public_id,
          uri: r.uri,
          thumbnailUri: r.thumbnail_uri || r.uri,
          localPath: r.local_path,
          filename: r.filename,
          mediaType: r.media_type,
          width: r.width,
          height: r.height,
          duration: r.duration,
          fileSize: r.file_size,
          createdAt: r.created_at,
          isFavorite: Boolean(r.is_favorite),
          isDownloaded: Boolean(r.is_downloaded),
          isPrivate: false,
          downloadStatus: r.download_status,
          downloadProgress: r.download_progress,
        }));

        const album: Album = {
          id,
          name: folderName,
          description: `Cloud Vault Album (${items.length} items)`,
          coverUri: items[0]?.thumbnailUri || items[0]?.uri,
          mediaCount: items.length,
          isPrivate: false,
          createdAt: items[0]?.createdAt || Date.now(),
          updatedAt: items[0]?.createdAt || Date.now(),
        };
        return { album, items };
      }

      // 3. Manual Album
      const albumRow = await db.getFirstAsync('SELECT * FROM albums WHERE id = ?;', [id]);
      if (!albumRow) return null;

      const itemsRows = await db.getAllAsync(`
        SELECT m.* FROM media_assets m
        INNER JOIN album_items ai ON m.id = ai.media_id
        WHERE ai.album_id = ?
        ORDER BY ai.sort_order ASC, m.created_at DESC;
      `, [id]);

      const items: MediaAsset[] = itemsRows.map((r: any) => ({
        id: r.id,
        remoteId: r.remote_id,
        cloudConnectionId: r.cloud_connection_id,
        cloudinaryAssetId: r.cloudinary_asset_id,
        publicId: r.public_id,
        uri: r.uri,
        thumbnailUri: r.thumbnail_uri || r.uri,
        localPath: r.local_path,
        filename: r.filename,
        mediaType: r.media_type,
        width: r.width,
        height: r.height,
        duration: r.duration,
        fileSize: r.file_size,
        createdAt: r.created_at,
        isFavorite: Boolean(r.is_favorite),
        isDownloaded: Boolean(r.is_downloaded),
        isPrivate: Boolean(r.is_private),
        downloadStatus: r.download_status,
        downloadProgress: r.download_progress,
      }));

      const album: Album = {
        id: albumRow.id,
        remoteId: albumRow.remote_id,
        name: albumRow.name,
        description: albumRow.description,
        coverAssetId: albumRow.cover_asset_id,
        coverUri: items[0]?.thumbnailUri || items[0]?.uri,
        mediaCount: items.length,
        isPrivate: Boolean(albumRow.is_private),
        cloudConnectionId: albumRow.cloud_connection_id,
        createdAt: albumRow.created_at,
        updatedAt: albumRow.updated_at,
      };

      return { album, items };
    } catch {
      return null;
    }
  },

  async create(album: Omit<Album, 'mediaCount'>): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`
      INSERT INTO albums (id, remote_id, name, description, cover_asset_id, is_private, cloud_connection_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      album.id,
      album.remoteId || null,
      album.name,
      album.description || null,
      album.coverAssetId || null,
      album.isPrivate ? 1 : 0,
      album.cloudConnectionId || null,
      album.createdAt,
      album.updatedAt,
    ]);
  },

  async rename(id: string, newName: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('UPDATE albums SET name = ?, updated_at = ? WHERE id = ?;', [
      newName,
      Date.now(),
      id,
    ]);
  },

  async addMedia(albumId: string, mediaIds: string[]): Promise<void> {
    const db = await getDatabase();
    for (let i = 0; i < mediaIds.length; i++) {
      await db.runAsync(`
        INSERT OR IGNORE INTO album_items (album_id, media_id, sort_order)
        VALUES (?, ?, ?);
      `, [albumId, mediaIds[i], i]);
    }
    // Update cover if none exists
    await db.runAsync(`
      UPDATE albums SET 
        cover_asset_id = COALESCE(cover_asset_id, ?),
        updated_at = ?
      WHERE id = ?;
    `, [mediaIds[0], Date.now(), albumId]);
  },

  async removeMedia(albumId: string, mediaIds: string[]): Promise<void> {
    const db = await getDatabase();
    const placeholders = mediaIds.map(() => '?').join(',');
    await db.runAsync(`
      DELETE FROM album_items 
      WHERE album_id = ? AND media_id IN (${placeholders});
    `, [albumId, ...mediaIds]);
  },

  async setCover(albumId: string, mediaId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('UPDATE albums SET cover_asset_id = ?, updated_at = ? WHERE id = ?;', [
      mediaId,
      Date.now(),
      albumId,
    ]);
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    // Delete album junction entries first then album record; underlying media_assets remain intact!
    await db.runAsync('DELETE FROM album_items WHERE album_id = ?;', [id]);
    await db.runAsync('DELETE FROM albums WHERE id = ?;', [id]);
  },
};
