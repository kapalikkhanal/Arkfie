import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // or any icon set you prefer

const Popup = () => {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <View className="mb-4 flex-row items-center justify-between rounded-xl bg-gray-100 py-4 px-2" >
      {/* Left Icon and Text */}
      <View className="flex-1 flex-row items-center pr-4">
        <View className="mr-2 items-center justify-center rounded-full">
          <Ionicons name="alert-circle-outline" size={30} color="#000" />
        </View>
        <View>
          <Text className="text-md font-semibold text-black">New Investment Opportunity</Text>
          <Text className="text-xs text-gray-500">New IPO is available to apply</Text>
        </View>
      </View>

      {/* CTA Button and Close */}
      <View className="flex-row items-center">
        <Pressable className="mr-4 rounded-full bg-black px-4 py-2">
          <Text className="text-sm text-white">View now</Text>
        </Pressable>
        <Pressable onPress={() => setVisible(false)}>
          <Ionicons name="close" size={20} color="#888" />
        </Pressable>
      </View>
    </View>
  );
};

export default Popup;
