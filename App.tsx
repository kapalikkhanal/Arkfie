import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, Image, Dimensions, StyleSheet } from 'react-native';
import * as Font from 'expo-font';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import './global.css';
import {
  fetchMarketData,
  fetchCandleData,
  MarketData,
  CandleData,
  Stock,
} from './services/marketData';

// Screens
import BrowserScreen from 'components/screens/Browser';
import DashboardScreen from 'components/screens/Dashboard';
import StockDetailsScreen from 'components/screens/StockDetails';
import MarketScreen from 'components/screens/Market';
import NewsScreen from 'components/screens/NewsScreen';
import SettingsScreen from 'components/screens/Settings';

import { MaterialIcons, FontAwesome, FontAwesome5, AntDesign } from '@expo/vector-icons';
import PortfolioScreen from 'components/screens/PortfolioScreen';

// Types
type RootStackParamList = {
  Splash: undefined;
  Main: {
    marketData?: MarketData['data'];
    initialCandleData?: CandleData[];
  };
  StockDetails: { stock: Stock };
  PortfolioScreen: { stock: Stock };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();
const { width } = Dimensions.get('window');

function MainTabs({ route }: { route: any }) {
  const { marketData, initialCandleData } = route.params || {};

  return (
    <View className="flex-1">
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#1dcc97',
          tabBarInactiveTintColor: 'white',
          tabBarStyle: {
            position: 'absolute',
            backgroundColor: '#02314a',
            height: 50,
            bottom: 24,
            left: 0,
            right: 0,
            borderRadius: 15,
            marginHorizontal: width * 0.05,
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarItemStyle: {
            height: 50,
            padding: 4,
          },
          headerShown: false,
        }}>
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          initialParams={{ marketData }}
          options={{
            tabBarLabel: () => null,
            tabBarIcon: ({ color, size }) => (
              <View style={styles.iconContainer}>
                <MaterialIcons name="space-dashboard" size={size} color={color} />
              </View>
            ),
          }}
        />
        <Tab.Screen
          name="Market"
          component={MarketScreen}
          initialParams={{ marketData, initialCandleData }}
          options={{
            tabBarLabel: () => null,
            tabBarIcon: ({ color, size }) => (
              <View style={styles.iconContainer}>
                <MaterialIcons name="show-chart" size={size} color={color} />
              </View>
            ),
          }}
        />
        <Tab.Screen
          name="Browser"
          component={BrowserScreen}
          options={{
            tabBarLabel: () => null,
            tabBarIcon: ({ color, size }) => (
              <View style={styles.iconContainer}>
                <FontAwesome5 name="firefox-browser" size={size} color={color} />
              </View>
            ),
          }}
        />
        <Tab.Screen
          name="News"
          component={NewsScreen}
          options={{
            tabBarLabel: () => null,
            tabBarIcon: ({ color, size }) => (
              <View style={styles.iconContainer}>
                <FontAwesome name="newspaper-o" size={size} color={color} />
              </View>
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarLabel: () => null,
            tabBarIcon: ({ color, size }) => (
              <View style={styles.iconContainer}>
                <AntDesign name="setting" size={size} color={color} />
              </View>
            ),
          }}
        />
      </Tab.Navigator>
    </View>
  );
}

// Splash Screen Component
function SplashScreen({ navigation }: { navigation: any }) {
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // Step 1: Fetch market data
        setLoadingProgress(30);
        const marketResponse = await fetchMarketData();

        // Step 2: Fetch candle data (1M period by default)
        setLoadingProgress(60);
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const periodTimestamp = currentTimestamp - 30 * 24 * 60 * 60; // 1 month
        const candleResponse = await fetchCandleData(periodTimestamp);

        // Step 3: Validate and prepare data
        setLoadingProgress(90);
        const validCandleData =
          candleResponse.status === 200 && candleResponse.data ? candleResponse.data : [];

        setTimeout(() => {
          navigation.replace('Main', {
            marketData: marketResponse.data,
            initialCandleData: validCandleData,
          });
        }, 1000);
      } catch (error) {
        console.error('Error fetching data:', error);
        setTimeout(() => {
          navigation.replace('Main');
        }, 1000);
      } finally {
        setLoadingProgress(100);
      }
    };

    fetchAllData();
  }, [navigation]);

  return (
    <View className="h-screen w-screen bg-black">
      <StatusBar style="auto" />
      <View className="relative flex-1 items-center justify-center bg-white">
        <Text style={{ fontFamily: 'Miniver' }} className="pt-4 text-5xl font-extrabold text-black">
          Arkfie
        </Text>
        <Image source={require('./assets/pipe.gif')} className="h-36 w-60" resizeMode="contain" />
        <View className="mt-8 h-2 w-48 rounded-full bg-gray-200">
          <View
            className="h-2 rounded-full bg-green-500"
            style={{ width: `${loadingProgress}%` }}
          />
        </View>
      </View>
    </View>
  );
}

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    const loadResources = async () => {
      try {
        await Font.loadAsync({
          Miniver: require('./assets/fonts/Miniver-Regular.ttf'),
        });
      } catch (e) {
        console.warn(e);
      } finally {
        setFontsLoaded(true);
      }
    };

    loadResources();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <NavigationContainer>
          <SafeAreaProvider>
            <SafeAreaView style={{ flex: 1 }} edges={['right', 'left']}>
              <Stack.Navigator
                screenOptions={{
                  headerShown: false,
                  animation: 'fade',
                }}>
                <Stack.Screen name="Splash" component={SplashScreen} />
                <Stack.Screen name="Main" component={MainTabs} />
                <Stack.Screen
                  name="StockDetails"
                  component={StockDetailsScreen}
                  options={{
                    animation: 'slide_from_right',
                  }}
                />
                <Stack.Screen
                  name="PortfolioScreen"
                  component={PortfolioScreen}
                  options={{
                    animation: 'slide_from_right',
                  }}
                />
              </Stack.Navigator>
            </SafeAreaView>
          </SafeAreaProvider>
        </NavigationContainer>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
