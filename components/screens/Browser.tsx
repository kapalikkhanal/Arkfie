import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { AntDesign, Entypo, Ionicons, MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface Bookmark {
  id: string;
  title: string;
  url: string;
  icon: string;
}

const bookmarks: Bookmark[] = [
  {
    id: '1',
    title: 'Meroshare',
    url: 'meroshare.cdsc.com.np',
    icon: 'bar-chart',
  },
  {
    id: '2',
    title: 'Sharesansar',
    url: 'sharesansar.com',
    icon: 'trending-up',
  },
  {
    id: '3',
    title: 'NEPSE',
    url: 'nepalstock.com.np',
    icon: 'analytics',
  },
  {
    id: '4',
    title: 'NRB',
    url: 'nrb.org.np',
    icon: 'business',
  },
];

function BrowserScreen() {
  const [url, setUrl] = useState<string>('google.com');
  const [inputUrl, setInputUrl] = useState<string>('Search here');
  const [canGoBack, setCanGoBack] = useState<boolean>(false);
  const [canGoForward, setCanGoForward] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showBookmarks, setShowBookmarks] = useState<boolean>(true);
  const webViewRef = useRef<WebView>(null);

  const handleSearch = () => {
    let processedUrl = inputUrl;
    if (!inputUrl.startsWith('http://') && !inputUrl.startsWith('https://')) {
      if (inputUrl.includes('.') && !inputUrl.includes(' ')) {
        processedUrl = `https://${inputUrl}`;
      } else {
        processedUrl = `https://google.com/search?q=${encodeURIComponent(inputUrl)}`;
      }
    }
    setUrl(processedUrl);
    setInputUrl(processedUrl);
    setShowBookmarks(false);
  };

  const handleBookmarkPress = (bookmark: Bookmark) => {
    const processedUrl = `https://${bookmark.url}`;
    setUrl(processedUrl);
    setInputUrl(processedUrl);
    setShowBookmarks(false);
  };

  const handleNavigationStateChange = (navState: any) => {
    setCanGoBack(navState.canGoBack);
    setCanGoForward(navState.canGoForward);
    setInputUrl(navState.url);
    setIsLoading(navState.loading);
  };

  const handleRefresh = () => {
    webViewRef.current?.reload();
  };

  const handleHome = () => {
    setUrl('https://google.com');
    setInputUrl('https://google.com');
    setShowBookmarks(true);
  };

  const handleGoBack = () => {
    if (canGoBack) {
      webViewRef.current?.goBack();
    } else {
      handleHome();
    }
  };

  const handleClearInput = () => {
    setInputUrl('');
    setShowBookmarks(true);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <View className="flex-1">
          {/* Bookmarks Section */}
          {showBookmarks && (
            <View className="flex-1 items-center justify-center bg-white">
              {/* Arkfie TExt  */}
              <Text
                style={{ fontFamily: 'Miniver' }}
                className="pt-4 text-5xl font-extrabold text-orange-600">
                Arkfie
              </Text>

              {/* Modern Search Bar */}
              <View className="w-full px-4 pb-2 pt-4">
                <View className="flex-row items-center rounded-full bg-gray-100 px-4 py-4">
                  <Ionicons name="search" size={20} color="#9CA3AF" />
                  <TextInput
                    className="ml-2 flex-1 text-gray-800"
                    placeholder="Search Google or type URL"
                    placeholderTextColor="#9CA3AF"
                    onSubmitEditing={({ nativeEvent: { text } }) => {
                      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(text)}`;
                      setUrl(searchUrl);
                      setInputUrl(searchUrl);
                      setShowBookmarks(false);
                    }}
                  />
                  {inputUrl.length > 0 && (
                    <TouchableOpacity onPress={() => setInputUrl('')}>
                      <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Modern Bookmarks Grid */}
              <View className="mt-4 w-full px-4 py-2">
                <Text className="mb-1 text-lg font-bold text-gray-900">Quick Access</Text>
                <Text className="mb-4 text-xs font-medium text-gray-500">FINANCIAL PLATFORMS</Text>

                <View className="flex-row flex-wrap justify-between px-2">
                  {bookmarks.map((bookmark) => {
                    const logoSource = {
                      meroshare: require('../../assets/logos/meroshare.png'),
                      sharesansar: require('../../assets/logos/sharesanskar.png'),
                      nepalstock: require('../../assets/logos//nepse.jpeg'),
                      nrb: require('../../assets/logos//nrb.jpg'),
                      chukul: require('../../assets/logos/meroshare.png'),
                      merolagani: require('../../assets/logos/meroshare.png'),
                    }[bookmark.url.split('.')[0]]; // simple map

                    return (
                      <TouchableOpacity
                        key={bookmark.id}
                        onPress={() => handleBookmarkPress(bookmark)}
                        activeOpacity={0.9}
                        className="mb-3 rounded-2xl border border-gray-400 bg-white px-4 py-5"
                        style={{
                          width: (width - 48) / 2,
                          aspectRatio: 1,
                        }}>
                        <View className="mb-4 h-11 w-11 items-center justify-center self-center overflow-hidden rounded-xl bg-blue-100 shadow-sm">
                          <Image source={logoSource} resizeMode="contain" className="h-8 w-8" />
                        </View>

                        <Text
                          className="text-center text-sm font-semibold leading-tight text-gray-800"
                          numberOfLines={2}>
                          {bookmark.title}
                        </Text>

                        <Text className="mt-1 text-center text-xs text-gray-500">Open now</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          )}

          {/* WebView Container */}
          {!showBookmarks && (
            <View className="flex-1 bg-white">
              <WebView
                ref={webViewRef}
                source={{ uri: url }}
                onNavigationStateChange={handleNavigationStateChange}
                onLoadStart={() => setIsLoading(true)}
                onLoadEnd={() => setIsLoading(false)}
                style={{ flex: 1 }}
                allowsBackForwardNavigationGestures
                sharedCookiesEnabled
                javaScriptEnabled
                domStorageEnabled
                startInLoadingState
                scalesPageToFit
              />
            </View>
          )}

          {/* Bottom Navigation Bar */}
          <View className="rounded-t-xl bg-white pb-12">
            {/* Loading Bar */}
            {isLoading && (
              <View className="h-1 bg-gray-200">
                <View className="h-full animate-pulse bg-orange-500" style={{ width: '60%' }} />
              </View>
            )}

            <View className="flex-row items-center px-4 py-3">
              {/* Navigation Controls */}
              <TouchableOpacity className="mr-2 p-2" onPress={handleGoBack}>
                <AntDesign name="back" size={24} color={canGoBack ? '#374151' : 'gray'} />
              </TouchableOpacity>

              {/* Search Bar */}
              <View className="flex-1 flex-row items-center justify-start rounded-lg bg-[#e9efeb] px-3 py-3">
                <Ionicons name="search" size={16} color="#9CA3AF" />

                <TextInput
                  className="ml-2 flex-1 font-normal text-black"
                  value={inputUrl}
                  onChangeText={setInputUrl}
                  onSubmitEditing={handleSearch}
                  onFocus={() => setShowBookmarks(true)}
                  placeholder="Search or enter URL"
                  placeholderTextColor="#6B7280"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  returnKeyType="go"
                />

                {inputUrl.length > 0 && (
                  <TouchableOpacity onPress={handleClearInput} className="ml-2">
                    <Ionicons name="close-circle" size={18} color="#6B7280" />
                  </TouchableOpacity>
                )}

                {isLoading && <Entypo name="cross" size={18} color="#FF8C00" />}
              </View>

              {/* Action Buttons */}
              <TouchableOpacity className="ml-4 p-2" onPress={handleRefresh}>
                <Ionicons name="refresh" size={22} color="#000" />
              </TouchableOpacity>

              <TouchableOpacity className="ml-1 p-2" onPress={handleHome}>
                <AntDesign name="home" size={22} color="gray" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default BrowserScreen;
