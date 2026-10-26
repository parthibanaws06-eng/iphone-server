import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CloudConnection } from '../types/media';
import { Colors } from '../utils/theme';
import { triggerHaptic } from '../utils/haptics';

interface CloudAccountScopeBarProps {
  connections: CloudConnection[];
  activeConnection: CloudConnection | null;
  onSelectConnection: (conn: CloudConnection | null) => void;
  onManageAccounts?: () => void;
  mediaCounts?: Record<string, number>;
  totalCount?: number;
}

export const CloudAccountScopeBar: React.FC<CloudAccountScopeBarProps> = ({
  connections,
  activeConnection,
  onSelectConnection,
  onManageAccounts,
  mediaCounts = {},
  totalCount = 0,
}) => {
  const scheme = useColorScheme() ?? 'dark';
  const theme = Colors[scheme];

  const isAllActive = activeConnection === null;

  return (
    <View style={[styles.container, { borderBottomColor: theme.separator }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Option 1: All Clouds Combined View */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => {
            triggerHaptic('selection');
            onSelectConnection(null);
          }}
          style={[
            styles.pill,
            {
              backgroundColor: isAllActive ? theme.tint : theme.secondaryBackground,
              borderColor: isAllActive ? theme.tint : theme.separator,
            },
          ]}
        >
          <Ionicons
            name={isAllActive ? 'layers' : 'layers-outline'}
            size={14}
            color={isAllActive ? '#FFFFFF' : theme.secondaryLabel}
            style={styles.pillIcon}
          />
          <Text
            style={[
              styles.pillText,
              {
                color: isAllActive ? '#FFFFFF' : theme.label,
                fontWeight: isAllActive ? '700' : '500',
              },
            ]}
          >
            All Clouds
          </Text>
          {totalCount > 0 && (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: isAllActive
                    ? 'rgba(255, 255, 255, 0.28)'
                    : theme.tertiaryBackground,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: isAllActive ? '#FFFFFF' : theme.secondaryLabel },
                ]}
              >
                {totalCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Option 2..N: Individual Cloudinary Accounts */}
        {connections.map((conn) => {
          const isActive = activeConnection?.id === conn.id;
          const count = mediaCounts[conn.id] ?? conn.mediaCount ?? 0;
          const isFamily = conn.id === 'conn-family' || conn.cloudName.includes('family');
          const connColor = conn.color || (isFamily ? '#AF52DE' : '#007AFF');
          const iconName = isFamily ? 'people' : 'person';

          return (
            <TouchableOpacity
              key={conn.id}
              activeOpacity={0.75}
              onPress={() => {
                triggerHaptic('selection');
                onSelectConnection(conn);
              }}
              style={[
                styles.pill,
                {
                  backgroundColor: isActive ? connColor : theme.secondaryBackground,
                  borderColor: isActive ? connColor : theme.separator,
                },
              ]}
            >
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: isActive ? '#FFFFFF' : connColor,
                  },
                ]}
              />
              <Ionicons
                name={isActive ? iconName : (`${iconName}-outline` as any)}
                size={14}
                color={isActive ? '#FFFFFF' : theme.secondaryLabel}
                style={styles.pillIcon}
              />
              <Text
                style={[
                  styles.pillText,
                  {
                    color: isActive ? '#FFFFFF' : theme.label,
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}
              >
                {conn.displayName}
              </Text>

              {count > 0 && (
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: isActive
                        ? 'rgba(255, 255, 255, 0.28)'
                        : theme.tertiaryBackground,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: isActive ? '#FFFFFF' : theme.secondaryLabel },
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Option 3: Manage / Add Cloud Button */}
        {onManageAccounts && (
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => {
              triggerHaptic('light');
              onManageAccounts();
            }}
            style={[
              styles.pill,
              styles.addPill,
              {
                backgroundColor: theme.secondaryBackground,
                borderColor: theme.separator,
              },
            ]}
          >
            <Ionicons name="add" size={15} color={theme.tint} style={{ marginRight: 2 }} />
            <Text style={[styles.pillText, { color: theme.tint, fontWeight: '600' }]}>
              Accounts
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  addPill: {
    borderStyle: 'dashed',
  },
  pillIcon: {
    marginRight: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  pillText: {
    fontSize: 13,
  },
  badge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
