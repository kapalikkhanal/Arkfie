import { View, Text, Dimensions } from 'react-native';
import React from 'react';
import { LineChart } from 'react-native-gifted-charts';

const Chart = () => {
  return (
    <View>
      {/* Graph Section */}
      <View className="z-50 h-full w-[45%] pl-2">
        <LineChart
          data={[
            { value: 2150, label: '11:00' },
            { value: 2455, label: '12:22' },
            { value: 2260, label: '13:23' },
            { value: 2958, label: '14:24' },
            { value: 2161, label: '15:35' },
          ]}
          color="#1dcc97"
          thickness={2}
          hideDataPoints={false}
          dataPointsColor="#fff"
          dataPointsRadius={3}
          dataPointsHeight={6}
          dataPointsWidth={6}
          hideYAxisText
          hideAxesAndRules
          curved
          areaChart
          startFillColor="rgba(29, 204, 151, 0.3)"
          endFillColor="rgba(29, 204, 151, 0.01)"
          startOpacity={0.8}
          endOpacity={0.1}
          width={Dimensions.get('window').width * 0.35}
          height={90}
          isAnimated
          animationDuration={1500}
          yAxisColor="transparent"
          xAxisColor="transparent"
          initialSpacing={10}
          endSpacing={10}
          spacing={30}
          xAxisLabelTextStyle={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: 10,
            marginTop: 4,
          }}
          pointerConfig={{
            pointerStripHeight: 90,
            pointerStripColor: 'rgba(255,255,255,0.3)',
            pointerStripWidth: 1,
            pointerColor: '#1dcc97',
            radius: 4,
            pointerLabelWidth: 60,
            pointerLabelHeight: 30,
            activatePointersOnLongPress: true,
            autoAdjustPointerLabelPosition: true,
            pointerLabelComponent: (items: { value: number }[]) => {
              return (
                <View className="rounded-md bg-[#1dcc97] px-2 py-1">
                  <Text className="text-xs font-bold text-white">{items[0].value.toFixed(2)}</Text>
                </View>
              );
            },
          }}
        />
      </View>
    </View>
  );
};

export default Chart;
