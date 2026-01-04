
export interface PowerCalculation {
  maxTR: number;
  ct: number;
  mof: number;
  peakPower: string;
}

export interface AISSSetting {
  ct: number;
  maxTR: number;
  phaseCurrent: string;
  groundCurrent: string;
  timeDelay: string;
}

export interface DeviceStatus {
  hasFlash: boolean;
  isFlashOn: boolean;
}
