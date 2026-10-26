import { create } from 'zustand';
import { MediaAsset, MediaFilter } from '../types/media';
import { MediaRepository } from '../database/repositories/mediaRepository';
import { CloudinaryService } from '../services/cloudinary';
import { triggerHaptic } from '../utils/haptics';

interface LibraryState {
  media: MediaAsset[];
  filter: MediaFilter;
  selectedIds: string[];
  isSelectionMode: boolean;
  isLoading: boolean;
  activeConnectionId: string | null;
  isCloudConnected: boolean;
  cloudStatusMessage: string;

  // Actions
  loadMedia: (forceCloudSync?: boolean) => Promise<void>;
  setFilter: (filter: MediaFilter) => void;
  setSelectionMode: (enabled: boolean) => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  toggleFavorite: (id: string) => Promise<void>;
  deleteSelected: () => Promise<void>;
  moveToPrivateSelected: () => Promise<void>;
  addMediaItem: (asset: MediaAsset) => Promise<void>;
}

let activeLoadPromise: Promise<void> | null = null;

export const useLibraryStore = create<LibraryState>((set, get) => ({
  media: [],
  filter: 'all',
  selectedIds: [],
  isSelectionMode: false,
  isLoading: false,
  activeConnectionId: null,
  isCloudConnected: false,
  cloudStatusMessage: 'Checking Cloudinary connection...',

  loadMedia: async (forceCloudSync = false) => {
    if (activeLoadPromise && !forceCloudSync) {
      return activeLoadPromise;
    }

    const run = async () => {
      set({ isLoading: true });
      try {
        // 1. Load cached items from SQLite first for instant 0-latency render
        let items = await MediaRepository.getAll({
          filter: get().filter,
          includePrivate: false,
          cloudConnectionId: get().activeConnectionId || undefined,
        });

        set({ media: items });

        // 2. Determine target connections to check and sync
        const activeConnId = get().activeConnectionId;
        let targetConnections: Array<{
          id: string;
          displayName: string;
          cloudName: string;
          apiKey?: string;
          apiSecret?: string;
        }> = [];

        try {
          const { useCloudStore } = require('./useCloudStore');
          const cloudState = useCloudStore.getState();
          if (activeConnId) {
            const found = cloudState.connections.find((c: any) => c.id === activeConnId);
            if (found) targetConnections = [found];
          } else {
            targetConnections = cloudState.connections;
          }
        } catch {
          targetConnections = [
            {
              id: 'conn-personal',
              displayName: 'Personal Cloud Vault',
              cloudName: 'dri7edc3h',
              apiKey: '625297454914865',
              apiSecret: 'bv6TBu9n72Cd9R_n5zu8_wGfRmY',
            },
          ];
        }

        // 3. Fetch media from target Cloudinary accounts with progressive streaming
        let anyConnected = false;
        for (const conn of targetConnections) {
          if (!conn.cloudName) continue;
          const connCheck = await CloudinaryService.checkConnection({
            cloudName: conn.cloudName,
            apiKey: conn.apiKey,
            apiSecret: conn.apiSecret,
          });

          if (connCheck.connected) {
            anyConnected = true;
            set({
              isCloudConnected: true,
              cloudStatusMessage: `Syncing ${conn.displayName}...`,
            });

            await CloudinaryService.fetchRemoteMedia(
              {
                id: conn.id,
                cloudName: conn.cloudName,
                apiKey: conn.apiKey,
                apiSecret: conn.apiSecret,
              },
              (count, type) => {
                set({ cloudStatusMessage: `Syncing ${conn.displayName} (${count} ${type}s)...` });
              },
              async (batch) => {
                // Fast serialized transaction insert into SQLite
                await MediaRepository.upsertMany(batch);
                // Refresh visible media for the active scope
                const updated = await MediaRepository.getAll({
                  filter: get().filter,
                  includePrivate: false,
                  cloudConnectionId: get().activeConnectionId || undefined,
                });
                set({ media: updated });
              }
            );
          }
        }

        // 4. Final query to ensure all filters and counts are complete
        items = await MediaRepository.getAll({
          filter: get().filter,
          includePrivate: false,
          cloudConnectionId: get().activeConnectionId || undefined,
        });

        const activeName = activeConnId
          ? targetConnections[0]?.displayName || 'Selected Cloud'
          : 'All Accounts';

        set({
          media: items,
          isLoading: false,
          isCloudConnected: anyConnected,
          cloudStatusMessage: `${activeName} (${items.length} items)`,
        });
      } catch (error) {
        console.error('[useLibraryStore] loadMedia error:', error);
        set({ isLoading: false });
      } finally {
        activeLoadPromise = null;
      }
    };

    activeLoadPromise = run();
    return activeLoadPromise;
  },

  setFilter: (filter: MediaFilter) => {
    triggerHaptic('selection');
    set({ filter });
    get().loadMedia();
  },

  setSelectionMode: (enabled: boolean) => {
    triggerHaptic('medium');
    set({
      isSelectionMode: enabled,
      selectedIds: enabled ? get().selectedIds : [],
    });
  },

  toggleSelect: (id: string) => {
    triggerHaptic('selection');
    const { selectedIds } = get();
    const exists = selectedIds.includes(id);
    const updated = exists ? selectedIds.filter((item) => item !== id) : [...selectedIds, id];
    set({
      selectedIds: updated,
      isSelectionMode: updated.length > 0 ? true : get().isSelectionMode,
    });
  },

  selectAll: () => {
    triggerHaptic('selection');
    const allIds = get().media.map((m) => m.id);
    set({ selectedIds: allIds });
  },

  clearSelection: () => {
    set({ selectedIds: [], isSelectionMode: false });
  },

  toggleFavorite: async (id: string) => {
    triggerHaptic('light');
    const item = get().media.find((m) => m.id === id);
    if (!item) return;
    const newFavorite = !item.isFavorite;
    await MediaRepository.toggleFavorite(id, newFavorite);

    set((state) => ({
      media: state.media.map((m) => (m.id === id ? { ...m, isFavorite: newFavorite } : m)),
    }));
  },

  deleteSelected: async () => {
    const { selectedIds } = get();
    if (selectedIds.length === 0) return;
    triggerHaptic('warning');
    await MediaRepository.delete(selectedIds);
    set((state) => ({
      media: state.media.filter((m) => !selectedIds.includes(m.id)),
      selectedIds: [],
      isSelectionMode: false,
    }));
  },

  moveToPrivateSelected: async () => {
    const { selectedIds } = get();
    if (selectedIds.length === 0) return;
    triggerHaptic('success');
    await MediaRepository.setPrivateStatus(selectedIds, true);
    set((state) => ({
      media: state.media.filter((m) => !selectedIds.includes(m.id)),
      selectedIds: [],
      isSelectionMode: false,
    }));
  },

  addMediaItem: async (asset: MediaAsset) => {
    await MediaRepository.upsert(asset);
    set((state) => ({
      media: [asset, ...state.media],
    }));
  },
}));
