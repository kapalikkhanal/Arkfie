import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { Svg, Path } from 'react-native-svg';
// import { LineChart } from 'react-native-gifted-charts';
import { LineChart } from 'react-native-wagmi-charts';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import formatIndianNumber from 'components/Dashboard/FormatIndianNumber';
import moment from 'moment';
import { PieChart } from 'react-native-gifted-charts';
import StockCard from 'components/Dashboard/StockCard';
import FearGauge from 'components/FearMeter';

const { width } = Dimensions.get('window');

// Types
interface ChartDataPoint {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

interface StockDetails {
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  totalTradeQuantity: string;
  totalTradeValue: string;
  lastTradedPrice: string;
  percentageChange: string;
  lastUpdatedDateTime: string;
  lastUpdatedDate: string;
  totalTrades: string;
  previousClose: string;
  marketCapitalization: string;
  fiftyTwoWeekHigh: string;
  fiftyTwoWeekLow: string;
  averageTradedPrice: string;
  companyName: string;
  symbol: string;
  instrumentType: string;
  public: string;
  promoter: string;
  companyEmail: string;
  sectorName: string;
  cap_type: string;
  schange: number;
  perChange: number;
}

interface RelatedStock {
  symbol: string;
  name: string;
  price: string;
  change: string;
  perChange: string;
  isUp: boolean;
}

interface Stock {
  symbol: string;
  name: string;
  price: string;
  change: string;
  perChange: string;
  isUp: boolean;
}

interface RouteParams {
  stock: Stock;
}

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
  const { stock, liveData } = route.params as RouteParams;

