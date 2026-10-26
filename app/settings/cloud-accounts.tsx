import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCloudStore } from '../../src/store/useCloudStore';
import { Colors } from '../../src/utils/theme';
import { formatFileSize, formatDetailedDate } from '../../src/utils/formatters';
import { triggerHaptic } from '../../src/utils/haptics';

export default function CloudAccountsScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const theme = Colors[scheme];

  const {
    connections,
    activeConnection,
    isSyncing,
    setActiveConnection,
    syncCurrentConnection,
    addConnection,
    deleteConnection,
  } = useCloudStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [cloudName, setCloudName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [folder, setFolder] = useState('');

  const handleAdd = async () => {
    if (!displayName.trim() || !cloudName.trim()) {
      Alert.alert('Required', 'Please enter a display name and Cloudinary cloud name.');
      return;
    }

    await addConnection({
      displayName: displayName.trim(),
      cloudName: cloudName.trim(),
      apiKey: apiKey.trim(),
      apiSecret: apiSecret.trim(),
      defaultFolder: folder.trim() || undefined,
    });

    setDisplayName('');
    setCloudName('');
    setApiKey('');
    setApiSecret('');
    setFolder('');
    setModalVisible(false);
    triggerHaptic('success');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.headerHint, { color: theme.secondaryLabel }]}>
          Connect multiple Cloudinary cloud environments to isolate personal, family, and work libraries.
          API secrets are encrypted on the backend and never exposed in the client bundle.
        </Text>

        {/* Combined View Option */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveConnection(null)}
          style={[
            styles.card,
            {
              backgroundColor: theme.secondaryBackground,
              borderColor: activeConnection === null ? theme.tint : 'transparent',
              borderWidth: activeConnection === null ? 2 : 1,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleBox}>
              <Text style={[styles.connName, { color: theme.label }]}>All Cloud Libraries & Device</Text>
              <Text style={[styles.cloudNameText, { color: theme.secondaryLabel }]}>
                Browse media from all connected Cloudinary accounts
              </Text>
            </View>
            {activeConnection === null && (
              <View style={[styles.activePill, { backgroundColor: theme.tint }]}>
                <Text style={styles.activePillText}>Active</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {connections.map((conn) => {
          const isActive = activeConnection?.id === conn.id;
          return (
            <TouchableOpacity
              key={conn.id}
              activeOpacity={0.8}
              onPress={() => setActiveConnection(conn)}
              style={[
                styles.card,
                {
                  backgroundColor: theme.secondaryBackground,
                  borderColor: isActive ? theme.tint : 'transparent',
                  borderWidth: isActive ? 2 : 1,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleBox}>
                  <Text style={[styles.connName, { color: theme.label }]}>{conn.displayName}</Text>
                  <Text style={[styles.cloudNameText, { color: theme.secondaryLabel }]}>
                    Cloud: {conn.cloudName} {conn.defaultFolder ? `(${conn.defaultFolder})` : ''}
                  </Text>
                </View>

                {isActive ? (
                  <View style={[styles.activePill, { backgroundColor: theme.tint }]}>
                    <Text style={styles.activePillText}>Active</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => deleteConnection(conn.id)}
                    style={styles.deleteIcon}
                  >
                    <Ionicons name="trash-outline" size={18} color={theme.systemRed} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: theme.label }]}>{conn.mediaCount}</Text>
                  <Text style={[styles.statLabel, { color: theme.secondaryLabel }]}>Media Assets</Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: theme.label }]}>
                    {formatFileSize(conn.storageBytes)}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.secondaryLabel }]}>Storage Used</Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: theme.label }]}>
                    {conn.lastSyncedAt ? 'Synced' : 'Never'}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.secondaryLabel }]}>
                    {conn.lastSyncedAt ? formatDetailedDate(conn.lastSyncedAt) : 'Pending'}
                  </Text>
                </View>
              </View>

              {isActive && (
                <TouchableOpacity
                  onPress={syncCurrentConnection}
                  disabled={isSyncing}
                  style={[styles.syncButton, { backgroundColor: theme.tint }]}
                >
                  <Ionicons
                    name={isSyncing ? 'sync' : 'refresh'}
                    size={16}
                    color="#FFFFFF"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.syncButtonText}>
                    {isSyncing ? 'Reconciling Assets...' : 'Sync Now'}
                  </Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          onPress={() => {
            triggerHaptic('light');
            setModalVisible(true);
          }}
          style={[styles.addConnButton, { borderColor: theme.tint }]}
        >
          <Ionicons name="add" size={20} color={theme.tint} style={{ marginRight: 6 }} />
          <Text style={[styles.addConnText, { color: theme.tint }]}>Connect Another Cloudinary Account</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal: Add New Connection */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.label }]}>New Cloudinary Connection</Text>

            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Display Name (e.g. Family Vault)"
              placeholderTextColor={theme.secondaryLabel}
              style={[styles.input, { color: theme.label, backgroundColor: theme.secondaryBackground }]}
            />

            <TextInput
              value={cloudName}
              onChangeText={setCloudName}
              placeholder="Cloud Name"
              placeholderTextColor={theme.secondaryLabel}
              autoCapitalize="none"
              style={[styles.input, { color: theme.label, backgroundColor: theme.secondaryBackground }]}
            />

            <TextInput
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="API Key"
              placeholderTextColor={theme.secondaryLabel}
              autoCapitalize="none"
              style={[styles.input, { color: theme.label, backgroundColor: theme.secondaryBackground }]}
            />

            <TextInput
              value={apiSecret}
              onChangeText={setApiSecret}
              placeholder="API Secret (Sent securely to backend)"
              placeholderTextColor={theme.secondaryLabel}
              secureTextEntry={true}
              autoCapitalize="none"
              style={[styles.input, { color: theme.label, backgroundColor: theme.secondaryBackground }]}
            />

            <TextInput
              value={folder}
              onChangeText={setFolder}
              placeholder="Default Folder (Optional)"
              placeholderTextColor={theme.secondaryLabel}
              autoCapitalize="none"
              style={[styles.input, { color: theme.label, backgroundColor: theme.secondaryBackground }]}
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={[styles.btn, { borderColor: theme.separator, borderWidth: 1 }]}
              >
                <Text style={{ color: theme.tint, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAdd}
                style={[styles.btn, { backgroundColor: theme.tint }]}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Connect</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  headerHint: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  card: {
    borderRadius: 14,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitleBox: {
    flex: 1,
  },
  connName: {
    fontSize: 17,
    fontWeight: '700',
  },
  cloudNameText: {
    fontSize: 13,
    marginTop: 2,
  },
  activePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activePillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  deleteIcon: {
    padding: 6,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  statBox: {
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  addConnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addConnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  input: {
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
