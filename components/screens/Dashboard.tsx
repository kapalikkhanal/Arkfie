/* eslint-disable react-hooks/rules-of-hooks */
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Svg, Path } from 'react-native-svg';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LineChart } from 'react-native-gifted-charts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import debounce from 'lodash.debounce';
import { Stock, ChartPoint } from '../../services/marketData';

// Types
interface StockWithId extends Stock {
  id?: number;
  isUp?: boolean;
  logoColor?: string;
}

interface ChartDataCache {
  [key: string]: { value: number; date?: Date }[];
}

type SortOption = 'name' | 'symbol' | 'change' | 'perChange';

// Icons
const UpArrowIcon = () => (
  <Svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 19V5M5 12L12 5L19 12"
      stroke="#10B981"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const DownArrowIcon = () => (
  <Svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 5V19M19 12L12 19L5 12"
      stroke="#EF4444"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const PlusIcon = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 5V19M5 12H19"
      stroke="#6B7280"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Reusable Components
const MiniChart = React.memo(({ data, color }: { data: { value: number }[]; color: string }) => {
  const hexToRGBA = useCallback((hex: string, opacity: number) => {
    const bigint = parseInt(hex.replace('#', ''), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }, []);

  const chartData = useMemo(() => data.map((d) => ({ value: d.value })), [data]);

  return (
    <View className="overflow-hidden" style={{ height: 80, marginTop: -40, width: 'auto' }}>
      <LineChart
        data={chartData}
        color={color}
        thickness={2}
        hideDataPoints
        hideYAxisText
        hideAxesAndRules
        curved
        areaChart
        startFillColor={hexToRGBA(color, 0.5)}
        endFillColor={hexToRGBA(color, 0.0)}
        startOpacity={0.6}
        endOpacity={0}
        yAxisColor="transparent"
        xAxisColor="transparent"
        initialSpacing={0}
        spacing={6.5}
      />
    </View>
  );
});

const formatIndianNumber = (num: any) => {
  if (num === undefined || num === null) return '0.00';
  const numStr = typeof num === 'number' ? num.toString() : num;
  const number = parseFloat(numStr.replace(/,/g, ''));
  if (isNaN(number)) return '0.00';
  return number.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
};

const getRandomColor = () => {
  const colors = ['#4A90E2', '#50E3C2', '#F5A623', '#BD10E0', '#9013FE', '#FF6B6B', '#4ECDC4'];
  return colors[Math.floor(Math.random() * colors.length)];
};

const StockCard = React.memo(
  ({
    stock,
    onPress,
    onLongPress,
    chartData,
  }: {
    stock: StockWithId;
    onPress: () => void;
    onLongPress: () => void;
    chartData?: { value: number }[];
  }) => {
    const chartColor = useMemo(
      () => (stock.perChange > 0 ? '#10B981' : stock.perChange < 0 ? '#EF4444' : '#3B82F6'),
      [stock.perChange]
    );

    return (
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        className="mr-3 w-72 rounded-xl border border-[#dce0e2] bg-white p-4"
        style={{ elevation: 2 }}>
        <View className="flex w-full flex-row items-center justify-between">
          <View>
            <Text className="mt-1 text-sm font-extrabold text-black">{stock.symbol}</Text>
            <Text className="w-48 text-xs font-light text-black">{stock.name}</Text>
          </View>
          <View>
            <Text
              className={`mt-1 text-sm font-semibold ${
                stock.perChange >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
              {stock.perChange >= 0 ? '+' : ''}
              {typeof stock.perChange === 'number' ? stock.perChange.toFixed(2) : stock.perChange}%
            </Text>
          </View>
        </View>

        <View className="mt-10 flex w-full flex-row items-center justify-between">
          <View className="">
            <Text className="w-32 text-xl font-bold text-black">
              Rs. {formatIndianNumber(stock.schange)}
            </Text>
            <Text
              className={`text-sm font-semibold ${
                stock.perChange >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
              {stock.perChange >= 0 ? '+' : ''}
              {typeof stock.percentageChange === 'number'
                ? stock.percentageChange.toFixed(2)
                : stock.percentageChange}
            </Text>
          </View>

          <MiniChart data={chartData || []} color={chartColor} />
        </View>
      </TouchableOpacity>
    );
  },
  (prevProps, nextProps) =>
    prevProps.stock.id === nextProps.stock.id && prevProps.chartData === nextProps.chartData
);

const EmptyWatchlist = React.memo(
  ({
    stock,
    onAdd,
    onPress,
    onLongPress,
  }: {
    stock: Stock;
    onPress: () => void;
    onLongPress: () => void;
    onAdd: () => void;
  }) => {
    const chartColor = useMemo(
      () => (stock.perChange >= 0 ? '#10B981' : stock.perChange < 0 ? '#EF4444' : '#3B82F6'),
      [stock.perChange]
    );

    return (
      <View className="flex flex-row items-center justify-center">
        {/* Left: Message and Add Button */}
        <View className="mr-2 w-52 items-center justify-center rounded-xl border border-[#dce0e2] px-4 py-6">
          <AntDesign name="disconnect" size={40} color="#D1D5DB" />
          <Text className="mt-2 text-gray-500">Your watchlist is empty</Text>

          <TouchableOpacity
            onPress={onAdd}
            className="mt-6 flex-row items-center rounded-lg bg-gray-100 px-4 py-2">
            <PlusIcon />
            <Text className="ml-2 text-sm font-semibold text-gray-700">Add Stocks</Text>
          </TouchableOpacity>
        </View>

        {/* Right: Suggested Stock Card */}
        <TouchableOpacity
          onPress={onPress}
          onLongPress={onLongPress}
          className="mr-3 w-72 rounded-xl border border-[#dce0e2] bg-white p-4"
          style={{ elevation: 2 }}>
          <View className="flex w-full flex-row items-center justify-between">
            <View>
              <Text className="mt-1 text-sm font-extrabold text-black">{stock.symbol}</Text>
              <Text className="w-48 text-xs font-light text-black">{stock.companyName}</Text>

              <Text className="mt-2 w-20 rounded-lg bg-gray-400 px-2 py-0.5 text-xs font-light text-white">
                Suggested
              </Text>
            </View>
            <View>
              <Text
                className={`mt-1 text-sm font-semibold ${
                  stock.percentageChange >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                {stock.percentageChange >= 0 ? '+' : ''}
                {typeof stock.percentageChange === 'number'
                  ? stock.percentageChange.toFixed(2)
                  : stock.percentageChange}
                %
              </Text>
            </View>
          </View>

          <View className="mt-10 flex w-full flex-row items-center justify-between">
            <View>
              <Text className="w-32 text-xl font-bold text-black">
                Rs. {formatIndianNumber(stock.lastTradedPrice)}
              </Text>
              <Text
                className={`text-sm font-semibold ${
                  stock?.schange >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                {stock?.schange >= 0 ? '+' : ''}
                {typeof stock.schange === 'number' ? stock.schange.toFixed(2) : stock.schange}
              </Text>
            </View>

            <MiniChart data={[]} color={chartColor} />
          </View>
        </TouchableOpacity>
      </View>
    );
  }
);

// Main Component
const DashboardScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const searchInputRef = useRef<TextInput>(null);

  // Get initial data from route params
  const { marketData } = route.params || {};

  // State
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [watchlist, setWatchlist] = useState<StockWithId[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [chartDataCache, setChartDataCache] = useState<ChartDataCache>({});
  const [sortOption, setSortOption] = useState<SortOption>('symbol');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedIndexType, setSelectedIndexType] = useState<'N' | 'S' | 'F'>('N');

  // Derived data
  const portfolioData = useMemo(() => {
    if (!marketData?.liveData) return [];
    return marketData.liveData.map((stock: Stock) => ({
      ...stock,
      isUp: stock.perChange != null ? stock.perChange >= 0 : true,
      logoColor: getRandomColor(),
    }));
  }, [marketData]);

  const availableStocks = useMemo(() => {
    if (!marketData?.liveData) return [];
    return marketData.liveData.map((stock: Stock) => ({
      symbol: stock.symbol,
      name: stock.companyName || stock.name || '',
    }));
  }, [marketData]);

  // Debounced search handlers
  const handleSearchDebounced = useMemo(
    () => debounce((query: string) => setSearchQuery(query), 300),
    []
  );

  const handleStockSearchDebounced = useMemo(
    () => debounce((query: string) => setStockSearchQuery(query), 300),
    []
  );

  // Watchlist management
  const loadWatchlist = useCallback(async () => {
    try {
      const savedWatchlist = await AsyncStorage.getItem('watchlist');
      if (savedWatchlist) {
        const parsedWatchlist: StockWithId[] = JSON.parse(savedWatchlist);
        setWatchlist(parsedWatchlist.sort((a, b) => (b.id || 0) - (a.id || 0)));
      }
    } catch (error) {
      console.error('Error loading watchlist:', error);
    }
  }, []);

  const saveWatchlist = useCallback(async (newWatchlist: StockWithId[]) => {
    try {
      await AsyncStorage.setItem('watchlist', JSON.stringify(newWatchlist));
    } catch (error) {
      console.error('Error saving watchlist:', error);
    }
  }, []);

  const addToWatchlist = useCallback(
    (stock: { symbol: string; name: string }) => {
      const isAlreadyAdded = watchlist.some((item) => item.symbol === stock.symbol);

      if (isAlreadyAdded) {
        Alert.alert('Already Added', `${stock.symbol} is already in your watchlist.`);
        return;
      }

      const stockData = portfolioData.find((item: Stock) => item.symbol === stock.symbol);

      const newStock: StockWithId = {
        id: Date.now(),
        name: stockData?.name || stock.name,
        price: parseFloat(stockData?.price?.toString() || '0'),
        symbol: stock.symbol,
        change: parseFloat(stockData?.change?.toString() || '0'),
        perChange: parseFloat((stockData?.perChange?.toString() || '0').replace('%', '')),
        companyName: stockData?.companyName || stock.name,
        schange: parseFloat(stockData?.schange?.toString() || '0'),
        lastTradedPrice: parseFloat(stockData?.lastTradedPrice?.toString() || '0'),
        percentageChange: parseFloat(stockData?.percentageChange?.toString() || '0'),
      };

      setWatchlist((prev) => {
        const updatedWatchlist = [newStock, ...prev];
        saveWatchlist(updatedWatchlist);
        return updatedWatchlist;
      });

      setModalVisible(false);
      setStockSearchQuery('');
      scrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: true });
    },
    [watchlist, portfolioData, saveWatchlist]
  );

  const removeFromWatchlist = useCallback(
    (stockId: number) => {
      Alert.alert(
        'Remove Stock',
        'Are you sure you want to remove this stock from your watchlist?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              setWatchlist((prev) => {
                const updatedWatchlist = prev.filter((item) => item.id !== stockId);
                saveWatchlist(updatedWatchlist);
                return updatedWatchlist;
              });
            },
          },
        ]
      );
    },
    [saveWatchlist]
  );

  const fetchChartData = async (symbol: string) => {
    try {
      if (chartDataCache[symbol]) {
        return chartDataCache[symbol];
      }

      const currentTimestamp = Math.floor(Date.now() / 1000);
      const oneYearAgoTimestamp = currentTimestamp - 365 * 24 * 60 * 60;

      const response = await fetch(
        `https://peridotnepal.xyz/api/company/chart_data/${symbol}/${oneYearAgoTimestamp}`,
        { headers: { Permission: '2021D@T@f@RSt6&%2-D@T@' } }
      );

      const data = await response.json();

      if (data.status === 200) {
        const points = data.data || [];
        const recentPoints = points.slice(-16);
        const chartData = recentPoints.map((point: { c: any; t: number }) => ({
          value: point.c,
          date: new Date(point.t * 1000),
        }));

        setChartDataCache((prev) => ({ ...prev, [symbol]: chartData }));
        return chartData;
      }
      return [];
    } catch (error) {
      console.error(`Error fetching chart data for ${symbol}:`, error);
      return [];
    }
  };

  const preloadChartData = async () => {
    if (watchlist.length > 0) {
      const promises = watchlist.map((stock) => fetchChartData(stock.symbol));
      await Promise.all(promises);
    }
  };

  const navigateToStockDetails = useCallback(
    (stock: StockWithId) => {
      const stockData = portfolioData.find((p: Stock) => p.symbol === stock.symbol) || {
        symbol: stock.symbol,
        name: stock.name,
        change: stock.change ? stock.change.toString() : '0.00',
        price: (Math.random() * 1000 + 100).toFixed(2),
        perChange: stock.perChange ? stock.perChange.toString() + '%' : '0.00%',
        isUp: typeof stock.perChange === 'number' ? stock.perChange >= 0 : true,
        logoColor: getRandomColor(),
      };

      navigation.navigate('StockDetails', { stock: stockData });
    },
    [portfolioData, navigation]
  );

  const toggleSearch = useCallback(() => {
    setShowSearch(!showSearch);
    if (!showSearch && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [showSearch]);

  const clearSearch = useCallback(() => {
    setShowSearch(false);
    setSearchQuery('');
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadWatchlist().then(() => setRefreshing(false));
  }, [loadWatchlist]);

  const filteredStocks = useMemo(() => {
    if (!searchQuery) return portfolioData;

    return portfolioData.filter(
      (stock: Stock) =>
        (stock.symbol?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (stock.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (stock.companyName?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );
  }, [portfolioData, searchQuery]);

  const filteredAvailableStocks = useMemo(() => {
    if (!stockSearchQuery) return availableStocks;

    return availableStocks.filter(
      (stock: Stock) =>
        (stock.symbol?.toLowerCase() || '').includes(stockSearchQuery.toLowerCase()) ||
        (stock.name?.toLowerCase() || '').includes(stockSearchQuery.toLowerCase())
    );
  }, [availableStocks, stockSearchQuery]);

  const sortedFilteredStocks = useMemo(() => {
    return [...filteredStocks]
      .filter((stock) => stock.lastTradedPrice !== null && stock.schange !== null)
      .sort((a, b) => {
        let comparison = 0;

        if (sortOption === 'name') {
          comparison = a.name.localeCompare(b.name);
        } else if (sortOption === 'symbol') {
          comparison = a.symbol.localeCompare(b.symbol);
        } else {
          const valA =
            typeof a[sortOption] === 'string'
              ? parseFloat(a[sortOption] as number)
              : (a[sortOption] as number);
          const valB =
            typeof b[sortOption] === 'string'
              ? parseFloat(b[sortOption] as number)
              : (b[sortOption] as number);
          comparison = valA - valB;
        }

        return sortDirection === 'asc' ? comparison : -comparison;
      });
  }, [filteredStocks, sortOption, sortDirection]);

  useEffect(() => {
    loadWatchlist();
  }, [loadWatchlist]);

  useEffect(() => {
    if (watchlist.length > 0 && marketData) {
      preloadChartData();
    }
  }, [watchlist, marketData]);

  useEffect(() => {
    return () => {
      handleSearchDebounced.cancel();
      handleStockSearchDebounced.cancel();
    };
  }, [handleSearchDebounced, handleStockSearchDebounced]);

  if (!marketData) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#15a37b" />
      </SafeAreaView>
    );
  }

  const nepseIndex = marketData.nepseIndex.find((index: Stock) => index.sindex === 'NEPSE Index');
  const sensitiveIndex = marketData.nepseIndex.find(
    (index: Stock) => index.sindex === 'Sensitive Index'
  );
  const floatIndex = marketData.nepseIndex.find((index: Stock) => index.sindex === 'Float Index');
  const totalTurnover = marketData.marketSummary.find(
    (item: Stock) => item.ms_key === 'Total Turnover Rs:'
  );
  const totalTradedShares = marketData.marketSummary.find(
    (item: Stock) => item.ms_key === 'Total Traded Shares'
  );

  const renderModalItem = useCallback(
    ({ item }: { item: Stock }) => (
      <TouchableOpacity
        onPress={() => addToWatchlist(item)}
        className="flex-row items-center justify-between border-b border-gray-100 px-2 py-3">
        <View className="flex-1">
          <Text className="text-sm font-bold text-black">{item.symbol}</Text>
          <Text className="text-xs text-gray-600">{item.name}</Text>
        </View>
        <Ionicons name="add-circle-outline" size={24} color="#15a37b" />
      </TouchableOpacity>
    ),
    [addToWatchlist]
  );

  const keyExtractor = useCallback((item: Stock, index: number) => `${item.symbol}-${index}`, []);

  const getItemLayout = useCallback(
    (data: any, index: number) => ({ length: 80, offset: 80 * index, index }),
    []
  );

  return (
    <View className="flex flex-col bg-white" style={{ paddingTop: insets.top }}>
      <StatusBar style="auto" />

      {/* Header Section */}
      <View className="mb-4 flex-row items-center justify-between px-6 pt-4">
        <View>
          <Text className="mx-1.5 text-lg font-bold text-gray-500">Hello, Kapalik</Text>
        </View>
        <View className="flex-1 flex-row items-center justify-end">
          <TouchableOpacity className="relative m-1 mx-4">
            <Ionicons name="notifications-outline" size={24} color="#6B7280" />
            <View className="absolute right-0 h-1.5 w-1.5 rounded-full bg-red-600" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Fixed Header Section */}
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#15a37b']}
            tintColor="#15a37b"
          />
        }
        className="px-4"
        showsVerticalScrollIndicator={false}>
        {/* Total Investment Card */}
        {nepseIndex && (
          <View
            className="relative mb-6 mt-2 h-52 rounded-2xl bg-[#1dcc97]"
            style={{ transform: [{ rotate: '-1.5deg' }] }}>
            <View
              className="absolute inset-0 flex items-center justify-center rounded-2xl bg-[#02314a] p-6"
              style={{ transform: [{ rotate: '1.5deg' }] }}>
              {/* Dynamic Index Data */}
              <View className="flex w-full flex-row items-center justify-between px-2">
                <View className="rounded-2xlp-6 z-50">
                  <Text className="text-lg font-semibold text-white">
                    {selectedIndexType === 'N'
                      ? 'NEPSE INDEX'
                      : selectedIndexType === 'S'
                        ? 'SENSITIVE INDEX'
                        : 'FLOAT INDEX'}
                  </Text>
                  <Text className="mt-2 text-4xl font-bold text-white">
                    {selectedIndexType === 'N'
                      ? nepseIndex.currentValue.toFixed(2)
                      : selectedIndexType === 'S'
                        ? sensitiveIndex?.currentValue.toFixed(2)
                        : floatIndex?.currentValue.toFixed(2)}
                  </Text>
                  <View className="mt-2 flex-row items-center">
                    <Text
                      className={`text-base font-bold ${
                        (selectedIndexType === 'N'
                          ? nepseIndex.perChange
                          : selectedIndexType === 'S'
                            ? sensitiveIndex?.perChange
                            : floatIndex?.perChange) >= 0
                          ? 'text-green-300'
                          : 'text-red-300'
                      }`}>
                      {(selectedIndexType === 'N'
                        ? nepseIndex.perChange
                        : selectedIndexType === 'S'
                          ? sensitiveIndex?.perChange
                          : floatIndex?.perChange) >= 0
                        ? '+'
                        : ''}
                      {(selectedIndexType === 'N'
                        ? nepseIndex.perChange
                        : selectedIndexType === 'S'
                          ? sensitiveIndex?.perChange
                          : floatIndex?.perChange
                      )?.toFixed(2)}
                      %
                    </Text>
                    <Text
                      className={`ml-3 text-base font-bold ${
                        (selectedIndexType === 'N'
                          ? nepseIndex.schange
                          : selectedIndexType === 'S'
                            ? sensitiveIndex?.schange
                            : floatIndex?.schange) >= 0
                          ? 'text-green-300'
                          : 'text-red-300'
                      }`}>
                      {(selectedIndexType === 'N'
                        ? nepseIndex.schange
                        : selectedIndexType === 'S'
                          ? sensitiveIndex?.schange
                          : floatIndex?.schange) >= 0
                        ? '+'
                        : ''}
                      {(selectedIndexType === 'N'
                        ? nepseIndex.schange
                        : selectedIndexType === 'S'
                          ? sensitiveIndex?.schange
                          : floatIndex?.schange
                      )?.toFixed(2)}
                    </Text>
                  </View>
                  <Text className="text-sm text-white">
                    {dayjs(
                      selectedIndexType === 'N'
                        ? nepseIndex.lastUpdatedDate
                        : selectedIndexType === 'S'
                          ? sensitiveIndex?.lastUpdatedDate
                          : floatIndex?.lastUpdatedDate
                    ).format('MMM DD, HH:mm')}
                  </Text>
                </View>
                <View className="rounded-2xlp-6 z-50">
                  {totalTurnover && (
                    <View className="mt-2 flex-col items-start justify-center">
                      <Text className="text-sm text-white">Total Turnover</Text>
                      <Text className="text-base font-bold text-green-300">
                        Rs {totalTurnover.ms_value}
                      </Text>
                    </View>
                  )}
                  {totalTradedShares && (
                    <View className="mt-2 flex-col items-start justify-center">
                      <Text className="text-sm text-white">Total Traded Shares</Text>
                      <Text className="text-base font-bold text-green-300">
                        {totalTradedShares.ms_value}
                      </Text>
                    </View>
                  )}
                  {/* Index Type Selector */}
                  <View className="mb-3 mt-3 flex-row justify-center">
                    <View className="flex flex-row items-center justify-center rounded-full border border-[#dce0e2] p-1">
                      <TouchableOpacity
                        className={`mx-1 rounded-full px-3 py-1 ${
                          selectedIndexType === 'N' ? 'bg-white' : 'bg-transparent'
                        }`}
                        onPress={() => setSelectedIndexType('N')}>
                        <Text
                          className={`text-sm font-medium ${
                            selectedIndexType === 'N' ? 'text-black' : 'text-white'
                          }`}>
                          N
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className={`mx-1 rounded-full px-3 py-1.5 ${
                          selectedIndexType === 'S' ? 'bg-white' : 'bg-transparent'
                        }`}
                        onPress={() => setSelectedIndexType('S')}>
                        <Text
                          className={`text-sm font-medium ${
                            selectedIndexType === 'S' ? 'text-black' : 'text-white'
                          }`}>
                          S
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className={`mx-1 rounded-full px-3 py-1.5 ${
                          selectedIndexType === 'F' ? 'bg-white' : 'bg-transparent'
                        }`}
                        onPress={() => setSelectedIndexType('F')}>
                        <Text
                          className={`text-sm font-medium ${
                            selectedIndexType === 'F' ? 'text-black' : 'text-white'
                          }`}>
                          F
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* WatchList Section */}
        <View className="">
          <View className="flex flex-row items-center justify-between">
            <Text className="text-xl font-bold text-black">Watchlist</Text>
            <TouchableOpacity>
              <Text className="text-md font-normal text-[#15a37b]">View All</Text>
            </TouchableOpacity>
          </View>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 12, marginBottom: 20 }}>
            {/* Watchlist Items */}
            {watchlist.length > 0
              ? watchlist.map((stock) => (
                  <StockCard
                    key={stock.id}
                    stock={stock}
                    onPress={() => navigateToStockDetails(stock)}
                    onLongPress={() => removeFromWatchlist(stock.id!)}
                    chartData={chartDataCache[stock.symbol]}
                  />
                ))
              : (() => {
                  const nabilStock = sortedFilteredStocks.find((stock) => stock.symbol === 'NABIL');
                  // console.log(nabilStock)
                  return nabilStock ? (
                    <EmptyWatchlist
                      onPress={() => navigateToStockDetails(nabilStock)}
                      onLongPress={() => removeFromWatchlist(nabilStock.id!)}
                      stock={nabilStock}
                      chartData={chartDataCache[nabilStock.symbol]}
                      onAdd={() => setModalVisible(true)}
                    />
                  ) : (
                    <Text>No suggested stock available</Text>
                  );
                })()}

            {/* Add Stock Card */}
            <TouchableOpacity
              onPress={() => setModalVisible(true)}
              className="mr-3 w-60 items-center justify-center rounded-xl border-2 border-dashed border-[#dce0e2] bg-gray-50 p-4"
              style={{ elevation: 2 }}>
              <PlusIcon />
              <Text className="mt-2 text-sm font-semibold text-gray-500">Add Stock</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Stocks Activity Header */}
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-xl font-bold text-black">Stocks Activity</Text>

          {showSearch ? (
            <View className="ml-4 flex-1 flex-row items-center">
              <TextInput
                ref={searchInputRef}
                className="flex-1 rounded-lg border border-[#dce0e2] px-4 py-2"
                placeholder="Search Stocks"
                placeholderTextColor="#9CA3AF"
                defaultValue={searchQuery}
                onChangeText={handleSearchDebounced}
                autoFocus={true}
              />
              <TouchableOpacity className="ml-2 p-2" onPress={clearSearch}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
          ) : (
            <View className="flex flex-row items-center justify-center">
              <TouchableOpacity
                onPress={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                className="ml-2 p-1">
                <Ionicons
                  name={sortDirection === 'asc' ? 'arrow-up' : 'arrow-down'}
                  size={24}
                  color="#6B7280"
                />
              </TouchableOpacity>
              <TouchableOpacity className="ml-4 px-4 py-2" onPress={toggleSearch}>
                <Ionicons name="search-outline" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Stocks Activity List - Separate scrollable section */}
      <View className="h-96 px-6">
        <FlatList
          data={sortedFilteredStocks}
          keyExtractor={keyExtractor}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => navigateToStockDetails(item)}
              className="mb-3 w-full flex-row items-center justify-between rounded-xl border border-[#dce0e2] bg-white p-3 py-4">
              <View className="flex-1 flex-col items-start justify-center">
                <Text className="mt-1 text-sm font-extrabold text-black">{item.symbol}</Text>
                <Text className="text-xs font-light text-black">{item.companyName}</Text>
              </View>

              <View className="ml-2 w-20 items-start">
                <Text className="text-base font-bold text-black">{item.schange}</Text>
                <View className="mt-1 flex-row items-center">
                  {item.isUp ? <UpArrowIcon /> : <DownArrowIcon />}
                  <Text
                    className={`${
                      item.isUp ? 'text-green-600' : 'text-red-600'
                    } ml-1 text-sm font-semibold`}>
                    {item.percentageChange}
                  </Text>
                </View>
              </View>

              <View className="ml-4 w-32 items-end">
                <Text className="text-base font-bold text-black">Rs. {item.lastTradedPrice}</Text>
              </View>
            </TouchableOpacity>
          )}
          getItemLayout={getItemLayout}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={false}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      </View>

      {/* Add Stock Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <View className="flex-1 justify-end bg-black/20">
          <View className="h-[70%] rounded-t-3xl bg-white p-6">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-black">Add to Watchlist</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <TextInput
              className="mb-4 w-full rounded-lg border border-[#dce0e2] px-4 py-3"
              placeholder="Search stocks..."
              placeholderTextColor="#9CA3AF"
              defaultValue={stockSearchQuery}
              onChangeText={handleStockSearchDebounced}
              autoFocus={true}
            />

            <FlatList
              data={filteredAvailableStocks}
              keyExtractor={keyExtractor}
              renderItem={renderModalItem}
              initialNumToRender={15}
              maxToRenderPerBatch={10}
              windowSize={7}
              removeClippedSubviews={true}
            />

            {filteredAvailableStocks.length === 0 && (
              <View className="items-center justify-center py-10">
                <Text className="text-gray-500">No stocks found</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default DashboardScreen;
