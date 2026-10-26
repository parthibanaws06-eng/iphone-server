import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, Text, useColorScheme } from 'react-native';
import { MediaFilter } from '../types/media';
import { Colors } from '../utils/theme';
import { triggerHaptic } from '../utils/haptics';

interface IOSSegmentedFilterProps {
  activeFilter: MediaFilter;
  onSelectFilter: (filter: MediaFilter) => void;
}

const FILTERS: { key: MediaFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'photos', label: 'Photos' },
  { key: 'videos', label: 'Videos' },
  { key: 'favorites', label: 'Favorites' },
  { key: 'downloaded', label: 'Downloaded' },
  { key: 'cloud_only', label: 'Cloud' },
];

export const IOSSegmentedFilter: React.FC<IOSSegmentedFilterProps> = ({
  activeFilter,
  onSelectFilter,
}) => {
  const scheme = useColorScheme() ?? 'dark';
  const theme = Colors[scheme];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {FILTERS.map((item) => {
        const isActive = activeFilter === item.key;
        return (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.pill,
              {
                backgroundColor: isActive ? theme.label : theme.secondaryBackground,
              },
            ]}
            onPress={() => {
              triggerHaptic('selection');
              onSelectFilter(item.key);
            }}
          >
            <Text
              style={[
                styles.label,
                {
                  color: isActive ? theme.background : theme.secondaryLabel,
                  fontWeight: isActive ? '600' : '500',
                },
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  label: {
    fontSize: 13,
  },
});
