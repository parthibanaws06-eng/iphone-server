import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
  SafeAreaView,
  StatusBar,
  Animated as RNAnimated,
  Easing,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { MediaAsset } from '../types/media';
import { triggerHaptic } from '../utils/haptics';
import { DownloadManager } from '../services/download-manager';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface MemoryStory {
  id: string;
  title: string;
  subtitle: string;
  coverUri: string;
  items: MediaAsset[];
}

interface MemoriesReelProps {
  media: MediaAsset[];
  onOpenAsset?: (asset: MediaAsset) => void;
}

export const MemoriesReel: React.FC<MemoriesReelProps> = ({ media, onOpenAsset }) => {
  const [activeStory, setActiveStory] = useState<MemoryStory | null>(null);

  // Group media assets into intelligent memories
  const stories = useMemo<MemoryStory[]>(() => {
    if (!media || media.length === 0) return [];

    const result: MemoryStory[] = [];
    const photosOnly = media.filter((m) => m.mediaType === 'photo');
    if (photosOnly.length === 0) return [];

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();

    // 1. "On This Day" (photos from the same day/month from previous years, or oldest photos)
    const onThisDayItems = photosOnly.filter((m) => {
      const d = new Date(m.createdAt);
      return d.getMonth() === currentMonth && Math.abs(d.getDate() - currentDay) <= 3;
    });

    if (onThisDayItems.length >= 2) {
      result.push({
        id: 'on_this_day',
        title: 'On This Day',
        subtitle: `${onThisDayItems.length} moments revisited`,
        coverUri: onThisDayItems[0].uri,
        items: onThisDayItems.slice(0, 8),
      });
    }

    // 2. "Favorites Spotlight"
    const favItems = photosOnly.filter((m) => m.isFavorite);
    if (favItems.length >= 2) {
      result.push({
        id: 'favorites_spotlight',
        title: 'Favorites Rewind',
        subtitle: `${favItems.length} curated highlights`,
        coverUri: favItems[0].uri,
        items: favItems.slice(0, 10),
      });
    }

    // 3. Folder / Collection Memories (e.g. Payaldhare or Aurora or General vault)
    const folderGroups: Record<string, MediaAsset[]> = {};
    for (const item of photosOnly) {
      if (item.publicId && item.publicId.includes('/')) {
        const folder = item.publicId.split('/')[0];
        if (!folderGroups[folder]) folderGroups[folder] = [];
        folderGroups[folder].push(item);
      }
    }

    Object.entries(folderGroups).forEach(([folderName, items]) => {
      if (items.length >= 3) {
        result.push({
          id: `folder_${folderName}`,
          title: folderName.replace(/[-_]/g, ' '),
          subtitle: `${items.length} moments captured`,
          coverUri: items[0].uri,
          items: items.slice(0, 8),
        });
      }
    });

    // 4. "Recent Highlights"
    if (result.length < 3 && photosOnly.length >= 4) {
      result.push({
        id: 'recent_highlights',
        title: 'Vault Highlights',
        subtitle: 'Rediscover your memories',
        coverUri: photosOnly[0].uri,
        items: photosOnly.slice(0, 8),
      });
    }

    return result.slice(0, 6);
  }, [media]);

  if (stories.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Ionicons name="sparkles" size={17} color="#FF9500" />
          <Text style={styles.headerTitle}>Memories</Text>
        </View>
        <Text style={styles.headerSubtitle}>For You</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
      >
        {stories.map((story) => (
          <TouchableOpacity
            key={story.id}
            activeOpacity={0.88}
            onPress={() => {
              triggerHaptic('selection');
              setActiveStory(story);
            }}
            style={styles.card}
          >
            <Image
              source={{ uri: story.coverUri }}
              style={styles.cardImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
            <View style={styles.cardGradient}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {story.title}
              </Text>
              <Text style={styles.cardSubtitle} numberOfLines={1}>
                {story.subtitle}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Full-Screen Ken Burns Story Viewer Modal */}
      {activeStory && (
        <StoryViewerModal
          story={activeStory}
          onClose={() => setActiveStory(null)}
          onOpenAsset={onOpenAsset}
        />
      )}
    </View>
  );
};

// Fullscreen Ken Burns Animated Story Viewer
const StoryViewerModal: React.FC<{
  story: MemoryStory;
  onClose: () => void;
  onOpenAsset?: (asset: MediaAsset) => void;
}> = ({ story, onClose, onOpenAsset }) => {
  const [slideIndex, setSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const kenBurnsAnim = useRef(new RNAnimated.Value(1)).current;
  const progressAnim = useRef(new RNAnimated.Value(0)).current;

  const currentItem = story.items[slideIndex] || story.items[0];

  // Start Ken Burns zoom & progress bar
  useEffect(() => {
    kenBurnsAnim.setValue(1);
    progressAnim.setValue(0);

    const zoom = RNAnimated.timing(kenBurnsAnim, {
      toValue: 1.15,
      duration: 4200,
      easing: Easing.linear,
      useNativeDriver: true,
    });

    const progress = RNAnimated.timing(progressAnim, {
      toValue: 1,
      duration: 4200,
      easing: Easing.linear,
      useNativeDriver: false,
    });

    if (!isPaused) {
      zoom.start();
      progress.start(({ finished }) => {
        if (finished) {
          if (slideIndex < story.items.length - 1) {
            setSlideIndex((prev) => prev + 1);
          } else {
            onClose();
          }
        }
      });
    }

    return () => {
      zoom.stop();
      progress.stop();
    };
  }, [slideIndex, isPaused, story.items.length]);

  const handleNext = () => {
    triggerHaptic('light');
    if (slideIndex < story.items.length - 1) {
      setSlideIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    triggerHaptic('light');
    if (slideIndex > 0) {
      setSlideIndex((prev) => prev - 1);
    }
  };

  const handleSaveToDevice = async () => {
    if (!currentItem) return;
    triggerHaptic('medium');
    try {
      await DownloadManager.downloadAsset(currentItem);
      triggerHaptic('success');
      Alert.alert('Saved', 'Photo saved to device Photos app.');
    } catch (err: any) {
      Alert.alert('Download Error', err.message || 'Could not save photo.');
    }
  };

  return (
    <Modal visible={true} animationType="fade" transparent={false} onRequestClose={onClose}>
      <StatusBar barStyle="light-content" hidden={true} />
      <SafeAreaView style={styles.storyContainer}>
        {/* Ken Burns Animated Image */}
        <View style={styles.storyCanvas}>
          <RNAnimated.View
            style={[
              styles.kenBurnsWrapper,
              {
                transform: [{ scale: kenBurnsAnim }],
              },
            ]}
          >
            <Image
              source={{ uri: currentItem.uri }}
              style={styles.storyImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          </RNAnimated.View>

          {/* Left/Right Touch navigation triggers */}
          <TouchableOpacity
            style={styles.touchLeft}
            activeOpacity={1}
            onPress={handlePrev}
            onLongPress={() => setIsPaused(true)}
            onPressOut={() => setIsPaused(false)}
          />
          <TouchableOpacity
            style={styles.touchRight}
            activeOpacity={1}
            onPress={handleNext}
            onLongPress={() => setIsPaused(true)}
            onPressOut={() => setIsPaused(false)}
          />
        </View>

        {/* Top Header with Segmented Story Bars */}
        <View style={styles.storyTopBar}>
          <View style={styles.progressRow}>
            {story.items.map((_, i) => (
              <View key={i} style={styles.progressBarBg}>
                {i < slideIndex ? (
                  <View style={[styles.progressBarFill, { width: '100%' }]} />
                ) : i === slideIndex ? (
                  <RNAnimated.View
                    style={[
                      styles.progressBarFill,
                      {
                        width: progressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  />
                ) : null}
              </View>
            ))}
          </View>

          <View style={styles.storyMetaRow}>
            <View>
              <Text style={styles.storyMetaTitle}>{story.title}</Text>
              <Text style={styles.storyMetaSubtitle}>
                {slideIndex + 1} of {story.items.length}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                triggerHaptic('light');
                onClose();
              }}
              style={styles.storyCloseButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Story Floating Actions */}
        <View style={styles.storyBottomBar}>
          <TouchableOpacity
            onPress={handleSaveToDevice}
            style={styles.storyActionButton}
          >
            <Ionicons name="arrow-down-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.storyActionText}>Save Photo</Text>
          </TouchableOpacity>

          {onOpenAsset && (
            <TouchableOpacity
              onPress={() => {
                onClose();
                onOpenAsset(currentItem);
              }}
              style={styles.storyActionButton}
            >
              <Ionicons name="expand-outline" size={20} color="#FFFFFF" />
              <Text style={styles.storyActionText}>Inspect</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  scrollList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    width: 145,
    height: 200,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#1C1C1E',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 18,
  },
  cardSubtitle: {
    color: '#E5E5EA',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 3,
  },
  storyContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  storyCanvas: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  kenBurnsWrapper: {
    width: '100%',
    height: '100%',
  },
  storyImage: {
    width: '100%',
    height: '100%',
  },
  touchLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '35%',
  },
  touchRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: '65%',
  },
  storyTopBar: {
    position: 'absolute',
    top: 16,
    left: 14,
    right: 14,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 10,
  },
  progressBarBg: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  storyMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  storyMetaTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  storyMetaSubtitle: {
    color: '#E5E5EA',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  storyCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyBottomBar: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  storyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  storyActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
