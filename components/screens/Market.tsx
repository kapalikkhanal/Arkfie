import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LineChart as WagmiLineChart } from 'react-native-wagmi-charts';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';

const screenWidth = Dimensions.get('window').width;

// Types
type TimePeriod = '1W' | '1M' | '3M' | '6M';

interface ProcessedCandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface StockWithChange {
  symbol: string;
  companyName: string;
  lastTradedPrice: number;
  schange: number;
  perChange: number;
  isGainer?: boolean;
  chartData?: { value: number }[];
}

const timePeriods: Record<TimePeriod, { label: string; days: number }> = {
  '1W': { label: '1W', days: 7 },
  '1M': { label: '1M', days: 30 },
  '3M': { label: '3M', days: 90 },
  '6M': { label: '6M', days: 180 },
};

const MarketScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { marketData } = route.params || {};

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candleData, setCandleData] = useState<ProcessedCandleData[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1M');
  const [activeTab, setActiveTab] = useState<'summary' | 'gainers-losers' | 'losers'>('summary');
  const [chartDataCache, setChartDataCache] = useState<Record<string, { value: number }[]>>({});

  // Utility functions
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

  // MiniChart component
  const MiniChart = React.memo(({ data, color }: { data: { value: number }[]; color: string }) => {
    const hexToRGBA = (hex: string, opacity: number) => {
      const bigint = parseInt(hex.replace('#', ''), 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    };

    return (
      <View className="overflow-hidden" style={{ height: 80, marginTop: -40 }}>
        <LineChart
          data={data}
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
          endSpacing={20}
          spacing={5.5}
        />
      </View>
    );
  });

  // StockCard component
  const StockCard = React.memo(
    ({ stock, onPress }: { stock: StockWithChange; onPress: () => void }) => {
      const chartColor = stock.isGainer ? '#10B981' : '#EF4444';

      return (
        <TouchableOpacity
          onPress={onPress}
          className=" rounded-xl border border-[#dce0e2] bg-white p-4"
          style={{ elevation: 2 }}>
          <View className="flex w-full flex-row items-center justify-between">
            <View>
              <Text className="mt-1 text-sm font-extrabold text-black">{stock.symbol}</Text>
              {/* <Text className="w-48 text-xs font-light text-black">{stock.companyName}</Text> */}
            </View>
            <View>
              <Text
                className={`mt-1 text-sm font-semibold ${
                  stock.isGainer ? 'text-green-500' : 'text-red-500'
                }`}>
                {stock.isGainer ? '+' : ''}
                {stock.perChange.toFixed(2)}%
              </Text>
            </View>
          </View>

          <View className="mt-10 flex w-full flex-row items-center justify-between overflow-x-hidden">
            <View className="flex flex-col items-start justify-center">
              <Text className="w-24 text-sm font-bold text-black">
                Rs. {formatIndianNumber(stock.lastTradedPrice)}
              </Text>
              <Text
                className={`text-sm font-semibold ${
                  stock.isGainer ? 'text-green-500' : 'text-red-500'
                }`}>
                Rs. {stock.isGainer ? '+' : ''}
                {stock.schange.toFixed(2)}
              </Text>
            </View>
            <MiniChart data={stock.chartData || []} color={chartColor} />
          </View>
        </TouchableOpacity>
      );
    }
  );

  // Fetch chart data for individual stocks
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

  // Process market data
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

  // Load chart data for top gainers/losers
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

  const nepseIndex = marketData?.nepseIndex?.find((index) => index.sindex === 'NEPSE Index');

  // Render functions
  const renderMarketMovers = () => (
    <ScrollView showsVerticalScrollIndicator={false} className="mx-2 py-4 mb-20">
      <View className="w-full flex-row flex-wrap justify-between">
        <View className="mb-3 w-[49%]">
          {topGainers.map((stock) => (
            <View key={stock.symbol}>
              <StockCard stock={stock} onPress={() => navigateToStockDetails(stock)} />
            </View>
          ))}
        </View>
        <View className="mb-3 w-[49%]">
          {topLosers.map((stock) => (
            <View key={stock.symbol}>
              <StockCard stock={stock} onPress={() => navigateToStockDetails(stock)} />
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  const renderTopLosers = () => (
    <ScrollView showsVerticalScrollIndicator={false} className="mx-2 py-4">
      <View className="flex-row flex-wrap justify-between">
        {topLosers.map((stock) => (
          <View key={stock.symbol} className="mb-3 w-[49%]">
            <StockCard stock={stock} onPress={() => navigateToStockDetails(stock)} />
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const navigateToStockDetails = (stock: StockWithChange) => {
    navigation.navigate('StockDetails', {
      stock: {
        symbol: stock.symbol,
        name: stock.companyName,
        price: stock.lastTradedPrice?.toString() || '0.00',
        change: stock.schange?.toString() || '0.00',
        perChange: stock.perChange?.toString() || '0.00',
        isUp: stock.isGainer,
      },
    });
  };

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
        <WagmiLineChart.Provider data={lineData}>
          <WagmiLineChart height={250}>
            <WagmiLineChart.Path color="#64748B" strokeWidth={1}>
              <WagmiLineChart.Gradient colors={['#FF0000', '#FF0000']} />
            </WagmiLineChart.Path>
            <WagmiLineChart.CursorCrosshair
              color="#666"
              onCurrentXChange={({ index }) => {
                if (index !== undefined && index >= 0 && index < candleData.length) {
                  setSelectedIndex(index);
                }
              }}>
              <WagmiLineChart.Tooltip
                className="rounded-xl border border-[#dce0e2] bg-white px-2 py-1"
                textStyle={{ color: '#000', fontSize: 12, fontWeight: '700' }}
                cursorGutter={16}
              />
            </WagmiLineChart.CursorCrosshair>
          </WagmiLineChart>
        </WagmiLineChart.Provider>
      </View>
    );
  };

  const renderMarketSummary = () => {
    if (!marketData?.marketSummary) return null;

    return (
      <View className="mb-20">
        <Text className="mb-3 text-lg font-bold text-black">Market Summary</Text>
        <View className="flex flex-row flex-wrap">
          {marketData.marketSummary.map(
            (item: {
              id: React.Key | null | undefined;
              ms_key:
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
              ms_value: any;
            }) => (
              <View key={item.id} className="w-1/2 p-2">
                <View className="rounded-lg bg-gray-50 p-3">
                  <Text className="text-sm text-gray-600">{item.ms_key}</Text>
                  <Text className="text-base font-bold text-black">
                    {formatIndianNumber(item.ms_value)}
                  </Text>
                </View>
              </View>
            )
          )}
        </View>
      </View>
    );
  };

  const renderSubIndicesChart = () => {
    if (!marketData?.subIndices || marketData.subIndices.length === 0) return null;

    // Generate distinct colors for each sector
    const sectorColors = [
      '#3B82F6',
      '#10B981',
      '#F59E0B',
      '#EF4444',
      '#8B5CF6',
      '#EC4899',
      '#14B8A6',
      '#F97316',
      '#6366F1',
      '#A855F7',
    ];

    // Sort by percentage change (descending)
    const sortedData = [...marketData.subIndices].sort((a, b) => b.perChange - a.perChange);

    const barData = sortedData.map((sector, index) => ({
      value: sector.perChange,
      frontColor: sectorColors[index % sectorColors.length], // Cycle through colors
      topLabelComponent: () => (
        <Text
          className={`text-xs font-semibold ${sector.perChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {sector.perChange >= 0 ? '+' : ''}
          {sector.perChange.toFixed(2)}%
        </Text>
      ),
      labelTextStyle: { color: 'black', width: 24 }, // Style for the index number
    }));

    return (
      <View className="mt-4">
        <View className="h-fit w-screen">
          {/* Sector legend with index numbers */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-2 py-1"
            contentContainerStyle={{ paddingHorizontal: 8 }}>
            <View className="flex-row">
              {Array.from({ length: Math.ceil(sortedData.length / 2) }).map((_, colIndex) => (
                <View key={colIndex} className="mr-4">
                  {sortedData.slice(colIndex * 2, colIndex * 2 + 2).map((sector, rowIndex) => {
                    const index = colIndex * 2 + rowIndex;
                    return (
                      <View key={sector.id} className="mb-2 flex-row items-center">
                        <View
                          style={{
                            backgroundColor: sectorColors[index % sectorColors.length],
                            width: 12,
                            height: 12,
                            borderRadius: 4,
                            marginRight: 4,
                          }}
                        />
                        <Text className="text-xs text-gray-700">
                          {index + 1}. {sector.sindex}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
          <View className='-mb-36'>
            <BarChart
              data={barData}
              // barWidth={24}
              spacing={4}
              roundedTop={false}
              roundedBottom={false}
              hideRules
              yAxisThickness={0}
              xAxisThickness={0}
              hideYAxisText
              hideAxesAndRules
              noOfSections={1}
              maxValue={Math.max(...sortedData.map((d) => Math.abs(d.perChange))) * 1.3}
              minValue={Math.min(...sortedData.map((d) => -Math.abs(d.perChange))) * 1.3}
              renderTooltip={(item: any) => (
                <View className="rounded border border-gray-200 bg-white p-2">
                  <View className="flex-col items-center justify-center">
                    <Text className="mb-1 text-xs font-bold" style={{ textAlign: 'center' }}>
                      {sortedData[item.index].sindex}
                    </Text>
                    <Text
                      className={`text-xs ${item.value >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {item.value >= 0 ? '+' : ''}
                      {item.value.toFixed(2)}%
                    </Text>
                  </View>
                </View>
              )}
              showVerticalLines={false}
              // showFractionalValues
              // side="right"
            />
          </View>
        </View>
      </View>
    );
  };

  // Main render
  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaView className="flex-1 bg-white">
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
          {/* Header Section */}
          <View className="mx-4 mb-4 mt-4 rounded-xl bg-white p-4" style={{ elevation: 2 }}>
            <View className="mb-2 flex-row items-center justify-between">
              <View>
                <Text className="text-2xl font-bold text-black">Nepse</Text>
                <Text className="text-sm text-gray-600">Nepal Stock Exchange</Text>
              </View>
              <View className="flex-col items-end">
                <Text className="text-2xl font-bold text-black">
                  {nepseIndex?.currentValue?.toFixed(2) || '0.00'}
                </Text>
                <Text
                  className={`text-sm font-semibold ${
                    (nepseIndex?.perChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                  {(nepseIndex?.perChange || 0) >= 0 ? '+' : ''}
                  {nepseIndex?.perChange?.toFixed(2) || '0.00'}%
                </Text>
              </View>
            </View>
          </View>

          {/* Time Period Selector */}
          {renderTimePeriodSelector()}

          {renderMainChart()}

          {/* Tab Navigation */}
          <View className="mb-2 flex-row justify-center border-b border-gray-200">
            {['gainers-losers', 'summary', 'losers'].map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab as any)}
                className={`flex-1 py-3 ${activeTab === tab ? 'border-b-2 border-[#15a37b]' : ''}`}>
                <Text
                  className={`text-center font-medium ${
                    activeTab === tab ? 'text-[#15a37b]' : 'text-gray-600'
                  }`}>
                  {tab === 'gainers-losers'
                    ? 'Market Movers'
                    : tab === 'losers'
                      ? 'Top Losers'
                      : 'Performaces'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Content Section */}
          <View className="">
            {activeTab === 'gainers-losers' && renderMarketMovers()}
            {activeTab === 'losers' && renderTopLosers()}
            {activeTab === 'summary' && (
              <View className="px-4">
                {renderSubIndicesChart()}
                {renderMarketSummary()}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default MarketScreen;
