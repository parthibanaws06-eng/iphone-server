import React, { useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../utils/theme';
import { triggerHaptic } from '../utils/haptics';

interface IOSSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear?: () => void;
  placeholder?: string;
}

export const IOSSearchBar: React.FC<IOSSearchBarProps> = ({
  value,
  onChangeText,
  onClear,
  placeholder = 'Search photos, albums, people, dates...',
}) => {
  const scheme = useColorScheme() ?? 'dark';
  const theme = Colors[scheme];
  const inputRef = useRef<any>(null);

  const handleClear = () => {
    triggerHaptic('light');
    onChangeText('');
    onClear?.();
  };

  return (
    <View style={styles.container}>
      <View style={[styles.inputBox, { backgroundColor: theme.secondaryBackground }]}>
        <Ionicons name="search" size={18} color={theme.secondaryLabel} style={styles.searchIcon} />
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.secondaryLabel}
          style={[styles.input, { color: theme.label }]}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Ionicons name="close-circle" size={18} color={theme.secondaryLabel} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
  },
  searchIcon: {
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
});
