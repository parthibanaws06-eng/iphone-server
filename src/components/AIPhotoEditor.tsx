import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { MediaAsset } from '../types/media';
import {
  CloudinaryTransformsService,
  TRANSFORM_PRESETS,
  TransformPreset,
} from '../services/cloudinary-transforms';
import { DownloadManager } from '../services/download-manager';
import { mediaRepository } from '../database/repositories/mediaRepository';
import { useLibraryStore } from '../store/useLibraryStore';
import { triggerHaptic } from '../utils/haptics';

interface AIPhotoEditorProps {
  visible: boolean;
  asset: MediaAsset | null;
  onClose: () => void;
  onSaved?: (newAsset: MediaAsset) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const AIPhotoEditor: React.FC<AIPhotoEditorProps> = ({
  visible,
  asset,
  onClose,
  onSaved,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('original');
  const [activeCategory, setActiveCategory] = useState<'ai' | 'style'>('ai');
  const [isComparingOriginal, setIsComparingOriginal] = useState<boolean>(false);
  const [isLoadingImage, setIsLoadingImage] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const selectedPreset = useMemo(
    () => TRANSFORM_PRESETS.find((p) => p.id === selectedPresetId) || TRANSFORM_PRESETS[0],
    [selectedPresetId]
  );

  const transformedUri = useMemo(() => {
    if (!asset) return '';
    if (selectedPreset.id === 'original' || !selectedPreset.code) {
      return asset.uri;
    }
    return CloudinaryTransformsService.getTransformedUrl(asset.uri, selectedPreset.code);
  }, [asset, selectedPreset]);

  const displayUri = isComparingOriginal && asset ? asset.uri : transformedUri;

  const filteredPresets = useMemo(
    () => TRANSFORM_PRESETS.filter((p) => p.category === activeCategory),
    [activeCategory]
  );

  if (!visible || !asset) return null;

  const handleSelectPreset = (preset: TransformPreset) => {
    if (preset.id === selectedPresetId) return;
    triggerHaptic('selection');
    setSelectedPresetId(preset.id);
    setIsLoadingImage(true);
  };

  const handleSaveCopy = async () => {
    if (!asset || isSaving) return;
    triggerHaptic('medium');
    setIsSaving(true);

    try {
      const isOriginal = selectedPreset.id === 'original';
      const finalUri = isOriginal ? asset.uri : transformedUri;
      const newId = `cld-edit-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const newFilename = isOriginal
        ? asset.filename
        : `${asset.filename.replace(/\.[^.]+$/, '')}_${selectedPreset.id}.jpg`;

      const newAsset: MediaAsset = {
        ...asset,
        id: newId,
        uri: finalUri,
        thumbnailUri: finalUri,
        filename: newFilename,
        createdAt: Date.now(),
        syncedAt: Date.now(),
        downloadStatus: 'cloud_only',
        isDownloaded: false,
        aiDescription: isOriginal
          ? asset.aiDescription
          : `Edited with Cloudinary AI: ${selectedPreset.name} (${selectedPreset.description})`,
      };

      // 1. Save new transformed asset into SQLite database
      await mediaRepository.upsert(newAsset);

      // 2. Refresh library store so the edited photo shows immediately in Library
      await useLibraryStore.getState().loadMedia(false);

      triggerHaptic('success');
      Alert.alert(
        'Saved to Vault',
        `A new edited copy with "${selectedPreset.name}" has been added to your Library.`,
        [
          {
            text: 'Save to Camera Roll Too',
            onPress: async () => {
              try {
                await DownloadManager.downloadAsset(newAsset);
                Alert.alert('Saved', 'Photo saved to device Photos app.');
              } catch (e: any) {
                Alert.alert('Error', e.message || 'Could not save to Camera Roll');
              }
            },
          },
          {
            text: 'Done',
            onPress: () => {
              onSaved?.(newAsset);
              onClose();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('[AIPhotoEditor] Save failed:', error);
      triggerHaptic('error');
      Alert.alert('Save Failed', error?.message || 'Could not save edited photo.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.container}>
        {/* Top Navigation */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => {
              triggerHaptic('light');
              onClose();
            }}
            style={styles.textButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <View style={styles.titleBadgeRow}>
              <Ionicons name="sparkles" size={16} color="#AF52DE" />
              <Text style={styles.titleText}>AI Visual Magic</Text>
            </View>
            <Text style={styles.subtitleText} numberOfLines={1}>
              {selectedPreset.name}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleSaveCopy}
            disabled={isSaving}
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Center Canvas / Preview Area */}
        <View style={styles.canvasContainer}>
          <Image
            source={{ uri: displayUri }}
            style={styles.mainImage}
            contentFit="contain"
            cachePolicy="memory-disk"
            onLoadStart={() => setIsLoadingImage(true)}
            onLoad={() => setIsLoadingImage(false)}
            onError={() => setIsLoadingImage(false)}
          />

          {isLoadingImage && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#AF52DE" />
              <Text style={styles.loadingText}>Applying Cloudinary AI...</Text>
            </View>
          )}

          {/* Hold to Compare Floating Pill */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPressIn={() => {
              triggerHaptic('selection');
              setIsComparingOriginal(true);
            }}
            onPressOut={() => {
              triggerHaptic('light');
              setIsComparingOriginal(false);
            }}
            style={[styles.comparePill, isComparingOriginal && styles.comparePillActive]}
          >
            <Ionicons
              name={isComparingOriginal ? 'eye' : 'eye-outline'}
              size={16}
              color={isComparingOriginal ? '#000000' : '#FFFFFF'}
            />
            <Text
              style={[styles.compareText, isComparingOriginal && styles.compareTextActive]}
            >
              {isComparingOriginal ? 'Showing Original' : 'Hold to Compare'}
            </Text>
          </TouchableOpacity>

          {/* Preset Description Pill */}
          <View style={styles.descriptionPill}>
            <Text style={styles.descriptionText} numberOfLines={1}>
              {selectedPreset.description}
            </Text>
          </View>
        </View>

        {/* Bottom Control Panel */}
        <View style={styles.bottomControls}>
          {/* Category Selector Tabs */}
          <View style={styles.categoryTabs}>
            <TouchableOpacity
              onPress={() => {
                triggerHaptic('light');
                setActiveCategory('ai');
              }}
              style={[styles.tabButton, activeCategory === 'ai' && styles.tabButtonActive]}
            >
              <Ionicons
                name="sparkles"
                size={14}
                color={activeCategory === 'ai' ? '#FFFFFF' : '#8E8E93'}
              />
              <Text
                style={[styles.tabText, activeCategory === 'ai' && styles.tabTextActive]}
              >
                AI Magic
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                triggerHaptic('light');
                setActiveCategory('style');
              }}
              style={[styles.tabButton, activeCategory === 'style' && styles.tabButtonActive]}
            >
              <Ionicons
                name="color-palette"
                size={14}
                color={activeCategory === 'style' ? '#FFFFFF' : '#8E8E93'}
              />
              <Text
                style={[styles.tabText, activeCategory === 'style' && styles.tabTextActive]}
              >
                iOS Photographic Styles
              </Text>
            </TouchableOpacity>
          </View>

          {/* Horizontal Preset Cards Carousel */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.presetsScroll}
          >
            {filteredPresets.map((preset) => {
              const isSelected = preset.id === selectedPresetId;
              const thumbUrl = CloudinaryTransformsService.getPresetPreviewUrl(
                asset.uri,
                preset.code
              );

              return (
                <TouchableOpacity
                  key={preset.id}
                  onPress={() => handleSelectPreset(preset)}
                  style={[styles.presetCard, isSelected && styles.presetCardSelected]}
                >
                  <View style={styles.presetThumbWrapper}>
                    <Image
                      source={{ uri: thumbUrl }}
                      style={styles.presetThumb}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                    {preset.badge && (
                      <View style={styles.badgePill}>
                        <Text style={styles.badgeText}>{preset.badge}</Text>
                      </View>
                    )}
                    {isSelected && (
                      <View style={styles.selectedCheckOverlay}>
                        <Ionicons name="checkmark-circle" size={18} color="#AF52DE" />
                      </View>
                    )}
                  </View>
                  <Text
                    style={[styles.presetName, isSelected && styles.presetNameSelected]}
                    numberOfLines={1}
                  >
                    {preset.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topBar: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2C2C2E',
  },
  textButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  cancelText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '500',
  },
  titleContainer: {
    alignItems: 'center',
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  subtitleText: {
    color: '#AF52DE',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  saveButton: {
    backgroundColor: '#AF52DE',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 18,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  canvasContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#0A0A0C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainImage: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#E5E5EA',
    fontSize: 14,
    fontWeight: '500',
  },
  comparePill: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(28, 28, 30, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  comparePillActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  compareText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  compareTextActive: {
    color: '#000000',
    fontWeight: '700',
  },
  descriptionPill: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    maxWidth: SCREEN_WIDTH - 40,
  },
  descriptionText: {
    color: '#D1D1D6',
    fontSize: 12,
    fontWeight: '400',
  },
  bottomControls: {
    backgroundColor: '#121214',
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2C2C2E',
  },
  categoryTabs: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 18,
    padding: 3,
    marginBottom: 14,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 15,
  },
  tabButtonActive: {
    backgroundColor: '#2C2C2E',
  },
  tabText: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  presetsScroll: {
    paddingHorizontal: 14,
    gap: 12,
  },
  presetCard: {
    alignItems: 'center',
    width: 74,
  },
  presetCardSelected: {
    transform: [{ scale: 1.05 }],
  },
  presetThumbWrapper: {
    width: 68,
    height: 68,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#2C2C2E',
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  presetThumb: {
    width: '100%',
    height: '100%',
  },
  badgePill: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#AF52DE',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  selectedCheckOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  presetName: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
  },
  presetNameSelected: {
    color: '#AF52DE',
    fontWeight: '700',
  },
});
