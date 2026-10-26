import { getDatabase } from '../sqlite';
import { FaceGroup } from '../../types/media';

export const FaceRepository = {
  async getAllGroups(): Promise<FaceGroup[]> {
    const db = await getDatabase();
    try {
      const rows = await db.getAllAsync(`
        SELECT fg.*, m.uri as representative_uri
        FROM face_groups fg
        LEFT JOIN media_assets m ON fg.representative_asset_id = m.id
        ORDER BY fg.face_count DESC;
      `);

      return rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        representativeAssetId: r.representative_asset_id,
        representativeUri: r.representative_uri,
        faceCount: r.face_count,
        createdAt: r.created_at,
      }));
    } catch {
      return [];
    }
  },

  async renameGroup(id: string, newName: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('UPDATE face_groups SET name = ? WHERE id = ?;', [newName, id]);
  },

  async createGroup(group: FaceGroup): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`
      INSERT OR REPLACE INTO face_groups (id, name, representative_asset_id, face_count, created_at)
      VALUES (?, ?, ?, ?, ?);
    `, [group.id, group.name, group.representativeAssetId || null, group.faceCount, group.createdAt]);
  },

  async deleteAllFaceData(): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM face_embeddings;');
    await db.runAsync('DELETE FROM face_groups;');
  },
};
