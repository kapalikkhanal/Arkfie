export interface Stock {
  sindex: string;
  ms_key: string;
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

export interface StockWithId extends Stock {
  chartData: never[];
  id?: number;
  isUp?: boolean;
  logoColor?: string;
}

export interface Portfolio {
  id: string;
  name: string;
  isDefault: boolean;
  stocks: PortfolioStock[];
}

export interface PortfolioStock {
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
}
