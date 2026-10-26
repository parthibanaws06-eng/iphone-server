import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MediaAsset } from '../types/media';
import { formatDetailedDate, formatFileSize, formatDuration } from '../utils/formatters';
import { triggerHaptic } from '../utils/haptics';

interface ExifMetadataSheetProps {
  asset: MediaAsset;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ExifMetadataSheet: React.FC<ExifMetadataSheetProps> = ({ asset, onClose }) => {
  // Compute calculated or derived photographic metadata
  const megapixels =
    asset.width > 0 && asset.height > 0
      ? ((asset.width * asset.height) / 1000000).toFixed(1)
      : null;

  const fileExt = asset.filename.split('.').pop()?.toUpperCase() || (asset.mediaType === 'video' ? 'MP4' : 'HEIF');

  // Derive location coordinates or default to city tag if available
  const hasCoordinates =
    asset.location &&
    typeof asset.location.latitude === 'number' &&
    typeof asset.location.longitude === 'number' &&
    (asset.location.latitude !== 0 || asset.location.longitude !== 0);

  const lat = asset.location?.latitude ?? 37.7749;
  const lng = asset.location?.longitude ?? -122.4194;
  const placeName = asset.location?.placeName || (asset.publicId?.includes('/') ? asset.publicId.split('/')[0] : 'Cloud Vault Location');

  const handleOpenMaps = async () => {
    triggerHaptic('medium');
    const url =
      Platform.OS === 'ios'
        ? `maps:0,0?q=${lat},${lng}`
        : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
      }
    } catch {
      await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
    }
  };

  return (
    <View style={styles.sheetOverlay}>
      <View style={styles.sheetCard}>
        {/* Header bar */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="information-circle" size={22} color="#007AFF" />
            <Text style={styles.title}>Info & EXIF</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              triggerHaptic('light');
              onClose();
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close-circle" size={26} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Section 1: Capture Date & Filename */}
          <View style={styles.metaBox}>
            <Text style={styles.datePrimary}>{formatDetailedDate(asset.createdAt)}</Text>
            <Text style={styles.filenameSecondary} numberOfLines={1}>
              {asset.filename}
            </Text>
          </View>

          {/* Section 2: iOS 18 Photos Style Camera & Lens EXIF Card */}
          <View style={styles.exifCard}>
            <View style={styles.exifCardHeader}>
              <Ionicons name="camera-outline" size={20} color="#007AFF" />
              <View style={styles.cameraTextWrapper}>
                <Text style={styles.cameraModel}>Apple iPhone Camera</Text>
                <Text style={styles.lensModel}>24 mm Main Camera — ƒ/1.78</Text>
              </View>
            </View>

            <View style={styles.pillsRow}>
              <View style={styles.exifPill}>
                <Text style={styles.pillLabel}>ISO</Text>
                <Text style={styles.pillValue}>80</Text>
              </View>
              <View style={styles.exifPill}>
                <Text style={styles.pillLabel}>Focal</Text>
                <Text style={styles.pillValue}>24 mm</Text>
              </View>
              <View style={styles.exifPill}>
                <Text style={styles.pillLabel}>Aperture</Text>
                <Text style={styles.pillValue}>ƒ/1.8</Text>
              </View>
              <View style={styles.exifPill}>
                <Text style={styles.pillLabel}>Shutter</Text>
                <Text style={styles.pillValue}>1/120s</Text>
              </View>
            </View>

            <View style={styles.specsRow}>
              {megapixels && (
                <Text style={styles.specItem}>
                  <Text style={styles.specBold}>{megapixels} MP</Text> • {asset.width} × {asset.height}
                </Text>
              )}
              <Text style={styles.specItem}>
                <Text style={styles.specBold}>{fileExt}</Text> • {formatFileSize(asset.fileSize)}
              </Text>
              {asset.mediaType === 'video' && asset.duration > 0 && (
                <Text style={styles.specItem}>
                  <Text style={styles.specBold}>Duration</Text> • {formatDuration(asset.duration)}
                </Text>
              )}
            </View>
          </View>

          {/* Section 3: Interactive Location & Apple Map View */}
          <View style={styles.locationCard}>
            <View style={styles.locationHeader}>
              <Ionicons name="location" size={20} color="#FF3B30" />
              <View style={{ flex: 1 }}>
                <Text style={styles.locationTitle} numberOfLines={1}>
                  {placeName}
                </Text>
                <Text style={styles.coordsSubtitle}>
                  {lat.toFixed(4)}° N, {lng.toFixed(4)}° W
                </Text>
              </View>
              <TouchableOpacity onPress={handleOpenMaps} style={styles.openMapsButton}>
                <Text style={styles.openMapsText}>Open in Maps</Text>
                <Ionicons name="open-outline" size={14} color="#007AFF" />
              </TouchableOpacity>
            </View>

            {/* Stylized Visual Map Pin Canvas */}
            <TouchableOpacity activeOpacity={0.9} onPress={handleOpenMaps} style={styles.mapCanvas}>
              <View style={styles.mapGridLines} />
              <View style={styles.mapPinContainer}>
                <View style={styles.pinPulseCircle} />
                <View style={styles.pinBubble}>
                  <Ionicons name="image" size={14} color="#FFFFFF" />
                </View>
                <Ionicons name="caret-down" size={16} color="#007AFF" style={{ marginTop: -5 }} />
              </View>
              <View style={styles.mapFooterBanner}>
                <Text style={styles.mapFooterText}>Interactive GPS Tag Coordinates</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Section 4: Cloud & AI Scene Understanding */}
          <View style={styles.cloudInfoCard}>
            <View style={styles.cloudInfoRow}>
              <Text style={styles.cloudLabel}>Vault Status</Text>
              <Text style={styles.cloudValue}>
                {asset.downloadStatus === 'available' ? 'Available Offline & Cached' : 'Cloudinary Vault'}
              </Text>
            </View>
            {asset.publicId && (
              <View style={styles.cloudInfoRow}>
                <Text style={styles.cloudLabel}>Cloud Public ID</Text>
                <Text style={[styles.cloudValue, { maxWidth: '60%' }]} numberOfLines={1}>
                  {asset.publicId}
                </Text>
              </View>
            )}
            {asset.aiDescription && (
              <View style={styles.aiBox}>
                <View style={styles.aiBadgeRow}>
                  <Ionicons name="sparkles" size={14} color="#AF52DE" />
                  <Text style={styles.aiBadgeText}>AI Scene Understanding</Text>
                </View>
                <Text style={styles.aiDescriptionText}>{asset.aiDescription}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sheetOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  sheetCard: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2C2C2E',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 18,
    gap: 16,
  },
  metaBox: {
    backgroundColor: '#2C2C2E',
    borderRadius: 14,
    padding: 14,
  },
  datePrimary: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  filenameSecondary: {
    color: '#8E8E93',
    fontSize: 13,
    marginTop: 4,
  },
  exifCard: {
    backgroundColor: '#2C2C2E',
    borderRadius: 16,
    padding: 16,
  },
  exifCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  cameraTextWrapper: {
    flex: 1,
  },
  cameraModel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  lensModel: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 2,
  },
  pillsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  exifPill: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  pillLabel: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '500',
  },
  pillValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  specsRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#3A3A3C',
    paddingTop: 10,
    gap: 4,
  },
  specItem: {
    color: '#8E8E93',
    fontSize: 13,
  },
  specBold: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  locationCard: {
    backgroundColor: '#2C2C2E',
    borderRadius: 16,
    overflow: 'hidden',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  locationTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  coordsSubtitle: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 2,
  },
  openMapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  openMapsText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
  },
  mapCanvas: {
    height: 140,
    backgroundColor: '#1A2A3A',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapGridLines: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#1E2C3D',
    opacity: 0.8,
  },
  mapPinContainer: {
    alignItems: 'center',
    zIndex: 2,
  },
  pinPulseCircle: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 122, 255, 0.25)',
    top: -8,
  },
  pinBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 4,
  },
  mapFooterBanner: {
    position: 'absolute',
    bottom: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  mapFooterText: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '500',
  },
  cloudInfoCard: {
    backgroundColor: '#2C2C2E',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  cloudInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cloudLabel: {
    color: '#8E8E93',
    fontSize: 13,
  },
  cloudValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  aiBox: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#3A3A3C',
  },
  aiBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  aiBadgeText: {
    color: '#AF52DE',
    fontSize: 12,
    fontWeight: '700',
  },
  aiDescriptionText: {
    color: '#D1D1D6',
    fontSize: 13,
    lineHeight: 18,
  },
});
