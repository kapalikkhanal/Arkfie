import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

const MiniChart = React.memo(
  ({ type, data, color }: { data: { value: number }[]; color: string; type: string }) => {
    const hexToRGBA = useCallback((hex: string, opacity: number) => {
      const bigint = parseInt(hex.replace('#', ''), 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }, []);

    const chartData = useMemo(() => data.map((d) => ({ value: d.value })), [data]);
    const spacing = type === 'gainer-losers' ? 5 : 6.5;

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
          spacing={spacing}
        />
      </View>
    );
  }
);

export default MiniChart;
