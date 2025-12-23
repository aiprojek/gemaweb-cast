import React, { useState, useRef } from 'react';
import { ServerConfig, RecordingConfig, StreamingConfig, StreamBehaviorConfig, RecordBehaviorConfig, DSPConfig, GeneralConfig, AppLanguage, StreamingMode } from '../types';
import { EQ_PRESETS, DEFAULT_PROFILE_CONFIG } from '../constants';
import { streamingService } from '../services/streamingService';

interface SettingsViewProps {
  // Global State
  generalConfig: GeneralConfig;
  setGeneralConfig: React.Dispatch<React.SetStateAction<GeneralConfig>>;
  
  profiles: ServerConfig[];
  setProfiles: React.Dispatch<React.SetStateAction<ServerConfig[]>>;
  activeProfileId: string;
  setActiveProfileId: React.Dispatch<React.SetStateAction<string>>;
  
  streamConfig: StreamingConfig;
  setStreamConfig: React.Dispatch<React.SetStateAction<StreamingConfig>>;
  
  streamBehavior: StreamBehaviorConfig;
  setStreamBehavior: React.Dispatch<React.SetStateAction<StreamBehaviorConfig>>;
  
  recConfig: RecordingConfig;
  setRecConfig: React.Dispatch<React.SetStateAction<RecordingConfig>>;
  
  recBehavior: RecordBehaviorConfig;
  setRecBehavior: React.Dispatch<React.SetStateAction<RecordBehaviorConfig>>;
  
  dspConfig: DSPConfig;
  setDspConfig: React.Dispatch<React.SetStateAction<DSPConfig>>;
  
