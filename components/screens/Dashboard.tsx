/* eslint-disable react-hooks/exhaustive-deps */
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { AntDesign, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import debounce from 'lodash.debounce';
import { Stock } from '../../services/marketData';
import Popup from 'components/Dashboard/Popup';
import StockCard from 'components/Dashboard/StockCard';
import PortfolioSummary from 'components/Dashboard/PortfolioSummary';
import MarketMoverCard from 'components/Dashboard/MarketMoverCard';
import AddStockModal from 'components/Dashboard/AddStockModal';
import SearchModal from 'components/Dashboard/SearchModal';

// Types
interface StockWithId extends Stock {
  id?: number;
  isUp?: boolean;
  logoColor?: string;
}

interface ChartDataCache {
  [key: string]: { value: number; date?: Date }[];
}

interface PortfolioStock {
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
}

interface Portfolio {
  id: string;
  name: string;
  isDefault: boolean;
  stocks: PortfolioStock[];
}

const getRandomColor = () => {
  const colors = ['#4A90E2', '#50E3C2', '#F5A623', '#BD10E0', '#9013FE', '#FF6B6B', '#4ECDC4'];
  return colors[Math.floor(Math.random() * colors.length)];
};

// Main Component
const DashboardScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  // Get initial data from route params
  const { marketData } = route.params || {};

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [watchlist, setWatchlist] = useState<StockWithId[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [chartDataCache, setChartDataCache] = useState<ChartDataCache>({});
  const [selectedIndexType, setSelectedIndexType] = useState<'N' | 'S' | 'F'>('N');
  const [defaultPortfolio, setDefaultPortfolio] = useState<Portfolio | null>(null);
  const [searchModalVisible, setSearchModalVisible] = useState(false);

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
    // console.log(marketData.liveData)
    return marketData.liveData.map((stock: Stock) => ({
      symbol: stock.symbol,
      name: stock.companyName || stock.name || '',
      sectorName: stock.sectorName || '',
      percentageChange: stock.percentageChange || '',
      lastTradedPrice: stock.lastTradedPrice || '',
      perChange: stock.perChange || '',
      schange: stock.schange || '',
    }));
  }, [marketData]);

  // Debounced search handlers
  const handleSearchDebounced = useMemo(
    () => debounce((query: string) => setSearchQuery(query), 300),
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
        sindex: '',
        ms_key: '',
      };

      setWatchlist((prev) => {
        const updatedWatchlist = [newStock, ...prev];
        saveWatchlist(updatedWatchlist);
        return updatedWatchlist;
      });

      setModalVisible(false);
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

      // console.log('Available Stocks:', availableStocks);
      navigation.navigate('StockDetails', { stock: stockData, liveData: availableStocks });
    },
    [portfolioData, navigation]
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadDefaultPortfolio();
    loadWatchlist().then(() => setRefreshing(false));
  }, [loadWatchlist]);

  const loadDefaultPortfolio = async () => {
    const savedPortfolios = await AsyncStorage.getItem('portfolios');
    if (savedPortfolios) {
      const portfolios = JSON.parse(savedPortfolios);
      const defaultPortfolio = portfolios.find((p: Portfolio) => p.isDefault);
      setDefaultPortfolio(defaultPortfolio || null);
    }
  };

  useEffect(() => {
    loadDefaultPortfolio();
  }, []);

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
    };
  }, [handleSearchDebounced]);

  // Portfolio calculations
  const totalValue = useMemo(() => {
    if (!defaultPortfolio) return 0;
    return defaultPortfolio.stocks.reduce((total, stock) => {
      const liveStock = marketData?.liveData?.find(
        (s: { symbol: string }) => s.symbol === stock.symbol
      );
      return total + stock.quantity * (liveStock?.lastTradedPrice || 0);
    }, 0);
  }, [defaultPortfolio, marketData]);

  const profitLoss = useMemo(() => {
    if (!defaultPortfolio) return 0;
    return defaultPortfolio.stocks.reduce((total, stock) => {
      const liveStock = marketData?.liveData?.find(
        (s: { symbol: string }) => s.symbol === stock.symbol
      );
      const currentValue = stock.quantity * (liveStock?.lastTradedPrice || 0);
      const invested = stock.quantity * stock.avgPrice;
      return total + (currentValue - invested);
    }, 0);
  }, [defaultPortfolio, marketData]);

  // Market movers
  const topGainers = useMemo(() => {
    if (!marketData?.liveData) return [];
    return [...marketData.liveData]
      .filter((stock) => stock.symbol && stock.perChange !== undefined)
      .sort((a, b) => (b.perChange || 0) - (a.perChange || 0))
      .slice(0, 4)
      .map((stock) => ({
        ...stock,
        isGainer: true,
        chartData: chartDataCache[stock.symbol] || [],
      }));
  }, [marketData, chartDataCache]);

  const topLosers = useMemo(() => {
    if (!marketData?.liveData) return [];
    return [...marketData.liveData]
      .filter((stock) => stock.symbol && stock.perChange !== undefined)
      .sort((a, b) => (a.perChange || 0) - (b.perChange || 0))
      .slice(0, 4)
      .map((stock) => ({
        ...stock,
        isGainer: false,
        chartData: chartDataCache[stock.symbol] || [],
      }));
  }, [marketData, chartDataCache]);

  const fetchStockChartData = async (symbol: string) => {
    try {
      if (chartDataCache[symbol]) return;

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
        const chartData = recentPoints.map((point: { c: any }) => ({
          value: point.c,
        }));

        setChartDataCache((prev) => ({ ...prev, [symbol]: chartData }));
      }
    } catch (error) {
      console.error(`Error fetching chart data for ${symbol}:`, error);
    }
  };

  useEffect(() => {
    if (!marketData?.liveData) return;

    const loadChartData = async () => {
      const allSymbols = [
        ...topGainers.map((stock) => stock.symbol),
        ...topLosers.map((stock) => stock.symbol),
      ];

      await Promise.all(allSymbols.map((symbol) => fetchStockChartData(symbol)));
    };

    loadChartData();
  }, [marketData?.liveData]);

  // Market data
  const nepseIndex = marketData?.nepseIndex?.find((index: Stock) => index.sindex === 'NEPSE Index');
  const sensitiveIndex = marketData?.nepseIndex?.find(
    (index: Stock) => index.sindex === 'Sensitive Index'
  );
  const floatIndex = marketData?.nepseIndex?.find((index: Stock) => index.sindex === 'Float Index');
  const totalTurnover = marketData?.marketSummary?.find(
    (item: Stock) => item.ms_key === 'Total Turnover Rs:'
  );
  const totalTradedShares = marketData?.marketSummary?.find(
    (item: Stock) => item.ms_key === 'Total Traded Shares'
  );

  if (!marketData) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#15a37b" />
      </SafeAreaView>
    );
  }

  return (
    <View className="flex flex-col bg-white" style={{ paddingTop: insets.top }}>
      <StatusBar style="auto" />

      {/* Header Section */}
      <View className="mb-1 flex-row items-center justify-between px-6 pt-4">
        <View>
          <Text className="mx-1.5 text-lg font-bold text-gray-500">Hello, Kapalik</Text>
        </View>
        <View className="flex-1 flex-row items-center justify-end">
          <TouchableOpacity
            className="relative p-2 px-3"
            onPress={() => setSearchModalVisible(true)}>
            <Ionicons name="search-outline" size={24} color="#6B7280" />
          </TouchableOpacity>

          <TouchableOpacity className="relative m-1 mx-3">
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
                          : 'text-red-400'
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
                          : 'text-red-400'
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

        <Popup />

        {/* WatchList Section */}
        <View className="">
          <View className="flex flex-row items-center justify-between">
            <Text className="pl-1 text-xl font-bold text-black">Watchlist</Text>
            <TouchableOpacity>
              <Text className="text-md font-normal text-[#15a37b]">View All</Text>
            </TouchableOpacity>
          </View>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex"
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 12 }}>
            {/* Watchlist Items */}
            {watchlist.length > 0 ? (
              watchlist.map((stock) => (
                <StockCard
                  key={stock.id}
                  stock={stock}
                  onPress={() => navigateToStockDetails(stock)}
                  onLongPress={() => removeFromWatchlist(stock.id!)}
                  chartData={chartDataCache[stock.symbol]}
                />
              ))
            ) : (
              <View className="flex flex-row items-center justify-center">
                {/* Left: Message and Add Button */}
                <View className="mr-2 w-52 items-center justify-center rounded-xl border border-[#dce0e2] px-4 py-6">
                  <AntDesign name="disconnect" size={40} color="#808080" />
                  <Text className="mt-2 text-gray-500">Your watchlist is empty</Text>

                  <TouchableOpacity
                    onPress={() => setModalVisible(true)}
                    className="mt-6 flex-row items-center rounded-lg bg-gray-100 px-4 py-2">
                    <AntDesign name="plus" size={20} color="#808080" />
                    <Text className="ml-2 text-sm font-semibold text-gray-700">Add Stocks</Text>
                  </TouchableOpacity>
                </View>

                {/* Right: Suggested Stock Card */}
                {(() => {
                  const nabilStock = portfolioData.find(
                    (stock: { symbol: string }) => stock.symbol === 'NABIL'
                  );
                  return nabilStock ? (
                    <StockCard
                      stock={nabilStock}
                      onPress={() => navigateToStockDetails(nabilStock)}
                      onLongPress={() => removeFromWatchlist(nabilStock.id!)}
                      chartData={chartDataCache[nabilStock.symbol]}
                      isSuggested={true}
                    />
                  ) : null;
                })()}
              </View>
            )}

            {/* Add Stock Card */}
            <TouchableOpacity
              onPress={() => setModalVisible(true)}
              className="mr-3 w-60 items-center justify-center rounded-xl border-2 border-dashed border-[#dce0e2] bg-gray-50 p-4"
              style={{ elevation: 2 }}>
              <AntDesign name="plus" size={28} color="#808080" />
              <Text className="mt-2 text-sm font-semibold text-gray-500">Add Stock</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Portfolio  */}
        <View className="mt-4 flex flex-row items-center justify-between">
          <Text className="pl-1 text-xl font-bold text-black">Portfolio</Text>
          <TouchableOpacity
            className="p-1"
            onPress={() => navigation.navigate('PortfolioScreen', { liveData: portfolioData })}>
            <Text className="text-md font-normal text-[#15a37b]">View All</Text>
          </TouchableOpacity>
        </View>
        <View className="mb-4 mt-3">
          <PortfolioSummary
            portfolio={defaultPortfolio}
            totalValue={totalValue}
            profitLoss={profitLoss}
            onPress={() => navigation.navigate('PortfolioScreen', { liveData: portfolioData })}
          />
        </View>

        {/* Stocks Activity Header */}
        <View className="flex-row items-center justify-between">
          <Text className="pl-1 text-xl font-bold text-black">Market Movers</Text>
        </View>

        <View className="mb-2 py-4">
          <View className="w-full flex-row flex-wrap justify-between">
            <View className="mb-3 w-[49%]">
              {topGainers.map((stock) => (
                <View key={stock.symbol} className="mb-3">
                  <MarketMoverCard stock={stock} onPress={() => navigateToStockDetails(stock)} />
                </View>
              ))}
            </View>
            <View className="mb-3 w-[49%]">
              {topLosers.map((stock) => (
                <View key={stock.symbol} className="mb-3">
                  <MarketMoverCard stock={stock} onPress={() => navigateToStockDetails(stock)} />
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Join Us */}
        <View className="mb-44 rounded-xl border border-[#e9ecef] bg-[#f8f9fa] p-5">
          <View className="mb-2 flex-row items-center">
            <View className="mr-2 rounded-full bg-[#15a37b] p-1">
              <Ionicons name="trophy" size={16} color="white" />
            </View>
            <Text className="text-lg font-bold text-black">Join Arkfie Traders</Text>
          </View>

          <Text className="mb-3 text-sm text-gray-600">
            Get <Text className="font-bold text-[#15a37b]">80% OFF</Text> today to unlock
          </Text>

          <View className="mb-4">
            {[
              'Exclusive Telegram group access',
              'High-return trading strategies',
              'Insider market tips & analysis',
              'Winning stock picks from top traders',
            ].map((item, index) => (
              <View key={index} className="mb-1 flex-row items-start">
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color="#15a37b"
                  className="mr-2 mt-0.5"
                />
                <Text className="flex-1 text-sm text-gray-800">{item}</Text>
              </View>
            ))}
          </View>

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <MaterialIcons name="group" size={16} color="#6c757d" />
              <Text className="ml-1 text-xs text-gray-500">Limited spots remaining</Text>
            </View>

            <TouchableOpacity
              className="flex-row items-center rounded-full bg-[#15a37b] px-4 py-2"
              activeOpacity={0.8}>
              <Text className="mr-2 font-medium text-white">Join VIP Team</Text>
              <MaterialIcons name="arrow-forward" size={16} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <AddStockModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        stocks={availableStocks}
        onAddStock={addToWatchlist}
      />

      <SearchModal
        visible={searchModalVisible}
        onClose={() => setSearchModalVisible(false)}
        stocks={portfolioData}
        onSelectStock={(stock) => {
          setSearchModalVisible(false);
          navigateToStockDetails(stock);
        }}
      />
    </View>
  );
};

export default DashboardScreen;
