import React, { useState } from 'react';
import { pollinationsService } from '../services/pollinationsService';
import { AIScript } from '../types';

interface CopilotProps {
  onAddLog: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void;
}

const PRESET_TONES = [
  'Energetic', 'Chill', 'Funny', 'Serious', 
  'Nostalgic', 'Dramatic', 'Professional', 
  'Warm', 'Urgent', 'Sarcastic', 'Custom...'
];

export const Copilot: React.FC<CopilotProps> = ({ onAddLog }) => {
  const [topic, setTopic] = useState('');
  const [selectedTone, setSelectedTone] = useState('Energetic');
  const [customTone, setCustomTone] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [script, setScript] = useState<AIScript | null>(null);

  // Helper to determine final tone
  const finalTone = selectedTone === 'Custom...' ? customTone : selectedTone;

  const handleEnhance = async () => {
    if (!topic.trim()) return;
    setEnhancing(true);
    try {
      const enhanced = await pollinationsService.enhancePrompt(topic);
      setTopic(enhanced.trim());
      onAddLog('Prompt enhanced by AI', 'info');
    } catch (e) {
      onAddLog('Failed to enhance prompt', 'error');
    } finally {
      setEnhancing(false);
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    if (selectedTone === 'Custom...' && !customTone.trim()) {
      onAddLog('Please enter a custom tone', 'warning');
      return;
    }

    setLoading(true);
    try {
      const result = await pollinationsService.generateShowScript(topic, finalTone);
      setScript(result);
      onAddLog('AI Script generated via Pollinations', 'success');
    } catch (e) {
      onAddLog('Failed to generate AI script', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded p-4 border border-gray-700 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></div>
          <h3 className="text-white font-bold text-sm uppercase tracking-wider">Pollinations AI</h3>
        </div>
        <span className="text-[10px] text-gray-500 border border-gray-600 px-1 rounded">Free Tier</span>
      </div>

      <div className="space-y-3">
        {/* Topic Input with Enhance Button */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Segment Topic</label>
          <div className="flex gap-2">
            <textarea 
              className="flex-1 bg-gray-900 border border-gray-600 text-white text-xs p-2 rounded focus:border-pink-500 outline-none resize-none h-20"
              placeholder="e.g. 80s Rock block intro..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
            <button
              onClick={handleEnhance}
              disabled={enhancing || !topic}
              title="Enhance Prompt with AI"
              className="w-10 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded flex items-center justify-center transition-colors disabled:opacity-50"
            >
               {enhancing ? (
                 <span className="animate-spin h-3 w-3 border-2 border-pink-500 border-t-transparent rounded-full"></span>
               ) : (
                 <svg className="w-4 h-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
               )}
            </button>
          </div>
        </div>

        {/* Tone Selection */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Broadcast Tone</label>
          <select 
            className="w-full bg-gray-900 border border-gray-600 text-white text-xs p-2 rounded focus:border-pink-500 outline-none mb-2"
            value={selectedTone}
            onChange={(e) => setSelectedTone(e.target.value)}
          >
            {PRESET_TONES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {/* Conditional Custom Tone Input */}
          {selectedTone === 'Custom...' && (
            <input 
              type="text" 
              className="w-full bg-black border border-gray-600 text-white text-xs p-2 rounded focus:border-pink-500 outline-none animate-in fade-in slide-in-from-top-1"
              placeholder="Describe your custom tone (e.g. Like a pirate)..."
              value={customTone}
              onChange={(e) => setCustomTone(e.target.value)}
            />
          )}
        </div>

        <button 
          onClick={handleGenerate}
          disabled={loading || !topic}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white text-xs font-bold py-2 rounded transition-all flex items-center justify-center gap-2 shadow-lg"
        >
          {loading ? (
            <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></span>
          ) : (
            <>
              <span>GENERATE SCRIPT</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            </>
          )}
        </button>
      </div>

      {script && (
        <div className="mt-4 flex-1 overflow-y-auto bg-gray-900 p-3 rounded border border-gray-700 shadow-inner">
          <h4 className="text-pink-400 font-bold text-sm mb-2">{script.title}</h4>
          <p className="text-gray-300 text-xs italic mb-4 whitespace-pre-wrap leading-relaxed border-l-2 border-purple-500 pl-2">
            "{script.content}"
          </p>
          <div className="border-t border-gray-800 pt-2">
            <span className="text-xs text-gray-500 uppercase font-bold block mb-1">Queue Suggestions:</span>
            <ul className="text-xs text-green-400 space-y-1">
              {script.suggestedTracks.map((track, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="text-[8px] opacity-50">▶</span> {track}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};