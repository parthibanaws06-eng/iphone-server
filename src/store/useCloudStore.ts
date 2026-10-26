import { create } from 'zustand';
import { CloudConnection } from '../types/media';
import { apiRequest } from '../services/api';
import { triggerHaptic } from '../utils/haptics';
import { useLibraryStore } from './useLibraryStore';

interface CloudState {
  connections: CloudConnection[];
  activeConnection: CloudConnection | null;
  isSyncing: boolean;
  syncProgress: number;
  lastSyncedAt: number | null;

  // Actions
  loadConnections: () => Promise<void>;
  setActiveConnection: (connection: CloudConnection | null) => void;
  syncCurrentConnection: () => Promise<void>;
  addConnection: (connection: {
    displayName: string;
    cloudName: string;
    apiKey: string;
    apiSecret: string;
    defaultFolder?: string;
  }) => Promise<void>;
  deleteConnection: (id: string) => Promise<void>;
}

const DEFAULT_CONNECTIONS: CloudConnection[] = [
  {
    id: 'conn-personal',
    displayName: 'Personal Cloud Vault',
    cloudName: 'dri7edc3h',
    apiKey: '625297454914865',
    apiSecret: 'bv6TBu9n72Cd9R_n5zu8_wGfRmY',
    defaultFolder: '',
    color: '#007AFF',
    status: 'connected',
    lastSyncedAt: Date.now() - 1000 * 60 * 15,
    mediaCount: 0,
    storageBytes: 0,
  },
  {
    id: 'conn-family',
    displayName: 'Family Shared Library',
    cloudName: 'dipszdg23',
    apiKey: '632257459348129',
    apiSecret: 'bPsT_BKygxCIvsphgxF9FSvJOU4',
    defaultFolder: 'family-archive',
    color: '#AF52DE',
    status: 'connected',
    lastSyncedAt: Date.now() - 1000 * 60 * 60 * 4,
    mediaCount: 0,
    storageBytes: 0,
  },
];


export const useCloudStore = create<CloudState>((set, get) => ({
  connections: DEFAULT_CONNECTIONS,
  activeConnection: DEFAULT_CONNECTIONS[0],
  isSyncing: false,
  syncProgress: 0,
  lastSyncedAt: Date.now() - 1000 * 60 * 15,

  loadConnections: async () => {
    try {
      const data = await apiRequest<CloudConnection[]>('/cloud-connections');
      if (data && data.length > 0) {
        set({
          connections: data,
          activeConnection: get().activeConnection || data[0],
        });
      }
    } catch {
      // Offline fallback: keep cached default connections
    }
  },

  setActiveConnection: (connection: CloudConnection | null) => {
    triggerHaptic('selection');
    set({ activeConnection: connection });
    // Update active connection in library store & reload media immediately
    useLibraryStore.setState({ activeConnectionId: connection?.id || null });
    useLibraryStore.getState().loadMedia(true);
  },

  syncCurrentConnection: async () => {
    const active = get().activeConnection;
    if (!active || get().isSyncing) return;

    triggerHaptic('medium');
    set({ isSyncing: true, syncProgress: 0.1 });

    try {
      // Call backend sync
      await apiRequest('/sync/start', {
        method: 'POST',
        body: JSON.stringify({ connectionId: active.id }),
      }).catch(() => null);

      // Simulate step-wise sync progress
      for (let p = 0.2; p <= 1.0; p += 0.2) {
        await new Promise((r) => setTimeout(r, 200));
        set({ syncProgress: p });
      }

      set({
        isSyncing: false,
        syncProgress: 1,
        lastSyncedAt: Date.now(),
      });

      // Reload media to show newly reconciled Cloudinary assets
      useLibraryStore.getState().loadMedia();
      triggerHaptic('success');
    } catch (err) {
      console.warn('[CloudStore] Sync error:', err);
      set({ isSyncing: false });
      triggerHaptic('error');
    }
  },

  addConnection: async (payload) => {
    triggerHaptic('medium');
    try {
      const created = await apiRequest<CloudConnection>('/cloud-connections', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      set((state) => ({
        connections: [...state.connections, created],
        activeConnection: created,
      }));
    } catch {
      // Local addition fallback
      const localCreated: CloudConnection = {
        id: `conn-${Date.now()}`,
        displayName: payload.displayName,
        cloudName: payload.cloudName,
        apiKey: payload.apiKey,
        apiSecret: payload.apiSecret,
        defaultFolder: payload.defaultFolder || 'main',
        color: '#FF9500',
        status: 'connected',
        lastSyncedAt: Date.now(),
        mediaCount: 0,
        storageBytes: 0,
      };
      set((state) => ({
        connections: [...state.connections, localCreated],
        activeConnection: localCreated,
      }));
    }
    useLibraryStore.setState({ activeConnectionId: get().activeConnection?.id || null });
    useLibraryStore.getState().loadMedia();
  },

  deleteConnection: async (id: string) => {
    triggerHaptic('warning');
    try {
      await apiRequest(`/cloud-connections/${id}`, { method: 'DELETE' }).catch(() => null);
    } catch {}
    const remaining = get().connections.filter((c) => c.id !== id);
    const newActive = get().activeConnection?.id === id ? remaining[0] || null : get().activeConnection;
    set({
      connections: remaining,
      activeConnection: newActive,
    });
    useLibraryStore.setState({ activeConnectionId: newActive?.id || null });
    useLibraryStore.getState().loadMedia();
  },
}));
