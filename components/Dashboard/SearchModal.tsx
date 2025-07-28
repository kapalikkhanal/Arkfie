// components/Dashboard/SearchModal.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal, FlatList } from 'react-native';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stock } from '../../services/marketData';

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
  stocks: Stock[];
  onSelectStock: (stock: Stock) => void;
}

const RECENT_SEARCHES_KEY = '@recent_searches';
const MAX_RECENT_SEARCHES = 7;

const SearchModal = ({ visible, onClose, stocks, onSelectStock }: SearchModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const insets = useSafeAreaInsets();

  const filteredStocks = useMemo(() => {
    if (!searchQuery) return stocks;
    return stocks.filter(
      (stock) =>
        stock.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stock.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stock.companyName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, stocks]);

  // Load recent searches from AsyncStorage
  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  };

  // Save recent searches to AsyncStorage
  const saveRecentSearches = async (searches: string[]) => {
    try {
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
    } catch (error) {
      console.error('Error saving recent searches:', error);
    }
  };

  // Add a new search to recent searches
  const addToRecentSearches = async (symbol: string) => {
    try {
      let updatedSearches = [...recentSearches];

      // Remove if already exists
      updatedSearches = updatedSearches.filter((search) => search !== symbol);

      // Add to beginning
      updatedSearches.unshift(symbol);

      // Keep only last 7 searches
      updatedSearches = updatedSearches.slice(0, MAX_RECENT_SEARCHES);

      setRecentSearches(updatedSearches);
      await saveRecentSearches(updatedSearches);
    } catch (error) {
      console.error('Error adding to recent searches:', error);
    }
  };

  // Load recent searches when modal becomes visible
  useEffect(() => {
    if (visible) {
      loadRecentSearches();
    }
  }, [visible]);

  // Handle stock selection
  const handleSelectStock = async (stock: Stock) => {
    await addToRecentSearches(stock.symbol);
    onSelectStock(stock);
  };

  // Handle recent search tap
  const handleRecentSearchTap = (symbol: string) => {
    setSearchQuery(symbol);
  };

  // Clear all recent searches
  const clearRecentSearches = async () => {
    try {
      setRecentSearches([]);
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (error) {
      console.error('Error clearing recent searches:', error);
    }
  };

  // Get suggested searches (random 7 stocks)
  const getSuggestedSearches = useMemo(() => {
    if (stocks.length === 0) return [];

    // Create a copy of stocks array and shuffle it
    const shuffled = [...stocks].sort(() => 0.5 - Math.random());

    // Return first 7 stock symbols
    return shuffled.slice(0, 5).map((stock) => stock.symbol);
  }, [stocks]);

  const renderItem = ({ item }: { item: Stock }) => (
    <TouchableOpacity
      onPress={() => handleSelectStock(item)}
      className="mb-3 w-full flex-row items-center justify-between rounded-xl border border-[#dce0e2] bg-white p-3 py-4">
      <View className="flex-1 flex-col items-start justify-center">
        <Text className="mt-1 text-sm font-extrabold text-black">{item.symbol}</Text>
        <Text className="text-xs font-light text-black">{item.companyName}</Text>
      </View>

      <View className="ml-2 w-20 items-start">
        <Text className="text-base font-bold text-black">{item.schange}</Text>
        <View className="mt-1 flex-row items-center">
          {item.perChange >= 0 ? (
            <AntDesign name="caretup" size={12} color="#10B981" />
          ) : (
            <AntDesign name="caretdown" size={12} color="#EF4444" />
          )}
          <Text
            className={`${
              item.perChange >= 0 ? 'text-green-600' : 'text-red-600'
            } ml-1 text-sm font-semibold`}>
            {item.perChange?.toFixed(2)}%
          </Text>
        </View>
      </View>

      <View className="ml-4 w-32 items-end">
        <Text className="text-base font-bold text-black">Rs. {item.lastTradedPrice}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }} edges={['right', 'left']}>
        {/* Indicator  */}
        <View className="absolute top-0 h-2 w-20 bg-gray-400" />

        <View className="flex-1 items-end justify-end bg-white">
          <Modal
            animationType="slide"
            transparent={true} // Important: set transparent to true
            visible={visible}
            onRequestClose={onClose}>
            <View className="w-full items-center justify-end bg-white/30" style={{ flex: 1 }}>
              <View className="w-full rounded-t-2xl bg-white p-4" style={{ height: '85%' }}>
                <SafeAreaView className="flex-1">
                  {/* Header */}
                  <View className="mb-4 flex-row items-center justify-between">
                    <Text className="text-xl font-bold text-black">Search Stocks</Text>
                    <TouchableOpacity className="-mt-1 px-3 py-2" onPress={onClose}>
                      <Ionicons name="close" size={24} color="#6B7280" />
                    </TouchableOpacity>
                  </View>

                  {/* Search Input */}
                  <View className="mb-4 flex-row items-center rounded-lg border border-[#dce0e2] pl-3">
                    <Ionicons name="search-outline" size={20} color="#6B7280" />
                    <TextInput
                      className="ml-2 flex-1 text-black"
                      placeholder="Search by symbol or company name..."
                      placeholderTextColor="#9CA3AF"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      autoFocus
                    />
                    <TouchableOpacity className="p-3" onPress={() => setSearchQuery('')}>
                        <AntDesign name="closecircle" size={16} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>

                  {/* Recent Searches or Suggested Searches */}
                  <View className="mb-4">
                    <View className="mb-2 flex-row items-center justify-between">
                      <Text className="text-sm font-semibold text-gray-500">
                        {recentSearches.length > 0 ? 'Recent Searches' : 'Suggested Searches'}
                      </Text>
                      {recentSearches.length > 0 && (
                        <TouchableOpacity className="px-2 py-1" onPress={clearRecentSearches}>
                          <Text className="text-md font-normal text-[#15a37b]">Clear All</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <View className="flex-row justify-between">
                      {(recentSearches.length > 0 ? recentSearches : getSuggestedSearches).map(
                        (symbol) => (
                          <TouchableOpacity
                            key={symbol}
                            className="mb-2 mr-2 rounded-full bg-gray-100 px-3 py-1"
                            onPress={() => handleRecentSearchTap(symbol)}>
                            <Text className="text-sm text-gray-700">{symbol}</Text>
                          </TouchableOpacity>
                        )
                      )}
                    </View>
                  </View>

                  {/* FlatList */}
                  <FlatList
                    data={filteredStocks}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.symbol}
                    ListEmptyComponent={
                      <View className="items-center justify-center py-10">
                        <Ionicons name="search-outline" size={40} color="#9CA3AF" />
                        <Text className="mt-2 text-gray-500">No stocks found</Text>
                        <Text className="text-gray-400">
                          Try searching by symbol or company name
                        </Text>
                      </View>
                    }
                  />
                </SafeAreaView>
              </View>
            </View>
          </Modal>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default SearchModal;
