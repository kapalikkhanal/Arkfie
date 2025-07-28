import { AntDesign } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { Portfolio } from 'components/types/types';

const PortfolioSummary = React.memo(
  ({
    portfolio,
    totalValue,
    profitLoss,
    onPress,
  }: {
    portfolio: Portfolio | null;
    totalValue: number;
    profitLoss: number;
    onPress: () => void;
  }) => {
    if (!portfolio) {
      return (
        <TouchableOpacity
          onPress={onPress}
          className="flex flex-row items-center justify-between rounded-lg bg-gray-100 p-4 py-6">
          <View className="flex flex-row items-center justify-between">
            <AntDesign name="disconnect" size={36} color="#808080" />
            <View className="ml-2 flex flex-col items-start justify-between">
              <Text className="text-lg font-semibold">No Stocks in Your Portfolio</Text>
              <Text className="text-sm font-light">Add a stock to track your investments</Text>
            </View>
          </View>
          <View className="rounded-full border p-1">
            <AntDesign name="plus" size={24} color="#808080" />
          </View>
        </TouchableOpacity>
      );
    }

    const isProfit = profitLoss >= 0;
    const totalInvested = totalValue - profitLoss;

    return (
      <TouchableOpacity
        onPress={onPress}
        className="rounded-xl border border-[#dfe4e6] bg-gray-50 p-4 px-6 py-4">
        <View className="flex flex-row items-center justify-between">
          <View className="flex flex-col items-start">
            <View className="flex flex-row items-center justify-center">
              <Text className="mr-2 text-lg font-semibold">{portfolio.name}</Text>
              <Text className="w-fit rounded-lg bg-black px-2 py-0.5 text-xs font-semibold text-white">
                Default
              </Text>
            </View>
            <View className="flex flex-col items-start justify-center pt-1">
              <Text className="text-md font-bold text-blue-500">
                Rs.&nbsp;
                {(totalValue - profitLoss).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
              <Text className="-ml-1 text-sm font-bold text-gray-500">
                &nbsp;({portfolio.stocks.length} stocks)
              </Text>
            </View>
          </View>

          <View className="items-center">
            <PieChart
              data={[
                {
                  value: Math.abs(profitLoss),
                  color: isProfit ? '#10B981' : '#EF4444',
                  text: isProfit ? 'Profit' : 'Loss',
                  textColor: 'white',
                },
                {
                  value: totalInvested,
                  color: '#3B82F6',
                  text: 'Invested',
                  textColor: 'white',
                },
              ]}
              radius={36}
              innerRadius={18}
              textSize={10}
              showTextBackground
              textBackgroundRadius={12}
              centerLabelComponent={() => <Text className="text-xs text-gray-600">Ratio</Text>}
            />
          </View>

          <View className="flex flex-col items-end">
            <Text className="text-lg font-bold">
              Rs. {totalValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </Text>
            <Text className={`pt-1 text-sm ${isProfit ? 'text-green-500' : 'text-red-500'}`}>
              {isProfit ? '+' : ''}
              {profitLoss.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }
);

export default PortfolioSummary;
