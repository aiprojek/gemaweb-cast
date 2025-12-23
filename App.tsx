import React, { useState, useEffect, useRef } from 'react';
import { ConnectionState, ServerConfig, LogEntry, RecordingConfig, StreamingConfig, StreamBehaviorConfig, RecordBehaviorConfig, DSPConfig, GeneralConfig } from './types';
import { Display } from './components/Display';
import { VUMeter } from './components/VUMeter';
import { Copilot } from './components/Copilot';
import { SettingsView } from './components/SettingsView';
import { AboutView } from './components/AboutView';
import { audioEngine } from './services/audioEngine';
import { streamingService } from './services/streamingService';
import { 
  CURRENT_VERSION, 
  RELEASE_NOTES, 
  STORAGE_KEY, 
  GENERAL_SETTINGS_KEY,
  REC_SETTINGS_KEY,
  REC_BEHAVIOR_KEY,
  STREAM_SETTINGS_KEY,
  STREAM_BEHAVIOR_KEY,
  DSP_SETTINGS_KEY,
  DEFAULT_PROFILE_CONFIG, 
  DEFAULT_RECORDING_CONFIG,
  DEFAULT_STREAMING_CONFIG,
  DEFAULT_STREAM_BEHAVIOR,
  DEFAULT_RECORD_BEHAVIOR,
  DEFAULT_DSP_CONFIG,
  DEFAULT_GENERAL_CONFIG
} from './constants';

// Translation Dictionary
const TRANSLATIONS = {
  en: {
    menu: "Menu",
    settingsTitle: "System Config",
    back: "Back",
    save: "Save Settings",
    savedMsg: "Settings Saved Successfully",
    tabs: {
      general: "General",
      server: "Server Profiles",
      audio: "Audio Devices",
      streaming: "Streaming",
      record: "Recording",
      dsp: "DSP (FX)"
    },
    general: {
      title: "General Settings",
      langLabel: "Application Language",
      backupTitle: "Configuration Backup",
      exportBtn: "Export Config",
      importBtn: "Import Config"
    },
    about: {
      title: "About & Help",
      sectionInfo: "Application Info",
      sectionGuide: "User Manual",
      sectionContact: "Contact Support",
      devLink: "Developer AI Projek",
      licenseLink: "GNU GPL v3 License",
      githubLink: "Github Repository",
      telegramLink: "Join Community",
      donateLink: "Donate / Treat Coffee",
      contactText: "Need help? Contact us directly:",
      emailBtn: "Send Email",
      waBtn: "Chat WhatsApp"
    }
  },
  id: {
    menu: "Menu",
    settingsTitle: "Konfigurasi Sistem",
    back: "Kembali",
    save: "Simpan Pengaturan",
    savedMsg: "Pengaturan Berhasil Disimpan",
    tabs: {
      general: "Umum",
      server: "Profil Server",
      audio: "Perangkat Audio",
      streaming: "Streaming",
      record: "Rekaman",
      dsp: "DSP (FX)"
    },
    general: {
      title: "Pengaturan Umum",
      langLabel: "Bahasa Aplikasi",
      backupTitle: "Cadangan Konfigurasi",
      exportBtn: "Ekspor Config",
      importBtn: "Impor Config"
    },
    about: {
      title: "Tentang & Bantuan",
      sectionInfo: "Informasi Aplikasi",
      sectionGuide: "Panduan Penggunaan",
      sectionContact: "Hubungi Kami",
      devLink: "Pengembang AI Projek",
      licenseLink: "Lisensi GNU GPL v3",
      githubLink: "Repository Github",
      telegramLink: "Gabung Komunitas",
      donateLink: "Traktir Kopi / Donasi",
      contactText: "Butuh bantuan? Hubungi kami langsung:",
      emailBtn: "Kirim Email",
      waBtn: "Chat WhatsApp"
    }
  }
};

// Default config factory
const createDefaultProfile = (): ServerConfig => ({
  id: crypto.randomUUID(),
  ...DEFAULT_PROFILE_CONFIG
});

