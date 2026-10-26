import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Album } from '../types/media';
import { Colors } from '../utils/theme';

interface AlbumCardProps {
  album: Album;
  size: number;
  onPress: () => void;
}

export const AlbumCard: React.FC<AlbumCardProps> = ({ album, size, onPress }) => {
  const scheme = useColorScheme() ?? 'dark';
  const theme = Colors[scheme];

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[styles.container, { width: size }]}
    >
      <View style={[styles.coverWrapper, { width: size, height: size, backgroundColor: theme.secondaryBackground }]}>
        {album.coverUri ? (
          <Image
            source={{ uri: album.coverUri }}
            style={styles.coverImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.placeholderWrapper}>
            <Ionicons name="images-outline" size={36} color={theme.tertiaryLabel} />
          </View>
        )}

        {album.isPrivate && (
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={12} color="#FFFFFF" />
          </View>
        )}
      </View>

      <Text style={[styles.albumTitle, { color: theme.label }]} numberOfLines={1}>
        {album.name}
      </Text>
      <Text style={[styles.albumCount, { color: theme.secondaryLabel }]}>
        {album.mediaCount} {album.mediaCount === 1 ? 'item' : 'items'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  coverWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 6,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  placeholderWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 10,
    padding: 4,
  },
  albumTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  albumCount: {
    fontSize: 13,
    marginTop: 1,
  },
});
