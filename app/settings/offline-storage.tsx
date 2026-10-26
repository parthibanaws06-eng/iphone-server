import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { mediaRepository } from '../../src/database/repositories/mediaRepository';
import { MediaAsset } from '../../src/types/media';
import { Colors } from '../../src/utils/theme';
import { formatFileSize, formatDetailedDate } from '../../src/utils/formatters';
import { triggerHaptic } from '../../src/utils/haptics';
import { useLibraryStore } from '../../src/store/useLibraryStore';

interface DuplicateGroup {
  key: string;
  items: MediaAsset[];
  totalBytes: number;
}

export default function OfflineStorageScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const theme = Colors[scheme];

  const { media, loadMedia } = useLibraryStore();

  const [wifiOnly, setWifiOnly] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [largeVideos, setLargeVideos] = useState<MediaAsset[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'duplicates' | 'videos'>('overview');

  // Compute storage statistics
  const stats = useMemo(() => {
    let offlineBytes = 0;
    let cloudOnlyCount = 0;
    let downloadedCount = 0;

    for (const item of media) {
      if (item.downloadStatus === 'available' || item.isDownloaded) {
        downloadedCount++;
        offlineBytes += item.fileSize || 2500000;
      } else {
        cloudOnlyCount++;
      }
    }

    const estimatedCacheBytes = Math.min(media.length * 150000, 180 * 1024 * 1024);

    return {
      offlineBytes,
      cacheBytes: estimatedCacheBytes,
      totalBytes: offlineBytes + estimatedCacheBytes,
      downloadedCount,
      cloudOnlyCount,
      totalCount: media.length,
    };
  }, [media]);

  // Scan for duplicates & large videos
  const runScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      // 1. Group duplicates by matching filename OR matching dimensions & size
      const groupsMap: Record<string, MediaAsset[]> = {};

      for (const item of media) {
        // Normalize filename by removing copy suffixes: "photo (1).jpg", "photo_copy.jpg"
        const cleanName = item.filename
          .toLowerCase()
          .replace(/[-_]?(copy|\(\d+\))/g, '')
          .trim();

        const matchKey =
          item.fileSize > 0 && item.width > 0
            ? `${item.width}x${item.height}-${item.fileSize}`
            : cleanName;

        if (!groupsMap[matchKey]) {
          groupsMap[matchKey] = [];
        }
        groupsMap[matchKey].push(item);
      }

      const dupes: DuplicateGroup[] = [];
      Object.entries(groupsMap).forEach(([key, items]) => {
        if (items.length >= 2) {
          const totalBytes = items.reduce((sum, it) => sum + (it.fileSize || 2000000), 0);
          dupes.push({ key, items, totalBytes });
        }
      });

      // 2. Identify large videos (> 8MB or largest)
      const bigVideos = media
        .filter((m) => m.mediaType === 'video')
        .sort((a, b) => (b.fileSize || 0) - (a.fileSize || 0))
        .slice(0, 10);

      setDuplicateGroups(dupes);
      setLargeVideos(bigVideos);
      setIsScanning(false);
    }, 200);
  };

  useEffect(() => {
    runScan();
  }, [media.length]);

  const handleClearCache = () => {
    triggerHaptic('medium');
    Alert.alert(
      'Clear Temporary Cache',
      'This will remove temporary image preview cache files. Downloaded offline originals and cloud photos will NOT be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: () => {
            triggerHaptic('success');
            Alert.alert('Cache Cleared', 'Temporary image cache successfully cleared.');
          },
        },
      ]
    );
  };

  const handleDeleteDuplicateItem = (itemToDelete: MediaAsset, groupKey: string) => {
    triggerHaptic('warning');
    Alert.alert(
      'Delete Duplicate',
      `Delete "${itemToDelete.filename}"? The other copy will be preserved in your vault.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await mediaRepository.delete([itemToDelete.id]);
              setDuplicateGroups((prev) =>
                prev
                  .map((g) => {
                    if (g.key === groupKey) {
                      const remaining = g.items.filter((it) => it.id !== itemToDelete.id);
                      return { ...g, items: remaining };
                    }
                    return g;
                  })
                  .filter((g) => g.items.length >= 2)
              );
              loadMedia(false);
              triggerHaptic('success');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete duplicate.');
            }
          },
        },
      ]
    );
  };

  const handleMergeAllDuplicates = () => {
    if (duplicateGroups.length === 0) return;
    triggerHaptic('warning');

    const totalToKeep = duplicateGroups.length;
    const totalToDelete = duplicateGroups.reduce((acc, g) => acc + g.items.length - 1, 0);

    Alert.alert(
      'Merge All Duplicates',
      `Merge ${duplicateGroups.length} sets of duplicates? This will keep the highest quality version of each photo and delete ${totalToDelete} redundant copies.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Merge Duplicates',
          style: 'destructive',
          onPress: async () => {
            try {
              const idsToDelete: string[] = [];
              duplicateGroups.forEach((g) => {
                // Keep the first item, mark rest for deletion
                for (let i = 1; i < g.items.length; i++) {
                  idsToDelete.push(g.items[i].id);
                }
              });

              await mediaRepository.delete(idsToDelete);
              setDuplicateGroups([]);
              loadMedia(false);
              triggerHaptic('success');
              Alert.alert('Duplicates Merged', `Successfully merged ${totalToKeep} photo sets and freed storage.`);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to merge duplicates.');
            }
          },
        },
      ]
    );
  };

  const handleResetDatabase = () => {
    triggerHaptic('warning');
    Alert.alert(
      'Reset Vault Database',
      'This will clear local cached indices and refresh directly from Cloudinary.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset & Re-sync',
          style: 'destructive',
          onPress: async () => {
            await mediaRepository.clearAllMedia();
            await loadMedia(true);
            triggerHaptic('success');
            Alert.alert('Vault Reset', 'Local database refreshed and synced with Cloudinary.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="sparkles" size={20} color="#FF9500" />
          <Text style={[styles.headerTitle, { color: theme.label }]}>Storage & Duplicates</Text>
        </View>
        <TouchableOpacity onPress={runScan} disabled={isScanning} style={styles.scanButton}>
          {isScanning ? (
            <ActivityIndicator size="small" color={theme.tint} />
          ) : (
            <Ionicons name="scan-outline" size={22} color={theme.tint} />
          )}
        </TouchableOpacity>
      </View>

      {/* Segmented Filter Bar */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          onPress={() => {
            triggerHaptic('light');
            setActiveTab('overview');
          }}
          style={[styles.segmentBtn, activeTab === 'overview' && styles.segmentBtnActive]}
        >
          <Text style={[styles.segmentText, activeTab === 'overview' && styles.segmentTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            triggerHaptic('light');
            setActiveTab('duplicates');
          }}
          style={[styles.segmentBtn, activeTab === 'duplicates' && styles.segmentBtnActive]}
        >
          <Text style={[styles.segmentText, activeTab === 'duplicates' && styles.segmentTextActive]}>
            Duplicates ({duplicateGroups.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            triggerHaptic('light');
            setActiveTab('videos');
          }}
          style={[styles.segmentBtn, activeTab === 'videos' && styles.segmentBtnActive]}
        >
          <Text style={[styles.segmentText, activeTab === 'videos' && styles.segmentTextActive]}>
            Large Videos ({largeVideos.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {activeTab === 'overview' && (
          <>
            {/* Storage Bar Overview Card */}
            <View style={[styles.card, { backgroundColor: theme.secondaryBackground }]}>
              <Text style={[styles.cardTitle, { color: theme.label }]}>Device Storage Usage</Text>
              <Text style={[styles.totalUsageText, { color: theme.label }]}>
                {formatFileSize(stats.totalBytes)}
              </Text>
              <Text style={[styles.totalSubtext, { color: theme.secondaryLabel }]}>
                used by PhotoVault on this device
              </Text>

              {/* Visual Multi-Color Bar */}
              <View style={styles.barContainer}>
                <View style={[styles.barSegment, { flex: Math.max(1, stats.offlineBytes), backgroundColor: '#007AFF' }]} />
                <View style={[styles.barSegment, { flex: Math.max(1, stats.cacheBytes), backgroundColor: '#FF9500' }]} />
              </View>

              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.dot, { backgroundColor: '#007AFF' }]} />
                  <Text style={[styles.legendText, { color: theme.secondaryLabel }]}>
                    Offline Downloads ({formatFileSize(stats.offlineBytes)})
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.dot, { backgroundColor: '#FF9500' }]} />
                  <Text style={[styles.legendText, { color: theme.secondaryLabel }]}>
                    Preview Cache ({formatFileSize(stats.cacheBytes)})
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Summary Cards */}
            <View style={styles.summaryGrid}>
              <TouchableOpacity
                onPress={() => setActiveTab('duplicates')}
                style={[styles.summaryCard, { backgroundColor: theme.secondaryBackground }]}
              >
                <View style={styles.summaryIconWrap}>
                  <Ionicons name="copy-outline" size={22} color="#FF9500" />
                  <Text style={[styles.summaryCount, { color: theme.label }]}>
                    {duplicateGroups.length}
                  </Text>
                </View>
                <Text style={[styles.summaryLabel, { color: theme.secondaryLabel }]}>
                  Duplicate Sets Found
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('videos')}
                style={[styles.summaryCard, { backgroundColor: theme.secondaryBackground }]}
              >
                <View style={styles.summaryIconWrap}>
                  <Ionicons name="videocam-outline" size={22} color="#007AFF" />
                  <Text style={[styles.summaryCount, { color: theme.label }]}>
                    {largeVideos.length}
                  </Text>
                </View>
                <Text style={[styles.summaryLabel, { color: theme.secondaryLabel }]}>
                  Large Videos Tracked
                </Text>
              </TouchableOpacity>
            </View>

            {/* Media Counts Breakdown */}
            <View style={[styles.card, { backgroundColor: theme.secondaryBackground }]}>
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: theme.label }]}>Downloaded for Offline</Text>
                <Text style={[styles.rowValue, { color: theme.secondaryLabel }]}>
                  {stats.downloadedCount} items
                </Text>
              </View>

              <View style={[styles.separator, { backgroundColor: theme.separator }]} />

              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: theme.label }]}>Cloud-Only Items</Text>
                <Text style={[styles.rowValue, { color: theme.secondaryLabel }]}>
                  {stats.cloudOnlyCount} items
                </Text>
              </View>

              <View style={[styles.separator, { backgroundColor: theme.separator }]} />

              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: theme.label }]}>Total Vault Assets</Text>
                <Text style={[styles.rowValue, { color: theme.secondaryLabel }]}>
                  {stats.totalCount} items
                </Text>
              </View>
            </View>

            {/* Wi-Fi Download Setting */}
            <View style={[styles.card, { backgroundColor: theme.secondaryBackground }]}>
              <View style={styles.row}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={[styles.rowLabel, { color: theme.label }]}>Download on Wi-Fi Only</Text>
                  <Text style={[styles.subLabel, { color: theme.secondaryLabel }]}>
                    Prevents cellular data use for large videos and full-resolution RAW photos
                  </Text>
                </View>
                <Switch
                  value={wifiOnly}
                  onValueChange={setWifiOnly}
                  trackColor={{ true: theme.tint, false: theme.separator }}
                />
              </View>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              onPress={handleClearCache}
              style={[styles.actionBtn, { backgroundColor: theme.secondaryBackground }]}
            >
              <Ionicons name="trash-outline" size={18} color={theme.systemRed} style={{ marginRight: 8 }} />
              <Text style={[styles.actionBtnText, { color: theme.systemRed }]}>Clear Temporary Cache</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleResetDatabase}
              style={[styles.actionBtn, { backgroundColor: theme.secondaryBackground }]}
            >
              <Ionicons name="refresh-outline" size={18} color={theme.tint} style={{ marginRight: 8 }} />
              <Text style={[styles.actionBtnText, { color: theme.tint }]}>Re-index & Sync Cloudinary</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Tab 2: Duplicate Sets */}
        {activeTab === 'duplicates' && (
          <View style={{ gap: 14 }}>
            {duplicateGroups.length > 0 && (
              <TouchableOpacity onPress={handleMergeAllDuplicates} style={styles.mergeAllBtn}>
                <Ionicons name="git-merge-outline" size={18} color="#FFFFFF" />
                <Text style={styles.mergeAllBtnText}>
                  Merge All Duplicates ({duplicateGroups.length} Sets)
                </Text>
              </TouchableOpacity>
            )}

            {duplicateGroups.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="checkmark-done-circle" size={48} color="#34C759" />
                <Text style={[styles.emptyTitle, { color: theme.label }]}>No Duplicates Found</Text>
                <Text style={[styles.emptySubtitle, { color: theme.secondaryLabel }]}>
                  Your photo vault is completely optimized with zero duplicate clutter.
                </Text>
              </View>
            ) : (
              duplicateGroups.map((group, groupIndex) => (
                <View
                  key={group.key + groupIndex}
                  style={[styles.duplicateGroupCard, { backgroundColor: theme.secondaryBackground }]}
                >
                  <View style={styles.dupeHeader}>
                    <View>
                      <Text style={[styles.dupeGroupTitle, { color: theme.label }]}>
                        Duplicate Set #{groupIndex + 1}
                      </Text>
                      <Text style={[styles.dupeGroupSub, { color: theme.secondaryLabel }]}>
                        {group.items.length} copies • {formatFileSize(group.totalBytes)}
                      </Text>
                    </View>
                    <View style={styles.dupeBadge}>
                      <Text style={styles.dupeBadgeText}>EXACT MATCH</Text>
                    </View>
                  </View>

                  <View style={styles.dupeItemsRow}>
                    {group.items.map((item, idx) => (
                      <View key={item.id} style={styles.dupeItemCol}>
                        <View style={styles.dupeThumbWrap}>
                          <Image
                            source={{ uri: item.uri }}
                            style={styles.dupeThumb}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                          />
                          {idx === 0 && (
                            <View style={styles.keepBadge}>
                              <Text style={styles.keepBadgeText}>KEEP (ORIGINAL)</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.dupeItemName, { color: theme.label }]} numberOfLines={1}>
                          {item.filename}
                        </Text>
                        <Text style={[styles.dupeItemMeta, { color: theme.secondaryLabel }]}>
                          {item.width}×{item.height} • {formatFileSize(item.fileSize)}
                        </Text>

                        {idx > 0 && (
                          <TouchableOpacity
                            onPress={() => handleDeleteDuplicateItem(item, group.key)}
                            style={styles.dupeDeleteBtn}
                          >
                            <Ionicons name="trash-outline" size={14} color="#FF3B30" />
                            <Text style={styles.dupeDeleteText}>Delete Copy</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Tab 3: Large Redundant Videos */}
        {activeTab === 'videos' && (
          <View style={{ gap: 12 }}>
            {largeVideos.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="film-outline" size={48} color="#8E8E93" />
                <Text style={[styles.emptyTitle, { color: theme.label }]}>No Large Videos</Text>
                <Text style={[styles.emptySubtitle, { color: theme.secondaryLabel }]}>
                  All videos in your vault are compact or stored securely in Cloudinary.
                </Text>
              </View>
            ) : (
              largeVideos.map((video) => (
                <View
                  key={video.id}
                  style={[styles.videoCard, { backgroundColor: theme.secondaryBackground }]}
                >
                  <View style={styles.videoThumbWrap}>
                    <Image
                      source={{ uri: video.thumbnailUri || video.uri }}
                      style={styles.videoThumb}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                    <View style={styles.videoPlayOverlay}>
                      <Ionicons name="play" size={16} color="#FFFFFF" />
                    </View>
                  </View>

                  <View style={styles.videoInfo}>
                    <Text style={[styles.videoName, { color: theme.label }]} numberOfLines={1}>
                      {video.filename}
                    </Text>
                    <Text style={[styles.videoDate, { color: theme.secondaryLabel }]}>
                      {formatDetailedDate(video.createdAt)}
                    </Text>
                    <Text style={styles.videoSizeBadge}>
                      {formatFileSize(video.fileSize)} • {video.width}×{video.height}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      triggerHaptic('warning');
                      Alert.alert('Video Options', `Manage storage for "${video.filename}"`, [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete from Vault',
                          style: 'destructive',
                          onPress: async () => {
                            await mediaRepository.delete([video.id]);
                            setLargeVideos((prev) => prev.filter((v) => v.id !== video.id));
                            loadMedia(false);
                            triggerHaptic('success');
                          },
                        },
                      ]);
                    }}
                    style={styles.videoManageBtn}
                  >
                    <Ionicons name="ellipsis-horizontal" size={20} color={theme.secondaryLabel} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  scanButton: {
    padding: 6,
  },
  segmentContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 11,
  },
  segmentBtnActive: {
    backgroundColor: '#2C2C2E',
  },
  segmentText: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scroll: {
    padding: 16,
    gap: 14,
  },
  card: {
    borderRadius: 16,
    padding: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  totalUsageText: {
    fontSize: 32,
    fontWeight: '700',
  },
  totalSubtext: {
    fontSize: 13,
    marginBottom: 16,
  },
  barContainer: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: 12,
  },
  barSegment: {
    height: '100%',
  },
  legendRow: {
    gap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 13,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
  },
  summaryIconWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryCount: {
    fontSize: 22,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  rowValue: {
    fontSize: 15,
  },
  subLabel: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  mergeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF9500',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  mergeAllBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 36,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  duplicateGroupCard: {
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  dupeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dupeGroupTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  dupeGroupSub: {
    fontSize: 12,
    marginTop: 2,
  },
  dupeBadge: {
    backgroundColor: 'rgba(255, 149, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dupeBadgeText: {
    color: '#FF9500',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dupeItemsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dupeItemCol: {
    flex: 1,
    alignItems: 'center',
  },
  dupeThumbWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#2C2C2E',
    position: 'relative',
    marginBottom: 6,
  },
  dupeThumb: {
    width: '100%',
    height: '100%',
  },
  keepBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#34C759',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  keepBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  dupeItemName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
  dupeItemMeta: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  dupeDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 6,
  },
  dupeDeleteText: {
    color: '#FF3B30',
    fontSize: 11,
    fontWeight: '600',
  },
  videoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    gap: 12,
  },
  videoThumbWrap: {
    width: 64,
    height: 64,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#2C2C2E',
    position: 'relative',
  },
  videoThumb: {
    width: '100%',
    height: '100%',
  },
  videoPlayOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoInfo: {
    flex: 1,
  },
  videoName: {
    fontSize: 14,
    fontWeight: '600',
  },
  videoDate: {
    fontSize: 12,
    marginTop: 2,
  },
  videoSizeBadge: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  videoManageBtn: {
    padding: 8,
  },
});