  const [timeframe, setTimeframe] = useState<string>('1M');
  const [isInWatchlist, setIsInWatchlist] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('chart');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [volumeData, setVolumeData] = useState([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState(null);
  const [meterData, setMeterData] = useState<number | null>(null);

  const [stockDetails, setStockDetails] = useState<StockDetails | null>(null);
  const [relatedStocks, setRelatedStocks] = useState<RelatedStock[]>([]);

  const timeframes = ['1M', '3M', '6M', '1Y'];
  const tabs = [
    { id: 'chart', label: 'Chart' },
    { id: 'news', label: 'News' },
  ];

  useEffect(() => {
    checkWatchlistStatus();
    fetchChartData();
    fetchStockDetails();
    findRelatedStocks();
    fetchFearMeterData();
  }, []);

  useEffect(() => {
    if (chartData.length > 0) {
      filterDataByTimeframe();
    }
  }, [timeframe, chartData]);

  const handleShare = () => {
    try {
      console.log(stock);
      const shareMessage = `Check out ${stock.symbol} (${stockDetails?.companyName || stock.name}) on Arkfie:
    
      Current Price: Rs ${stock.lastTradedPrice}
      Today's Change: Rs ${stock.schange} (${stock.percentageChange}%)
      Last Updated: ${moment(stock?.lastUpdatedDate).format('MMM DD')}

      Download Arkfie to track this stock and get real-time market updates, detailed analysis, and trading insights!

      https://arkfie.com/download`;

      Share.share({
        message: shareMessage,
        title: `Share ${stock.symbol} Details`,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share stock details');
      console.error('Error sharing:', error);
    }
  };

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

  const fetchStockDetails = async () => {
    try {
      const response = await fetch(`https://peridotnepal.xyz/api/live_data/live/${stock.symbol}`, {
        headers: {
          Permission: '2021D@T@f@RSt6&%2-D@T@',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch stock details');
      }

      const data = await response.json();
      if (data.status === 200 && data.data && data.data.length > 0) {
        setStockDetails(data.data[0]);
      }
    } catch (err: any) {
      console.error('Error fetching stock details:', err);
    }
  };

  const fetchFearMeterData = async () => {
    try {
      const response = await fetch(
        `https://peridotnepal.xyz/api/company/get_trading_meter/${stock.symbol}`,
        {
          headers: {
            Permission: '2021D@T@f@RSt6&%2-D@T@',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch stock details');
      }

      const data = await response.json();
      if (data.status === 200 && data.data) {
        setMeterData(data.data.percent);
      }
    } catch (err: any) {
      console.error('Error fetching stock details:', err);
    }
  };

  const fetchChartData = async () => {
    try {
      setLoading(true);
      const currentTimestamp = Date.now() / 1000;
      const oneYearAgoTimestamp = currentTimestamp - 365 * 24 * 60 * 60;

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

  const findRelatedStocks = () => {
    if (!liveData || !stock) return;

    // console.log("Live Data:",liveData)

    const filtered = liveData.filter(
      (s: { symbol: string; sectorName: string }) =>
        s.symbol !== stock.symbol && s.sectorName === stock.sectorName
    );

    setRelatedStocks(filtered);
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

    // Prepare data for wagmi charts
    const chartData = filteredData.map((item) => ({
      timestamp: item.date.getTime(),
      value: item.value,
      open: item.open,
      high: item.high,
      low: item.low,
      volume: item.volume,
    }));

    const minIndex = chartData.reduce(
      (minIdx, curr, idx, arr) => (curr.value < arr[minIdx].value ? idx : minIdx),
      0
    );

    const maxIndex = chartData.reduce(
      (maxIdx, curr, idx, arr) => (curr.value > arr[maxIdx].value ? idx : maxIdx),
      0
    );

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

        {/* Wagmi Chart */}
        <View style={{ height: 300 }}>
          <LineChart.Provider data={chartData}>
            <LineChart height={250}>
              <LineChart.Path color={stock.perChange >= 0 ? '#10B981' : '#EF4444'} width={2}>
                <LineChart.Gradient
                  colors={
                    stock.perChange >= 0
                      ? ['rgba(16, 185, 129, 0.2)', 'rgba(16, 185, 129, 0)']
                      : ['rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0)']
                  }
                />
                <LineChart.Dot at={minIndex} color="red" hasPulse />
                <LineChart.Dot at={maxIndex} color="green" hasPulse />
              </LineChart.Path>

              <LineChart.CursorCrosshair color="#64748B">
                <LineChart.Tooltip
                  textStyle={{
                    color: '#000',
                    fontSize: 12,
                    fontWeight: 'bold',
                  }}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: 8,
                    padding: 8,
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                  }}
                />
              </LineChart.CursorCrosshair>
            </LineChart>

            {/* X-Axis with dates */}
            <LineChart.DatetimeText
              locale="en-IN"
              options={{
                year: undefined,
                month: 'short',
                day: 'numeric',
              }}
              style={{
                color: '#64748B',
                fontSize: 12,
                marginTop: 8,
              }}
            />
          </LineChart.Provider>
        </View>

        {/* Price Info */}
        {/* <View className="mt-4 flex-row items-center justify-between border-t border-gray-100 pt-4">
          <View>
            <Text className="text-xs text-gray-500">Current Price</Text>
            <Text className="text-lg font-bold text-black">Rs. {stock.lastTradedPrice}</Text>
          </View>
          <View className="items-end">
            <Text className="text-xs text-gray-500">Today's Change</Text>
            <View className="flex-row items-center">
              {stock.perChange >= 0 ? <UpArrowIcon /> : <DownArrowIcon />}
              <Text
                className={`ml-1 text-sm font-semibold ${
                  stock.perChange >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                Rs {stock.schange} ({stock.perChange}%)
              </Text>
            </View>
          </View>
        </View> */}
      </View>
    );
  };

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
        return (
          <>
            {renderChart()}
            {renderKeyStats()}
            {/* {renderRelatedStocks()} */}
          </>
        );
      case 'news':
        return renderNews();
      default:
        return renderChart();
    }
  };

  const renderKeyStats = () => {
    if (!stockDetails) return null;

    // Calculate holdings percentages
    const totalShares = parseFloat(stockDetails.public) + parseFloat(stockDetails.promoter);
    // console.log(totalShares)
    const publicPercentage = totalShares > 0 ? (stockDetails.public / totalShares) * 100 : 0;
    const promoterPercentage = totalShares > 0 ? (stockDetails.promoter / totalShares) * 100 : 0;

    const stats = [
      { label: 'Market Cap', value: `Rs ${formatIndianNumber(stockDetails.marketCapitalization)}` },
      { label: 'Open Price', value: `Rs ${formatIndianNumber(stockDetails.openPrice)}` },
      { label: 'High Price', value: `Rs ${formatIndianNumber(stockDetails.highPrice)}` },
      { label: 'Low Price', value: `Rs ${formatIndianNumber(stockDetails.lowPrice)}` },
      { label: '52W High', value: `Rs ${formatIndianNumber(stockDetails.fiftyTwoWeekHigh)}` },
      { label: '52W Low', value: `Rs ${formatIndianNumber(stockDetails.fiftyTwoWeekLow)}` },
      { label: 'Volume', value: formatIndianNumber(stockDetails.totalTradeQuantity) },
      { label: 'Total Trades', value: formatIndianNumber(stockDetails.totalTrades) },
    ];

    return (
      <View className="mx-4 -mt-10 rounded-xl border border-[#dce0e2] p-6" style={{ elevation: 2 }}>
        {/* Shareholding Pattern Pie Chart */}
        <View className="mb-2">
          <Text className="mb-4 text-center text-lg font-bold text-black">
            Shareholding Pattern
          </Text>
          <View className="flex-col items-center justify-between">
            <View className="flex-1">
              <View className="items-center">
                <PieChart
                  data={[
                    {
                      value: publicPercentage,
                      color: '#3B82F6',
                      text: 'Public',
                      textColor: 'white',
                      textSize: 10,
                      shiftX: 2.25,
                      shiftY: -1,
                    },
                    {
                      value: promoterPercentage,
                      color: '#10B981',
                      text: 'Promoter',
                      textColor: 'white',
                      textSize: 10,
                    },
                  ]}
                  radius={80}
                  innerRadius={45}
                  textSize={10}
                  showTextBackground
                  textBackgroundRadius={12}
                  centerLabelComponent={() => (
                    <View className="items-center">
                      <Text className="text-xs font-semibold text-gray-600">Total Share</Text>
                      <Text className="text-xs font-bold text-black">
                        {Math.floor(totalShares)}
                      </Text>
                    </View>
                  )}
                />
              </View>
            </View>

            <View className="mt-4 flex-1 pl-4">
              <View className="mb-3 flex-row items-center">
                <View className="mr-2 h-3 w-3 rounded-full bg-[#3B82F6]" />
                <Text className="text-sm text-gray-700">
                  Public: {formatIndianNumber(stockDetails.public)} ({publicPercentage.toFixed(1)}%)
                </Text>
              </View>
              <View className="flex-row items-center">
                <View className="mr-2 h-3 w-3 rounded-full bg-[#10B981]" />
                <Text className="text-sm text-gray-700">
                  Promoter: {formatIndianNumber(stockDetails.promoter)} (
                  {promoterPercentage.toFixed(1)}%)
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Divider  */}
        <View className="my-4 border-t border-gray-200" />

        <Text className="mb-8 text-center text-lg font-bold text-black">Statistics</Text>
        <View className="flex-row flex-wrap justify-between">
          {stats.map((stat, index) => (
            <View key={index} className="mb-4 w-1/2">
              <View className="pr-2">
                <Text className="text-center text-sm text-gray-600">{stat.label}</Text>
                <Text className="text-center text-base font-semibold text-black">{stat.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Divider  */}
        <View className="my-4 border-t border-gray-200" />

        <Text className="mb-8 text-center text-lg font-bold text-black">Technical Meter</Text>
        <FearGauge value={meterData} />
      </View>
    );
  };

  const renderRelatedStocks = () => (
    <View className="mx-4 mb-6 rounded-xl border border-[#dce0e2] bg-gray-100">
      <View className="flex-row items-center justify-between p-4 pb-2">
        <Text className="mb-2 text-lg font-bold text-gray-900">Related Stocks</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <View className="flex-row space-x-3">
          {relatedStocks?.slice(-7)?.map((relatedStock, index) => {
            // Get the last 16 data points for the chart
            const limitedChartData =
              chartData?.slice(-16)?.map((item) => ({ value: item.c })) || [];

            // console.log(relatedStock);

            return (
              <StockCard
                key={index}
                stock={{
                  ...relatedStock,
                }}
                chartData={limitedChartData}
                onPress={() =>
                  navigation.navigate('StockDetails', {
                    stock: relatedStock,
                    liveData: liveData,
                  })
                }
                onLongPress={() => {}}
              />
            );
          })}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle={'default'} />

      {/* Header */}
      <View className="w-full flex-row items-center justify-between bg-white px-4 pt-4">
        <TouchableOpacity className="w-10" onPress={() => navigation.goBack()}>
          <BackIcon />
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text className="text-lg font-bold text-gray-900">{stock.symbol}</Text>
          {stockDetails && <Text className="text-sm text-gray-500">{stockDetails.sectorName}</Text>}
        </View>
        <View className="flex w-10 flex-row items-center justify-end">
          <TouchableOpacity onPress={handleShare}>
            <Feather name="share" size={22} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity className="ml-6" onPress={toggleWatchlist}>
            <HeartIcon filled={isInWatchlist} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stock Info Card */}
      <View>
        <View
          className="relative mx-3 mb-6 mt-4 h-52 rounded-2xl bg-[#1dcc97]"
          style={{ transform: [{ rotate: '-1.5deg' }] }}>
          <View
            className="absolute inset-0 rounded-2xl bg-[#02314a] p-4"
            style={{ transform: [{ rotate: '1.5deg' }] }}>
            {/* Front Card Content */}
            <View className="flex-1">
              {/* Symbol and Price Info */}
              <View className="mb-3 flex-row items-start justify-between">
                <View className="flex-1">
                  <Text className="mb-1 text-2xl font-bold text-white">{stock.symbol}</Text>
                  <Text numberOfLines={1} className="text-sm leading-5 text-gray-300">
                    {stockDetails?.companyName || stock.name}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="mb-1 text-2xl font-bold text-white">
                    Rs {stockDetails?.lastTradedPrice || stock.price}
                  </Text>
                  <View className="flex-row items-center">
                    {(stockDetails?.perChange || parseFloat(stock.perChange)) >= 0 ? (
                      <UpArrowIcon />
                    ) : (
                      <DownArrowIcon />
                    )}
                    <Text
                      className={`ml-1 text-sm font-semibold ${
                        (stockDetails?.perChange || parseFloat(stock.perChange)) >= 0
                          ? 'text-emerald-300'
                          : 'text-red-300'
                      }`}>
                      {stockDetails?.perChange?.toFixed(2) || stock.perChange}% (
                      {stockDetails?.schange || stock.change})
                    </Text>
                  </View>
                </View>
              </View>

              {/* Instrument Info */}
              {stockDetails && (
                <View className="mt-2 flex-1  flex-row items-start justify-between">
                  <View className="flex-row items-center">
                    <View className="mr-4">
                      <Text className="text-xs text-gray-300">Instrument</Text>
                      <Text className="text-sm font-medium text-white">
                        {stockDetails.instrumentType}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-xs text-gray-300">Category</Text>
                      <Text className="text-sm font-medium text-white">
                        {stockDetails.cap_type}
                      </Text>
                    </View>
                  </View>
                  <View className="flex">
                    <Text className="text-right text-xs text-gray-300">Last Updated</Text>
                    <Text className="text-sm font-medium text-white">
                      {moment(stockDetails.lastUpdatedDateTime).format('MMM DD, HH:mm')}
                    </Text>
                  </View>
                </View>
              )}

              {/* Divider and Footer Info */}
              {stockDetails && (
                <View className="mt-4 border-t border-gray-600 pt-4">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 items-center justify-center">
                      <Text className="mb-1 text-xs text-gray-300">Previous Close</Text>
                      <Text className="text-sm font-semibold text-white">
                        Rs {stockDetails.previousClose}
                      </Text>
                    </View>
                    <View className="flex-1 items-center justify-center">
                      <Text className="mb-1 text-xs text-gray-300">Avg Price</Text>
                      <Text className="text-sm font-semibold text-white">
                        Rs {stockDetails.averageTradedPrice}
                      </Text>
                    </View>
                    <View className="flex-1 items-center justify-center">
                      <Text className="mb-1 text-xs text-gray-300">Trade Value</Text>
                      <Text className="text-sm font-semibold text-white">
                        Rs {parseFloat(stockDetails.totalTradeValue).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View className="mx-4 mb-4 flex-row rounded-xl bg-white" style={{ elevation: 2 }}>
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

      <ScrollView className="flex-1">
        {/* Tab Content */}
        {renderTabContent()}

        {/* Related Stocks  */}
        <View className="mt-4">{renderRelatedStocks()}</View>

        {/* Join Us */}
        <View className="m-4 mb-20 rounded-xl border border-[#e9ecef] bg-[#f8f9fa] p-5">
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
    </SafeAreaView>
  );
};

export default StockDetailsScreen;
