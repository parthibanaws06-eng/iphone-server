import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FaceRepository } from '../../src/database/repositories/faceRepository';
import { Colors } from '../../src/utils/theme';
import { triggerHaptic } from '../../src/utils/haptics';

export default function PrivacySettingsScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const theme = Colors[scheme];

  const [faceDetectionEnabled, setFaceDetectionEnabled] = useState(true);
  const [autoLockOption, setAutoLockOption] = useState<'immediately' | '1min' | '5min'>('immediately');

  const handleDeleteFaceData = () => {
    triggerHaptic('warning');
    Alert.alert(
      'Delete All Face Indexing Data?',
      'This will erase all locally generated face clusters and person names from this device. Photos will remain in your library.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Face Data',
          style: 'destructive',
          onPress: async () => {
            await FaceRepository.deleteAllFaceData();
            triggerHaptic('success');
            Alert.alert('Deleted', 'All local face metadata has been permanently removed.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Biometric Auto-Lock Section */}
        <Text style={[styles.sectionTitle, { color: theme.label }]}>Private Vault Auto-Lock</Text>
        <View style={[styles.card, { backgroundColor: theme.secondaryBackground }]}>
          {(['immediately', '1min', '5min'] as const).map((opt) => {
            const isSelected = autoLockOption === opt;
            const labelMap = {
              immediately: 'Immediately upon exiting app',
              '1min': 'After 1 minute in background',
              '5min': 'After 5 minutes in background',
            };
            return (
              <TouchableOpacity
                key={opt}
                onPress={() => {
                  triggerHaptic('selection');
                  setAutoLockOption(opt);
                }}
                style={styles.radioRow}
              >
                <Text style={[styles.rowText, { color: theme.label }]}>{labelMap[opt]}</Text>
                {isSelected && <Ionicons name="checkmark" size={20} color={theme.tint} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Face Detection & Grouping Privacy Section */}
        <Text style={[styles.sectionTitle, { color: theme.label, marginTop: 20 }]}>
          On-Device People & Pet Grouping
        </Text>
        <View style={[styles.card, { backgroundColor: theme.secondaryBackground }]}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.rowText, { color: theme.label }]}>Enable Face Analysis</Text>
              <Text style={[styles.subText, { color: theme.secondaryLabel }]}>
                Detects and groups faces locally on this device.
              </Text>
            </View>
            <Switch
              value={faceDetectionEnabled}
              onValueChange={setFaceDetectionEnabled}
              trackColor={{ true: theme.tint, false: theme.separator }}
            />
          </View>
        </View>

        {/* Privacy Note */}
        <View style={[styles.noteBox, { backgroundColor: theme.secondaryBackground }]}>
          <Ionicons name="lock-closed" size={20} color={theme.tint} style={{ marginRight: 10 }} />
          <Text style={[styles.noteText, { color: theme.secondaryLabel }]}>
            Privacy Guarantee: Face analysis runs 100% on-device. Face embeddings and biometric data are
            never uploaded to Cloudinary or our backend servers.
          </Text>
        </View>

        {/* Action: Delete Local Face Indexing Data */}
        <TouchableOpacity
          onPress={handleDeleteFaceData}
          style={[styles.destructiveBtn, { backgroundColor: theme.secondaryBackground }]}
        >
          <Ionicons name="trash-bin-outline" size={18} color={theme.systemRed} style={{ marginRight: 8 }} />
          <Text style={[styles.destructiveBtnText, { color: theme.systemRed }]}>
            Delete All Local Face Data
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  card: {
    borderRadius: 14,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  radioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowText: {
    fontSize: 16,
    fontWeight: '500',
  },
  subText: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  destructiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  destructiveBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
