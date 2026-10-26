import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StatusBar,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { MediaAsset } from '../types/media';
import { triggerHaptic } from '../utils/haptics';

interface BurstPickerModalProps {
  visible: boolean;
  asset: MediaAsset;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const BurstPickerModal: React.FC<BurstPickerModalProps> = ({
  visible,
  asset,
  onClose,
}) => {
  const [selectedFrame, setSelectedFrame] = useState(0);

  // Generate 5 burst frames from this asset
  const frames = useMemo(() => {
    return [0, 1, 2, 3, 4].map((i) => {
      let frameUri = asset.uri;
      if (asset.uri.includes('/image/upload/')) {
        const crops = [
          'c_crop,w_0.98,h_0.98,g_center',
          'c_crop,w_0.96,h_0.96,g_center',
          '',
          'c_crop,w_0.97,h_0.97,g_center',
          'c_crop,w_0.99,h_0.99,g_center',
        ];
        if (crops[i]) {
          frameUri = asset.uri.replace('/image/upload/', `/image/upload/${crops[i]}/`);
        }
      }
      return {
        id: `frame_${i}`,
        index: i + 1,
        uri: frameUri,
      };
    });
  }, [asset]);

  if (!visible) return null;

  const handlePickBest = () => {
    triggerHaptic('success');
    Alert.alert(
      'Key Photo Selected',
      `Frame #${selectedFrame + 1} has been set as the main display photo for this burst.`
    );
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              triggerHaptic('light');
              onClose();
            }}
            style={styles.headerBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={styles.burstBadgeHeader}>
              <Ionicons name="copy-outline" size={14} color="#FFFFFF" />
              <Text style={styles.headerTitle}>Burst</Text>
            </View>
            <Text style={styles.headerSubtitle}>
              {selectedFrame + 1} of {frames.length} Photos
            </Text>
          </View>

          <TouchableOpacity
            onPress={handlePickBest}
            style={styles.headerBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Center Main Preview */}
        <View style={styles.canvas}>
          <Image
            source={{ uri: frames[selectedFrame].uri }}
            style={styles.mainImage}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        </View>

        {/* Bottom Horizontal Filmstrip Carousel */}
        <View style={styles.bottomCarousel}>
          <Text style={styles.instructionText}>Select Best Photo</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.framesScroll}
          >
            {frames.map((frame, idx) => {
              const isSelected = idx === selectedFrame;
              return (
                <TouchableOpacity
                  key={frame.id}
                  activeOpacity={0.85}
                  onPress={() => {
                    triggerHaptic('selection');
                    setSelectedFrame(idx);
                  }}
                  style={[styles.frameCard, isSelected && styles.frameCardSelected]}
                >
                  <Image
                    source={{ uri: frame.uri }}
                    style={styles.frameThumb}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                  <View style={styles.frameNumberBadge}>
                    <Text style={styles.frameNumberText}>{frame.index}</Text>
                  </View>
                  {isSelected && (
                    <View style={styles.checkmarkBadge}>
                      <Ionicons name="checkmark-circle" size={18} color="#007AFF" />
                    </View>
                  )}
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
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2C2C2E',
  },
  headerBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  cancelText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '500',
  },
  headerCenter: {
    alignItems: 'center',
  },
  burstBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 1,
  },
  doneText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '700',
  },
  canvas: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0C',
  },
  mainImage: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  bottomCarousel: {
    backgroundColor: '#121214',
    paddingTop: 12,
    paddingBottom: 22,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2C2C2E',
  },
  instructionText: {
    color: '#8E8E93',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  framesScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  frameCard: {
    width: 66,
    height: 84,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#2C2C2E',
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  frameCardSelected: {
    borderColor: '#007AFF',
    transform: [{ scale: 1.05 }],
  },
  frameThumb: {
    width: '100%',
    height: '100%',
  },
  frameNumberBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  frameNumberText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  checkmarkBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 9,
  },
});
