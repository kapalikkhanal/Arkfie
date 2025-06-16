import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  FlatList,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LineChart } from 'react-native-wagmi-charts';
import { Ionicons } from '@expo/vector-icons';
import { CandleData, MarketData } from '../../services/marketData';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';

// Types
type TimePeriod = '1W' | '1M' | '3M' | '6M';

interface ProcessedCandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  id: number;
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  type: number;
  pc: number | null;
}

type LiveDataStock = MarketData['data']['liveData'][0];

interface StockWithChange extends LiveDataStock {
  totalTradeValue: never;
  totalTradeQuantity: never;
  sectorName: never;
  isGainer?: boolean;
}

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

const MarketScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { marketData } = route.params as { marketData: MarketData['data'] };

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candleData, setCandleData] = useState<ProcessedCandleData[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1M');
  const [activeTab, setActiveTab] = useState<'summary' | 'indices' | 'stocks'>('summary');

  // Time period configurations
  const timePeriods: Record<TimePeriod, { label: string; days: number }> = {
    '1W': { label: '1W', days: 7 },
    '1M': { label: '1M', days: 30 },
    '3M': { label: '3M', days: 90 },
    '6M': { label: '6M', days: 180 },
  };

  const navigateToStockDetails = (stock: StockWithChange) => {
    navigation.navigate('StockDetails', {
      stock: {
        symbol: stock.symbol,
        name: stock.companyName,
        price: stock.lastTradedPrice?.toString() || '0.00',
        change: stock.schange?.toString() || '0.00',
        perChange: stock.percentageChange?.toString() || '0.00',
        isUp: stock.perChange >= 0,
        sectorName: stock.sectorName,
        totalTradeQuantity: stock.totalTradeQuantity,
        totalTradeValue: stock.totalTradeValue,
      },
    });
  };

  // Process market data
  const topGainers = useMemo(() => {
    if (!marketData?.liveData) return [];
    return [...marketData.liveData]
      .sort((a, b) => (b.perChange || 0) - (a.perChange || 0))
      .slice(0, 5)
      .map((stock) => ({ ...stock, isGainer: true }));
  }, [marketData]);

  const topLosers = useMemo(() => {
    if (!marketData?.liveData) return [];
    return [...marketData.liveData]
      .sort((a, b) => (a.perChange || 0) - (b.perChange || 0))
      .slice(0, 5)
      .map((stock) => ({ ...stock, isGainer: false }));
  }, [marketData]);

  const nepseIndex = marketData?.nepseIndex.find((index) => index.sindex === 'NEPSE Index');

  // Process and validate candle data
  const processCandleData = (data: CandleData[]): ProcessedCandleData[] => {
    if (!data) return [];

    return data
      .filter(validateCandleData)
      .map((item, index) => ({
        timestamp: item.t * 1000,
        open: Number(item.o),
        high: Number(item.h),
        low: Number(item.l),
        close: Number(item.c),
        id: item.id || index,
        t: Number(item.t),
        o: Number(item.o),
        h: Number(item.h),
        l: Number(item.l),
        c: Number(item.c),
        v: Number(item.v),
        type: item.type,
        pc: item.pc,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  };

  // Validate candle data
  const validateCandleData = (item: CandleData): boolean => {
    return !!(
      item &&
      typeof item.t === 'number' &&
      typeof item.o === 'number' &&
      typeof item.h === 'number' &&
      typeof item.l === 'number' &&
      typeof item.c === 'number' &&
      typeof item.v === 'number' &&
      !isNaN(item.t) &&
      !isNaN(item.o) &&
      !isNaN(item.h) &&
      !isNaN(item.l) &&
      !isNaN(item.c) &&
      !isNaN(item.v) &&
      item.o > 0 &&
      item.h > 0 &&
      item.l > 0 &&
      item.c > 0 &&
      item.h >= Math.max(item.o, item.c) &&
      item.l <= Math.min(item.o, item.c)
    );
  };

  // Fetch candle data for selected period
  const fetchCandleData = async (period: TimePeriod = selectedPeriod) => {
    try {
      setLoading(true);
      setError(null);

      const currentTimestamp = Math.floor(Date.now() / 1000);
      const periodTimestamp = currentTimestamp - timePeriods[period].days * 24 * 60 * 60;

      const response = await fetch(
        `https://peridotnepal.xyz/api/company/chart_data/1/${periodTimestamp}`,
        { headers: { Permission: '2021D@T@f@RSt6&%2-D@T@' } }
      );

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      if (data.status !== 200) throw new Error('API returned non-success status');
      if (!data.data || !Array.isArray(data.data)) throw new Error('Invalid data format');

      setCandleData(processCandleData(data.data));
      setError(null);
    } catch (err) {
      console.error('Error fetching market data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch market data');
    } finally {
      setLoading(false);
    }
  };

  // Handle period selection
  const handlePeriodSelect = (period: TimePeriod) => {
    setSelectedPeriod(period);
    setSelectedIndex(null);
    fetchCandleData(period);
  };

  // Initialize with passed data
  useEffect(() => {
    fetchCandleData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Format large numbers
  const formatLargeNumber = (num: number): string => {
    if (num >= 1_00_00_00_000) return `${(num / 1_00_00_00_000).toFixed(2)} खर्ब`;
    if (num >= 1_00_00_000) return `${(num / 1_00_00_000).toFixed(2)} अर्ब`;
    if (num >= 1_00_000) return `${(num / 1_00_000).toFixed(2)} लाख`;
    return num.toLocaleString('en-IN');
  };

  // Render time period selector
  const renderTimePeriodSelector = () => (
    <View className="mb-4 flex-row justify-center">
      <View className="flex w-[75%] flex-row justify-between rounded-lg bg-gray-100 p-2">
        {(Object.keys(timePeriods) as TimePeriod[]).map((key) => (
          <TouchableOpacity
            key={key}
            className={`mx-1 rounded-md px-4 py-2 ${
              selectedPeriod === key ? 'bg-black' : 'bg-transparent'
            }`}
            onPress={() => handlePeriodSelect(key)}>
            <Text
              className={`text-sm font-medium ${
                selectedPeriod === key ? 'text-white' : 'text-gray-600'
              }`}>
              {timePeriods[key].label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Render main chart
  const renderMainChart = () => {
    if (loading) {
      return (
        <View className="h-60 items-center justify-center rounded-lg bg-gray-50">
          <ActivityIndicator size="large" color="#000" />
        </View>
      );
    }

    if (!candleData || candleData.length === 0) {
      return (
        <View className="h-60 items-center justify-center rounded-lg bg-gray-50">
          <Text className="text-gray-500">No chart data available</Text>
        </View>
      );
    }

    const lineData = candleData.map((item) => ({
      timestamp: item.timestamp,
      value: item.close,
    }));

    return (
      <View style={{ height: 260 }}>
        <LineChart.Provider data={lineData}>
          <LineChart height={250}>
            <LineChart.Path color="#64748B" strokeWidth={1}>
              <LineChart.Gradient colors={['#FF0000', '#FF0000']} />
            </LineChart.Path>
            <LineChart.CursorCrosshair
              color="#666"
              onCurrentXChange={({ index }) => {
                if (index !== undefined && index >= 0 && index < candleData.length) {
                  setSelectedIndex(index);
                }
              }}>
              <LineChart.Tooltip
                className="rounded-xl border border-[#dce0e2] bg-white px-2 py-1"
                textStyle={{ color: '#000', fontSize: 12, fontWeight: '700' }}
                cursorGutter={16}
              />
            </LineChart.CursorCrosshair>
          </LineChart>
        </LineChart.Provider>
      </View>
    );
  };

  // Render market summary
  const renderMarketSummary = () => {
    const summaryKeyMap: Record<string, string> = {
      'Total Turnover Rs:': 'Total Turnover',
      'Total Traded Shares': 'Total Traded Shares',
      'Total Transactions': 'Total Transactions',
      'Total Scrips Traded': 'Total Scrips Traded',
      'Total Market Capitalization Rs:': 'Market Capitalization',
      'Total Float Market Capitalization Rs:': 'Float Capitalization',
    };

    return (
      <ScrollView
        className="my-2"
        contentContainerStyle={{ paddingBottom: 100 }} // Optional bottom spacing for safe area
        showsVerticalScrollIndicator={false}>
        {/* Market Summary Grid */}
        <View className="mx-2 flex-row flex-wrap items-center justify-center">
          {marketData?.marketSummary.map((item, index) => {
            const displayKey = summaryKeyMap[item.ms_key] || item.ms_key;
            return (
              <View key={index} className="w-1/2 p-1">
                <View className="h-16 items-center justify-center rounded-xl border border-gray-300 bg-white p-3">
                  <Text className="mb-1 text-xs font-medium text-gray-500">{displayKey}</Text>
                  <Text className="text-base font-bold text-gray-900">
                    {item.ms_key.includes('Rs')
                      ? `Rs. ${formatLargeNumber(Number(item.ms_value))}`
                      : item.ms_value}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        <Text className="mt-4 text-lg font-medium text-center text-black">Sub Indices</Text>
        {renderSubIndices()}
      </ScrollView>
    );
  };

  // Render sub-indices
  const renderSubIndices = () => (
    <View className="mb-6">
      <View className="mx-2 flex-row flex-wrap">
        {marketData?.subIndices.map(
          (
            index: {
              sindex:
                | string
                | number
                | bigint
                | boolean
                | React.ReactElement<unknown, string | React.JSXElementConstructor<any>>
                | Iterable<React.ReactNode>
                | React.ReactPortal
                | Promise<
                    | string
                    | number
                    | bigint
                    | boolean
                    | React.ReactPortal
                    | React.ReactElement<unknown, string | React.JSXElementConstructor<any>>
                    | Iterable<React.ReactNode>
                    | null
                    | undefined
                  >
                | null
                | undefined;
              currentValue: number;
              perChange: number;
            },
            i: React.Key | null | undefined
          ) => (
            <View key={i} className="w-1/3 p-1">
              <View className="h-20 rounded-xl border border-gray-300 bg-white p-3">
                <Text className="mb-1 truncate text-center text-xs font-medium text-gray-500">
                  {index.sindex}
                </Text>
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-bold text-gray-900">
                    {index.currentValue.toFixed(2)}
                  </Text>
                  <Text
                    className={`text-xs font-semibold ${
                      index.perChange >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {index.perChange >= 0 ? '+' : ''}({index.perChange.toFixed(2)}%)
                  </Text>
                </View>
              </View>
            </View>
          )
        )}
      </View>
    </View>
  );

  // Render stock list item
  const renderStockItem = ({ item }: { item: StockWithChange }) => (
    <TouchableOpacity
      onPress={() => navigateToStockDetails(item)}
      className="mb-3 w-full flex-row items-center justify-between rounded-xl border border-[#dce0e2] bg-white p-3 py-4">
      {/* Stock Info */}
      <View className="flex-1 flex-col items-start justify-center">
        <Text className="mt-1 text-sm font-extrabold text-black">{item.symbol}</Text>
        <Text className="mt-1 text-xs font-light text-black">{item.companyName}</Text>
      </View>

      {/* Stock Value and Change */}
      <View className="ml-2 w-20 items-start">
        <Text className="text-base font-bold text-black">{item.schange}</Text>
        <View className="mt-1 flex-row items-center">
          {item.isGainer ? <UpArrowIcon /> : <DownArrowIcon />}
          <Text
            className={`${
              item.isGainer ? 'text-green-600' : 'text-red-600'
            } ml-1 text-sm font-semibold`}>
            {item.percentageChange}
          </Text>
        </View>
      </View>

      {/* Price */}
      <View className="ml-4 w-32 items-end">
        <Text className="text-base font-bold text-black">Rs. {item.lastTradedPrice}</Text>
      </View>
    </TouchableOpacity>
  );

  // Top Gainers Column
  const renderTopGainers = () => (
    <View className="w-full">
      <FlatList
        data={topGainers}
        renderItem={renderStockItem}
        keyExtractor={(item) => item.symbol}
        scrollEnabled={false}
      />
    </View>
  );

  // Top Gainers Column
  const renderTopLosers = () => (
    <View className="w-full">
      <FlatList
        data={topLosers}
        renderItem={renderStockItem}
        keyExtractor={(item) => item.symbol}
        scrollEnabled={false}
      />
    </View>
  );

  // Render tab navigation
  const renderTabNavigation = () => {
    const tabs = [
      { id: 'summary', label: 'Market Summary' },
      { id: 'topgainers', label: 'Top Gainers' },
      { id: 'toplosers', label: 'Top Losers' },
    ];
    return (
      <View className="mb-2 flex-row justify-center border-b border-gray-200">
        {/* Tabs */}
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 ${activeTab === tab.id ? 'border-b-2 border-[#15a37b]' : ''}`}>
            <Text
              className={`text-center font-medium ${
                activeTab === tab.id ? 'text-[#15a37b]' : 'text-gray-600'
              }`}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center p-6">
          <Ionicons name="warning-outline" size={48} color="#ff3b30" />
          <Text className="mb-4 mt-4 text-center text-base text-black">{error}</Text>
          <TouchableOpacity
            className="rounded-lg bg-black px-6 py-3"
            onPress={() => fetchCandleData()}>
            <Text className="font-bold text-white">Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaView className="flex-1 bg-white">
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
          {/* Market Header */}
          <View className="mx-4 mb-4 mt-4 rounded-xl bg-white p-4" style={{ elevation: 2 }}>
            <View className="mb-2 flex-row items-center justify-between">
              <View className="flex-row items-center justify-center">
                <Image
                  source={require('../../assets/logos/nepse.jpeg')}
                  className="h-14 w-14"
                  resizeMode="contain"
                />
                <View className="ml-2 flex flex-col justify-center">
                  <Text className="text-2xl font-bold text-black">Nepse</Text>
                  <Text className="text-sm text-gray-600">Nepal Stock Exchange</Text>
                </View>
              </View>

              <View className="flex-col items-center justify-between">
                <Text className="text-2xl font-bold text-black">
                  {nepseIndex?.currentValue.toFixed(2)}
                </Text>
                <Text
                  className={`ml-1 text-sm font-semibold ${
                    nepseIndex?.perChange >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                  {nepseIndex?.perChange >= 0 ? '+' : ''}
                  {nepseIndex?.perChange.toFixed(2)}% ({nepseIndex?.schange.toFixed(2)})
                </Text>
              </View>
            </View>
          </View>

          {/* Time Period Selector */}
          {renderTimePeriodSelector()}

          {/* Main Chart */}
          <View>{renderMainChart()}</View>

          {/* Tab Navigation */}
          {renderTabNavigation()}

          {/* Content based on active tab */}
          <View className="mx-3">
            {activeTab === 'summary' && renderMarketSummary()}
            {activeTab === 'topgainers' && renderTopGainers()}
            {activeTab === 'toplosers' && renderTopLosers()}
          </View>
        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default MarketScreen;
function getRandomColor(): never {
  throw new Error('Function not implemented.');
}
