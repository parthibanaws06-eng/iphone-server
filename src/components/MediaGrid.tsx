import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  FlatList,
  Text,
  useColorScheme,
  RefreshControl,
} from 'react-native';
import { MediaAsset } from '../types/media';
import { MediaThumbnail } from './MediaThumbnail';
import { Colors, Spacing } from '../utils/theme';

interface MediaGridProps {
  media: MediaAsset[];
  selectedIds: string[];
  isSelectionMode: boolean;
  showAccountBadge?: boolean;
  onPressItem: (item: MediaAsset, index: number) => void;
  onLongPressItem: (item: MediaAsset) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  headerComponent?: React.ReactElement;
  emptyMessage?: string;
  numColumns?: number;
}

const GAP = Spacing.gridGap;

export const MediaGrid: React.FC<MediaGridProps> = ({
  media,
  selectedIds,
  isSelectionMode,
  showAccountBadge = false,
  onPressItem,
  onLongPressItem,
  onRefresh,
  isRefreshing = false,
  headerComponent,
  emptyMessage = 'No Photos or Videos',
  numColumns = 3,
}) => {
  const scheme = useColorScheme() ?? 'dark';
  const theme = Colors[scheme];
  const screenWidth = Dimensions.get('window').width;

  const itemSize = useMemo(() => {
    return (screenWidth - (numColumns - 1) * GAP) / numColumns;
  }, [screenWidth, numColumns]);

  // Compute summary count
  const summary = useMemo(() => {
    const photos = media.filter((m) => m.mediaType === 'photo').length;
    const videos = media.filter((m) => m.mediaType === 'video').length;
    const parts: string[] = [];
    if (photos > 0) parts.push(`${photos} ${photos === 1 ? 'Photo' : 'Photos'}`);
    if (videos > 0) parts.push(`${videos} ${videos === 1 ? 'Video' : 'Videos'}`);
    return parts.join(', ') || '0 Items';
  }, [media]);

  const renderItem = ({ item, index }: { item: MediaAsset; index: number }) => {
    const isSelected = selectedIds.includes(item.id);
    const isLastInRow = (index + 1) % numColumns === 0;

    return (
      <View
        style={{
          marginRight: isLastInRow ? 0 : GAP,
          marginBottom: GAP,
        }}
      >
        <MediaThumbnail
          item={item}
          size={itemSize}
          isSelected={isSelected}
          isSelectionMode={isSelectionMode}
          showAccountBadge={showAccountBadge}
          onPress={() => onPressItem(item, index)}
          onLongPress={() => onLongPressItem(item)}
        />
      </View>
    );
  };

  const renderFooter = () => (
    <View style={styles.footerContainer}>
      <Text style={[styles.footerText, { color: theme.secondaryLabel }]}>{summary}</Text>
    </View>
  );

  return (
    <FlatList
      key={`grid-cols-${numColumns}`}
      data={media}
      keyExtractor={(item) => item.id}
      numColumns={numColumns}
      renderItem={renderItem}
      ListHeaderComponent={headerComponent}
      ListFooterComponent={media.length > 0 ? renderFooter : undefined}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyTitle, { color: theme.label }]}>{emptyMessage}</Text>
          <Text style={[styles.emptySubtitle, { color: theme.secondaryLabel }]}>
            Photos and videos will appear here from Cloudinary.
          </Text>
        </View>
      }
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.tint}
          />
        ) : undefined
      }
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={true}
      removeClippedSubviews={true}
      initialNumToRender={24}
      maxToRenderPerBatch={18}
      windowSize={7}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 110,
  },
  footerContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  emptyContainer: {
    paddingVertical: 120,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 20,
  },
});
