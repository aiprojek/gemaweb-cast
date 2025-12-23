import { ReleaseNote, ServerConfig, RecordingConfig, StreamingConfig, StreamBehaviorConfig, RecordBehaviorConfig, DSPConfig, GeneralConfig } from './types';

export const STORAGE_KEY = 'gemaweb_profiles';
export const GENERAL_SETTINGS_KEY = 'gemaweb_general_settings';
export const REC_SETTINGS_KEY = 'gemaweb_rec_settings';
export const REC_BEHAVIOR_KEY = 'gemaweb_rec_behavior';
export const STREAM_SETTINGS_KEY = 'gemaweb_stream_settings';
export const STREAM_BEHAVIOR_KEY = 'gemaweb_stream_behavior';
export const DSP_SETTINGS_KEY = 'gemaweb_dsp_settings';
export const CURRENT_VERSION = '1.4.0';

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: '1.4.0',
    date: '2023-11-10',
    changes: [
      'UX: Simplified Settings interface for easy setup.',
      'New: "Direct HTTP" streaming mode (Experimental/Free).',
      'Update: Smart Default connection mode.'
    ]
  },
  {
    version: '1.3.1',
    date: '2023-11-09',
    changes: [
      'Update: Default streaming mode set to Proxy (Free Tier compatible).',
      'UI: Added built-in guide for running Local Relay Proxy.',
      'Fix: Improved clarity on Cloudflare paid requirements.'
    ]
  },
  {
    version: '1.3.0',
    date: '2023-11-08',
    changes: [
      'New Feature: Cloudflare Workers support for serverless broadcasting.',
      'System: Added dedicated Streaming Service for better stability.',
      'UI: Updated Streaming settings to select between Proxy or Cloudflare mode.'
    ]
  },
  {
    version: '1.2.1',
    date: '2023-11-07',
    changes: [
      'System: Added explicit Simulation Mode indicator.',
      'System: Added WebSocket Proxy support for real streaming.',
      'UI: Clarity improvements on connection logs.'
    ]
  },
  {
    version: '1.2.0',
    date: '2023-11-06',
    changes: [
      'Rebranding: Application renamed to GemaWeb Cast.',
      'UI Update: Updated Logo and About section with branding details.',
      'System: Updated storage keys for GemaWeb namespace.'
    ]
  },
  {
    version: '1.1.0',
    date: '2023-11-05',
    changes: [
      'UI Update: Settings and About menu consolidated into a single dropdown.',
      'UI Update: About page now uses tabbed navigation.',
    ]
  },
  {
    version: '1.0.0',
    date: '2023-11-04',
    changes: [
      'Official Release: WebCast Pro v1.0.0',
      'Streaming: Support for Icecast & Shoutcast protocols.',
      'Audio Engine: Low-latency processing with input gain control.',
      'Recording: Local recording (OPUS/MP3/AAC).',
      'DSP Effects: 5-Band Equalizer & Compressor.',
      'AI Copilot: Integrated AI script generator.'
    ]
  }
];

export const DEFAULT_GENERAL_CONFIG: GeneralConfig = {
  language: 'en'
};

export const DEFAULT_PROFILE_CONFIG: Omit<ServerConfig, 'id'> = {
  name: 'Main Station',
  type: 'Icecast',
  address: 'streaming.example.com',
  port: 8000,
  password: 'password',
  mount: '/stream',
  user: 'source'
};

export const DEFAULT_STREAMING_CONFIG: StreamingConfig = {
  codec: 'MP3',
  bitrate: 128,
  mode: 'CLOUDFLARE', // Set to Cloudflare as default "Smart" mode
  proxyUrl: 'ws://localhost:8888'
};

export const DEFAULT_RECORDING_CONFIG: RecordingConfig = {
  codec: 'OPUS',
  bitrate: 128
};

export const DEFAULT_STREAM_BEHAVIOR: StreamBehaviorConfig = {
  liveTitle: 'Live on GemaWeb',
  titleUpdateDelay: 0,
  autoConnectOnLaunch: false,
  reconnectEnabled: true,
  reconnectDelay: 5
};

export const DEFAULT_RECORD_BEHAVIOR: RecordBehaviorConfig = {
  fileNamePattern: 'gemaweb_%Y%m%d-%H%M%S',
  directory: 'Downloads/GemaWeb',
  startOnConnect: false,
  stopOnDisconnect: false,
  startOnLaunch: false
};

export const DEFAULT_DSP_CONFIG: DSPConfig = {
  compressor: {
    enabled: false,
    threshold: -24,
    ratio: 12,
    attack: 0.003,
    release: 0.25
  },
  equalizer: {
    enabled: false,
    preset: 'Flat',
    bands: [
      { frequency: 60, gain: 0 },
      { frequency: 250, gain: 0 },
      { frequency: 1000, gain: 0 },
      { frequency: 4000, gain: 0 },
      { frequency: 12000, gain: 0 }
    ]
  }
};

export const EQ_PRESETS: Record<string, number[]> = {
  'Flat': [0, 0, 0, 0, 0],
  'Broadcast': [3, 1, -1, 2, 4], // slight bass and presence boost, cut mud
  'Bass Boost': [6, 4, 0, 0, 0],
  'Voice Presence': [-4, -2, 0, 3, 2], // Cut rumble, boost clarity
  'Loudness': [5, -2, 0, -2, 5], // Smile curve
};