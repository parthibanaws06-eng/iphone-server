import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/utils/theme';
import { useCloudStore } from '../../src/store/useCloudStore';

export default function SettingsIndexScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'dark';
  const theme = Colors[scheme];
  const { activeConnection } = useCloudStore();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Cloud Connection Summary Card */}
        <View style={[styles.sectionGroup, { backgroundColor: theme.secondaryBackground }]}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push('/settings/cloud-accounts')}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#007AFF' }]}>
                <Ionicons name="cloud" size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text style={[styles.rowTitle, { color: theme.label }]}>Cloudinary Accounts</Text>
                <Text style={[styles.rowSubtitle, { color: theme.secondaryLabel }]}>
                  Active: {activeConnection?.displayName || 'None connected'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.tertiaryLabel} />
          </TouchableOpacity>
        </View>

        {/* Offline & Storage Settings */}
        <View style={[styles.sectionGroup, { backgroundColor: theme.secondaryBackground }]}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push('/settings/offline-storage')}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#34C759' }]}>
                <Ionicons name="pie-chart" size={20} color="#FFFFFF" />
              </View>
              <Text style={[styles.rowTitle, { color: theme.label }]}>Storage & Downloads</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.tertiaryLabel} />
          </TouchableOpacity>

          <View style={[styles.separator, { backgroundColor: theme.separator }]} />

          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push('/settings/privacy')}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#5856D6' }]}>
                <Ionicons name="lock-closed" size={20} color="#FFFFFF" />
              </View>
              <Text style={[styles.rowTitle, { color: theme.label }]}>Face ID & Privacy</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.tertiaryLabel} />
          </TouchableOpacity>
        </View>

        {/* App Info Group */}
        <View style={[styles.sectionGroup, { backgroundColor: theme.secondaryBackground }]}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#8E8E93' }]}>
                <Ionicons name="information" size={20} color="#FFFFFF" />
              </View>
              <Text style={[styles.rowTitle, { color: theme.label }]}>PhotoVault Version</Text>
            </View>
            <Text style={[styles.rowValue, { color: theme.secondaryLabel }]}>1.0.0 (Expo SDK 58)</Text>
          </View>
        </View>
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
    gap: 18,
  },
  sectionGroup: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  rowValue: {
    fontSize: 15,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 60,
  },
});
