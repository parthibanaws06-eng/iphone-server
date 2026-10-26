export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  remote_id TEXT,
  cloud_connection_id TEXT,
  cloudinary_asset_id TEXT,
  public_id TEXT,
  uri TEXT NOT NULL,
  thumbnail_uri TEXT,
  local_path TEXT,
  filename TEXT NOT NULL,
  media_type TEXT NOT NULL, -- 'photo' | 'video'
  width INTEGER NOT NULL DEFAULT 0,
  height INTEGER NOT NULL DEFAULT 0,
  duration REAL DEFAULT 0,
  file_size INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  is_favorite INTEGER DEFAULT 0,
  is_downloaded INTEGER DEFAULT 0,
  is_private INTEGER DEFAULT 0,
  download_status TEXT DEFAULT 'cloud_only',
  download_progress REAL DEFAULT 0,
  synced_at INTEGER,
  location_lat REAL,
  location_lng REAL,
  location_name TEXT,
  tags TEXT,
  ai_description TEXT
);

CREATE INDEX IF NOT EXISTS idx_media_created_at ON media_assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_private ON media_assets(is_private);
CREATE INDEX IF NOT EXISTS idx_media_favorite ON media_assets(is_favorite);
CREATE INDEX IF NOT EXISTS idx_media_type ON media_assets(media_type);
CREATE INDEX IF NOT EXISTS idx_media_download ON media_assets(download_status);

CREATE TABLE IF NOT EXISTS albums (
  id TEXT PRIMARY KEY,
  remote_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  cover_asset_id TEXT,
  is_private INTEGER DEFAULT 0,
  cloud_connection_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS album_items (
  album_id TEXT NOT NULL,
  media_id TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  PRIMARY KEY (album_id, media_id),
  FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
  FOREIGN KEY (media_id) REFERENCES media_assets(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS face_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  representative_asset_id TEXT,
  face_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS face_embeddings (
  id TEXT PRIMARY KEY,
  face_group_id TEXT,
  media_id TEXT NOT NULL,
  box_x REAL,
  box_y REAL,
  box_w REAL,
  box_h REAL,
  embedding_json TEXT NOT NULL,
  FOREIGN KEY (media_id) REFERENCES media_assets(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cloud_connections_local (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  cloud_name TEXT NOT NULL,
  default_folder TEXT,
  status TEXT DEFAULT 'connected',
  last_synced_at INTEGER,
  media_count INTEGER DEFAULT 0,
  storage_bytes INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  media_id TEXT NOT NULL,
  cloud_connection_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at INTEGER NOT NULL
);
`;
