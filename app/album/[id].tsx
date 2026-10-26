import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  useColorScheme,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Album, MediaAsset } from '../../src/types/media';
import { AlbumRepository } from '../../src/database/repositories/albumRepository';
import { MediaGrid } from '../../src/components/MediaGrid';
import { MediaViewer } from '../../src/components/MediaViewer';
import { Colors } from '../../src/utils/theme';
import { triggerHaptic } from '../../src/utils/haptics';
import { DownloadManager } from '../../src/services/download-manager';

export default function AlbumDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'dark';
  const theme = Colors[scheme];

  const [albumData, setAlbumData] = useState<{ album: Album; items: MediaAsset[] } | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const loadAlbum = async () => {
    if (!id) return;
    const data = await AlbumRepository.getById(id);
    setAlbumData(data);
  };

  useEffect(() => {
    loadAlbum();
  }, [id]);

  const handleRename = () => {
    if (!albumData) return;
    Alert.prompt
      ? Alert.prompt(
          'Rename Album',
          'Enter a new title for this album',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Rename',
              onPress: async (newName?: string) => {
                if (newName && newName.trim()) {
                  await AlbumRepository.rename(id, newName.trim());
                  loadAlbum();
                }
              },
            },
          ],
          'plain-text',
          albumData.album.name
        )
      : Alert.alert('Rename', 'Renaming album');
  };

  const handleDeleteAlbum = () => {
    Alert.alert(
      'Delete Album',
      'Are you sure you want to delete this album? The photos and videos inside will remain safely in your Library.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Album',
          style: 'destructive',
          onPress: async () => {
            triggerHaptic('warning');
            await AlbumRepository.delete(id);
            router.back();
          },
        },
      ]
    );
  };

  const handleDownloadEntireAlbum = async () => {
    if (!albumData || albumData.items.length === 0) return;
    triggerHaptic('medium');
    try {
      await DownloadManager.downloadBatch(albumData.items);
      triggerHaptic('success');
      Alert.alert('Download Complete', 'All media in this album saved for offline use.');
      loadAlbum();
    } catch {
      Alert.alert('Download Incomplete', 'Some items could not be downloaded.');
    }
  };

  if (!albumData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ title: 'Loading...' }} />
      </SafeAreaView>
    );
  }

  const { album, items } = albumData;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: album.name,
          headerRight: () => (
            <TouchableOpacity onPress={handleRename} style={{ padding: 4 }}>
              <Ionicons name="ellipsis-horizontal-circle" size={24} color={theme.tint} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.albumActionBar}>
        <TouchableOpacity
          onPress={handleDownloadEntireAlbum}
          style={[styles.albumActionBtn, { backgroundColor: theme.secondaryBackground }]}
        >
          <Ionicons name="cloud-download-outline" size={16} color={theme.tint} style={{ marginRight: 6 }} />
          <Text style={[styles.albumActionText, { color: theme.tint }]}>Download All</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleDeleteAlbum}
          style={[styles.albumActionBtn, { backgroundColor: theme.secondaryBackground }]}
        >
          <Ionicons name="trash-outline" size={16} color={theme.systemRed} style={{ marginRight: 6 }} />
          <Text style={[styles.albumActionText, { color: theme.systemRed }]}>Delete Album</Text>
        </TouchableOpacity>
      </View>

      <MediaGrid
        media={items}
        selectedIds={[]}
        isSelectionMode={false}
        onPressItem={(item, idx) => {
          triggerHaptic('light');
          setViewerIndex(idx);
          setViewerVisible(true);
        }}
        onLongPressItem={() => {}}
        emptyMessage="This album is empty"
      />

      <MediaViewer
        visible={viewerVisible}
        media={items}
        initialIndex={viewerIndex}
        onClose={() => setViewerVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  albumActionBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  albumActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  albumActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