const App: React.FC = () => {
  // --- State: App Core ---
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.IDLE);
  const [isRecording, setIsRecording] = useState(false);
  const [streamDuration, setStreamDuration] = useState(0);
  const [recDuration, setRecDuration] = useState(0); 
  const [volume, setVolume] = useState({ left: 0, right: 0 });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [toast, setToast] = useState<{show: boolean, msg: string}>({show: false, msg: ''});
  
  // --- State: Configuration & Profiles ---
  const [profiles, setProfiles] = useState<ServerConfig[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>('');
  
  // --- State: Global Settings ---
  const [generalConfig, setGeneralConfig] = useState<GeneralConfig>(DEFAULT_GENERAL_CONFIG);
  const [recConfig, setRecConfig] = useState<RecordingConfig>(DEFAULT_RECORDING_CONFIG);
  const [streamConfig, setStreamConfig] = useState<StreamingConfig>(DEFAULT_STREAMING_CONFIG);
  const [streamBehavior, setStreamBehavior] = useState<StreamBehaviorConfig>(DEFAULT_STREAM_BEHAVIOR);
  const [recBehavior, setRecBehavior] = useState<RecordBehaviorConfig>(DEFAULT_RECORD_BEHAVIOR);
  const [dspConfig, setDspConfig] = useState<DSPConfig>(DEFAULT_DSP_CONFIG);

  // --- State: UI Navigation ---
  // viewMode determines the main screen state
  const [viewMode, setViewMode] = useState<'dashboard' | 'settings' | 'about'>('dashboard');
  const [showChangelog, setShowChangelog] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  // --- State: Audio Settings ---
  const [inputGain, setInputGain] = useState(1.0);
  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');

  // --- Refs ---
  const streamTimerRef = useRef<number | null>(null);
  const recTimerRef = useRef<number | null>(null); 
  const vuRef = useRef<number | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const hasAutoLaunchedRef = useRef(false);

  // Computed
  const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0];
  const t = TRANSLATIONS[generalConfig.language];

  // --- Helpers ---
  const addLog = (message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info') => {
    setLogs(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      message,
      type
    }]);
  };

  const showToast = (msg: string) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: '' }), 3000);
  };

  const formatFileName = (pattern: string, date: Date, extension: string): string => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const replacements: Record<string, string> = {
      '%Y': date.getFullYear().toString(),
      '%m': pad(date.getMonth() + 1),
      '%d': pad(date.getDate()),
      '%H': pad(date.getHours()),
      '%M': pad(date.getMinutes()),
      '%S': pad(date.getSeconds())
    };
    
    let filename = pattern;
    for (const [key, value] of Object.entries(replacements)) {
      filename = filename.replace(new RegExp(key, 'g'), value);
    }
    
    // Safety check: remove illegal characters
    filename = filename.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    
    return `${filename}.${extension}`;
  };

  // --- Lifecycle: Load Profiles & Settings ---
  useEffect(() => {
    // Load Profiles
    const savedProfiles = localStorage.getItem(STORAGE_KEY);
    if (savedProfiles) {
      try {
        const parsed = JSON.parse(savedProfiles);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProfiles(parsed);
          setActiveProfileId(parsed[0].id);
        } else {
          const def = createDefaultProfile();
          setProfiles([def]);
          setActiveProfileId(def.id);
        }
      } catch (e) {
        console.error("Failed to parse profiles", e);
        const def = createDefaultProfile();
        setProfiles([def]);
        setActiveProfileId(def.id);
      }
    } else {
      const def = createDefaultProfile();
      setProfiles([def]);
      setActiveProfileId(def.id);
    }

    // Load Settings
    const loadSetting = (key: string, setter: any) => {
        const saved = localStorage.getItem(key);
        if (saved) {
            try { setter(JSON.parse(saved)); } catch(e) { console.error(e); }
        }
    };

    loadSetting(GENERAL_SETTINGS_KEY, setGeneralConfig);
    loadSetting(REC_SETTINGS_KEY, setRecConfig);
    loadSetting(STREAM_SETTINGS_KEY, setStreamConfig);
    loadSetting(STREAM_BEHAVIOR_KEY, setStreamBehavior);
    loadSetting(REC_BEHAVIOR_KEY, setRecBehavior);
    loadSetting(DSP_SETTINGS_KEY, setDspConfig);

    addLog('System initialized.', 'info');
  }, []);

  // --- Lifecycle: Save Data ---
  useEffect(() => {
    if (profiles.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    }
  }, [profiles]);

  useEffect(() => { localStorage.setItem(GENERAL_SETTINGS_KEY, JSON.stringify(generalConfig)); }, [generalConfig]);
  useEffect(() => { localStorage.setItem(REC_SETTINGS_KEY, JSON.stringify(recConfig)); }, [recConfig]);
  useEffect(() => { localStorage.setItem(STREAM_SETTINGS_KEY, JSON.stringify(streamConfig)); }, [streamConfig]);
  useEffect(() => { localStorage.setItem(STREAM_BEHAVIOR_KEY, JSON.stringify(streamBehavior)); }, [streamBehavior]);
  useEffect(() => { localStorage.setItem(REC_BEHAVIOR_KEY, JSON.stringify(recBehavior)); }, [recBehavior]);
  useEffect(() => { localStorage.setItem(DSP_SETTINGS_KEY, JSON.stringify(dspConfig)); }, [dspConfig]);

  // --- Lifecycle: Sync DSP to Audio Engine ---
  useEffect(() => {
    audioEngine.setDSPConfig(dspConfig);
  }, [dspConfig]);

  // --- Auto-Start Logic ---
  useEffect(() => {
    if (profiles.length > 0 && !hasAutoLaunchedRef.current) {
      hasAutoLaunchedRef.current = true;
      
      // Delay slightly for audio engine readiness
      setTimeout(() => {
          // Auto Connect
          if (streamBehavior.autoConnectOnLaunch && connectionState === ConnectionState.IDLE) {
            addLog('Auto-start enabled: Initiating connection...', 'info');
            toggleConnection();
          }

          // Auto Record
          if (recBehavior.startOnLaunch && !isRecording) {
             addLog('Auto-record enabled: Starting recording...', 'info');
             startRecordingProcess();
          }
      }, 1000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles, streamBehavior.autoConnectOnLaunch, recBehavior.startOnLaunch]);

  // Scroll log to bottom
  useEffect(() => {
    if (viewMode === 'dashboard') {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, viewMode]);

  // Initial Audio Setup
  useEffect(() => {
    const initAudio = async () => {
      try {
        await audioEngine.initialize();
        // Sync DSP config after init
        audioEngine.setDSPConfig(dspConfig);
        const devices = await audioEngine.getInputDevices();
        setInputDevices(devices);
        if (devices.length > 0) setSelectedDevice(devices[0].deviceId);
        startVULoop();
      } catch (e) {
        addLog('Failed to initialize audio. Check permissions.', 'error');
      }
    };
    initAudio();

    return () => {
      stopVULoop();
      audioEngine.cleanup();
      streamingService.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // VU Meter Loop
  const startVULoop = () => {
    const tick = () => {
      const vol = audioEngine.getVolumeData();
      setVolume(vol);
      vuRef.current = requestAnimationFrame(tick);
    };
    vuRef.current = requestAnimationFrame(tick);
  };

  const stopVULoop = () => {
    if (vuRef.current) cancelAnimationFrame(vuRef.current);
  };

  // --- Event Handlers: Audio ---
  const handleDeviceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const deviceId = e.target.value;
    setSelectedDevice(deviceId);
    try {
      await audioEngine.initialize(deviceId);
      // Re-apply settings after re-init
      audioEngine.setDSPConfig(dspConfig);
      audioEngine.setGain(inputGain);
      addLog(`Input device changed to ${inputDevices.find(d => d.deviceId === deviceId)?.label || deviceId}`, 'info');
    } catch (err) {
      addLog('Error switching input device', 'error');
    }
  };

  const handleGainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setInputGain(val);
    audioEngine.setGain(val);
  };

  // --- Logic: Recording ---
  const startRecordingProcess = async () => {
      try {
        const { usedMimeType } = await audioEngine.startRecording(recConfig.codec, recConfig.bitrate);
        setIsRecording(true);
        
        // Start Timer
        setRecDuration(0);
        recTimerRef.current = window.setInterval(() => {
          setRecDuration(prev => prev + 1);
        }, 1000);

        addLog(`Recording started (${recConfig.codec} [${usedMimeType}] @ ${recConfig.bitrate}kbps)`, 'info');
      } catch (e) {
        addLog(`Failed to start recording: ${e}`, 'error');
        console.error(e);
      }
  };

  const stopRecordingProcess = async () => {
      try {
        addLog('Stopping recording...', 'info');
        const blob = await audioEngine.stopRecording();
        setIsRecording(false);
        
        // Stop Timer
        if (recTimerRef.current) {
          clearInterval(recTimerRef.current);
          recTimerRef.current = null;
        }
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        
        // Determine file extension
        let ext = 'webm';
        if (blob.type.includes('mpeg') || blob.type.includes('mp3')) ext = 'mp3';
        else if (blob.type.includes('aac')) ext = 'aac';
        else if (blob.type.includes('ogg')) ext = 'ogg';
        
        // Format Filename
        const fileName = formatFileName(recBehavior.fileNamePattern, new Date(), ext);

        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 100);

        addLog(`Recording saved: ${fileName}`, 'success');
        if (recBehavior.directory !== 'Downloads/GemaWeb') {
             addLog(`Note: Browser saved to default downloads.`, 'warning');
        }
      } catch (e) {
        addLog('Error stopping recording.', 'error');
        console.error(e);
      }
  };

  const toggleRecording = async () => {
    if (!isRecording) {
      await startRecordingProcess();
    } else {
      await stopRecordingProcess();
    }
  };

  // --- Event Handlers: Connection ---
  const toggleConnection = async () => {
    if (!activeProfile) return;

    if (connectionState === ConnectionState.IDLE || connectionState === ConnectionState.ERROR) {
      // Connect
      setConnectionState(ConnectionState.CONNECTING);
      addLog(`Initializing connection via ${streamConfig.mode}...`, 'info');

      try {
        // 1. Establish Network Connection (WebSocket)
        await streamingService.connect(activeProfile, streamConfig);
        addLog(`Connected to Streaming Node.`, 'info');
        
        // 2. Start Audio Encoding & Streaming
        const { usedMimeType } = await audioEngine.startStreaming(
          streamConfig.codec, 
          streamConfig.bitrate,
          (data) => {
             streamingService.sendAudioChunk(data);
          }
        );
        
        setConnectionState(ConnectionState.CONNECTED);
        addLog(`Streaming Started: ${streamConfig.codec} [${usedMimeType}] @ ${streamConfig.bitrate}kbps`, 'success');
        addLog(`Live Title: "${streamBehavior.liveTitle}"`, 'info');

        // Auto Recording
        if (recBehavior.startOnConnect && !isRecording) {
            addLog('Auto-start Record triggered by connection.', 'info');
            startRecordingProcess();
        }

        setStreamDuration(0);
        streamTimerRef.current = window.setInterval(() => {
          setStreamDuration(prev => prev + 1);
        }, 1000);

      } catch (error) {
        console.error(error);
        setConnectionState(ConnectionState.ERROR);
        addLog(`Connection Failed: ${error}`, 'error');
        if (streamConfig.mode === 'CLOUDFLARE') {
           addLog('Hint: Ensure you are running on Cloudflare Pages/Workers environment.', 'warning');
        } else {
           addLog('Hint: Ensure local proxy is running.', 'warning');
        }
      }

    } else {
      // Disconnect
      setConnectionState(ConnectionState.IDLE);
      
      await audioEngine.stopStreaming();
      streamingService.disconnect();
      
      addLog('Disconnected from server', 'warning');
      
      // Auto Stop Recording
      if (recBehavior.stopOnDisconnect && isRecording) {
          addLog('Auto-stop Record triggered by disconnection.', 'info');
          stopRecordingProcess();
      }

      if (streamTimerRef.current) {
        clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
      }
    }
  };

  // --- Render ---
  return (
    <div className="min-h-screen bg-[#111] flex items-center justify-center p-2 md:p-4 font-mono text-sm">
      
      {/* Container Card */}
      <div className="w-full max-w-4xl bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-gray-800 flex flex-col md:flex-row overflow-hidden relative min-h-[85vh] md:min-h-[500px]">
        
        {/* Toast Notification */}
        <div className={`absolute top-4 right-4 z-[100] transition-all duration-300 transform ${toast.show ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0 pointer-events-none'}`}>
          <div className="bg-green-600 text-white px-4 py-2 rounded shadow-lg flex items-center gap-2 font-bold text-xs">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            {toast.msg}
          </div>
        </div>

        {/* Release Notes Overlay */}
        {showChangelog && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
             <div className="bg-[#222] border border-gray-600 rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-[#1a1a1a]">
                   <h2 className="text-white font-bold text-lg">Release Notes</h2>
                   <button onClick={() => setShowChangelog(false)} className="text-gray-400 hover:text-white text-xl">✕</button>
                </div>
                <div className="p-4 md:p-6 overflow-y-auto">
                   {RELEASE_NOTES.map((note, idx) => (
                     <div key={idx} className="mb-6 last:mb-0">
                       <div className="flex items-baseline gap-2 mb-2">
                         <span className="text-green-500 font-bold text-base">v{note.version}</span>
                         <span className="text-gray-500 text-xs">{note.date}</span>
                       </div>
                       <ul className="list-disc list-inside text-gray-300 space-y-1">
                         {note.changes.map((change, cIdx) => (
                           <li key={cIdx}>{change}</li>
                         ))}
                       </ul>
                     </div>
                   ))}
                </div>
                <div className="p-4 border-t border-gray-700 bg-[#1a1a1a] text-right">
                  <button onClick={() => setShowChangelog(false)} className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 w-full md:w-auto">Close</button>
                </div>
             </div>
          </div>
        )}

        {/* =======================
            VIEW 1: DASHBOARD
           ======================= */}
        {viewMode === 'dashboard' && (
          <>
            {/* LEFT PANEL: Broadcast Controls */}
            <div className="flex-1 p-4 md:p-6 flex flex-col gap-4 md:gap-6 animate-in slide-in-from-left duration-300">
              {/* Header */}
              <div className="flex justify-between items-center border-b border-gray-700 pb-4">
                <div>
                  <h1 className="text-xl md:text-2xl font-black text-gray-200 tracking-tighter italic">GemaWeb <span className="text-green-500">Cast</span></h1>
                  <span className="text-[10px] md:text-xs text-gray-500">Professional Broadcast Utility</span>
                </div>
                <div className="flex items-center gap-4">
                   <div className="flex gap-2 hidden sm:flex">
                      <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_red]"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_8px_orange]"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_green]"></div>
                   </div>
                   
                   {/* Dropdown Menu */}
                   <div className="relative">
                     <button 
                      onClick={() => setShowMenu(!showMenu)}
                      className="text-gray-400 hover:text-white transition-colors p-2 rounded hover:bg-gray-800 border border-gray-700 md:border-transparent flex items-center gap-2"
                      title={t.menu}
                     >
                       <svg className="w-6 h-6 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                     </button>
                     
                     {showMenu && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
                          <div className="absolute right-0 top-full mt-2 w-48 bg-[#222] border border-gray-700 rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                             <button
                                onClick={() => { setViewMode('settings'); setShowMenu(false); }}
                                className="w-full text-left px-4 py-3 text-xs font-bold text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-3 border-b border-gray-800"
                             >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                {t.settingsTitle}
                             </button>
                             <button
                                onClick={() => { setViewMode('about'); setShowMenu(false); }}
                                className="w-full text-left px-4 py-3 text-xs font-bold text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-3"
                             >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {t.about.title}
                             </button>
                          </div>
                        </>
                     )}
                   </div>
                </div>
              </div>

              {/* Main LCD */}
              <Display 
                state={connectionState} 
                streamDuration={streamDuration}
                recDuration={recDuration}
                isRecording={isRecording}
                serverName={activeProfile?.name || 'Loading...'}
                isSimulation={false}
              />

              {/* VU Meters */}
              <div>
                 <div className="flex justify-between text-xs text-gray-400 mb-1">
                   <span>L/R Input Level</span>
                   <span>{(inputGain * 100).toFixed(0)}%</span>
                 </div>
                 <VUMeter volume={volume} />
              </div>

              {/* Primary Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button 
                  onClick={toggleConnection}
                  disabled={!activeProfile}
                  className={`
                    h-14 rounded font-bold text-lg shadow-lg transform transition active:scale-95 flex items-center justify-center gap-2
                    ${connectionState === ConnectionState.CONNECTED 
                      ? 'bg-red-900 text-red-100 border border-red-700 hover:bg-red-800' 
                      : 'bg-green-800 text-green-100 border border-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed'}
                  `}
                >
                  {connectionState === ConnectionState.CONNECTED ? (
                    <>
                      <div className="w-3 h-3 bg-red-400 animate-pulse rounded-full"></div>
                      STOP STREAM
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      START STREAM
                    </>
                  )}
                </button>

                <button 
                  className={`
                    h-14 rounded font-bold text-lg shadow-lg transform transition active:scale-95 flex items-center justify-center gap-2
                    ${isRecording 
                      ? 'bg-yellow-900 text-yellow-100 border border-yellow-700 hover:bg-yellow-800' 
                      : 'bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-200'}
                  `}
                  onClick={toggleRecording}
                >
                  {isRecording ? (
                    <>
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-blink"></div>
                      STOP REC
                    </>
                  ) : (
                    <>
                       <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                       REC LOCAL
                    </>
                  )}
                </button>
              </div>

              {/* Log Window */}
              <div className="bg-black border border-gray-700 rounded p-2 overflow-y-auto h-32 md:flex-1 font-mono text-xs">
                {logs.length === 0 && <span className="text-gray-700 select-none">System Ready...</span>}
                {logs.map((log) => (
                  <div key={log.id} className="mb-1">
                    <span className="text-gray-500">[{log.timestamp.toLocaleTimeString()}]</span>
                    <span className={`ml-2 ${
                      log.type === 'error' ? 'text-red-400' : 
                      log.type === 'success' ? 'text-green-400' : 
                      log.type === 'warning' ? 'text-yellow-400' : 'text-gray-300'
                    }`}>
                      {log.message}
                    </span>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>

            {/* RIGHT PANEL: AI Copilot */}
            <div className="w-full md:w-80 bg-[#222] border-t md:border-t-0 md:border-l border-gray-800 flex flex-col animate-in slide-in-from-right duration-300 h-96 md:h-auto">
               <div className="flex border-b border-gray-700 bg-[#1a1a1a]">
                 <div className="flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider bg-[#222] text-purple-400 border-b-2 border-purple-500">
                   AI Prep
                 </div>
              </div>
              <div className="flex-1 p-4 overflow-y-auto">
                 <Copilot onAddLog={addLog} />
              </div>
              <div className="p-3 bg-[#1a1a1a] border-t border-gray-800 flex justify-between items-center text-[10px] text-gray-600">
                <span>GemaWeb Cast</span>
                <button 
                  onClick={() => setShowChangelog(true)} 
                  className="text-green-600 hover:text-green-500 hover:underline cursor-pointer"
                >
                  v{CURRENT_VERSION}
                </button>
              </div>
            </div>
          </>
        )}

        {/* =======================
            VIEW 2: SETTINGS (Component)
           ======================= */}
        {viewMode === 'settings' && (
          <SettingsView 
            generalConfig={generalConfig} setGeneralConfig={setGeneralConfig}
            profiles={profiles} setProfiles={setProfiles} activeProfileId={activeProfileId} setActiveProfileId={setActiveProfileId}
            streamConfig={streamConfig} setStreamConfig={setStreamConfig}
            streamBehavior={streamBehavior} setStreamBehavior={setStreamBehavior}
            recConfig={recConfig} setRecConfig={setRecConfig}
            recBehavior={recBehavior} setRecBehavior={setRecBehavior}
            dspConfig={dspConfig} setDspConfig={setDspConfig}
            inputDevices={inputDevices} selectedDevice={selectedDevice} handleDeviceChange={handleDeviceChange}
            inputGain={inputGain} handleGainChange={handleGainChange}
            onBack={() => setViewMode('dashboard')}
            onShowToast={showToast}
            onAddLog={addLog}
            t={t}
          />
        )}

        {/* =======================
            VIEW 3: ABOUT (Component)
           ======================= */}
        {viewMode === 'about' && (
          <AboutView 
            t={t.about}
            onBack={() => setViewMode('dashboard')}
          />
        )}
      </div>
    </div>
  );
};

export default App;