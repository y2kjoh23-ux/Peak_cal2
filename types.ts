
export interface ResourceConfig {
  currentAmount: number;
  dailyIncome: number;
  targetAmount: number;
  bonusPercentage: number;
}

export interface PeakSimulation {
  date: string;
  amount: number;
  isPeak: boolean;
}

export interface AIAdvice {
  summary: string;
  recommendations: string[];
  efficiencyRating: number;
  estimatedPeakDate: string;
}

export enum CalculationMode {
  RESOURCES = 'RESOURCES',
  RAID_SCORE = 'RAID_SCORE',
}
