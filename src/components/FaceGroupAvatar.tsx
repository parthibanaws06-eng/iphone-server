import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  useColorScheme,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { FaceGroup } from '../types/media';
import { Colors } from '../utils/theme';
import { triggerHaptic } from '../utils/haptics';

interface FaceGroupAvatarProps {
  group: FaceGroup;
  size?: number;
  onRename?: (id: string, newName: string) => void;
  onPress?: () => void;
}

export const FaceGroupAvatar: React.FC<FaceGroupAvatarProps> = ({
  group,
  size = 80,
  onRename,
  onPress,
}) => {
  const scheme = useColorScheme() ?? 'dark';
  const theme = Colors[scheme];

  const handlePromptRename = () => {
    triggerHaptic('light');
    if (Alert.prompt) {
      Alert.prompt(
        'Name This Person',
        'Add a name for this recognized face group',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Save',
            onPress: (text?: string) => {
              if (text && text.trim()) {
                onRename?.(group.id, text.trim());
              }
            },
          },
        ],
        'plain-text',
        group.name === 'Unnamed Person' ? '' : group.name
      );
    } else {
      // Fallback for non-iOS prompt
      onPress?.();
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress || handlePromptRename}
      onLongPress={handlePromptRename}
      style={[styles.container, { width: size + 20 }]}
    >
      <View
        style={[
          styles.avatarWrapper,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: theme.secondaryBackground,
          },
        ]}
      >
        {group.representativeUri ? (
          <Image
            source={{ uri: group.representativeUri }}
            style={styles.avatarImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <Ionicons name="person" size={size * 0.5} color={theme.tertiaryLabel} />
        )}
      </View>

      <Text style={[styles.nameText, { color: theme.label }]} numberOfLines={1}>
        {group.name}
      </Text>
      <Text style={[styles.countText, { color: theme.secondaryLabel }]}>
        {group.faceCount} {group.faceCount === 1 ? 'photo' : 'photos'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginRight: 14,
    marginBottom: 8,
  },
  avatarWrapper: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  nameText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: '100%',
  },
  countText: {
    fontSize: 11,
    marginTop: 1,
    textAlign: 'center',
  },
});
