import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { MediaAsset } from '../types/media';
import { formatDuration } from '../utils/formatters';
import { triggerHaptic } from '../utils/haptics';

interface MediaViewerVideoProps {
  asset: MediaAsset;
  isActive: boolean;
  onToggleControls: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const MediaViewerVideo: React.FC<MediaViewerVideoProps> = ({
  asset,
  isActive,
}) => {
  const [hasStarted, setHasStarted] = useState(false);
  const [duration, setDuration] = useState(asset.duration || 0);

  const player = useVideoPlayer(asset.uri, (p) => {
    p.loop = true;
  });

  useEffect(() => {
    if (!isActive && player) {
      player.pause();
    }
  }, [isActive, player]);

  useEffect(() => {
    if (!player) return;

    const sub = player.addListener('statusChange', (event) => {
      if (event.status === 'readyToPlay' && player.duration > 0) {
        setDuration(player.duration);
      }
    });

    return () => {
      sub?.remove?.();
    };
  }, [player]);

  const handleStartPlay = () => {
    triggerHaptic('medium');
    setHasStarted(true);
    player?.play();
  };

  return (
    <View style={styles.container}>
      {hasStarted ? (
        <View style={styles.videoWrapper}>
          <VideoView
            style={styles.videoView}
            player={player}
            nativeControls={true}
            contentFit="contain"
          />
        </View>
      ) : (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleStartPlay}
          style={styles.posterContainer}
        >
          <Image
            source={{ uri: asset.thumbnailUri || asset.uri }}
            style={styles.posterImage}
            contentFit="contain"
            cachePolicy="memory-disk"
          />

          <View style={styles.centerPlayOverlay}>
            <View style={styles.largePlayCircle}>
              <Ionicons name="play" size={42} color="#FFFFFF" style={{ marginLeft: 5 }} />
            </View>
            <View style={styles.posterTimeBadge}>
              <Text style={styles.posterTimeText}>
                {duration > 0 ? formatDuration(duration) : 'PLAY VIDEO'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoView: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  posterContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  posterImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  centerPlayOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  largePlayCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  posterTimeBadge: {
    marginTop: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
  },
  posterTimeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
