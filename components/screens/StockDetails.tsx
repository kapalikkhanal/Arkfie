import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { Svg, Path } from 'react-native-svg';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, Ionicons } from '@expo/vector-icons';
import moment from 'moment';

const { width } = Dimensions.get('window');

const statsData = [
  { label: 'Market Cap', value: 'Rs 12.5B' },
  { label: 'P/E Ratio', value: '18.5' },
  { label: 'Volume', value: '1.2M' },
  { label: '52W High', value: 'Rs 892.00' },
  { label: '52W Low', value: 'Rs 445.00' },
  { label: 'Dividend Yield', value: '3.2%' },
];

const BackIcon = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path
      d="M19 12H5M12 19L5 12L12 5"
      stroke="#000"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const HeartIcon = ({ filled = false }) => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 12.2565C20 15.7437 19.4904 21.077 19.4904 21.2821C19.4904 21.4872 19.2866 21.7949 19.0828 21.8975C18.9809 22.0001 18.879 22.0001 18.6752 22.0001C18.5732 22.0001 18.4713 22.0001 18.2675 21.8975L12.051 18.6154C11.949 18.6154 11.8471 18.6154 11.8471 18.6154L5.63057 21.8975C5.42675 22.0001 5.12102 22.0001 4.9172 21.8975C4.71338 21.7949 4.50955 21.5898 4.50955 21.2821C4.50955 21.077 4 15.7437 4 12.2565C4.10191 10.0001 4.30573 7.0257 4.50955 4.87186C4.61146 3.53852 5.63057 2.51288 6.95541 2.30775C8.38217 2.20519 10.4204 2.00006 12.051 2.00006C13.6815 2.00006 15.7197 2.20519 17.1465 2.30775C18.4713 2.41032 19.4904 3.53852 19.5924 4.87186C19.7962 7.0257 20 10.0001 20 12.2565Z"
      stroke={filled ? '#000' : '#6B7280'}
      fill={filled ? '#000' : 'none'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"></Path>
  </Svg>
);

