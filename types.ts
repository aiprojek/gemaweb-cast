export enum ConnectionState {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}

export type StreamingCodec = 'MP3' | 'AAC' | 'OGG' | 'OPUS';

export type AppLanguage = 'en' | 'id';

export interface GeneralConfig {
  language: AppLanguage;
}

export interface ServerConfig {
  id: string; // Unique identifier for profiles
  name: string;
  type: 'Icecast' | 'Shoutcast';
  address: string;
  port: number;
  password: string;
  mount: string; // For Icecast
  user: string; // For Icecast
}

export type StreamingMode = 'PROXY' | 'CLOUDFLARE' | 'HTTP';

export interface StreamingConfig {
  codec: StreamingCodec;
  bitrate: number; // kbps
  mode: StreamingMode; // Updated: Selection mode
  proxyUrl: string; // e.g. wss://my-proxy.com
}

export interface StreamBehaviorConfig {
  liveTitle: string;
  titleUpdateDelay: number; // seconds (0-20)
  autoConnectOnLaunch: boolean;
  reconnectEnabled: boolean;
  reconnectDelay: number; // seconds
}

export interface RecordingConfig {
  codec: StreamingCodec; // Using the same Enum as streaming for consistency
  bitrate: number; // kbps
}

export interface RecordBehaviorConfig {
  fileNamePattern: string;
  directory: string; // Visual only in web context
  startOnConnect: boolean;
  stopOnDisconnect: boolean;
  startOnLaunch: boolean;
}

export interface CompressorConfig {
  enabled: boolean;
  threshold: number; // dB (-100 to 0)
  ratio: number; // (1 to 20)
  attack: number; // (0 to 1)
  release: number; // (0 to 1)
}

export interface EQBand {
  frequency: number;
  gain: number; // -12 to 12 dB
}

export interface EQConfig {
  enabled: boolean;
  preset: string; // 'Manual', 'Flat', 'Broadcast', etc.
  bands: EQBand[]; // 5 bands: 60, 250, 1000, 4000, 12000 Hz
}

export interface DSPConfig {
  compressor: CompressorConfig;
  equalizer: EQConfig;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

export interface AudioDevice {
  deviceId: string;
  label: string;
}

export interface AIScript {
  title: string;
  content: string;
  suggestedTracks: string[];
}

export interface ReleaseNote {
  version: string;
  date: string;
  changes: string[];
}