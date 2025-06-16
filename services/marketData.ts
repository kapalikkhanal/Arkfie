// services/marketData.ts
export interface MarketData {
  status: number;
  data: {
    subIndices: any;
    liveData: Stock[];
    nepseIndex: {
      sindex: string;
      currentValue: number;
      perChange: number;
      schange: number;
      lastUpdatedDate: string;
    }[];
    marketSummary: {
      ms_key: string;
      ms_value: string;
    }[];
  };
}

export interface Stock {
  companyName?: string;
  schange?: number | null;
  lastTradedPrice?: number | null;
  id?: number;
  symbol: string;
  name?: string;
  price?: number;
  change?: number;
  perChange?: number;
  percentageChange?: number;
  isUp?: boolean;
  logoColor?: string;
}

export interface ChartPoint {
  value: number;
  date?: Date;
}

export interface CandleData {
  id: number;
  t: number;
  c: number;
  h: number;
  l: number;
  o: number;
  v: number;
  type: number;
  pc: number | null;
}

export const fetchMarketData = async () => {
  const response = await fetch('https://peridotnepal.xyz/api/market_data/home_live', {
    headers: { Permission: '2021D@T@f@RSt6&%2-D@T@' },
  });
  const data: MarketData = await response.json();
  return data;
};

export const fetchCandleData = async (periodTimestamp: number) => {
  const response = await fetch(
    `https://peridotnepal.xyz/api/company/chart_data/1/${periodTimestamp}`,
    { headers: { Permission: '2021D@T@f@RSt6&%2-D@T@' } }
  );
  const data = await response.json();
  return data;
};