const UpArrowIcon = () => (
  <Svg width="16" height="16" viewBox="0 0 24 24" fill="none">
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
  <Svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 5V19M19 12L12 19L5 12"
      stroke="#EF4444"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const StockDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { stock } = route.params;

  const [timeframe, setTimeframe] = useState('1D');
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [activeTab, setActiveTab] = useState('chart');
  const [chartData, setChartData] = useState([]);
  const [volumeData, setVolumeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const timeframes = ['1M', '3M', '6M', '1Y'];
  const tabs = [
    { id: 'chart', label: 'Chart' },
    { id: 'stats', label: 'Stats' },
    { id: 'news', label: 'News' },
  ];

  useEffect(() => {
    checkWatchlistStatus();
    fetchChartData();
  }, []);

  useEffect(() => {
    if (chartData.length > 0) {
      filterDataByTimeframe();
    }
  }, [timeframe, chartData]);

  const checkWatchlistStatus = async () => {
    try {
      const savedWatchlist = await AsyncStorage.getItem('watchlist');
      if (savedWatchlist) {
        const parsedWatchlist = JSON.parse(savedWatchlist);
        const isInList = parsedWatchlist.some(
          (item: { symbol: any }) => item.symbol === stock.symbol
        );
        setIsInWatchlist(isInList);
      }
    } catch (error) {
      console.error('Error checking watchlist status:', error);
    }
  };

  const fetchChartData = async () => {
    try {
      setLoading(true);
      const currentTimestamp = Date.now() / 1000;
      const oneYearAgoTimestamp = currentTimestamp - 24 * 24 * 60 * 60;

      const response = await fetch(
        `https://peridotnepal.xyz/api/company/chart_data/${stock.symbol}/${oneYearAgoTimestamp}`,
        {
          headers: {
            permission: '2021D@T@f@RSt6&%2-D@T@',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch chart data');
      }

      const data = await response.json();
      //   console.log(data);
      if (response.status === 200 && data.data) {
        // Sort data by timestamp in ascending order
        const sortedData = data.data.sort((a: { t: number }, b: { t: number }) => a.t - b.t);
        setChartData(sortedData);

        // Prepare volume data for bar chart
        const volData = sortedData.map((item: { v: { toString: () => any }; t: any }) => ({
          value: item.v,
          label: moment.unix(item.t).format('DD MMM'),
          dataPointText: item.v.toString(),
        }));
        setVolumeData(volData);
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching chart data:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateChartMetrics = (data: any[]) => {
    if (!data || data.length === 0) return null;

    // Calculate min and max values with some padding
    const values = data.map((item) => item.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    const padding = (maxValue - minValue) * 0.1; // 10% padding
    const adjustedMin = Math.max(0, minValue - padding);
    const adjustedMax = maxValue + padding;

    // Calculate optimal spacing based on data range
    const range = adjustedMax - adjustedMin;
    let spacing = 50;
    if (range > 1000) spacing = 100;
    if (range > 5000) spacing = 500;
    if (range > 10000) spacing = 1000;

    // Calculate optimal number of labels
    const numLabels = Math.min(5, data.length);
    const labelStep = Math.ceil(data.length / numLabels);

    return {
      minValue: adjustedMin,
      maxValue: adjustedMax,
      spacing,
      labelStep,
    };
  };

  const filterDataByTimeframe = () => {
    if (!chartData || chartData.length === 0) return [];

    let filteredData = [];
    const now = moment();

    switch (timeframe) {
      case '1M':
        // Get data from the last 30 days (including today)
        filteredData = chartData.filter((item) =>
          moment.unix(item.t).isAfter(now.clone().subtract(30, 'days'))
        );
        break;
      case '3M':
        // Get data from the last 90 days (including today)
        filteredData = chartData.filter((item) =>
          moment.unix(item.t).isAfter(now.clone().subtract(90, 'days'))
        );
        break;
      case '6M':
        // Get data from the last 90 days (including today)
        filteredData = chartData.filter((item) =>
          moment.unix(item.t).isAfter(now.clone().subtract(180, 'days'))
        );
        break;
      case '1Y':
        // Show all available data (already sorted by date)
        filteredData = [...chartData];
        break;
      default:
        filteredData = [...chartData];
    }

    // If we have less than 2 data points, return empty to avoid chart errors
    if (filteredData.length < 2) return [];

    return filteredData.map((item) => ({
      value: item.c,
      label: moment.unix(item.t).format('DD MMM'),
      date: moment.unix(item.t).toDate(),
      dataPointText: `Rs ${item.c}`,
      open: item.o,
      high: item.h,
      low: item.l,
      volume: item.v,
      labelText: moment.unix(item.t).format('MMM DD'),
    }));
  };

  const toggleWatchlist = async () => {
    try {
      const savedWatchlist = await AsyncStorage.getItem('watchlist');
      let parsedWatchlist = savedWatchlist ? JSON.parse(savedWatchlist) : [];

      if (isInWatchlist) {
        // Remove from watchlist
        parsedWatchlist = parsedWatchlist.filter(
          (item: { symbol: any }) => item.symbol !== stock.symbol
        );
        setIsInWatchlist(false);
        Alert.alert('Removed', `${stock.symbol} removed from watchlist`);
      } else {
        // Add to watchlist
        const newWatchlistItem = {
          id: Date.now(),
          name: stock.name,
          symbol: stock.symbol,
          price: stock.price,
          change: parseFloat(stock.change) || 0,
          perChange: parseFloat(stock.perChange) || 0,
        };
        parsedWatchlist.push(newWatchlistItem);
        setIsInWatchlist(true);
        Alert.alert('Added', `${stock.symbol} added to watchlist`);
      }

      await AsyncStorage.setItem('watchlist', JSON.stringify(parsedWatchlist));
    } catch (error) {
      console.error('Error toggling watchlist:', error);
    }
  };

  const renderChart = () => {
    const filteredData = filterDataByTimeframe();
    const metrics = calculateChartMetrics(filteredData);

    if (loading) {
      return (
        <View className="mb-4 h-80 items-center justify-center rounded-xl bg-white px-2 py-4">
          <ActivityIndicator size="large" color="#15a37b" />
        </View>
      );
    }

    if (error) {
      return (
        <View className="mb-4 h-80 items-center justify-center rounded-xl bg-white px-2 py-4">
          <Text className="text-red-500">{error}</Text>
          <TouchableOpacity
            className="mt-4 rounded-lg bg-[#15a37b] px-4 py-2"
            onPress={fetchChartData}>
            <Text className="text-white">Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const baseSpacing = 20;
    const minSpacing = 18;
    const maxSpacing = 50;
    let spacing = baseSpacing;

    if (filteredData.length > 15) {
      spacing = Math.max(minSpacing, baseSpacing - (filteredData.length - 15));
    } else if (filteredData.length < 10) {
      spacing = Math.min(maxSpacing, baseSpacing + (10 - filteredData.length) * 5);
    }

    return (
      <View className="mb-4 rounded-xl bg-white px-2 py-4" style={{ elevation: 2 }}>
        {/* Timeframe Selection */}
        <View className="mb-6 w-full flex-col items-center justify-between">
          <View className="flex w-full flex-row justify-evenly">
            {timeframes.map((tf) => (
              <TouchableOpacity
                key={tf}
                onPress={() => setTimeframe(tf)}
                className={`rounded-lg px-4 py-2 ${
                  timeframe === tf ? 'bg-[#15a37b]' : 'bg-gray-50'
                }`}>
                <Text
                  className={`text-sm font-medium ${
                    timeframe === tf ? 'text-white' : 'text-gray-600'
                  }`}>
                  {tf}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Chart Container */}
        <View className="mb-4 overflow-hidden rounded-lg bg-gray-50/30 p-2">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 20 }}>
            <LineChart
              data={filteredData}
              color="#1dcc97"
              thickness={2.5}
              curved
              isAnimated
              animationDuration={1200}
              height={220}
              width={Math.max(width * 1.8, filteredData.length * spacing)}
              initialSpacing={0}
              spacing={spacing}
              yAxisOffset={metrics?.minValue || 0}
              noOfSections={5}
              yAxisLabelWidth={40}
              yAxisLabelPrefix="Rs "
              yAxisTextStyle={{ fontSize: 10 }}
              xAxisLabelTextStyle={{ fontSize: 10, textAlign: 'center' }}
              hideDataPoints={filteredData.length > 30}
              dataPointsColor="#15a37b"
              dataPointsRadius={4}
              startFillColor="rgba(21, 163, 123, 0.08)"
              endFillColor="rgba(21, 163, 123, 0.02)"
              startOpacity={0.5}
              endOpacity={0}
              areaChart
              showReferenceLine1
              referenceLine1Position={metrics ? (metrics.minValue + metrics.maxValue) / 2 : 0}
              referenceLine1Config={{
                color: 'gray',
                dashWidth: 2,
                dashGap: 3,
              }}
              focusEnabled
              showStripOnFocus
              stripColor="rgba(21, 163, 123, 0.3)"
              stripWidth={2}
              showTextOnFocus
              textFontSize={12}
              textColor="#374151"
              focusedDataPointColor="#15a37b"
              focusedDataPointRadius={6}
              pointerConfig={{
                pointerStripHeight: 160,
                pointerStripColor: 'lightgray',
                pointerStripWidth: 2,
                pointerColor: 'lightgray',
                radius: 6,
                pointerLabelWidth: 140,
                pointerLabelHeight: 120,
                activatePointersOnLongPress: true,
                autoAdjustPointerLabelPosition: true,
                pointerLabelComponent: (items: any[]) => {
                  const item = items[0];
                  return (
                    <View
                      style={{
                        height: 120,
                        width: 140,
                        padding: 10,
                        borderRadius: 8,
                        backgroundColor: 'white',
                        borderWidth: 1,
                        borderColor: '#E5E7EB',
                      }}>
                      <Text style={{ fontSize: 10, color: '#6B7280' }}>
                        {moment(item.date).format('DD MMM YYYY, HH:mm')}
                      </Text>
                      <Text style={{ fontWeight: 'bold', marginTop: 4 }}>
                        Rs {item.value.toFixed(2)}
                      </Text>
                      <View style={{ marginTop: 4 }}>
                        <Text style={{ fontSize: 10 }}>Open: Rs {item.open}</Text>
                        <Text style={{ fontSize: 10 }}>High: Rs {item.high}</Text>
                        <Text style={{ fontSize: 10 }}>Low: Rs {item.low}</Text>
                        <Text style={{ fontSize: 10 }}>Volume: {item.volume}</Text>
                      </View>
                    </View>
                  );
                },
              }}
            />
          </ScrollView>
        </View>

        {/* Price Info */}
        <View className="mt-4 flex-row items-center justify-between border-t border-gray-100 pt-4">
          <View>
            <Text className="text-xs text-gray-500">Current Price</Text>
            <Text className="text-lg font-bold text-black">Rs. {stock.price}</Text>
          </View>
          <View className="items-end">
            <Text className="text-xs text-gray-500">Today&apos;s Change</Text>
            <View className="flex-row items-center">
              {stock.isUp ? <UpArrowIcon /> : <DownArrowIcon />}
              <Text
                className={`ml-1 text-sm font-semibold ${
                  stock.isUp ? 'text-green-600' : 'text-red-600'
                }`}>
                {stock.change} ({stock.perChange})
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderStats = () => (
    <View className="mx-4 mb-4 rounded-xl bg-white p-4" style={{ elevation: 2 }}>
      <Text className="mb-4 text-lg font-bold text-black">Key Statistics</Text>
      <View className="flex-row flex-wrap">
        {statsData.map((stat, index) => (
          <View key={index} className="mb-4 w-1/2">
            <Text className="text-sm text-gray-600">{stat.label}</Text>
            <Text className="text-lg font-semibold text-black">{stat.value}</Text>
          </View>
        ))}
      </View>

      <Text className="mb-4 mt-4 text-lg font-bold text-black">Volume</Text>
      {volumeData && volumeData.length > 0 ? (
        <BarChart
          data={volumeData}
          width={width - 80}
          height={150}
          barWidth={40}
          spacing={20}
          roundedTop
          barBorderRadius={4}
          frontColor="#15a37b"
          showGradient
          gradientColor="#4fd1c7"
          hideAxesAndRules={false}
          xAxisColor="#E5E7EB"
          yAxisColor="#E5E7EB"
          isAnimated
          animationDuration={1000}
        />
      ) : (
        <View className="h-40 items-center justify-center">
          <Text className="text-gray-500">No volume data available</Text>
        </View>
      )}
    </View>
  );

  const renderNews = () => (
    <View className="mx-4 mb-4 rounded-xl bg-white p-4" style={{ elevation: 2 }}>
      <Text className="mb-4 text-lg font-bold text-black">Recent News</Text>
      <View className="space-y-4">
        <View className="border-b border-gray-100 pb-3">
          <Text className="mb-1 text-sm font-semibold text-black">
            {stock.symbol} Reports Strong Q4 Earnings
          </Text>
          <Text className="mb-2 text-xs text-gray-600">2 hours ago</Text>
          <Text className="text-sm text-gray-700">
            Company announces better than expected quarterly results with revenue growth of 15%...
          </Text>
        </View>
        <View className="border-b border-gray-100 pb-3">
          <Text className="mb-1 text-sm font-semibold text-black">
            Market Analysis: Banking Sector Outlook
          </Text>
          <Text className="mb-2 text-xs text-gray-600">5 hours ago</Text>
          <Text className="text-sm text-gray-700">
            Analysts remain optimistic about the banking sector performance in the upcoming
            quarter...
          </Text>
        </View>
        <View className="pb-3">
          <Text className="mb-1 text-sm font-semibold text-black">
            Regulatory Changes Impact Stock Performance
          </Text>
          <Text className="mb-2 text-xs text-gray-600">1 day ago</Text>
          <Text className="text-sm text-gray-700">
            New regulations announced by the central bank are expected to affect trading volumes...
          </Text>
        </View>
      </View>
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'chart':
        return renderChart();
      case 'stats':
        return renderStats();
      case 'news':
        return renderNews();
      default:
        return renderChart();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle={'default'} />

      {/* Header */}
      <View className="w-full flex-row items-center justify-between bg-white px-4 py-3">
        <TouchableOpacity className="w-1/3" onPress={() => navigation.goBack()}>
          <BackIcon />
        </TouchableOpacity>
        <Text className="w-1/3 text-center text-lg font-bold text-black">{stock.symbol}</Text>
        <View className="flex w-1/3 flex-row items-center justify-end">
          <TouchableOpacity className="mr-8">
            <Feather name="share" size={22} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleWatchlist}>
            <HeartIcon filled={isInWatchlist} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1">
        {/* Stock Info Card */}
        <View className="mx-4 mb-4 mt-4 rounded-xl bg-white p-4" style={{ elevation: 2 }}>
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-2xl font-bold text-black">{stock.symbol}</Text>
            <Text className="text-2xl font-bold text-black">Rs. {stock.price}</Text>
          </View>

          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-sm text-gray-600">{stock.name}</Text>
            <View className="flex-row items-center">
              {stock.isUp ? <UpArrowIcon /> : <DownArrowIcon />}
              <Text
                className={`ml-1 text-sm font-semibold ${
                  stock.isUp ? 'text-green-600' : 'text-red-600'
                }`}>
                {stock.perChange} ({stock.change})
              </Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View className="mx-4 mb-4 flex-row rounded-xl bg-white" style={{ elevation: 2 }}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 ${
                activeTab === tab.id ? 'border-b-2 border-[#15a37b]' : ''
              }`}>
              <Text
                className={`text-center font-medium ${
                  activeTab === tab.id ? 'text-[#15a37b]' : 'text-gray-600'
                }`}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {renderTabContent()}

        {/* Bottom spacing */}
        <View className="h-6" />
      </ScrollView>
    </SafeAreaView>
  );
};

export default StockDetailsScreen;
