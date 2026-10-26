import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  useColorScheme,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePrivateVaultStore } from '../../src/store/usePrivateVaultStore';
import { MediaGrid } from '../../src/components/MediaGrid';
import { MediaViewer } from '../../src/components/MediaViewer';
import { MediaAsset } from '../../src/types/media';
import { Colors } from '../../src/utils/theme';
import { triggerHaptic } from '../../src/utils/haptics';

export default function PrivateScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const theme = Colors[scheme];

  const {
    isUnlocked,
    isAuthenticating,
    biometryType,
    privateMedia,
    checkBiometricSupport,
    authenticate,
    lock,
    restoreFromPrivate,
    deletePrivateSelected,
  } = usePrivateVaultStore();

  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  useEffect(() => {
    checkBiometricSupport();
  }, [checkBiometricSupport]);

  const handleUnlockPress = async () => {
    await authenticate();
  };

  const handlePressItem = (item: MediaAsset, index: number) => {
    triggerHaptic('light');
    setViewerIndex(index);
    setViewerVisible(true);
  };

  const handleRestore = (asset: MediaAsset) => {
    Alert.alert(
      'Unhide Photo',
      'Move this photo back to your main Library?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unhide',
          onPress: async () => {
            await restoreFromPrivate([asset.id]);
            setViewerVisible(false);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.largeTitle, { color: theme.label }]}>Private</Text>
          <Text style={[styles.subtitle, { color: theme.secondaryLabel }]}>
            {isUnlocked ? 'Vault Unlocked' : 'Locked Album'}
          </Text>
        </View>

        {isUnlocked && (
          <TouchableOpacity
            onPress={() => {
              triggerHaptic('medium');
              lock();
            }}
            style={styles.lockButton}
          >
            <Ionicons name="lock-closed" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.lockButtonText}>Lock Now</Text>
          </TouchableOpacity>
        )}
      </View>

      {!isUnlocked ? (
        /* Locked State: Prompts for Native Biometric Authentication */
        <View style={styles.lockedContainer}>
          <View style={[styles.iconShield, { backgroundColor: theme.secondaryBackground }]}>
            <Ionicons name="shield-checkmark" size={60} color={theme.tint} />
          </View>

          <Text style={[styles.lockedTitle, { color: theme.label }]}>
            Private Vault is Locked
          </Text>
          <Text style={[styles.lockedDescription, { color: theme.secondaryLabel }]}>
            This album is encrypted and protected. Authenticate using {biometryType || 'Face ID'} or
            your device passcode to view hidden photos and videos.
          </Text>

          <TouchableOpacity
            onPress={handleUnlockPress}
            disabled={isAuthenticating}
            style={[styles.unlockButton, { backgroundColor: theme.tint }]}
          >
            <Ionicons
              name={biometryType === 'Face ID' ? 'scan' : 'finger-print'}
              size={22}
              color="#FFFFFF"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.unlockButtonText}>
              {isAuthenticating ? 'Authenticating...' : `Unlock with ${biometryType || 'Face ID'}`}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.securityFootnote, { color: theme.tertiaryLabel }]}>
            Protected by device hardware security. Private media is never synchronized to public albums.
          </Text>
        </View>
      ) : (
        /* Unlocked State: Displays Private Media Grid */
        <View style={styles.unlockedContainer}>
          <MediaGrid
            media={privateMedia}
            selectedIds={[]}
            isSelectionMode={false}
            onPressItem={handlePressItem}
            onLongPressItem={() => {}}
            emptyMessage="No Private Items"
          />

          <MediaViewer
            visible={viewerVisible}
            media={privateMedia}
            initialIndex={viewerIndex}
            onClose={() => setViewerVisible(false)}
            onAddToAlbum={handleRestore}
            onDelete={(id) => deletePrivateSelected([id])}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.35,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  lockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  lockButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  lockedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingBottom: 80,
  },
  iconShield: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  lockedTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  lockedDescription: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 24,
    marginBottom: 24,
  },
  unlockButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  securityFootnote: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  unlockedContainer: {
    flex: 1,
  },
});
