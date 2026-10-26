import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { CREATE_TABLES_SQL } from './migrations';

let databaseInstance: SQLite.SQLiteDatabase | null = null;
let databasePromise: Promise<SQLite.SQLiteDatabase | any> | null = null;

// In-memory fallback for web environment
class WebSQLiteMock {
  private storage: Record<string, any[]> = {
    media_assets: [],
    albums: [],
    album_items: [],
    face_groups: [],
    face_embeddings: [],
    cloud_connections_local: [],
    sync_queue: [],
  };

  async execAsync(sql: string) {
    return;
  }
  async runAsync(sql: string, params: any[] = []) {
    return { changes: 1, lastInsertRowId: 1 };
  }
  async getAllAsync<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return [];
  }
  async getFirstAsync<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    return null;
  }
}

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase | any> => {
  if (Platform.OS === 'web') {
    if (!databaseInstance) {
      databaseInstance = new WebSQLiteMock() as any;
    }
    return databaseInstance;
  }

  if (databaseInstance) {
    return databaseInstance;
  }

  if (!databasePromise) {
    databasePromise = (async () => {
      const db = await SQLite.openDatabaseAsync('photovault.db');
      // Enable WAL mode, busy timeout, and foreign keys for high performance and integrity
      await db.execAsync('PRAGMA journal_mode = WAL;');
      await db.execAsync('PRAGMA busy_timeout = 10000;');
      await db.execAsync('PRAGMA synchronous = NORMAL;');
      await db.execAsync('PRAGMA foreign_keys = ON;');
      await db.execAsync(CREATE_TABLES_SQL);
      // Purge any previously seeded mock sample media and low-res thumbnail archives
      await db.execAsync(`
        DELETE FROM media_assets WHERE id LIKE 'mock-asset-%' OR id LIKE 'mock-%' OR id LIKE 'sample-%' OR id LIKE 'asset-%' OR cloudinary_asset_id LIKE 'cld-%' OR uri LIKE '%unsplash%' OR thumbnail_uri LIKE '%unsplash%' OR public_id LIKE '%/thumbs/%' OR public_id LIKE '%/thumbnails/%';
        DELETE FROM face_groups WHERE id LIKE 'face-%' OR id LIKE 'mock-%' OR (representative_asset_id IS NOT NULL AND representative_asset_id NOT IN (SELECT id FROM media_assets));
      `).catch(() => {});
      databaseInstance = db;
      return db;
    })().catch((err) => {
      databasePromise = null;
      throw err;
    });
  }

  return databasePromise;
};

export const initDatabase = async (): Promise<void> => {
  try {
    await getDatabase();
    console.log('[SQLite] PhotoVault database initialized and clean');
  } catch (error) {
    console.error('[SQLite] Failed to initialize database:', error);
  }
};

