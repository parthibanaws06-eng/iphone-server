import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IOSSearchBar } from '../../src/components/IOSSearchBar';
import { MediaGrid } from '../../src/components/MediaGrid';
import { MediaViewer } from '../../src/components/MediaViewer';
import { MediaAsset } from '../../src/types/media';
import { MediaRepository } from '../../src/database/repositories/mediaRepository';
import { Colors } from '../../src/utils/theme';
import { triggerHaptic } from '../../src/utils/haptics';

const SUGGESTED_CATEGORIES = [
  { label: 'Mountains', icon: 'image-outline', query: 'mountains' },
  { label: 'Portraits & Faces', icon: 'person-outline', query: 'portrait' },
  { label: 'Beaches & Ocean', icon: 'water-outline', query: 'beach' },
  { label: 'Night Sky & Stars', icon: 'moon-outline', query: 'night' },
  { label: 'Pets & Animals', icon: 'paw-outline', query: 'dog' },
  { label: 'Sunsets', icon: 'sunny-outline', query: 'sunset' },
  { label: 'Videos', icon: 'videocam-outline', query: 'video' },
  { label: 'Favorites', icon: 'heart-outline', query: 'favorite' },
];

export default function SearchScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const theme = Colors[scheme];

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MediaAsset[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const performSearch = useCallback(async (searchTerm: string) => {
    const trimmed = searchTerm.trim().toLowerCase();
    if (!trimmed) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      let items: MediaAsset[] = [];
      if (trimmed === 'favorite' || trimmed === 'favorites') {
        items = await MediaRepository.getAll({ filter: 'favorites', includePrivate: false });
      } else if (trimmed === 'video' || trimmed === 'videos') {
        items = await MediaRepository.getAll({ filter: 'videos', includePrivate: false });
      } else if (trimmed === 'downloaded') {
        items = await MediaRepository.getAll({ filter: 'downloaded', includePrivate: false });
      } else {
        items = await MediaRepository.getAll({
          search: searchTerm.trim(),
          includePrivate: false,
        });
      }
      setResults(items);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 200);
    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const handleSelectCategory = (term: string) => {
    triggerHaptic('selection');
    setQuery(term);
    if (!recentSearches.includes(term)) {
      setRecentSearches((prev) => [term, ...prev.slice(0, 5)]);
    }
  };

  const handlePressItem = (item: MediaAsset, index: number) => {
    triggerHaptic('light');
    setViewerIndex(index);
    setViewerVisible(true);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.largeTitle, { color: theme.label }]}>Search</Text>
      </View>

      {/* iOS Search Bar */}
      <IOSSearchBar
        value={query}
        onChangeText={setQuery}
        onClear={() => setResults([])}
      />

      {query.length > 0 ? (
        <View style={styles.resultsContainer}>
          <View style={styles.resultsHeader}>
            <Text style={[styles.resultsCount, { color: theme.secondaryLabel }]}>
              {results.length} {results.length === 1 ? 'Result' : 'Results'} found
            </Text>
          </View>
          <MediaGrid
            media={results}
            selectedIds={[]}
            isSelectionMode={false}
            onPressItem={handlePressItem}
            onLongPressItem={() => {}}
            emptyMessage={`No results for "${query}"`}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.exploreScroll}>
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: theme.label }]}>Recent Searches</Text>
                <TouchableOpacity onPress={() => setRecentSearches([])}>
                  <Text style={[styles.clearText, { color: theme.tint }]}>Clear</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.chipsContainer}>
                {recentSearches.map((term, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => handleSelectCategory(term)}
                    style={[styles.recentChip, { backgroundColor: theme.secondaryBackground }]}
                  >
                    <Ionicons name="time-outline" size={15} color={theme.secondaryLabel} style={{ marginRight: 6 }} />
                    <Text style={[styles.recentChipText, { color: theme.label }]}>{term}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Suggested Categories */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.label, marginBottom: 12 }]}>
              Categories & Scenes
            </Text>
            <View style={styles.categoriesGrid}>
              {SUGGESTED_CATEGORIES.map((cat, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => handleSelectCategory(cat.query)}
                  style={[styles.categoryTile, { backgroundColor: theme.secondaryBackground }]}
                >
                  <Ionicons name={cat.icon as any} size={24} color={theme.tint} style={{ marginBottom: 6 }} />
                  <Text style={[styles.categoryLabel, { color: theme.label }]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {/* Full-Screen Media Viewer */}
      <MediaViewer
        visible={viewerVisible}
        media={results}
        initialIndex={viewerIndex}
        onClose={() => setViewerVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.35,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  exploreScroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 110,
  },
  section: {
    marginBottom: 26,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  clearText: {
    fontSize: 14,
    fontWeight: '500',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  recentChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryTile: {
    width: '48%',
    padding: 16,
    borderRadius: 14,
    alignItems: 'flex-start',
  },
  categoryLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});
