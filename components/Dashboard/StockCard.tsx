import { TouchableOpacity, Text, View } from 'react-native';
import MiniChart from './MiniChart';
import React, { useMemo } from 'react';
import formatIndianNumber from './FormatIndianNumber';
import { Stock } from 'components/types/types';

const StockCard = React.memo(
  ({
    stock,
    onPress,
    onLongPress,
    chartData,
    isSuggested = false,
  }: {
    stock: Stock;
    onPress: () => void;
    onLongPress: () => void;
    chartData?: { value: number }[];
    isSuggested?: boolean;
  }) => {
    const chartColor = useMemo(() => {
      const perChange = stock.perChange ?? 0;
      return perChange > 0 ? '#10B981' : perChange < 0 ? '#EF4444' : '#3B82F6';
    }, [stock.perChange]);

    return (
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        className="mr-3 w-72 rounded-xl border border-[#dce0e2] bg-white p-4"
        style={{ elevation: 2 }}>
        <View className="flex w-full flex-row items-center justify-between">
          <View>
            <Text className="mt-1 text-sm font-extrabold text-black">{stock.symbol}</Text>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              className="w-48 text-xs font-light text-black">
              {stock.name ?? 'N/A'}
            </Text>

            {isSuggested && (
              <Text className="w-24 rounded-lg bg-black py-0.5 text-center text-xs font-semibold text-white">
                Suggested
              </Text>
            )}
          </View>
          <View>
            <Text
              className={`mt-1 text-sm font-semibold ${
                (stock.perChange ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
              {(stock.perChange ?? 0) >= 0 ? '+' : ''}
              {typeof stock.perChange === 'number'
                ? stock.perChange.toFixed(2)
                : (stock.perChange ?? 0)}
              %
            </Text>
          </View>
        </View>

        <View className="mt-10 flex w-full flex-row items-center justify-between">
          <View className="flex flex-col items-start justify-center">
            <Text className="w-32 text-lg font-bold text-black">
              Rs. {formatIndianNumber(stock.lastTradedPrice ?? 0)}
            </Text>
            <Text
              className={`text-sm font-semibold ${
                (stock.schange ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
              Rs. {(stock.schange ?? 0) >= 0 ? '+' : ''}
              {typeof stock.schange === 'number' ? stock.schange.toFixed(2) : (stock.schange ?? 0)}
            </Text>
          </View>

          <MiniChart data={chartData || []} color={chartColor} type="watchlist" />
        </View>
      </TouchableOpacity>
    );
  },
  (prevProps, nextProps) =>
    prevProps.stock.id === nextProps.stock.id &&
    prevProps.chartData === nextProps.chartData &&
    prevProps.isSuggested === nextProps.isSuggested
);

export default StockCard;
