
export enum EntryType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EXPENSE = 'EXPENSE',
  BILL = 'BILL',
  INSURANCE = 'INSURANCE',
  BENEFIT = 'BENEFIT'
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export type FinancialCategory = 'Income' | 'Needs' | 'Wants' | 'Debt' | 'Savings' | 'Investments' | 'General';

export interface FinanceEntry {
  id: string;
  type: EntryType;
  category: FinancialCategory | string;
  name: string;
  amount: number; 
  currency?: string; 
  initialAmount?: number; 
  date: string;
  address?: string;
  plotSize?: string;
  propertyType?: string;
  valuationSources?: GroundingSource[];
  lastValuated?: string;
  referenceNumber?: string;
  linkedAssetId?: string;
  statementDriveId?: string; 
  isRecurring?: boolean;
  isWorkProvided?: boolean;
  liquidity?: 'high' | 'medium' | 'low';
  notes?: string;
  coverageAmount?: number;
  expiryDate?: string;
  // Loan specific
  emi?: number;
  monthsRemaining?: number;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency?: string;
  deadline?: string;
  category: 'Travel' | 'House' | 'Education' | 'Wedding' | 'Retirement' | 'Emergency' | 'Other';
  linkedAssetId?: string;
}

export interface LegacyProfile {
  successorName: string;
  recoveryPasskey: string;
  isConfigured: boolean;
  lastUpdated: string;
}

export interface FinancialHealth {
  score: number;
  safetyNetScore: number;
  summary: string;
  recommendations: string[];
  netWorth: number;
  monthlyCashFlow: number;
  liquidityRatio: number;
  gapAnalysis: {
    missingInsurance: string[];
    riskWarnings: string[];
  };
}

export interface UserData {
  entries: FinanceEntry[];
  goals: Goal[];
  lastSynced: string;
  exchangeRates?: Record<string, number>;
  legacy?: LegacyProfile;
  settings: {
    currency: string;
    userName: string;
    biometricEnabled: boolean;
    termsAccepted: boolean;
    spreadsheetId?: string;
    monthlyBudgetLimit?: number;
  };
}
