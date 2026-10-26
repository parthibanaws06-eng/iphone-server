import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  useColorScheme,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Album, FaceGroup, MediaFilter } from '../../src/types/media';
import { AlbumRepository } from '../../src/database/repositories/albumRepository';
import { FaceRepository } from '../../src/database/repositories/faceRepository';
import { MediaRepository } from '../../src/database/repositories/mediaRepository';
import { useLibraryStore } from '../../src/store/useLibraryStore';
import { useCloudStore } from '../../src/store/useCloudStore';
import { AlbumCard } from '../../src/components/AlbumCard';
import { FaceGroupAvatar } from '../../src/components/FaceGroupAvatar';
import { Colors } from '../../src/utils/theme';
import { triggerHaptic } from '../../src/utils/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ALBUM_CARD_WIDTH = (SCREEN_WIDTH - 44) / 2;

export default function CollectionsScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'dark';
  const theme = Colors[scheme];

  const { activeConnection } = useCloudStore();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [faceGroups, setFaceGroups] = useState<FaceGroup[]>([]);
  const [counts, setCounts] = useState({
    photos: 0,
    videos: 0,
    favorites: 0,
    downloaded: 0,
    screenshots: 0,
    privateCount: 0,
  });
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');

  const loadData = async () => {
    try {
      const allAlbums = await AlbumRepository.getAll({
        includePrivate: false,
        cloudConnectionId: activeConnection?.id,
      });
      setAlbums(allAlbums);
      const groups = await FaceRepository.getAllGroups();
      setFaceGroups(groups);
      const c = await MediaRepository.getMediaCounts();
      setCounts(c);
    } catch (err) {
      console.warn('[Collections] Error loading collections:', err);
    }
  };

  const handleOpenMediaType = (filter: MediaFilter) => {
    triggerHaptic('selection');
    useLibraryStore.getState().setFilter(filter);
    router.push('/(tabs)/library');
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleCreateAlbum = async () => {
    if (!newAlbumName.trim()) return;
    triggerHaptic('success');
    const newAlbum: Album = {
      id: `album-${Date.now()}`,
      name: newAlbumName.trim(),
      description: '',
      mediaCount: 0,
      isPrivate: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await AlbumRepository.create(newAlbum);
    setNewAlbumName('');
    setCreateModalVisible(false);
    loadData();
  };

  const handleRenamePerson = async (id: string, newName: string) => {
    await FaceRepository.renameGroup(id, newName);
    loadData();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={[styles.largeTitle, { color: theme.label }]}>Collections</Text>
          <TouchableOpacity
            onPress={() => {
              triggerHaptic('light');
              setCreateModalVisible(true);
            }}
            style={styles.addButton}
          >
            <Ionicons name="add-circle-outline" size={28} color={theme.tint} />
          </TouchableOpacity>
        </View>

        {/* Section: People & Pets */}
        {faceGroups.length > 0 && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: theme.label }]}>People & Pets</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.secondaryLabel }]}>
                {faceGroups.length} Identified
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.peopleScroll}
            >
              {faceGroups.map((group) => (
                <FaceGroupAvatar
                  key={group.id}
                  group={group}
                  size={76}
                  onRename={handleRenamePerson}
                />
              ))}
            </ScrollView>
          </>
        )}

        {/* Section: Media Types (iOS Photos Style System Collections) */}
        <Text style={[styles.sectionTitle, { color: theme.label, marginTop: 24, marginBottom: 12 }]}>
          Media Types
        </Text>
        <View style={[styles.typesContainer, { backgroundColor: theme.secondaryBackground }]}>
          {/* Videos */}
          <TouchableOpacity
            style={styles.typeRow}
            onPress={() => handleOpenMediaType('videos')}
          >
            <View style={styles.typeLeft}>
              <Ionicons name="videocam-outline" size={22} color={theme.tint} />
              <Text style={[styles.typeText, { color: theme.label }]}>Videos</Text>
            </View>
            <View style={styles.typeRight}>
              <Text style={[styles.typeCount, { color: theme.secondaryLabel }]}>{counts.videos}</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.tertiaryLabel} />
            </View>
          </TouchableOpacity>

          <View style={[styles.separator, { backgroundColor: theme.separator }]} />

          {/* Favorites */}
          <TouchableOpacity
            style={styles.typeRow}
            onPress={() => handleOpenMediaType('favorites')}
          >
            <View style={styles.typeLeft}>
              <Ionicons name="heart-outline" size={22} color="#FF3B30" />
              <Text style={[styles.typeText, { color: theme.label }]}>Favorites</Text>
            </View>
            <View style={styles.typeRight}>
              <Text style={[styles.typeCount, { color: theme.secondaryLabel }]}>{counts.favorites}</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.tertiaryLabel} />
            </View>
          </TouchableOpacity>

          <View style={[styles.separator, { backgroundColor: theme.separator }]} />

          {/* Downloaded & Saved Offline */}
          <TouchableOpacity
            style={styles.typeRow}
            onPress={() => handleOpenMediaType('downloaded')}
          >
            <View style={styles.typeLeft}>
              <Ionicons name="checkmark-circle-outline" size={22} color="#34C759" />
              <Text style={[styles.typeText, { color: theme.label }]}>Downloaded & Saved</Text>
            </View>
            <View style={styles.typeRight}>
              <Text style={[styles.typeCount, { color: theme.secondaryLabel }]}>{counts.downloaded}</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.tertiaryLabel} />
            </View>
          </TouchableOpacity>

          <View style={[styles.separator, { backgroundColor: theme.separator }]} />

          {/* Screenshots */}
          <TouchableOpacity
            style={styles.typeRow}
            onPress={() => handleOpenMediaType('screenshots')}
          >
            <View style={styles.typeLeft}>
              <Ionicons name="phone-portrait-outline" size={22} color={theme.tint} />
              <Text style={[styles.typeText, { color: theme.label }]}>Screenshots</Text>
            </View>
            <View style={styles.typeRight}>
              <Text style={[styles.typeCount, { color: theme.secondaryLabel }]}>{counts.screenshots}</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.tertiaryLabel} />
            </View>
          </TouchableOpacity>

          <View style={[styles.separator, { backgroundColor: theme.separator }]} />

          {/* Hidden / Private */}
          <TouchableOpacity
            style={styles.typeRow}
            onPress={() => {
              triggerHaptic('selection');
              router.push('/(tabs)/private');
            }}
          >
            <View style={styles.typeLeft}>
              <Ionicons name="lock-closed-outline" size={22} color={theme.systemYellow} />
              <Text style={[styles.typeText, { color: theme.label }]}>Hidden / Private</Text>
            </View>
            <View style={styles.typeRight}>
              <Ionicons name="chevron-forward" size={18} color={theme.tertiaryLabel} />
            </View>
          </TouchableOpacity>

          <View style={[styles.separator, { backgroundColor: theme.separator }]} />

          {/* Duplicates & Storage Cleaner */}
          <TouchableOpacity
            style={styles.typeRow}
            onPress={() => {
              triggerHaptic('selection');
              router.push('/settings/offline-storage');
            }}
          >
            <View style={styles.typeLeft}>
              <Ionicons name="copy-outline" size={22} color="#FF9500" />
              <Text style={[styles.typeText, { color: theme.label }]}>Duplicates & Storage Cleaner</Text>
            </View>
            <View style={styles.typeRight}>
              <Ionicons name="chevron-forward" size={18} color={theme.tertiaryLabel} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Section: My Albums */}
        <View style={[styles.sectionHeaderRow, { marginTop: 28 }]}>
          <Text style={[styles.sectionTitle, { color: theme.label }]}>My Albums</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.secondaryLabel }]}>
            {albums.length} Albums
          </Text>
        </View>

        <View style={styles.albumsGrid}>
          {albums.map((album) => (
            <AlbumCard
              key={album.id}
              album={album}
              size={ALBUM_CARD_WIDTH}
              onPress={() => router.push(`/album/${album.id}`)}
            />
          ))}
        </View>
      </ScrollView>

      {/* Modal: Create Album */}
      <Modal
        visible={createModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.label }]}>New Album</Text>
            <Text style={[styles.modalSubtitle, { color: theme.secondaryLabel }]}>
              Enter a name for this album.
            </Text>

            <TextInput
              value={newAlbumName}
              onChangeText={setNewAlbumName}
              placeholder="Album Name"
              placeholderTextColor={theme.secondaryLabel}
              autoFocus={true}
              style={[
                styles.modalInput,
                {
                  color: theme.label,
                  backgroundColor: theme.secondaryBackground,
                  borderColor: theme.separator,
                },
              ]}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                onPress={() => setCreateModalVisible(false)}
                style={[styles.modalButton, { borderColor: theme.separator }]}
              >
                <Text style={[styles.modalButtonText, { color: theme.tint }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateAlbum}
                style={[styles.modalButton, { backgroundColor: theme.tint }]}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF', fontWeight: '700' }]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 110,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.35,
  },
  addButton: {
    padding: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    fontSize: 14,
  },
  peopleScroll: {
    paddingVertical: 4,
  },
  typesContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  typeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  typeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  typeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeCount: {
    fontSize: 15,
    fontWeight: '400',
  },
  typeText: {
    fontSize: 16,
    fontWeight: '500',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 50,
  },
  albumsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    width: '100%',
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
