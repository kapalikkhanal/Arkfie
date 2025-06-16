import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

// Constants
const { width } = Dimensions.get('window');
const TRENDING_IMAGE_HEIGHT = width * 0.5;

// Types
interface NewsItem {
  id: number;
  title: string;
  short_description: string;
  publishedAt: string;
  thumbnail: {
    url: string;
    formats?: {
      large?: { url: string };
      medium?: { url: string };
      small?: { url: string };
      thumbnail?: { url: string };
    };
  };
  categories: {
    id: number;
    title: string;
  }[];
}

interface NewsResponse {
  data: NewsItem[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

const NewsScreen = () => {
  const navigation = useNavigation();
  const scrollRef = useRef<ScrollView>(null);
  const [newsData, setNewsData] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [categories, setCategories] = useState<{ id: number; title: string }[]>([]);

  // Fetch news data
  const fetchNews = async (pageNumber = 1, categoryTitle?: string) => {
    try {
      if (pageNumber === 1) setLoading(true);

      let url = `https://news.peridot.com.np/api/news?pagination[page]=${pageNumber}&pagination[pageSize]=12&populate=*&sort[0][publishedAt]=desc`;

      if (categoryTitle && categoryTitle !== 'All') {
        url += `&filters[categories][title][$eq]=${categoryTitle}`;
      }

      const response = await fetch(url);
      const data: NewsResponse = await response.json();

      if (pageNumber === 1) {
        const allCategories = data.data.flatMap((item) => item.categories);
        const uniqueCategories = Array.from(
          new Map(allCategories.map((cat) => [cat.id, cat])).values()
        );
        setCategories(uniqueCategories);
      }

      setNewsData((prev) => (pageNumber === 1 ? data.data : [...prev, ...data.data]));
      setTotalPages(data.meta.pagination.pageCount);
      setPage(pageNumber);
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchNews(1, selectedCategory);
  };

  // Handle scroll to load more
  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    if (
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 20 &&
      !loading &&
      page < totalPages
    ) {
      fetchNews(page + 1, selectedCategory);
    }
  };

  // Navigate to news detail
  const navigateToNewsDetail = (newsItem: NewsItem) => {
    // Implement your navigation logic
    console.log('Navigate to', newsItem.title);
  };

  // Initial fetch
  useEffect(() => {
    fetchNews();
  }, []);

  // Handle category change
  const handleCategoryPress = (categoryTitle: string) => {
    setSelectedCategory(categoryTitle);
    setNewsData([]); // Clear old news
    fetchNews(1, categoryTitle);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const trendingNews = newsData[1];
  const followingNews = newsData.slice(1);

  if (loading && page === 1) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#000" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <View className='mt-10'>
          <Text style={styles.headerTitle}>Today</Text>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color="black" />
          <View style={styles.notificationBadge} />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#000']}
            tintColor="#000"
          />
        }
        showsVerticalScrollIndicator={false}>
        {/* Trending News */}
        {trendingNews && (
          <View>
            <View style={styles.categoriesContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {['All', 'Business', 'Crypto', 'Gaming', 'Technology'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => handleCategoryPress(cat)}
                    style={[
                      styles.categoryButton,
                      selectedCategory === cat && styles.categoryButtonSelected,
                    ]}>
                    <Text
                      style={[
                        styles.categoryButtonText,
                        selectedCategory === cat && styles.categoryButtonTextSelected,
                      ]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View className="mt-4 flex w-full items-end">
              <TouchableOpacity
                className="w-[90%]"
                onPress={() => navigateToNewsDetail(trendingNews)}>
                <Image
                  source={{
                    uri:
                      'https://news.peridot.com.np' +
                      (trendingNews.thumbnail?.formats?.medium?.url || trendingNews.thumbnail?.url),
                  }}
                  style={styles.trendingImage}
                  className="rounded-l-3xl"
                  resizeMode="cover"
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* News List */}
        <View style={styles.listContainer}>
          {followingNews.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => navigateToNewsDetail(item)}
              style={styles.newsItemContainer}>
              <View style={styles.newsItemTextContainer}>
                <Text style={styles.newsItemCategory}>
                  {item.categories?.[0]?.title || 'Technology'}
                </Text>
                <Text style={styles.newsItemTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <View style={styles.newsItemMetaContainer}>
                  <Feather name="clock" size={14} color="#6B7280" />
                  <Text style={styles.newsItemMetaText}>{dayjs(item.publishedAt).fromNow()}</Text>
                  <View style={styles.metaSeparator} />
                  <Feather name="message-square" size={14} color="#6B7280" />
                  <Text style={styles.newsItemMetaText}>23</Text>
                </View>
              </View>
              <Image
                source={{
                  uri:
                    'https://news.peridot.com.np' +
                    (item.thumbnail?.formats?.small?.url || item.thumbnail?.url),
                }}
                style={styles.newsItemImage}
                className='w-full'
              />
              <TouchableOpacity style={styles.moreOptionsButton}>
                <Feather name="more-horizontal" size={20} color="#6B7280" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
          {loading && page > 1 && <ActivityIndicator style={{ marginVertical: 20 }} size="small" />}
        </View>
      </ScrollView>
      {/* Custom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem}>
          <Ionicons name="home" size={24} color="#0D9B74" />
          <Text style={[styles.tabLabel, { color: '#0D9B74' }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <Ionicons name="compass-outline" size={24} color="#6B7280" />
          <Text style={styles.tabLabel}>Explore</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <Ionicons name="list-outline" size={24} color="#6B7280" />
          <Text style={styles.tabLabel}>List</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <Ionicons name="person-outline" size={24} color="#6B7280" />
          <Text style={styles.tabLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0D9B74',
  },
  headerDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  notificationButton: {
    padding: 5,
  },
  notificationBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'red',
    borderWidth: 1,
    borderColor: '#f0f2f5',
  },
  trendingContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  trendingImageContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
  },
  trendingImage: {
    width: '100%',
    height: TRENDING_IMAGE_HEIGHT,
  },
  trendingTag: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  trendingTagText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  trendingTextContainer: {
    paddingTop: 12,
  },
  trendingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  trendingMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendingMetaText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  metaSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 8,
  },
  followingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  followingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  viewMoreText: {
    fontSize: 14,
    color: '#0D9B74',
    fontWeight: '600',
  },
  categoriesContainer: {
    paddingLeft: 20,
    marginBottom: 20,
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryButtonSelected: {
    backgroundColor: '#1F2937',
    borderColor: '#1F2937',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  categoryButtonTextSelected: {
    color: '#FFFFFF',
  },
  listContainer: {
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    paddingTop: 10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop:10
  },
  newsItemContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  newsItemTextContainer: {
    flex: 1,
    paddingRight: 15,
  },
  newsItemCategory: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6B7280',
    marginBottom: 4,
  },
  newsItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    lineHeight: 22,
    marginBottom: 8,
  },
  newsItemMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newsItemMetaText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  newsItemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
  },
  moreOptionsButton: {
    position: 'absolute',
    bottom: 10,
    right: 85,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  tabItem: {
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
  },
});

export default NewsScreen;
