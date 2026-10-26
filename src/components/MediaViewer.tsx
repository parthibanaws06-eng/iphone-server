import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  StatusBar,
  Share,
  Alert,
  ScrollView,
  FlatList,
  Animated as RNAnimated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { MediaAsset } from '../types/media';
import { formatDetailedDate, formatFileSize, formatDuration } from '../utils/formatters';
import { triggerHaptic } from '../utils/haptics';
import { DownloadManager } from '../services/download-manager';
import { MediaViewerVideo } from './MediaViewerVideo';
import { AIPhotoEditor } from './AIPhotoEditor';
import { ExifMetadataSheet } from './ExifMetadataSheet';
import { BurstPickerModal } from './BurstPickerModal';
import { CloudinaryService } from '../services/cloudinary';

interface MediaViewerProps {
  visible: boolean;
  media: MediaAsset[];
  initialIndex: number;
  onClose: () => void;
  onToggleFavorite?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAddToAlbum?: (asset: MediaAsset) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Spring configuration for Apple iOS Photos tactile responsiveness
const springConfig = {
  damping: 20,
  stiffness: 240,
  mass: 0.8,
};

// Individual Zoomable Photo Item supporting real two-finger pinch-to-zoom and pan
const PhotoPinchPanItem: React.FC<{
  asset: MediaAsset;
  isActive: boolean;
  onToggleControls: () => void;
  onZoomChange: (zoomed: boolean) => void;
  showControls: boolean;
  onOpenBurst?: () => void;
}> = ({ asset, isActive, onToggleControls, onZoomChange, showControls, onOpenBurst }) => {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const livePulse = useSharedValue(1);

  const [isLivePlaying, setIsLivePlaying] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [currentZoomPercent, setCurrentZoomPercent] = useState(100);

  const handleSetIsZoomed = (zoomed: boolean) => {
    setIsZoomed(zoomed);
    onZoomChange(zoomed);
  };

  const updateZoomPercentJS = (s: number) => {
    setCurrentZoomPercent(Math.round(s * 100));
  };

  // Reset zoom when navigating away from this photo
  useEffect(() => {
    if (!isActive) {
      scale.value = 1;
      savedScale.value = 1;
      translateX.value = 0;
      savedTranslateX.value = 0;
      translateY.value = 0;
      savedTranslateY.value = 0;
      setIsZoomed(false);
      setCurrentZoomPercent(100);
      onZoomChange(false);
    }
  }, [isActive]);

  // 1. Two-Finger Pinch Gesture: Zoom in and zoom out smoothly
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      runOnJS(handleSetIsZoomed)(true);
    })
    .onUpdate((e) => {
      const nextScale = Math.max(0.75, Math.min(savedScale.value * e.scale, 5.0));
      scale.value = nextScale;
      runOnJS(updateZoomPercentJS)(nextScale);
    })
    .onEnd(() => {
      if (scale.value < 1.05) {
        scale.value = withSpring(1, springConfig);
        translateX.value = withSpring(0, springConfig);
        translateY.value = withSpring(0, springConfig);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        runOnJS(handleSetIsZoomed)(false);
        runOnJS(updateZoomPercentJS)(1);
      } else {
        savedScale.value = scale.value;
        const maxBoundX = (SCREEN_WIDTH * (scale.value - 1)) / 2;
        const maxBoundY = (SCREEN_HEIGHT * (scale.value - 1)) / 2;
        if (Math.abs(translateX.value) > maxBoundX) {
          translateX.value = withSpring(Math.sign(translateX.value) * maxBoundX, springConfig);
          savedTranslateX.value = Math.sign(translateX.value) * maxBoundX;
        }
        if (Math.abs(translateY.value) > maxBoundY) {
          translateY.value = withSpring(Math.sign(translateY.value) * maxBoundY, springConfig);
          savedTranslateY.value = Math.sign(translateY.value) * maxBoundY;
        }
        runOnJS(handleSetIsZoomed)(true);
      }
    });

  // 2. Two-Finger Pan Gesture: Move around simultaneously while pinching with two fingers
  const twoFingerPanGesture = Gesture.Pan()
    .minPointers(2)
    .averageTouches(true)
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      if (scale.value > 1.05) {
        const maxBoundX = (SCREEN_WIDTH * (scale.value - 1)) / 2;
        const maxBoundY = (SCREEN_HEIGHT * (scale.value - 1)) / 2;
        translateX.value = Math.max(
          -maxBoundX * 1.15,
          Math.min(maxBoundX * 1.15, savedTranslateX.value + e.translationX)
        );
        translateY.value = Math.max(
          -maxBoundY * 1.15,
          Math.min(maxBoundY * 1.15, savedTranslateY.value + e.translationY)
        );
      }
    })
    .onEnd(() => {
      if (scale.value > 1.05) {
        const maxBoundX = (SCREEN_WIDTH * (scale.value - 1)) / 2;
        const maxBoundY = (SCREEN_HEIGHT * (scale.value - 1)) / 2;
        if (Math.abs(translateX.value) > maxBoundX) {
          translateX.value = withSpring(Math.sign(translateX.value) * maxBoundX, springConfig);
          savedTranslateX.value = Math.sign(translateX.value) * maxBoundX;
        } else {
          savedTranslateX.value = translateX.value;
        }
        if (Math.abs(translateY.value) > maxBoundY) {
          translateY.value = withSpring(Math.sign(translateY.value) * maxBoundY, springConfig);
          savedTranslateY.value = Math.sign(translateY.value) * maxBoundY;
        } else {
          savedTranslateY.value = translateY.value;
        }
      }
    });

  // 3. Single-Finger Pan Gesture: Only enabled when zoomed in (> 1.05)
  // When scale == 1 (not zoomed), this is disabled so single-finger swipe smoothly flips to next/previous photo!
  const singleFingerPanGesture = Gesture.Pan()
    .minPointers(1)
    .maxPointers(1)
    .enabled(isZoomed)
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      if (scale.value > 1.05) {
        const maxBoundX = (SCREEN_WIDTH * (scale.value - 1)) / 2;
        const maxBoundY = (SCREEN_HEIGHT * (scale.value - 1)) / 2;
        translateX.value = Math.max(
          -maxBoundX * 1.15,
          Math.min(maxBoundX * 1.15, savedTranslateX.value + e.translationX)
        );
        translateY.value = Math.max(
          -maxBoundY * 1.15,
          Math.min(maxBoundY * 1.15, savedTranslateY.value + e.translationY)
        );
      }
    })
    .onEnd(() => {
      if (scale.value > 1.05) {
        const maxBoundX = (SCREEN_WIDTH * (scale.value - 1)) / 2;
        const maxBoundY = (SCREEN_HEIGHT * (scale.value - 1)) / 2;
        if (Math.abs(translateX.value) > maxBoundX) {
          translateX.value = withSpring(Math.sign(translateX.value) * maxBoundX, springConfig);
          savedTranslateX.value = Math.sign(translateX.value) * maxBoundX;
        } else {
          savedTranslateX.value = translateX.value;
        }
        if (Math.abs(translateY.value) > maxBoundY) {
          translateY.value = withSpring(Math.sign(translateY.value) * maxBoundY, springConfig);
          savedTranslateY.value = Math.sign(translateY.value) * maxBoundY;
        } else {
          savedTranslateY.value = translateY.value;
        }
      }
    });

  // 4. Double-Tap Gesture: Spring zoom 2.5x or reset to 1x
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1.2) {
        scale.value = withSpring(1, springConfig);
        translateX.value = withSpring(0, springConfig);
        translateY.value = withSpring(0, springConfig);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        runOnJS(handleSetIsZoomed)(false);
        runOnJS(updateZoomPercentJS)(1);
      } else {
        scale.value = withSpring(2.5, springConfig);
        savedScale.value = 2.5;
        runOnJS(handleSetIsZoomed)(true);
        runOnJS(updateZoomPercentJS)(2.5);
      }
    });

  // 5. Long-Press Gesture: iOS Live Photos motion preview
  const longPressGesture = Gesture.LongPress()
    .minDuration(380)
    .onStart(() => {
      runOnJS(triggerHaptic)('medium');
      runOnJS(setIsLivePlaying)(true);
      livePulse.value = withSpring(1.05, springConfig);
    })
    .onEnd(() => {
      runOnJS(setIsLivePlaying)(false);
      livePulse.value = withSpring(1, springConfig);
    });

  // 6. Single-Tap Gesture: Toggle overlay controls
  const singleTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      runOnJS(onToggleControls)();
    });

  // Compose all gestures: Two-finger pinch and pan run simultaneously!
  const composedGesture = Gesture.Simultaneous(
    pinchGesture,
    twoFingerPanGesture,
    singleFingerPanGesture,
    longPressGesture,
    Gesture.Exclusive(doubleTapGesture, singleTapGesture)
  );

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value * livePulse.value },
    ],
  }));

  const handleStepZoom = (zoomIn: boolean) => {
    triggerHaptic('light');
    const current = scale.value;
    const next = zoomIn ? Math.min(current + 0.75, 4.0) : Math.max(current - 0.75, 1.0);
    scale.value = withSpring(next, springConfig);
    savedScale.value = next;
    if (next <= 1.05) {
      translateX.value = withSpring(0, springConfig);
      translateY.value = withSpring(0, springConfig);
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      handleSetIsZoomed(false);
    } else {
      handleSetIsZoomed(true);
    }
    updateZoomPercentJS(next);
  };

  const handleResetZoom = () => {
    triggerHaptic('light');
    scale.value = withSpring(1, springConfig);
    translateX.value = withSpring(0, springConfig);
    translateY.value = withSpring(0, springConfig);
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    handleSetIsZoomed(false);
    updateZoomPercentJS(1);
  };

  return (
    <View style={styles.pageSlide}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={styles.gestureContainer}>
          <Animated.View style={[styles.animImageContainer, animatedImageStyle]}>
            <Image
              source={{ uri: CloudinaryService.getHighResUrl(asset.uri) }}
              placeholder={asset.thumbnailUri ? { uri: asset.thumbnailUri } : undefined}
              style={styles.mediaImage}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={200}
            />
          </Animated.View>
        </Animated.View>
      </GestureDetector>

      {/* iOS Live Photo and Burst Badges */}
      {showControls && (
        <View style={styles.liveBadgeWrapper}>
          <View style={[styles.liveBadge, isLivePlaying && styles.liveBadgeActive]}>
            <Ionicons
              name="radio-button-on"
              size={13}
              color={isLivePlaying ? '#FFCC00' : '#FFFFFF'}
            />
            <Text style={[styles.liveBadgeText, isLivePlaying && styles.liveBadgeTextActive]}>
              {isLivePlaying ? 'LIVE MOTION' : 'LIVE'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => {
              triggerHaptic('selection');
              onOpenBurst?.();
            }}
            style={styles.burstBadge}
          >
            <Ionicons name="copy-outline" size={13} color="#FFFFFF" />
            <Text style={styles.burstBadgeText}>Burst (5)</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Floating Zoom Controls Pill */}
      {showControls && (
        <View style={styles.zoomPillOverlay}>
          <TouchableOpacity
            onPress={() => handleStepZoom(false)}
            disabled={currentZoomPercent <= 100}
            style={[styles.zoomPillButton, currentZoomPercent <= 100 && styles.zoomPillButtonDisabled]}
          >
            <Ionicons name="remove" size={18} color={currentZoomPercent <= 100 ? '#636366' : '#FFFFFF'} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleResetZoom} style={styles.zoomPillLabelButton}>
            <Text style={styles.zoomPillText}>{currentZoomPercent}%</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleStepZoom(true)}
            disabled={currentZoomPercent >= 400}
            style={[styles.zoomPillButton, currentZoomPercent >= 400 && styles.zoomPillButtonDisabled]}
          >
            <Ionicons name="add" size={18} color={currentZoomPercent >= 400 ? '#636366' : '#FFFFFF'} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export const MediaViewer: React.FC<MediaViewerProps> = ({
  visible,
  media,
  initialIndex,
  onClose,
  onToggleFavorite,
  onDelete,
  onAddToAlbum,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showControls, setShowControls] = useState(true);
  const [showInfoSheet, setShowInfoSheet] = useState(false);
  const [showAIEditor, setShowAIEditor] = useState(false);
  const [showBurstPicker, setShowBurstPicker] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPhotoZoomed, setIsPhotoZoomed] = useState(false);

  const flatListRef = useRef<FlatList<MediaAsset>>(null);
  const controlsOpacity = useRef(new RNAnimated.Value(1)).current;

  // Synchronize index when reopened or initialIndex changes
  useEffect(() => {
    if (visible) {
      const safeIndex = Math.max(0, Math.min(initialIndex, media.length - 1));
      setCurrentIndex(safeIndex);
      setShowControls(true);
      setShowInfoSheet(false);
      setIsPhotoZoomed(false);
      controlsOpacity.setValue(1);

      setTimeout(() => {
        if (flatListRef.current && safeIndex >= 0 && safeIndex < media.length) {
          flatListRef.current.scrollToIndex({
            index: safeIndex,
            animated: false,
          });
        }
      }, 50);
    }
  }, [visible, initialIndex, media.length]);

  const toggleControls = useCallback(() => {
    triggerHaptic('light');
    const nextVal = showControls ? 0 : 1;
    setShowControls(!showControls);
    RNAnimated.timing(controlsOpacity, {
      toValue: nextVal,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [showControls, controlsOpacity]);

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offset = event.nativeEvent.contentOffset.x;
      const newIndex = Math.round(offset / SCREEN_WIDTH);
      if (newIndex >= 0 && newIndex < media.length && newIndex !== currentIndex) {
        setCurrentIndex(newIndex);
        setIsPhotoZoomed(false);
        triggerHaptic('selection');
      }
    },
    [media.length, currentIndex]
  );

  const currentAsset = media[currentIndex] || media[0];

  const handleShare = async () => {
    if (!currentAsset) return;
    triggerHaptic('light');
    try {
      await Share.share({
        url: currentAsset.uri,
        message: currentAsset.filename,
      });
    } catch {}
  };

  const handleDownload = async () => {
    if (!currentAsset) return;
    triggerHaptic('medium');
    setIsDownloading(true);
    try {
      const res = await DownloadManager.downloadAsset(currentAsset);
      triggerHaptic('success');
      if (res.savedToCameraRoll) {
        Alert.alert('Saved to Photos', 'Photo has been saved to your device Photos app and offline vault.');
      } else {
        Alert.alert('Downloaded', 'Media downloaded to offline vault.');
      }
    } catch (error: any) {
      console.error('[MediaViewer] Download failed:', error);
      triggerHaptic('error');
      Alert.alert('Download Failed', error?.message || 'Could not download media.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = () => {
    if (!currentAsset) return;
    triggerHaptic('warning');
    Alert.alert(
      'Delete Media',
      'This item will be deleted from your PhotoVault library.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete?.(currentAsset.id);
            if (media.length <= 1) {
              onClose();
            } else if (currentIndex >= media.length - 1) {
              setCurrentIndex(currentIndex - 1);
            }
          },
        },
      ]
    );
  };

  const renderMediaItem = ({ item, index }: { item: MediaAsset; index: number }) => {
    if (item.mediaType === 'video') {
      return (
        <MediaViewerVideo
          asset={item}
          isActive={index === currentIndex}
          onToggleControls={toggleControls}
        />
      );
    }

    return (
      <PhotoPinchPanItem
        asset={item}
        isActive={index === currentIndex}
        onToggleControls={toggleControls}
        onZoomChange={(zoomed) => setIsPhotoZoomed(zoomed)}
        showControls={showControls}
        onOpenBurst={() => setShowBurstPicker(true)}
      />
    );
  };

  if (!visible || !currentAsset || media.length === 0) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <StatusBar hidden={!showControls} barStyle="light-content" />
      <View style={styles.container}>
        {/* Horizontal Swiping Full-Screen Media List (scroll is disabled while actively zoomed into a photo) */}
        <FlatList
          ref={flatListRef}
          data={media}
          keyExtractor={(item) => item.id}
          horizontal={true}
          pagingEnabled={true}
          scrollEnabled={!isPhotoZoomed}
          showsHorizontalScrollIndicator={false}
          renderItem={renderMediaItem}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          initialScrollIndex={Math.min(initialIndex, Math.max(0, media.length - 1))}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({
                index: info.index,
                animated: false,
              });
            }, 50);
          }}
          windowSize={3}
          maxToRenderPerBatch={3}
          removeClippedSubviews={true}
        />

        {/* Top Header Bar with animated fade */}
        <RNAnimated.View
          style={[styles.topBar, { opacity: controlsOpacity }]}
          pointerEvents={showControls ? 'auto' : 'none'}
        >
          <SafeAreaView style={styles.topSafeArea}>
            <TouchableOpacity
              onPress={() => {
                triggerHaptic('light');
                onClose();
              }}
              style={styles.navButton}
              hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
            >
              <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.headerInfo}>
              <Text style={styles.headerDate}>{formatDetailedDate(currentAsset.createdAt)}</Text>
              {currentAsset.location?.placeName && (
                <Text style={styles.headerLocation} numberOfLines={1}>
                  {currentAsset.location.placeName}
                </Text>
              )}
            </View>

            <View style={styles.headerRightButtons}>
              {currentAsset.mediaType === 'photo' && (
                <TouchableOpacity
                  onPress={() => {
                    triggerHaptic('medium');
                    setShowAIEditor(true);
                  }}
                  style={styles.aiMagicHeaderButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="sparkles" size={15} color="#AF52DE" />
                  <Text style={styles.aiMagicText}>AI Magic</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => {
                  triggerHaptic('selection');
                  setShowInfoSheet(true);
                }}
                style={styles.navButton}
                hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
              >
                <Ionicons name="information-circle-outline" size={26} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </RNAnimated.View>

        {/* Page Counter Badge */}
        {media.length > 1 && (
          <RNAnimated.View
            style={[styles.paginationRow, { opacity: controlsOpacity }]}
            pointerEvents={showControls ? 'auto' : 'none'}
          >
            <Text style={styles.pageCountText}>
              {currentIndex + 1} of {media.length}
            </Text>
          </RNAnimated.View>
        )}

        {/* Bottom Floating Control Bar with animated fade */}
        <RNAnimated.View
          style={[styles.bottomBar, { opacity: controlsOpacity }]}
          pointerEvents={showControls ? 'auto' : 'none'}
        >
          <SafeAreaView style={styles.bottomSafeArea}>
            <TouchableOpacity onPress={handleShare} style={styles.bottomAction}>
              <Ionicons name="share-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                onToggleFavorite?.(currentAsset.id);
                triggerHaptic('light');
              }}
              style={styles.bottomAction}
            >
              <Ionicons
                name={currentAsset.isFavorite ? 'heart' : 'heart-outline'}
                size={24}
                color={currentAsset.isFavorite ? '#FF3B30' : '#FFFFFF'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onAddToAlbum?.(currentAsset)}
              style={styles.bottomAction}
            >
              <Ionicons name="albums-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDownload}
              disabled={isDownloading}
              style={styles.bottomAction}
            >
              <Ionicons
                name={
                  isDownloading
                    ? 'hourglass-outline'
                    : currentAsset.downloadStatus === 'available'
                    ? 'checkmark-circle-outline'
                    : 'cloud-download-outline'
                }
                size={24}
                color={currentAsset.downloadStatus === 'available' ? '#34C759' : '#FFFFFF'}
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleDelete} style={styles.bottomAction}>
              <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </SafeAreaView>
        </RNAnimated.View>

        {/* EXIF Metadata & Location Map View */}
        {showInfoSheet && (
          <ExifMetadataSheet
            asset={currentAsset}
            onClose={() => setShowInfoSheet(false)}
          />
        )}

        {/* AI Visual Magic In-App Photo Editor */}
        <AIPhotoEditor
          visible={showAIEditor}
          asset={currentAsset}
          onClose={() => setShowAIEditor(false)}
        />

        {/* iOS Burst Mode / Pick Best Photo Modal */}
        {showBurstPicker && (
          <BurstPickerModal
            visible={showBurstPicker}
            asset={currentAsset}
            onClose={() => setShowBurstPicker(false)}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  pageSlide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000000',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gestureContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animImageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  zoomPillOverlay: {
    position: 'absolute',
    top: 90,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    zIndex: 15,
  },
  zoomPillButton: {
    padding: 6,
  },
  zoomPillButtonDisabled: {
    opacity: 0.35,
  },
  zoomPillLabelButton: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  zoomPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    minWidth: 42,
    textAlign: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    zIndex: 10,
  },
  topSafeArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  navButton: {
    padding: 6,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  headerDate: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  headerLocation: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 2,
  },
  paginationRow: {
    position: 'absolute',
    bottom: 95,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    zIndex: 10,
  },
  pageCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    zIndex: 10,
  },
  bottomSafeArea: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 14,
  },
  bottomAction: {
    padding: 8,
  },
  infoSheetOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
    zIndex: 20,
  },
  infoSheetCard: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: SCREEN_HEIGHT * 0.55,
  },
  infoSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoSheetTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  infoScroll: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2C2C2E',
  },
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aiMagicHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(175, 82, 222, 0.22)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(175, 82, 222, 0.5)',
  },
  aiMagicText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  liveBadgeWrapper: {
    position: 'absolute',
    top: 60,
    left: 16,
    zIndex: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  liveBadgeActive: {
    backgroundColor: 'rgba(255, 204, 0, 0.25)',
    borderColor: '#FFCC00',
  },
  liveBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  liveBadgeTextActive: {
    color: '#FFCC00',
  },
  burstBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  burstBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