  // Audio State
  inputDevices: MediaDeviceInfo[];
  selectedDevice: string;
  handleDeviceChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  inputGain: number;
  handleGainChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  
  // Navigation & Utils
  onBack: () => void;
  onShowToast: (msg: string) => void;
  onAddLog: (msg: string, type: 'info' | 'error' | 'success') => void;
  t: any; // Translation object
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  generalConfig, setGeneralConfig,
  profiles, setProfiles, activeProfileId, setActiveProfileId,
  streamConfig, setStreamConfig,
  streamBehavior, setStreamBehavior,
  recConfig, setRecConfig,
  recBehavior, setRecBehavior,
  dspConfig, setDspConfig,
  inputDevices, selectedDevice, handleDeviceChange,
  inputGain, handleGainChange,
  onBack, onShowToast, onAddLog, t
}) => {
  const [settingsTab, setSettingsTab] = useState<'general' | 'server' | 'audio' | 'streaming' | 'record' | 'dsp'>('server');
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [isUpdatingTitle, setIsUpdatingTitle] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0];

  // --- Logic: Profile Management ---
  const updateActiveProfile = (field: keyof ServerConfig, value: any) => {
    setProfiles(prev => prev.map(p => 
      p.id === activeProfileId ? { ...p, [field]: value } : p
    ));
  };

  const addNewProfile = () => {
    const newProfile = { id: crypto.randomUUID(), ...DEFAULT_PROFILE_CONFIG };
    setProfiles(prev => [...prev, newProfile]);
    setActiveProfileId(newProfile.id);
    onAddLog('New profile created.', 'info');
  };

  const deleteActiveProfile = () => {
    if (profiles.length <= 1) {
      onAddLog('Cannot delete the last profile.', 'error');
      return;
    }
    const newProfiles = profiles.filter(p => p.id !== activeProfileId);
    setProfiles(newProfiles);
    setActiveProfileId(newProfiles[0].id);
    onAddLog('Profile deleted.', 'info');
  };

  // --- Logic: Import/Export ---
  const handleExport = () => {
    const exportData = {
      generalConfig,
      profiles,
      recordingConfig: recConfig,
      streamingConfig: streamConfig,
      streamBehavior,
      recBehavior,
      dspConfig
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "webcast_pro_backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    onAddLog('Configuration exported.', 'success');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        
        let newProfiles = [];
        if (Array.isArray(parsed)) {
           // Legacy format support
           newProfiles = parsed;
        } else if (parsed.profiles) {
           newProfiles = parsed.profiles;
           if (parsed.generalConfig) setGeneralConfig(parsed.generalConfig);
           if (parsed.recordingConfig) setRecConfig(parsed.recordingConfig);
           if (parsed.streamingConfig) setStreamConfig(parsed.streamingConfig);
           if (parsed.streamBehavior) setStreamBehavior(parsed.streamBehavior);
           if (parsed.recBehavior) setRecBehavior(parsed.recBehavior);
           if (parsed.dspConfig) setDspConfig(parsed.dspConfig);
        }

        if (newProfiles.length > 0 && newProfiles[0].id) {
          setProfiles(newProfiles);
          setActiveProfileId(newProfiles[0].id);
          onAddLog('Configuration imported successfully.', 'success');
          onShowToast('Configuration Restored');
        } else {
          onAddLog('Invalid configuration file.', 'error');
        }
      } catch (err) {
        onAddLog('Failed to parse file.', 'error');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // --- Logic: EQ Handling ---
  const handleEQPresetChange = (presetName: string) => {
    if (presetName === 'Manual') {
      setDspConfig(prev => ({
        ...prev,
        equalizer: { ...prev.equalizer, preset: 'Manual' }
      }));
      return;
    }

    const presetValues = EQ_PRESETS[presetName];
    if (presetValues) {
      setDspConfig(prev => ({
        ...prev,
        equalizer: {
          ...prev.equalizer,
          preset: presetName,
          bands: prev.equalizer.bands.map((b, i) => ({ ...b, gain: presetValues[i] }))
        }
      }));
    }
  };

  const handleEQBandChange = (index: number, val: number) => {
    const newBands = [...dspConfig.equalizer.bands];
    newBands[index].gain = val;
    setDspConfig(prev => ({
      ...prev,
      equalizer: { ...prev.equalizer, bands: newBands, preset: 'Manual' }
    }));
  };
  
  const handleUpdateLiveTitle = async () => {
    if (isUpdatingTitle) return;
    setIsUpdatingTitle(true);
    onAddLog(`Updating title to "${streamBehavior.liveTitle}"...`, 'info');
    
    try {
      await streamingService.updateMetadata(activeProfile, streamConfig, streamBehavior.liveTitle);
      onAddLog(`METADATA UPDATED: "${streamBehavior.liveTitle}"`, 'success');
      onShowToast('Title Updated on Server');
    } catch (e: any) {
      onAddLog(`Failed to update title: ${e.message}`, 'error');
    } finally {
      setIsUpdatingTitle(false);
    }
  };

  // Helper for Bitrate Options
  const renderBitrateOptions = () => (
    <>
      <option value={8}>8 kbps (Extreme Low)</option>
      <option value={16}>16 kbps (Speech Low)</option>
      <option value={24}>24 kbps (Speech Clear)</option>
      <option value={32}>32 kbps (AM Radio)</option>
      <option value={40}>40 kbps</option>
      <option value={48}>48 kbps (FM Mono)</option>
      <option value={56}>56 kbps</option>
      <option value={64}>64 kbps (Standard Voice)</option>
      <option value={80}>80 kbps</option>
      <option value={96}>96 kbps (Music Low)</option>
      <option value={112}>112 kbps</option>
      <option value={128}>128 kbps (Music Std)</option>
      <option value={160}>160 kbps</option>
      <option value={192}>192 kbps (High Quality)</option>
      <option value={256}>256 kbps (Studio)</option>
      <option value={320}>320 kbps (Max)</option>
    </>
  );

  return (
    <div className="flex-1 flex flex-col animate-in zoom-in-95 duration-200">
        {/* Settings Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-[#1a1a1a] border-b border-gray-700 gap-3">
          <div className="flex items-center gap-3 w-full md:w-auto">
              <button 
              onClick={onBack}
              className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors bg-gray-800 hover:bg-gray-700 px-3 py-2 md:py-1.5 rounded text-xs font-bold uppercase"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                {t.back}
              </button>
              <h2 className="text-lg md:text-xl font-bold text-gray-200">{t.settingsTitle}</h2>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
             <div className="flex items-center gap-2">
               <span className="text-[10px] text-gray-500 font-bold uppercase">{isAdvancedMode ? 'ADVANCED' : 'SIMPLE'}</span>
               <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={isAdvancedMode}
                    onChange={e => setIsAdvancedMode(e.target.checked)}
                  />
                  <div className="w-8 h-4 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
             </div>
             
             <button 
                onClick={() => onShowToast(t.savedMsg)}
                className="flex-1 md:flex-none bg-green-700 hover:bg-green-600 text-white px-4 py-2 md:py-1.5 rounded text-xs font-bold uppercase flex items-center justify-center gap-2 transition-colors"
             >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                {t.save}
             </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Settings Sidebar */}
          <div className="w-full md:w-48 bg-[#222] border-b md:border-b-0 md:border-r border-gray-700 flex flex-row md:flex-col p-2 gap-1 overflow-x-auto shrink-0">
              {['server', 'audio', 'streaming', 'record', 'dsp', 'general'].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setSettingsTab(tab as any)}
                  className={`flex-1 md:flex-none text-center md:text-left px-4 py-3 rounded text-xs font-bold uppercase transition-colors flex items-center justify-center md:justify-start gap-2 whitespace-nowrap ${settingsTab === tab ? 'bg-green-900/50 text-green-400 border border-green-800' : 'text-gray-400 hover:bg-gray-800'}`}
                >
                  <span>{t.tabs[tab]}</span>
                </button>
              ))}
          </div>

          {/* Settings Content Area */}
          <div className="flex-1 bg-[#151515] p-4 md:p-6 overflow-y-auto">

              {/* TAB: GENERAL */}
              {settingsTab === 'general' && (
                <div className="max-w-xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                  <div className="border-b border-gray-700 pb-2 mb-4">
                      <h3 className="text-lg text-white font-bold">{t.general.title}</h3>
                  </div>

                  <div className="bg-gray-900 p-4 rounded border border-gray-800 space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs text-gray-400 font-bold uppercase">{t.general.langLabel}</label>
                        <select 
                            value={generalConfig.language} 
                            onChange={(e) => setGeneralConfig(prev => ({...prev, language: e.target.value as AppLanguage}))}
                            className="w-full bg-[#111] border border-gray-600 text-white text-sm p-3 md:p-2 rounded focus:border-green-500 outline-none"
                        >
                            <option value="en">English (US)</option>
                            <option value="id">Bahasa Indonesia</option>
                        </select>
                      </div>
                  </div>

                  {isAdvancedMode && (
                    <div className="bg-gray-900 p-4 rounded border border-gray-800 space-y-4">
                        <h4 className="text-xs text-gray-400 font-bold uppercase mb-3">{t.general.backupTitle}</h4>
                        <div className="flex flex-col md:flex-row gap-3">
                            <button onClick={handleExport} className="px-4 py-3 md:py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-200 text-xs rounded transition-colors flex items-center justify-center md:justify-start gap-2">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                {t.general.exportBtn}
                            </button>
                            <button onClick={() => fileInputRef.current?.click()} className="px-4 py-3 md:py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-200 text-xs rounded transition-colors flex items-center justify-center md:justify-start gap-2">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                {t.general.importBtn}
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef}
                                onChange={handleImportFile}
                                className="hidden" 
                                accept=".json"
                            />
                        </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* TAB: SERVER */}
              {settingsTab === 'server' && activeProfile && (
                <div className="max-w-xl mx-auto space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-gray-700 pb-2 mb-4 gap-2">
                      <h3 className="text-lg text-white font-bold">Broadcasting Server</h3>
                      {isAdvancedMode && (
                        <div className="flex w-full md:w-auto gap-2">
                            <button onClick={addNewProfile} className="flex-1 md:flex-none bg-green-700 hover:bg-green-600 text-white text-xs px-3 py-2 md:py-1 rounded font-bold transition-colors">
                            + NEW
                            </button>
                            <button onClick={deleteActiveProfile} className="flex-1 md:flex-none bg-red-900 hover:bg-red-800 text-red-100 text-xs px-3 py-2 md:py-1 rounded font-bold transition-colors">
                            DELETE
                            </button>
                        </div>
                      )}
                  </div>

                  <div className="bg-gray-900 p-4 rounded border border-gray-800 space-y-4">
                      {isAdvancedMode && (
                          <div className="space-y-1">
                            <label className="text-xs text-gray-400 font-bold uppercase">Profile</label>
                            <select 
                                value={activeProfileId} 
                                onChange={(e) => setActiveProfileId(e.target.value)}
                                className="w-full bg-[#111] border border-gray-600 text-white text-sm p-3 md:p-2 rounded focus:border-green-500 outline-none"
                            >
                                {profiles.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                          </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-800 pt-3">
                        <div className="md:col-span-2 space-y-1">
                            <label className="text-xs text-gray-500 uppercase font-bold">Server Address (Host)</label>
                            <input 
                                type="text" 
                                placeholder="e.g. s1.streaming.com"
                                value={activeProfile.address} 
                                onChange={e => updateActiveProfile('address', e.target.value)} 
                                className="w-full bg-[#111] border border-gray-700 p-3 rounded text-white text-sm focus:border-green-500 outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500 uppercase font-bold">Port</label>
                            <input 
                                type="number" 
                                placeholder="8000"
                                value={activeProfile.port} 
                                onChange={e => updateActiveProfile('port', parseInt(e.target.value))} 
                                className="w-full bg-[#111] border border-gray-700 p-3 rounded text-white text-sm focus:border-green-500 outline-none"
                            />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-gray-500 uppercase font-bold">Source Password</label>
                        <input 
                            type="password" 
                            placeholder="Required"
                            value={activeProfile.password} 
                            onChange={e => updateActiveProfile('password', e.target.value)} 
                            className="w-full bg-[#111] border border-gray-700 p-3 rounded text-white text-sm focus:border-green-500 outline-none"
                        />
                      </div>

                      {activeProfile.type === 'Icecast' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs text-gray-500 uppercase font-bold">Mount Point</label>
                              <input 
                                type="text" 
                                value={activeProfile.mount} 
                                onChange={e => updateActiveProfile('mount', e.target.value)} 
                                className="w-full bg-[#111] border border-gray-700 p-3 rounded text-white text-sm focus:border-green-500 outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-gray-500 uppercase font-bold">User</label>
                              <input 
                                type="text" 
                                value={activeProfile.user} 
                                onChange={e => updateActiveProfile('user', e.target.value)} 
                                className="w-full bg-[#111] border border-gray-700 p-3 rounded text-white text-sm focus:border-green-500 outline-none"
                              />
                            </div>
                        </div>
                      )}
                      
                      {isAdvancedMode && (
                         <div className="pt-2 border-t border-gray-800">
                             <div className="space-y-1">
                                <label className="text-xs text-gray-500">Protocol Type</label>
                                <select 
                                value={activeProfile.type} 
                                onChange={e => updateActiveProfile('type', e.target.value)} 
                                className="w-full bg-[#111] border border-gray-700 p-2 rounded text-white text-xs focus:border-green-500 outline-none"
                                >
                                <option value="Icecast">Icecast (Standard)</option>
                                <option value="Shoutcast">Shoutcast (Legacy)</option>
                                </select>
                            </div>
                         </div>
                      )}
                  </div>
                </div>
              )}

              {/* TAB: AUDIO */}
              {settingsTab === 'audio' && (
                <div className="max-w-xl mx-auto space-y-6">
                  <div className="border-b border-gray-700 pb-2 mb-4">
                      <h3 className="text-lg text-white font-bold">Audio Input</h3>
                  </div>

                  <div className="bg-gray-900 p-4 rounded border border-gray-800 space-y-6">
                      <div className="space-y-2">
                        <label className="text-xs text-gray-400 font-bold uppercase">Microphone / Mixer</label>
                        <select 
                            value={selectedDevice} 
                            onChange={handleDeviceChange}
                            className="w-full bg-[#111] border border-gray-700 text-white text-sm p-3 rounded focus:border-green-500 outline-none"
                        >
                            {inputDevices.map(d => (
                            <option key={d.deviceId} value={d.deviceId}>{d.label || `Device ${d.deviceId.substr(0,5)}...`}</option>
                            ))}
                        </select>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between">
                            <label className="text-xs text-gray-400 font-bold uppercase">Input Volume (Gain)</label>
                            <span className="text-xs text-green-500 font-mono font-bold">{(inputGain * 100).toFixed(0)}%</span>
                        </div>
                        <input 
                            type="range" 
                            min="0" 
                            max="2" 
                            step="0.01" 
                            value={inputGain} 
                            onChange={handleGainChange}
                            className="w-full accent-green-500 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                  </div>
                  
                  {/* Streaming Codec/Bitrate - VISIBLE TO ALL */}
                  <div className="bg-gray-900 p-4 rounded border border-gray-800 space-y-6 relative overflow-hidden">
                      <h4 className="text-sm text-gray-300 font-bold uppercase border-b border-gray-700 pb-2">Streaming Quality</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                              <label className="text-xs text-green-500 font-bold">Codec</label>
                              <select 
                              value={streamConfig.codec} 
                              onChange={e => setStreamConfig(prev => ({...prev, codec: e.target.value as any}))} 
                              className="w-full bg-[#111] border border-gray-700 p-2 rounded text-white text-xs focus:border-green-500 outline-none"
                              >
                              <option value="MP3">MP3</option>
                              <option value="AAC">AAC</option>
                              <option value="OGG">OGG (Vorbis)</option>
                              <option value="OPUS">OPUS</option>
                              </select>
                          </div>
                          <div className="space-y-1">
                              <label className="text-xs text-green-500 font-bold">Bitrate (kbps)</label>
                              <select 
                              value={streamConfig.bitrate} 
                              onChange={e => setStreamConfig(prev => ({...prev, bitrate: parseInt(e.target.value)}))} 
                              className="w-full bg-[#111] border border-gray-700 p-2 rounded text-white text-xs focus:border-green-500 outline-none"
                              >
                                {renderBitrateOptions()}
                              </select>
                          </div>
                      </div>
                  </div>
                </div>
              )}

              {/* TAB: STREAMING */}
              {settingsTab === 'streaming' && (
                <div className="max-w-xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                  <div className="border-b border-gray-700 pb-2 mb-4">
                      <h3 className="text-lg text-white font-bold">Connection Settings</h3>
                  </div>
                  
                  {/* METADATA */}
                  <div className="bg-gray-900 p-4 rounded border border-gray-800 space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                        <h4 className="text-sm text-gray-300 font-bold uppercase">Show Information</h4>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-gray-400 font-bold">Current Show Title</label>
                        <div className="flex gap-2">
                          <input 
                              type="text" 
                              value={streamBehavior.liveTitle}
                              onChange={e => setStreamBehavior(prev => ({...prev, liveTitle: e.target.value}))}
                              className="flex-1 bg-[#111] border border-gray-700 p-3 rounded text-white text-xs focus:border-cyan-500 outline-none"
                              placeholder="Enter show title..."
                          />
                          <button 
                            onClick={handleUpdateLiveTitle}
                            disabled={isUpdatingTitle}
                            className="bg-cyan-900 hover:bg-cyan-800 text-cyan-100 text-xs font-bold px-4 rounded border border-cyan-700 transition-colors disabled:opacity-50"
                          >
                            {isUpdatingTitle ? '...' : 'UPDATE'}
                          </button>
                        </div>
                      </div>
                  </div>

                  {/* PROXY CONFIGURATION (Advanced Only) */}
                  {isAdvancedMode ? (
                      <div className="bg-gray-900 p-4 rounded border border-gray-800 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                            <h4 className="text-sm text-gray-300 font-bold uppercase">Connection Method (Advanced)</h4>
                        </div>

                        <div className="p-3 bg-[#111] rounded border border-gray-700 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                <button 
                                    onClick={() => setStreamConfig(prev => ({ ...prev, mode: 'CLOUDFLARE' }))}
                                    className={`p-3 rounded border text-xs font-bold text-center transition-colors flex flex-col items-center justify-center gap-1 ${streamConfig.mode === 'CLOUDFLARE' ? 'bg-orange-900 border-orange-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'}`}
                                >
                                    <span>Cloud Relay</span>
                                    <span className="text-[9px] uppercase tracking-wider bg-orange-800 text-orange-100 px-1.5 rounded">Default</span>
                                </button>
                                <button 
                                    onClick={() => setStreamConfig(prev => ({ ...prev, mode: 'PROXY' }))}
                                    className={`p-3 rounded border text-xs font-bold text-center transition-colors flex flex-col items-center justify-center gap-1 ${streamConfig.mode === 'PROXY' ? 'bg-purple-900 border-purple-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'}`}
                                >
                                    <span>Custom Proxy</span>
                                    <span className="text-[9px] uppercase tracking-wider bg-purple-800 text-purple-100 px-1.5 rounded">Manual</span>
                                </button>
                                <button 
                                    onClick={() => setStreamConfig(prev => ({ ...prev, mode: 'HTTP' }))}
                                    className={`p-3 rounded border text-xs font-bold text-center transition-colors flex flex-col items-center justify-center gap-1 ${streamConfig.mode === 'HTTP' ? 'bg-blue-900 border-blue-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'}`}
                                >
                                    <span>Direct HTTP</span>
                                    <span className="text-[9px] uppercase tracking-wider bg-blue-800 text-blue-100 px-1.5 rounded">Experimental</span>
                                </button>
                            </div>

                            {streamConfig.mode === 'PROXY' && (
                                <div className="space-y-2 animate-in fade-in">
                                    <label className="text-xs text-purple-400 font-bold">WebSocket Proxy URL</label>
                                    <input 
                                        type="text" 
                                        value={streamConfig.proxyUrl}
                                        onChange={e => setStreamConfig(prev => ({...prev, proxyUrl: e.target.value}))}
                                        className="w-full bg-black border border-purple-900 p-2 rounded text-white text-xs focus:border-purple-500 outline-none"
                                        placeholder="ws://localhost:8888"
                                    />
                                    <p className="text-[10px] text-gray-500">For users hosting their own relay.</p>
                                </div>
                            )}

                             {streamConfig.mode === 'HTTP' && (
                                <div className="p-2 bg-blue-900/20 border border-blue-800 rounded text-[10px] text-blue-300">
                                    Attempts to connect directly to the server using HTTP PUT. Requires the radio server to support SSL (HTTPS) and CORS.
                                </div>
                            )}
                        </div>
                      </div>
                  ) : (
                      /* SIMPLIFIED VIEW INFO */
                      <div className="p-3 bg-gray-900 border border-gray-800 rounded flex items-center gap-3">
                           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                           <p className="text-xs text-gray-400">
                              System is configured to use the optimized <b>Cloud Relay</b> automatically. 
                              <br/><span className="text-[10px] opacity-70">Switch to Advanced Mode to change connection method.</span>
                           </p>
                      </div>
                  )}
                </div>
              )}

              {/* TAB: RECORDING */}
              {settingsTab === 'record' && (
                <div className="max-w-xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                  <div className="border-b border-gray-700 pb-2 mb-4">
                      <h3 className="text-lg text-white font-bold">Local Recording</h3>
                  </div>

                  <div className="bg-gray-900 p-4 rounded border border-gray-800 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                              <label className="text-xs text-red-500 font-bold">Format</label>
                              <select 
                                value={recConfig.codec} 
                                onChange={e => setRecConfig(prev => ({...prev, codec: e.target.value as any}))} 
                                className="w-full bg-[#111] border border-gray-700 p-2 rounded text-white text-xs focus:border-red-500 outline-none"
                              >
                                <option value="OPUS">OPUS (WebM) - Efficient</option>
                                <option value="MP3">MP3 - Standard</option>
                                <option value="AAC">AAC - High Quality</option>
                                <option value="OGG">OGG (Vorbis)</option>
                              </select>
                          </div>
                          <div className="space-y-1">
                              <label className="text-xs text-red-500 font-bold">Bitrate (kbps)</label>
                              <select 
                                value={recConfig.bitrate} 
                                onChange={e => setRecConfig(prev => ({...prev, bitrate: parseInt(e.target.value)}))} 
                                className="w-full bg-[#111] border border-gray-700 p-2 rounded text-white text-xs focus:border-red-500 outline-none"
                              >
                                {renderBitrateOptions()}
                              </select>
                          </div>
                      </div>
                      
                      <div className="space-y-1">
                          <label className="text-xs text-gray-400 font-bold uppercase">Filename Pattern</label>
                          <input 
                              type="text" 
                              value={recBehavior.fileNamePattern}
                              onChange={e => setRecBehavior(prev => ({...prev, fileNamePattern: e.target.value}))}
                              className="w-full bg-[#111] border border-gray-700 p-2 rounded text-white text-xs focus:border-red-500 outline-none font-mono"
                          />
                          <p className="text-[10px] text-gray-500">Variables: %Y, %m, %d, %H, %M, %S</p>
                      </div>

                       <div className="p-3 bg-black/40 rounded border border-gray-700/50">
                          <h4 className="text-xs text-gray-400 font-bold uppercase mb-2">Automation</h4>
                          <div className="space-y-2">
                             <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={recBehavior.startOnConnect}
                                  onChange={e => setRecBehavior(prev => ({...prev, startOnConnect: e.target.checked}))}
                                  className="accent-red-500"
                                />
                                <span className="text-xs text-gray-300">Auto-start recording when streaming starts</span>
                             </label>
                             <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={recBehavior.stopOnDisconnect}
                                  onChange={e => setRecBehavior(prev => ({...prev, stopOnDisconnect: e.target.checked}))}
                                  className="accent-red-500"
                                />
                                <span className="text-xs text-gray-300">Auto-stop recording when streaming stops</span>
                             </label>
                             <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={recBehavior.startOnLaunch}
                                  onChange={e => setRecBehavior(prev => ({...prev, startOnLaunch: e.target.checked}))}
                                  className="accent-red-500"
                                />
                                <span className="text-xs text-gray-300">Start recording immediately on app launch</span>
                             </label>
                          </div>
                       </div>
                  </div>
                </div>
              )}

              {/* TAB: DSP */}
              {settingsTab === 'dsp' && (
                <div className="max-w-xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                  <div className="border-b border-gray-700 pb-2 mb-4">
                      <h3 className="text-lg text-white font-bold">Digital Signal Processing</h3>
                  </div>

                  {/* COMPRESSOR */}
                  <div className="bg-gray-900 p-4 rounded border border-gray-800 space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm text-yellow-500 font-bold uppercase">Dynamic Compressor</h4>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={dspConfig.compressor.enabled}
                            onChange={e => setDspConfig(prev => ({...prev, compressor: {...prev.compressor, enabled: e.target.checked}}))}
                          />
                          <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-600"></div>
                        </label>
                      </div>

                      <div className={`grid grid-cols-2 gap-4 transition-opacity ${dspConfig.compressor.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                          <div className="space-y-1">
                              <div className="flex justify-between text-[10px] text-gray-400">
                                <span>Threshold</span>
                                <span>{dspConfig.compressor.threshold} dB</span>
                              </div>
                              <input 
                                type="range" min="-60" max="0" step="1"
                                value={dspConfig.compressor.threshold}
                                onChange={e => setDspConfig(prev => ({...prev, compressor: {...prev.compressor, threshold: parseFloat(e.target.value)}}))}
                                className="w-full accent-yellow-500 h-1 bg-gray-700 rounded-lg appearance-none"
                              />
                          </div>
                          <div className="space-y-1">
                              <div className="flex justify-between text-[10px] text-gray-400">
                                <span>Ratio</span>
                                <span>{dspConfig.compressor.ratio}:1</span>
                              </div>
                              <input 
                                type="range" min="1" max="20" step="0.5"
                                value={dspConfig.compressor.ratio}
                                onChange={e => setDspConfig(prev => ({...prev, compressor: {...prev.compressor, ratio: parseFloat(e.target.value)}}))}
                                className="w-full accent-yellow-500 h-1 bg-gray-700 rounded-lg appearance-none"
                              />
                          </div>
                      </div>
                  </div>

                  {/* EQUALIZER */}
                  <div className="bg-gray-900 p-4 rounded border border-gray-800 space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm text-blue-500 font-bold uppercase">5-Band Equalizer</h4>
                        <div className="flex items-center gap-3">
                           <select 
                              value={dspConfig.equalizer.preset}
                              onChange={e => handleEQPresetChange(e.target.value)}
                              className="bg-[#111] border border-gray-700 text-xs text-white p-1 rounded outline-none"
                              disabled={!dspConfig.equalizer.enabled}
                           >
                              <option value="Manual">Manual</option>
                              {Object.keys(EQ_PRESETS).map(k => <option key={k} value={k}>{k}</option>)}
                           </select>
                           <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={dspConfig.equalizer.enabled}
                              onChange={e => setDspConfig(prev => ({...prev, equalizer: {...prev.equalizer, enabled: e.target.checked}}))}
                            />
                            <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      </div>

                      <div className={`flex justify-between items-end h-32 gap-2 transition-opacity ${dspConfig.equalizer.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                          {dspConfig.equalizer.bands.map((band, idx) => (
                              <div key={idx} className="flex flex-col items-center h-full w-full">
                                  <div className="relative flex-1 w-full flex justify-center bg-black/20 rounded p-1">
                                      <input 
                                        type="range" 
                                        min="-12" max="12" step="1"
                                        // Removed non-standard 'orient' attribute
                                        value={band.gain}
                                        onChange={e => handleEQBandChange(idx, parseFloat(e.target.value))}
                                        className="h-full w-2 accent-blue-500 appearance-none bg-gray-700 rounded cursor-pointer vertical-range"
                                        style={{ WebkitAppearance: 'slider-vertical' } as any} 
                                      />
                                  </div>
                                  <span className="text-[9px] text-gray-400 mt-2 font-mono">{band.frequency < 1000 ? band.frequency : `${band.frequency/1000}k`}</span>
                                  <span className="text-[9px] text-blue-400 font-mono">{band.gain > 0 ? `+${band.gain}` : band.gain}</span>
                              </div>
                          ))}
                      </div>
                  </div>
                </div>
              )}
          </div>
        </div>
    </div>
  );
};