import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { MediaAsset } from '../types/media';
import { Colors } from '../utils/theme';
import { formatDuration } from '../utils/formatters';

interface MediaThumbnailProps {
  item: MediaAsset;
  size: number;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  showAccountBadge?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}

export const MediaThumbnail: React.FC<MediaThumbnailProps> = React.memo(({
  item,
  size,
  isSelected = false,
  isSelectionMode = false,
  showAccountBadge = false,
  onPress,
  onLongPress,
}) => {
  const imageUri = React.useMemo(() => {
    const raw = item.thumbnailUri || item.uri;
    if (raw && raw.includes('/upload/') && raw.includes('w_420')) {
      return raw.replace('w_420,h_420,c_fill,q_auto', 'w_720,h_720,c_fill,q_auto:best,dpr_2.0');
    }
    return raw;
  }, [item.thumbnailUri, item.uri]);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.container, { width: size, height: size }]}
    >
      <Image
        source={{ uri: imageUri }}
        style={styles.image}
        contentFit="cover"
        transition={150}
        cachePolicy="memory-disk"
      />

      {/* Account indicator badge when browsing all accounts */}
      {showAccountBadge && item.cloudConnectionId && !isSelectionMode && (
        <View
          style={[
            styles.accountBadge,
            {
              backgroundColor:
                item.cloudConnectionId === 'conn-family'
                  ? 'rgba(175, 82, 222, 0.88)'
                  : 'rgba(0, 122, 255, 0.88)',
            },
          ]}
        >
          <Ionicons
            name={item.cloudConnectionId === 'conn-family' ? 'people' : 'person'}
            size={9}
            color="#FFFFFF"
            style={{ marginRight: 3 }}
          />
          <Text style={styles.accountBadgeText}>
            {item.cloudConnectionId === 'conn-family' ? 'Family' : 'Personal'}
          </Text>
        </View>
      )}

      {/* Video duration badge */}
      {item.mediaType === 'video' && (
        <View style={styles.videoBadge}>
          <Ionicons name="play" size={10} color="#FFFFFF" style={{ marginRight: 3 }} />
          <Text style={styles.badgeText}>
            {item.duration && item.duration > 0 ? formatDuration(item.duration) : 'VIDEO'}
          </Text>
        </View>
      )}

      {/* Cloud-only indicator */}
      {item.downloadStatus === 'cloud_only' && !item.isDownloaded && (
        <View style={styles.cloudBadge}>
          <Ionicons name="cloud-outline" size={13} color="#FFFFFF" />
        </View>
      )}

      {/* Downloaded / Available Offline indicator */}
      {(item.downloadStatus === 'available' || item.isDownloaded) && !isSelectionMode && (
        <View style={styles.downloadedBadge}>
          <Ionicons name="checkmark-circle" size={13} color="#34C759" />
        </View>
      )}

      {/* Favorite badge */}
      {item.isFavorite && !isSelectionMode && (
        <View style={styles.favoriteBadge}>
          <Ionicons name="heart" size={12} color="#FFFFFF" />
        </View>
      )}

      {/* Selection Mode Overlay & Checkmark */}
      {isSelectionMode && (
        <View style={[styles.selectionOverlay, isSelected && styles.selectedOverlay]}>
          <View style={[styles.checkCircle, isSelected && styles.checkedCircle]}>
            {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#1C1C1E',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  accountBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 2,
  },
  accountBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  videoBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  cloudBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: 10,
    padding: 3,
  },
  downloadedBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: 10,
    padding: 3,
  },
  favoriteBadge: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: 8,
    padding: 3,
  },
  selectionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    padding: 6,
  },
  selectedOverlay: {
    backgroundColor: 'rgba(0, 122, 255, 0.25)',
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedCircle: {
    backgroundColor: '#007AFF',
    borderColor: '#FFFFFF',
  },
});
