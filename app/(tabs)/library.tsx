import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  useColorScheme,
  Alert,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLibraryStore } from '../../src/store/useLibraryStore';
import { useCloudStore } from '../../src/store/useCloudStore';
import { MediaRepository } from '../../src/database/repositories/mediaRepository';
import { CloudAccountScopeBar } from '../../src/components/CloudAccountScopeBar';
import { MediaGrid } from '../../src/components/MediaGrid';
import { SelectionToolbar } from '../../src/components/SelectionToolbar';
import { IOSSegmentedFilter } from '../../src/components/IOSSegmentedFilter';
import { MemoriesReel } from '../../src/components/MemoriesReel';
import { MediaViewer } from '../../src/components/MediaViewer';
import { MediaAsset } from '../../src/types/media';
import { Colors } from '../../src/utils/theme';
import { triggerHaptic } from '../../src/utils/haptics';
import { DownloadManager } from '../../src/services/download-manager';

export default function LibraryScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'dark';
  const theme = Colors[scheme];

  const {
    media,
    filter,
    selectedIds,
    isSelectionMode,
    isLoading,
    isCloudConnected,
    cloudStatusMessage,
    loadMedia,
    setFilter,
    setSelectionMode,
    toggleSelect,
    selectAll,
    clearSelection,
    toggleFavorite,
    deleteSelected,
    moveToPrivateSelected,
  } = useLibraryStore();

  const {
    connections,
    activeConnection,
    isSyncing,
    setActiveConnection,
    syncCurrentConnection,
  } = useCloudStore();

  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [gridColumns, setGridColumns] = useState<number>(3);
  const [connectionCounts, setConnectionCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    MediaRepository.getCountsByCloudConnection().then(setConnectionCounts).catch(() => {});
  }, [media]);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  const handlePressItem = useCallback(
    (item: MediaAsset, index: number) => {
      if (isSelectionMode) {
        toggleSelect(item.id);
      } else {
        triggerHaptic('light');
        setViewerIndex(index);
        setViewerVisible(true);
      }
    },
    [isSelectionMode, toggleSelect]
  );

  const handleLongPressItem = useCallback(
    (item: MediaAsset) => {
      if (!isSelectionMode) {
        setSelectionMode(true);
        toggleSelect(item.id);
      }
    },
    [isSelectionMode, setSelectionMode, toggleSelect]
  );

  // Selection actions
  const handleBatchShare = async () => {
    const selectedItems = media.filter((m) => selectedIds.includes(m.id));
    if (selectedItems.length === 0) return;
    triggerHaptic('light');
    try {
      await Share.share({
        message: `Sharing ${selectedItems.length} photos from PhotoVault:\n${selectedItems
          .map((m) => m.uri)
          .join('\n')}`,
      });
    } catch {}
  };

  const handleBatchDownload = async () => {
    const selectedItems = media.filter((m) => selectedIds.includes(m.id));
    if (selectedItems.length === 0) return;
    triggerHaptic('medium');
    try {
      const res = await DownloadManager.downloadBatch(selectedItems);
      triggerHaptic('success');
      Alert.alert(
        'Download Complete',
        `${res.succeeded} items saved to your device Photos & offline vault.`
      );
      loadMedia();
    } catch (err: any) {
      Alert.alert('Download Error', err.message || 'Failed downloading some items.');
    }
  };

  const handleConfirmDelete = () => {
    Alert.alert(
      'Delete Media',
      `Are you sure you want to delete ${selectedIds.length} items from PhotoVault?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: deleteSelected },
      ]
    );
  };

  const handleConfirmPrivate = () => {
    Alert.alert(
      'Hide into Private Vault',
      `Move ${selectedIds.length} items to your protected private album? They will require Face ID / Passcode to view.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Hide', style: 'default', onPress: moveToPrivateSelected },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={[styles.largeTitle, { color: theme.label }]}>Library</Text>
          <TouchableOpacity
            onPress={() => {
              triggerHaptic('light');
              loadMedia(true);
            }}
            style={styles.connectionBadge}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isCloudConnected ? theme.systemGreen : '#FF9500' },
              ]}
            />
            <Text style={[styles.connectionText, { color: theme.secondaryLabel }]}>
              {activeConnection
                ? `${activeConnection.displayName} (${activeConnection.cloudName})`
                : `${connections.length} Clouds Connected • All Media`}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerActions}>
          {/* Grid Zoom / Column Density Toggle Button */}
          <TouchableOpacity
            onPress={() => {
              triggerHaptic('selection');
              setGridColumns((prev) => (prev === 3 ? 1 : prev === 1 ? 5 : 3));
            }}
            style={styles.iconButton}
          >
            <Ionicons
              name={
                gridColumns === 3
                  ? 'grid-outline'
                  : gridColumns === 1
                  ? 'square-outline'
                  : 'apps-outline'
              }
              size={21}
              color={theme.tint}
            />
          </TouchableOpacity>

          {/* Sync status button */}
          <TouchableOpacity
            onPress={syncCurrentConnection}
            style={styles.iconButton}
            disabled={isSyncing}
          >
            <Ionicons
              name={isSyncing ? 'sync' : 'cloud-done-outline'}
              size={22}
              color={isSyncing ? theme.tint : theme.secondaryLabel}
            />
          </TouchableOpacity>

          {/* Settings button */}
          <TouchableOpacity
            onPress={() => router.push('/settings')}
            style={styles.iconButton}
          >
            <Ionicons name="settings-outline" size={22} color={theme.label} />
          </TouchableOpacity>

          {/* Select Toggle Button */}
          <TouchableOpacity
            onPress={() => {
              if (isSelectionMode) {
                clearSelection();
              } else {
                setSelectionMode(true);
              }
            }}
            style={styles.selectButton}
          >
            <Text style={[styles.selectButtonText, { color: theme.tint }]}>
              {isSelectionMode ? 'Done' : 'Select'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Cloud Account Scope Bar (Switch between Cloudinary accounts) */}
      <CloudAccountScopeBar
        connections={connections}
        activeConnection={activeConnection}
        onSelectConnection={setActiveConnection}
        onManageAccounts={() => router.push('/settings/cloud-accounts')}
        mediaCounts={connectionCounts}
        totalCount={Object.values(connectionCounts).reduce((a, b) => a + b, 0) || media.length}
      />

      {/* Select All Row when in Selection Mode */}
      {isSelectionMode && (
        <View style={[styles.selectionBar, { borderBottomColor: theme.separator }]}>
          <TouchableOpacity onPress={selectAll}>
            <Text style={[styles.subActionText, { color: theme.tint }]}>Select All</Text>
          </TouchableOpacity>
          <Text style={[styles.selectionCount, { color: theme.secondaryLabel }]}>
            {selectedIds.length} of {media.length} Selected
          </Text>
          <TouchableOpacity onPress={clearSelection}>
            <Text style={[styles.subActionText, { color: theme.tint }]}>Deselect All</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Media Grid with Segmented Filter Header and Zoom Density */}
      <View style={styles.gridContainer}>
        <MediaGrid
          media={media}
          selectedIds={selectedIds}
          isSelectionMode={isSelectionMode}
          showAccountBadge={activeConnection === null}
          numColumns={gridColumns}
          onPressItem={handlePressItem}
          onLongPressItem={handleLongPressItem}
          onRefresh={() => loadMedia(true)}
          isRefreshing={isLoading}
          emptyMessage={
            activeConnection
              ? `No media in ${activeConnection.displayName}`
              : 'No Photos or Videos in Connected Clouds'
          }
          headerComponent={
            <View>
              {!isSelectionMode && filter === 'all' && (
                <MemoriesReel
                  media={media}
                  onOpenAsset={(asset) => {
                    const idx = media.findIndex((m) => m.id === asset.id);
                    if (idx >= 0) {
                      setViewerIndex(idx);
                      setViewerVisible(true);
                    }
                  }}
                />
              )}
              <IOSSegmentedFilter activeFilter={filter} onSelectFilter={setFilter} />
            </View>
          }
        />
      </View>

      {/* Bottom Floating Selection Toolbar */}
      {isSelectionMode && (
        <SelectionToolbar
          selectedCount={selectedIds.length}
          onShare={handleBatchShare}
          onDownload={handleBatchDownload}
          onAddToAlbum={() => router.push('/(tabs)/collections')}
          onMoveToPrivate={handleConfirmPrivate}
          onDelete={handleConfirmDelete}
          onCancel={clearSelection}
        />
      )}

      {/* Full-Screen Edge-to-Edge Media Viewer */}
      <MediaViewer
        visible={viewerVisible}
        media={media}
        initialIndex={viewerIndex}
        onClose={() => setViewerVisible(false)}
        onToggleFavorite={toggleFavorite}
        onDelete={(id) => {
          useLibraryStore.getState().deleteSelected();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  titleContainer: {
    flex: 1,
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.35,
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  connectionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 6,
  },
  selectButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  selectButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  subActionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectionCount: {
    fontSize: 13,
  },
  gridContainer: {
    flex: 1,
  },
});
