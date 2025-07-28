import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface FearGaugeProps {
  value: number; // 0-100
  width?: number;
  height?: number;
}

const FearGauge: React.FC<FearGaugeProps> = ({ value, width = 300, height = 30 }) => {
  const percentage = Math.min(100, Math.max(0, value));
  const sentiment = getSentimentLabel(percentage);
  const color = getSentimentColor(percentage);

  return (
    <View style={[{ width: '100%', alignItems: 'center' }]}>
      <View style={[{ width }]}>
        {/* Gauge Track */}
        <View style={[styles.track, { height }]}>
          <View
            style={[
              styles.fill,
              {
                width: `${percentage}%`,
                backgroundColor: color,
                height,
              },
            ]}
          />
        </View>

        {/* Value Display */}
        <View style={styles.valueContainer}>
          <Text style={styles.valueText}>{percentage.toFixed(2)}</Text>
          <Text style={[styles.sentimentText, { color }]}>{sentiment}</Text>
        </View>

        {/* Labels */}
        <View style={styles.labelContainer}>
          <Text style={styles.label}>0 (Fear)</Text>
          <Text style={styles.label}>50 (Neutral)</Text>
          <Text style={styles.label}>100 (Greed)</Text>
        </View>
      </View>
    </View>
  );
};

// Helper functions
const getSentimentLabel = (value: number) => {
  if (value < 25) return 'Extreme Fear';
  if (value < 45) return 'Fear';
  if (value < 55) return 'Neutral';
  if (value < 75) return 'Greed';
  return 'Extreme Greed';
};

const getSentimentColor = (value: number) => {
  // Red to Green gradient calculation
  const red = Math.min(255, Math.floor(255 * (1 - value / 100)));
  const green = Math.min(255, Math.floor(255 * (value / 100)));
  return `rgb(${red}, ${green}, 0)`;
};

const styles = StyleSheet.create({
  track: {
    backgroundColor: '#E5E7EB',
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 8,
  },
  fill: {
    borderRadius: 15,
  },
  valueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  valueText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  sentimentText: {
    fontSize: 16,
    fontWeight: '600',
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 12,
    color: '#64748B',
  },
});

export default FearGauge;
