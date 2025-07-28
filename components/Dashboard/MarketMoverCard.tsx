import { StockWithId } from 'components/types/types';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import formatIndianNumber from './FormatIndianNumber';
import MiniChart from './MiniChart';

const MarketMoverCard = React.memo(
  ({ stock, onPress }: { stock: StockWithId; onPress: () => void }) => {
    const perChange = stock.perChange ?? 0;
    const schange = stock.schange ?? 0;
    const lastTradedPrice = stock.lastTradedPrice ?? 0;
    const isGainer = perChange > 0;
    const chartColor = isGainer ? '#10B981' : perChange < 0 ? '#EF4444' : '#3B82F6';

    return (
      <TouchableOpacity
        onPress={onPress}
        className="rounded-xl border border-[#dce0e2] bg-white p-4"
        style={{ elevation: 2 }}>
        <View className="flex w-full flex-row items-center justify-between">
          <View>
            <Text className="mt-1 text-sm font-extrabold text-black">{stock.symbol}</Text>
          </View>
          <View>
            <Text
              className={`mt-1 text-sm font-semibold ${
                isGainer ? 'text-green-500' : 'text-red-500'
              }`}>
              {isGainer ? '+' : ''}
              {typeof perChange === 'number' ? perChange.toFixed(2) : perChange}%
            </Text>
          </View>
        </View>

        <View className="mt-10 flex w-full flex-row items-center justify-between overflow-x-hidden">
          <View className="flex flex-col items-start justify-center">
            <Text className="w-24 text-sm font-bold text-black">
              Rs. {formatIndianNumber(lastTradedPrice)}
            </Text>
            <Text
              className={`text-sm font-semibold ${isGainer ? 'text-green-500' : 'text-red-500'}`}>
              Rs. {isGainer ? '+' : ''}
              {typeof schange === 'number' ? schange.toFixed(2) : schange}
            </Text>
          </View>
          <MiniChart
            type="gainer-losers"
            data={stock.chartData ?? []}
            color={chartColor}
          />
        </View>
      </TouchableOpacity>
    );
  }
);

export default MarketMoverCard;
