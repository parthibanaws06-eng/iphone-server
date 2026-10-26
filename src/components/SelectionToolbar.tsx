import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../utils/theme';
import { triggerHaptic } from '../utils/haptics';

interface SelectionToolbarProps {
  selectedCount: number;
  onShare: () => void;
  onDownload: () => void;
  onAddToAlbum: () => void;
  onMoveToPrivate: () => void;
  onDelete: () => void;
  onCancel: () => void;
}

export const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  selectedCount,
  onShare,
  onDownload,
  onAddToAlbum,
  onMoveToPrivate,
  onDelete,
  onCancel,
}) => {
  const scheme = useColorScheme() ?? 'dark';
  const theme = Colors[scheme];

  return (
    <View style={[styles.container, { backgroundColor: theme.tabBarBackground, borderTopColor: theme.separator }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.countText, { color: theme.label }]}>
          {selectedCount === 0 ? 'Select Items' : `${selectedCount} Selected`}
        </Text>
        <TouchableOpacity
          onPress={() => {
            triggerHaptic('light');
            onCancel();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.cancelText, { color: theme.tint }]}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionsRow}>
        {/* Share Action */}
        <TouchableOpacity
          style={styles.actionButton}
          disabled={selectedCount === 0}
          onPress={onShare}
        >
          <Ionicons
            name="share-outline"
            size={22}
            color={selectedCount > 0 ? theme.tint : theme.tertiaryLabel}
          />
          <Text style={[styles.actionLabel, { color: selectedCount > 0 ? theme.tint : theme.tertiaryLabel }]}>
            Share
          </Text>
        </TouchableOpacity>

        {/* Download Action */}
        <TouchableOpacity
          style={styles.actionButton}
          disabled={selectedCount === 0}
          onPress={onDownload}
        >
          <Ionicons
            name="cloud-download-outline"
            size={22}
            color={selectedCount > 0 ? theme.tint : theme.tertiaryLabel}
          />
          <Text style={[styles.actionLabel, { color: selectedCount > 0 ? theme.tint : theme.tertiaryLabel }]}>
            Download
          </Text>
        </TouchableOpacity>

        {/* Add to Album Action */}
        <TouchableOpacity
          style={styles.actionButton}
          disabled={selectedCount === 0}
          onPress={onAddToAlbum}
        >
          <Ionicons
            name="albums-outline"
            size={22}
            color={selectedCount > 0 ? theme.tint : theme.tertiaryLabel}
          />
          <Text style={[styles.actionLabel, { color: selectedCount > 0 ? theme.tint : theme.tertiaryLabel }]}>
            Album
          </Text>
        </TouchableOpacity>

        {/* Lock into Private Vault Action */}
        <TouchableOpacity
          style={styles.actionButton}
          disabled={selectedCount === 0}
          onPress={onMoveToPrivate}
        >
          <Ionicons
            name="lock-closed-outline"
            size={22}
            color={selectedCount > 0 ? theme.systemYellow : theme.tertiaryLabel}
          />
          <Text style={[styles.actionLabel, { color: selectedCount > 0 ? theme.systemYellow : theme.tertiaryLabel }]}>
            Hide
          </Text>
        </TouchableOpacity>

        {/* Delete Action */}
        <TouchableOpacity
          style={styles.actionButton}
          disabled={selectedCount === 0}
          onPress={onDelete}
        >
          <Ionicons
            name="trash-outline"
            size={22}
            color={selectedCount > 0 ? theme.systemRed : theme.tertiaryLabel}
          />
          <Text style={[styles.actionLabel, { color: selectedCount > 0 ? theme.systemRed : theme.tertiaryLabel }]}>
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  countText: {
    fontSize: 15,
    fontWeight: '600',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
  },
  actionLabel: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
});
