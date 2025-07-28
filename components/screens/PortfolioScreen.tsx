import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Dimensions,
  PanResponder,
  Animated,
  Alert,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AntDesign, Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DropDownPicker from 'react-native-dropdown-picker';

// Types
interface Stock {
  symbol: string;
  companyName: string;
  lastTradedPrice: number;
  schange: number;
  perChange: number;
}

interface Portfolio {
  id: string;
  name: string;
  isDefault: boolean;
  stocks: PortfolioStock[];
}

interface PortfolioStock {
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  transactions: Transaction[];
}

interface Transaction {
  id: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  total: number;
  date: string;
  notes: string;
}

const PortfolioScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const liveData: Stock[] = route.params?.liveData || [];

  // State
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [defaultPortfolio, setDefaultPortfolio] = useState<Portfolio | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [portfolioName, setPortfolioName] = useState('');
  const [isDefaultPortfolio, setIsDefaultPortfolio] = useState(false);
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [transactionType, setTransactionType] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [modalY] = useState(new Animated.Value(Dimensions.get('window').height));
  const [showDropdown, setShowDropdown] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);
  const [editPortfolioName, setEditPortfolioName] = useState('');

  // Load portfolios from AsyncStorage
  useEffect(() => {
    const loadPortfolios = async () => {
      try {
        const savedPortfolios = await AsyncStorage.getItem('portfolios');
        if (savedPortfolios) {
          const parsedPortfolios = JSON.parse(savedPortfolios);
          setPortfolios(parsedPortfolios);

          // Find default portfolio
          const defaultPortfolio = parsedPortfolios.find((p: Portfolio) => p.isDefault);
          if (defaultPortfolio) {
            setDefaultPortfolio(defaultPortfolio);
            setSelectedPortfolio(defaultPortfolio);
          } else if (parsedPortfolios.length > 0) {
            setSelectedPortfolio(parsedPortfolios[0]);
          }
        }
      } catch (error) {
        console.error('Error loading portfolios:', error);
      }
    };

    loadPortfolios();
  }, []);

  // Save portfolios to AsyncStorage whenever they change
  useEffect(() => {
    const savePortfolios = async () => {
      try {
        await AsyncStorage.setItem('portfolios', JSON.stringify(portfolios));
      } catch (error) {
        console.error('Error saving portfolios:', error);
      }
    };

    if (portfolios.length > 0) {
      savePortfolios();

      // Update default portfolio
      const newDefault = portfolios.find((p) => p.isDefault);
      setDefaultPortfolio(newDefault || null);
    }
  }, [portfolios]);

  // Filtered stocks based on search
  const filteredStocks = useMemo(() => {
    if (!searchQuery) return liveData;
    return liveData.filter(
      (stock) =>
        stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stock.companyName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [liveData, searchQuery]);

  // Create portfolio
  const handleCreatePortfolio = () => {
    if (portfolioName.trim()) {
      const newPortfolio: Portfolio = {
        id: Date.now().toString(),
        name: portfolioName,
        isDefault: isDefaultPortfolio,
        stocks: [],
      };

      // If setting as default, remove default from others
      let updatedPortfolios = [...portfolios];
      if (isDefaultPortfolio) {
        updatedPortfolios = portfolios.map((p) => ({ ...p, isDefault: false }));
      }

      setPortfolios([...updatedPortfolios, newPortfolio]);
      setPortfolioName('');
      setIsDefaultPortfolio(false);
      setShowCreateModal(false);
      setSelectedPortfolio(newPortfolio);
    }
  };

  // Set default portfolio
  const handleSetDefault = (portfolioId: string) => {
    setPortfolios(
      portfolios.map((p) => ({
        ...p,
        isDefault: p.id === portfolioId,
      }))
    );
  };

  // Edit portfolio name
  const handleEditPortfolio = () => {
    if (editingPortfolio && editPortfolioName.trim()) {
      setPortfolios(
        portfolios.map((p) =>
          p.id === editingPortfolio.id ? { ...p, name: editPortfolioName } : p
        )
      );
      setEditingPortfolio(null);
      setEditPortfolioName('');
    }
  };

  // Delete portfolio
  const handleDeletePortfolio = (portfolioId: string) => {
    Alert.alert('Delete Portfolio', 'Are you sure you want to delete this portfolio?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const newPortfolios = portfolios.filter((p) => p.id !== portfolioId);
          setPortfolios(newPortfolios);

          if (selectedPortfolio?.id === portfolioId) {
            setSelectedPortfolio(newPortfolios[0] || null);
          }
        },
      },
    ]);
  };

  // Delete stock from portfolio
  const handleDeleteStock = (portfolioId: string, stockSymbol: string) => {
    Alert.alert('Remove Stock', 'Are you sure you want to remove this stock from your portfolio?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          setPortfolios(
            portfolios.map((p) =>
              p.id === portfolioId
                ? { ...p, stocks: p.stocks.filter((s) => s.symbol !== stockSymbol) }
                : p
            )
          );
        },
      },
    ]);
  };

  // Add stock to portfolio
  const handleAddStock = () => {
    if (!selectedStock || !quantity || !price || !selectedPortfolio) return;

    const parsedQuantity = parseInt(quantity, 10);
    const parsedPrice = parseFloat(price);
    const total = parsedQuantity * parsedPrice;

    const transaction: Transaction = {
      id: Date.now().toString(),
      type: transactionType,
      quantity: parsedQuantity,
      price: parsedPrice,
      total,
      date: new Date().toISOString().split('T')[0],
      notes,
    };

    const portfolioIndex = portfolios.findIndex((p) => p.id === selectedPortfolio.id);
    const portfolio = portfolios[portfolioIndex];
    const stockIndex = portfolio.stocks.findIndex((s) => s.symbol === selectedStock.symbol);

    let updatedPortfolios = [...portfolios];

    if (stockIndex >= 0) {
      // Update existing stock
      const updatedStock = { ...portfolio.stocks[stockIndex] };

      if (transactionType === 'buy') {
        const newQuantity = updatedStock.quantity + parsedQuantity;
        const newTotal = updatedStock.avgPrice * updatedStock.quantity + total;
        updatedStock.quantity = newQuantity;
        updatedStock.avgPrice = newTotal / newQuantity;
      } else {
        // Selling
        updatedStock.quantity -= parsedQuantity;
        if (updatedStock.quantity <= 0) {
          // Remove stock if quantity is 0
          updatedPortfolios[portfolioIndex].stocks = portfolio.stocks.filter(
            (s) => s.symbol !== selectedStock.symbol
          );
        }
      }

      updatedStock.transactions = [...updatedStock.transactions, transaction];

      if (updatedStock.quantity > 0) {
        updatedPortfolios[portfolioIndex].stocks[stockIndex] = updatedStock;
      }
    } else {
      // Add new stock (only for buy transactions)
      if (transactionType === 'buy') {
        const newStock: PortfolioStock = {
          symbol: selectedStock.symbol,
          name: selectedStock.companyName,
          quantity: parsedQuantity,
          avgPrice: parsedPrice,
          transactions: [transaction],
        };
        updatedPortfolios[portfolioIndex].stocks = [...portfolio.stocks, newStock];
      }
    }

    setPortfolios(updatedPortfolios);
    setShowAddStockModal(false);
    setSelectedStock(null);
    setQuantity('');
    setPrice('');
    setNotes('');
  };

  // Calculate total value
  const calculateTotalValue = (portfolio: Portfolio) => {
    return portfolio.stocks.reduce((total, stock) => {
      const stockValue = liveData.find((s) => s.symbol === stock.symbol)?.lastTradedPrice || 0;
      return total + stock.quantity * stockValue;
    }, 0);
  };

  // Calculate profit/loss
  const calculateProfitLoss = (portfolio: Portfolio) => {
    return portfolio.stocks.reduce((total, stock) => {
      const currentPrice = liveData.find((s) => s.symbol === stock.symbol)?.lastTradedPrice || 0;
      const invested = stock.quantity * stock.avgPrice;
      const currentValue = stock.quantity * currentPrice;
      return total + (currentValue - invested);
    }, 0);
  };

  // Handle modal animation
  useEffect(() => {
    if (showCreateModal || showAddStockModal || editingPortfolio) {
      Animated.timing(modalY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(modalY, {
        toValue: Dimensions.get('window').height,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCreateModal, showAddStockModal, editingPortfolio]);

  // Create pan responder for swipe down to close
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        modalY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        setShowCreateModal(false);
        setShowAddStockModal(false);
        setEditingPortfolio(null);
      } else {
        Animated.spring(modalY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  // Portfolio dropdown items
  const portfolioItems = portfolios.map((p) => ({
    label: `${p.name}${p.isDefault ? ' (Default)' : ''}`,
    value: p.id,
    icon: () => (
      <View className="flex-row items-center">
        {p.isDefault && <MaterialIcons name="star" size={18} color="#F59E0B" />}
      </View>
    ),
  }));

  // Render stock item
  const renderStockItem = (stock: PortfolioStock) => {
    const liveStock = liveData.find((s) => s.symbol === stock.symbol);
    const currentValue = liveStock?.lastTradedPrice || 0;
    const profitLoss = (currentValue - stock.avgPrice) * stock.quantity;
    const isProfit = profitLoss >= 0;

    return (
      <View
        key={stock.symbol}
        className="flex-row items-center justify-between border-b border-gray-100 py-3">
        <View className="flex-1">
          <Text className="font-medium text-black">{stock.symbol}</Text>
          <Text className="text-sm text-gray-600">
            {stock.quantity} shares @ Rs. {stock.avgPrice.toFixed(2)}
          </Text>
        </View>

        <View className="items-end">
          <Text className="font-medium text-black">
            Rs.{' '}
            {(currentValue * stock.quantity).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </Text>
          <Text className={`text-xs ${isProfit ? 'text-green-500' : 'text-red-500'}`}>
            {isProfit ? '+' : ''}
            {profitLoss.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </Text>
        </View>

        <TouchableOpacity
          className="ml-2 p-1"
          onPress={() =>
            selectedPortfolio && handleDeleteStock(selectedPortfolio.id, stock.symbol)
          }>
          <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    );
  };

  // Render create portfolio modal
  const renderCreatePortfolioModal = () => (
    <Modal
      animationType="slide"
      transparent
      visible={showCreateModal}
      onRequestClose={() => setShowCreateModal(false)}>
      <Animated.View
        className="flex-1 justify-end bg-white/50"
        style={{ transform: [{ translateY: modalY }] }}
        {...panResponder.panHandlers}>
        <View className="mx-2 h-[85%] rounded-t-3xl border border-[#dce0e2] bg-white p-6 pt-4">
          <View className="mb-6 flex-row items-center justify-between">
            <Text className="text-xl font-bold text-black">Create Portfolio</Text>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <AntDesign name="down" size={24} color="#808080" />
            </TouchableOpacity>
          </View>

          <Text className="mb-2 text-gray-600">Portfolio Name</Text>
          <TextInput
            className="mb-4 rounded-lg border border-gray-300 p-3 text-black"
            placeholder="e.g., Long Term Investments"
            placeholderTextColor="#9CA3AF"
            value={portfolioName}
            onChangeText={setPortfolioName}
          />

          <View className="mb-6 flex-row items-center justify-between">
            <Text className="text-gray-600">Set as default portfolio</Text>
            <TouchableOpacity
              onPress={() => setIsDefaultPortfolio(!isDefaultPortfolio)}
              className={`flex h-6 w-12 items-center justify-center rounded-full ${isDefaultPortfolio ? 'bg-[#15a37b]' : 'bg-gray-300'}`}>
              <View
                className={`h-5 w-5 rounded-full bg-white ${isDefaultPortfolio ? 'ml-5' : 'mr-5'}`}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            className={`rounded-lg py-3 ${portfolioName ? 'bg-[#15a37b]' : 'bg-gray-300'}`}
            disabled={!portfolioName}
            onPress={handleCreatePortfolio}>
            <Text className="text-center font-medium text-white">Create Portfolio</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );

  // Render edit portfolio modal
  const renderEditPortfolioModal = () => (
    <Modal
      animationType="slide"
      transparent
      visible={!!editingPortfolio}
      onRequestClose={() => setEditingPortfolio(null)}>
      <Animated.View
        className="flex-1 justify-end bg-white/50"
        style={{ transform: [{ translateY: modalY }] }}
        {...panResponder.panHandlers}>
        <View className="mx-2 h-[50%] rounded-t-3xl border border-[#dce0e2] bg-white p-6 pt-4">
          <View className="mb-6 flex-row items-center justify-between">
            <Text className="text-xl font-bold text-black">Edit Portfolio</Text>
            <TouchableOpacity onPress={() => setEditingPortfolio(null)}>
              <AntDesign name="down" size={24} color="#808080" />
            </TouchableOpacity>
          </View>

          <Text className="mb-2 text-gray-600">Portfolio Name</Text>
          <TextInput
            className="mb-6 rounded-lg border border-gray-300 p-3 text-black"
            placeholder="Enter new name"
            placeholderTextColor="#9CA3AF"
            value={editPortfolioName}
            onChangeText={setEditPortfolioName}
          />

          <View className="flex-row space-x-3">
            <TouchableOpacity
              className="flex-1 rounded-lg border border-[#15a37b] py-3"
              onPress={() => setEditingPortfolio(null)}>
              <Text className="text-center font-medium text-[#15a37b]">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 rounded-lg py-3 ${editPortfolioName ? 'bg-[#15a37b]' : 'bg-gray-300'}`}
              disabled={!editPortfolioName}
              onPress={handleEditPortfolio}>
              <Text className="text-center font-medium text-white">Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );

  // Render add stock modal
  const renderAddStockModal = () => (
    <Modal
      transparent
      visible={showAddStockModal}
      onRequestClose={() => setShowAddStockModal(false)}>
      <Animated.View
        className="flex-1 justify-end bg-black/50"
        style={{ transform: [{ translateY: modalY }] }}
        {...panResponder.panHandlers}>
        <View className="h-[90%] rounded-t-3xl bg-white p-6 pt-4">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-xl font-bold text-black">Add Stock</Text>
            <TouchableOpacity onPress={() => setShowAddStockModal(false)}>
              <AntDesign name="down" size={24} color="#808080" />
            </TouchableOpacity>
          </View>

          {!selectedStock ? (
            <>
              <TextInput
                className="mb-4 rounded-lg border border-gray-300 p-3 text-black"
                placeholder="Search stocks..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />

              <FlatList
                data={filteredStocks}
                keyExtractor={(item) => item.symbol}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    className="border-b border-gray-100 py-3"
                    onPress={() => setSelectedStock(item)}>
                    <Text className="font-medium text-black">{item.symbol}</Text>
                    <Text className="text-gray-600">{item.companyName}</Text>
                    <Text className="mt-1 text-black">
                      Rs. {item.lastTradedPrice}
                      <Text
                        className={`${item.perChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {item.perChange >= 0 ? ' ▲' : ' ▼'}
                        {Math.abs(item.perChange).toFixed(2)}%
                      </Text>
                    </Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text className="py-4 text-center text-gray-500">No stocks found</Text>
                }
              />
            </>
          ) : (
            <>
              <View className="mb-6">
                <Text className="text-lg font-bold text-black">{selectedStock.symbol}</Text>
                <Text className="text-gray-600">{selectedStock.companyName}</Text>
                <Text className="mt-1 text-black">
                  Rs. {selectedStock.lastTradedPrice.toLocaleString('en-IN')}
                </Text>
              </View>

              <View className="mb-6 flex-row rounded-lg bg-gray-100 p-1">
                <TouchableOpacity
                  className={`flex-1 rounded-lg py-2 ${transactionType === 'buy' ? 'bg-[#15a37b]' : ''}`}
                  onPress={() => setTransactionType('buy')}>
                  <Text
                    className={`text-center ${transactionType === 'buy' ? 'text-white' : 'text-gray-700'}`}>
                    Buy
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`flex-1 rounded-lg py-2 ${transactionType === 'sell' ? 'bg-[#15a37b]' : ''}`}
                  onPress={() => setTransactionType('sell')}>
                  <Text
                    className={`text-center ${transactionType === 'sell' ? 'text-white' : 'text-gray-700'}`}>
                    Sell
                  </Text>
                </TouchableOpacity>
              </View>

              <Text className="mb-1 text-gray-600">Quantity</Text>
              <TextInput
                className="mb-4 rounded-lg border border-gray-300 p-3 text-black"
                placeholder="Number of shares"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
              />

              <Text className="mb-1 text-gray-600">Price per share (Rs.)</Text>
              <TextInput
                className="mb-4 rounded-lg border border-gray-300 p-3 text-black"
                placeholder="Price per share"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
              />

              {quantity && price && (
                <View className="mb-4">
                  <Text className="text-gray-600">Total Amount:</Text>
                  <Text className="text-lg font-bold text-black">
                    Rs. {(parseFloat(quantity) * parseFloat(price)).toLocaleString('en-IN')}
                  </Text>
                </View>
              )}

              <Text className="mb-1 text-gray-600">Notes (Optional)</Text>
              <TextInput
                className="mb-6 rounded-lg border border-gray-300 p-3 text-black"
                placeholder="e.g., Long term investment"
                placeholderTextColor="#9CA3AF"
                value={notes}
                onChangeText={setNotes}
              />

              <TouchableOpacity
                className={`rounded-lg py-3 ${quantity && price ? 'bg-[#15a37b]' : 'bg-gray-300'}`}
                disabled={!quantity || !price}
                onPress={handleAddStock}>
                <Text className="text-center font-medium text-white">
                  {transactionType === 'buy' ? 'Add to Portfolio' : 'Sell Stock'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Animated.View>
    </Modal>
  );

  // Main render
  return (
    <GestureHandlerRootView className="flex-1 bg-white">
      <StatusBar style="auto" />
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="w-full flex-row items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
          <TouchableOpacity className="w-1/3" onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#6B7280" />
          </TouchableOpacity>

          <View className="w-1/3">
            {portfolios.length > 0 && (
              <DropDownPicker
                open={showDropdown}
                value={selectedPortfolio?.id || null}
                items={portfolioItems}
                setOpen={setShowDropdown}
                setValue={(value: () => string) => {
                  const selected = portfolios.find((p) => p.id === value());
                  if (selected) setSelectedPortfolio(selected);
                }}
                placeholder="Select Portfolio"
                style={{
                  backgroundColor: 'white',
                  borderColor: '#E5E7EB',
                  minHeight: 40,
                }}
                dropDownContainerStyle={{
                  backgroundColor: 'white',
                  borderColor: '#E5E7EB',
                }}
                textStyle={{
                  fontSize: 16,
                  fontWeight: 'bold',
                  textAlign: 'center',
                }}
                showArrowIcon={false}
                listMode="MODAL"
              />
            )}
          </View>

          <View className="w-1/3 flex-row items-center justify-end">
            {portfolios.length > 0 && selectedPortfolio && (
              <TouchableOpacity
                className="mr-3"
                onPress={() => {
                  setEditingPortfolio(selectedPortfolio);
                  setEditPortfolioName(selectedPortfolio.name);
                }}>
                <Feather name="edit" size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => setShowCreateModal(true)}>
              <AntDesign name="plus" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="relative p-4">
          {portfolios.length === 0 ? (
            <View className="mt-[50%] flex items-center justify-center">
              <AntDesign name="disconnect" size={60} color="#808080" />
              <Text className="my-4 text-center text-2xl font-bold text-black">
                Start Building Your Portfolio
              </Text>
              <Text className="mb-8 px-8 text-center text-gray-600">
                Create a portfolio to track your investments and see how they perform over time.
              </Text>
              <TouchableOpacity
                className="rounded-full bg-[#15a37b] px-8 py-3"
                onPress={() => setShowCreateModal(true)}>
                <Text className="text-lg font-medium text-white">Create Portfolio</Text>
              </TouchableOpacity>
            </View>
          ) : selectedPortfolio ? (
            <>
              {/* Portfolio Summary */}
              <View className="mb-6 rounded-xl bg-white p-4 shadow-sm">
                <View className="mb-4 flex-row items-center justify-between">
                  <Text className="text-lg font-bold text-black">{selectedPortfolio.name}</Text>
                  <TouchableOpacity
                    onPress={() => handleSetDefault(selectedPortfolio.id)}
                    className="p-1">
                    <MaterialIcons
                      name={selectedPortfolio.isDefault ? 'star' : 'star-outline'}
                      size={24}
                      color={selectedPortfolio.isDefault ? '#F59E0B' : '#6B7280'}
                    />
                  </TouchableOpacity>
                </View>

                <View className="mb-1 flex-row justify-between">
                  <Text className="text-gray-600">Total Value:</Text>
                  <Text className="font-bold text-black">
                    Rs.{' '}
                    {calculateTotalValue(selectedPortfolio).toLocaleString('en-IN', {
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                </View>

                <View className="mb-4 flex-row justify-between">
                  <Text className="text-gray-600">Profit/Loss:</Text>
                  <Text
                    className={`font-bold ${calculateProfitLoss(selectedPortfolio) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {calculateProfitLoss(selectedPortfolio) >= 0 ? '+' : ''}
                    {calculateProfitLoss(selectedPortfolio).toLocaleString('en-IN', {
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                </View>

                <TouchableOpacity
                  className="rounded-lg bg-[#15a37b] py-2"
                  onPress={() => setShowAddStockModal(true)}>
                  <Text className="text-center font-medium text-white">Add Stock</Text>
                </TouchableOpacity>
              </View>

              {/* Stocks List */}
              {selectedPortfolio.stocks.length > 0 ? (
                <View className="mb-4">
                  <Text className="mb-3 text-lg font-bold text-black">Your Stocks</Text>
                  <View className="rounded-xl bg-white p-4 shadow-sm">
                    {selectedPortfolio.stocks.map(renderStockItem)}
                  </View>
                </View>
              ) : (
                <View className="items-center justify-center py-8">
                  <Text className="mb-2 text-gray-500">No stocks in this portfolio</Text>
                  <TouchableOpacity
                    className="rounded-lg bg-[#15a37b] px-6 py-2"
                    onPress={() => setShowAddStockModal(true)}>
                    <Text className="font-medium text-white">Add Your First Stock</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Delete Portfolio Button */}
              <TouchableOpacity
                className="mt-4 rounded-lg border border-red-500 py-3"
                onPress={() => handleDeletePortfolio(selectedPortfolio.id)}>
                <Text className="text-center font-medium text-red-500">Delete Portfolio</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View className="items-center justify-center py-8">
              <Text className="text-gray-500">No portfolio selected</Text>
            </View>
          )}
        </ScrollView>

        {renderCreatePortfolioModal()}
        {renderEditPortfolioModal()}
        {renderAddStockModal()}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default PortfolioScreen;
