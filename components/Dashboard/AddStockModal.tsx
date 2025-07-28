import { Ionicons } from '@expo/vector-icons';
import React, { useState, useMemo, useCallback } from 'react';
import { Text, TouchableOpacity, View, Modal, TextInput, FlatList } from 'react-native';
import { Stock } from 'services/marketData';
import debounce from 'lodash.debounce';

const AddStockModal = React.memo(
  ({
    visible,
    onClose,
    stocks,
    onAddStock,
  }: {
    visible: boolean;
    onClose: () => void;
    stocks: Stock[];
    onAddStock: (stock: Stock) => void;
  }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const handleSearchDebounced = useMemo(
      () => debounce((query: string) => setSearchQuery(query), 300),
      []
    );

    const filteredStocks = useMemo(() => {
      if (!searchQuery) return stocks;
      return stocks.filter(
        (stock) =>
          (stock.symbol?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
          (stock.name?.toLowerCase() || '').includes(searchQuery.toLowerCase())
      );
    }, [stocks, searchQuery]);

    const renderItem = useCallback(
      ({ item }: { item: Stock }) => (
        <TouchableOpacity
          onPress={() => onAddStock(item)}
          className="flex-row items-center justify-between border-b border-gray-100 px-2 py-3">
          <View className="flex-1">
            <Text className="text-sm font-bold text-black">{item.symbol}</Text>
            <Text className="text-xs text-gray-600">{item.name}</Text>
          </View>
          <Ionicons name="add-circle-outline" size={24} color="#15a37b" />
        </TouchableOpacity>
      ),
      [onAddStock]
    );

    const keyExtractor = useCallback((item: Stock) => item.symbol, []);

    return (
      <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
        <View className="flex-1 justify-end bg-white/20">
          <View className="h-[85%] bg-white p-6">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-black">Add to Watchlist</Text>
              <TouchableOpacity className="-mt-1 px-3 py-2" onPress={onClose}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <TextInput
              className="mb-4 w-full rounded-lg border border-[#dce0e2] px-4 py-3"
              placeholder="Search stocks..."
              placeholderTextColor="#9CA3AF"
              onChangeText={handleSearchDebounced}
              autoFocus={true}
            />

            <FlatList
              data={filteredStocks}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              initialNumToRender={15}
              maxToRenderPerBatch={10}
              windowSize={7}
              removeClippedSubviews={true}
            />

            {filteredStocks.length === 0 && (
              <View className="items-center justify-center py-10">
                <Text className="text-gray-500">No stocks found</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  }
);

export default AddStockModal;
