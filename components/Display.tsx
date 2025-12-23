import React, { useState, useEffect } from 'react';
import { ConnectionState } from '../types';

interface DisplayProps {
  state: ConnectionState;
  streamDuration: number;
  recDuration: number;
  isRecording: boolean;
  serverName: string;
  isSimulation?: boolean; // New prop
}

export const Display: React.FC<DisplayProps> = ({ state, streamDuration, recDuration, isRecording, serverName, isSimulation = true }) => {
  const [viewMode, setViewMode] = useState<'STREAM' | 'REC'>('STREAM');

  // Logic to toggle view if both active
  useEffect(() => {
    let interval: number | null = null;

    if (state === ConnectionState.CONNECTED && isRecording) {
      // Toggle every 4 seconds
      interval = window.setInterval(() => {
        setViewMode(prev => prev === 'STREAM' ? 'REC' : 'STREAM');
      }, 4000);
    } else if (isRecording) {
      setViewMode('REC');
    } else {
      setViewMode('STREAM');
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state, isRecording]);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    if (viewMode === 'REC') return 'text-red-500';
    
    switch (state) {
      case ConnectionState.CONNECTED: return 'text-green-500';
      case ConnectionState.CONNECTING: return 'text-yellow-500';
      case ConnectionState.ERROR: return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusText = () => {
    if (viewMode === 'REC') return 'RECORDING';

    switch (state) {
      case ConnectionState.CONNECTED: 
        return isSimulation ? 'ON AIR (DEMO)' : 'ON AIR';
      case ConnectionState.CONNECTING: return 'CONNECTING...';
      case ConnectionState.ERROR: return 'ERROR';
      default: return 'IDLE';
    }
  };

  const currentDuration = viewMode === 'REC' ? recDuration : streamDuration;
  const currentServerInfo = viewMode === 'REC' ? 'LOCAL REC' : (serverName || 'No Server');

  return (
    <div className="bg-[#111] border-4 border-gray-600 rounded-lg p-4 shadow-xl relative overflow-hidden transition-colors duration-500">
      {/* Glass Reflection Effect */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>

      <div className="flex justify-between items-start mb-2">
        <span className="text-gray-400 text-xs font-bold tracking-widest uppercase transition-all duration-300">
          {viewMode === 'REC' ? 'REC Status' : 'Stream Status'}
        </span>
        <span className={`text-xs font-bold tracking-wider ${getStatusColor()} animate-pulse transition-colors duration-300`}>
          {viewMode === 'REC' ? '● REC' : (state === ConnectionState.CONNECTED ? '● LIVE' : '○')}
        </span>
      </div>

      <div className="flex flex-col items-center justify-center py-4">
        <div className={`lcd-text text-5xl font-bold tracking-widest ${getStatusColor()} drop-shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-colors duration-300`}>
          {formatTime(currentDuration)}
        </div>
        <div className={`mt-2 lcd-text text-sm uppercase tracking-wider transition-colors duration-300 ${viewMode === 'REC' ? 'text-red-700' : 'text-cyan-700'}`}>
          {getStatusText()}
        </div>
      </div>

      <div className="mt-4 border-t border-gray-800 pt-2 flex justify-between text-xs text-gray-500 font-mono">
        <span className="uppercase">SRV: {currentServerInfo}</span>
        <span>KBPS: {viewMode === 'REC' ? 'VAR' : '128'}</span>
      </div>
    </div>
  );
};