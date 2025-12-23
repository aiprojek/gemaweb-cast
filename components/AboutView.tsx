import React, { useState } from 'react';

interface AboutViewProps {
  t: any; // Translation object for the 'about' section
  onBack: () => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ t, onBack }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'guide' | 'contact'>('info');

  const handleContactWhatsApp = () => {
    window.open('https://wa.me/6281225879494?text=Halo%20Tim%20AI%20Projek,%20saya%20butuh%20bantuan%20terkait%20Pulsar%20Broadcast', '_blank');
  };

  const tabs = [
    { id: 'info', label: t.sectionInfo },
    { id: 'guide', label: t.sectionGuide },
    { id: 'contact', label: t.sectionContact },
  ];

  return (
    <div className="flex-1 flex flex-col animate-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-[#1a1a1a] border-b border-gray-700">
         <button 
          onClick={onBack}
          className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors bg-gray-800 hover:bg-gray-700 px-3 py-2 md:py-1.5 rounded text-xs font-bold uppercase"
         >
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
           BACK
         </button>
         <h2 className="text-lg md:text-xl font-bold text-gray-200">{t.title}</h2>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-48 bg-[#222] border-b md:border-b-0 md:border-r border-gray-700 flex flex-row md:flex-col p-2 gap-1 overflow-x-auto shrink-0">
            {tabs.map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 md:flex-none text-center md:text-left px-4 py-3 rounded text-xs font-bold uppercase transition-colors flex items-center justify-center md:justify-start gap-2 whitespace-nowrap ${activeTab === tab.id ? 'bg-green-900/50 text-green-400 border border-green-800' : 'text-gray-400 hover:bg-gray-800'}`}
              >
                {/* Icons based on tab id */}
                {tab.id === 'info' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                {tab.id === 'guide' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
                {tab.id === 'contact' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
                <span>{tab.label}</span>
              </button>
            ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-[#151515] p-4 md:p-6 overflow-y-auto">
          <div className="max-w-xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
            
            {/* TAB: INFO */}
            {activeTab === 'info' && (
              <>
                <div className="border-b border-gray-700 pb-2 mb-4">
                    <h3 className="text-lg text-white font-bold">{t.sectionInfo}</h3>
                </div>

                {/* APP DESCRIPTION & NAME MEANING */}
                <div className="bg-gray-900 p-4 rounded border border-gray-800 mb-6">
                    <h4 className="text-green-400 font-bold text-sm mb-2 uppercase">GemaWeb Cast</h4>
                    <p className="text-gray-300 text-xs leading-relaxed mb-3">
                      A professional, browser-based broadcasting solution designed for seamless Icecast/Shoutcast streaming. No installation required.
                    </p>
                    <div className="p-3 bg-black/40 rounded border border-gray-700/50">
                      <p className="text-gray-400 text-[10px] uppercase font-bold mb-1">Meaning of the Name:</p>
                      <ul className="text-xs space-y-1 text-gray-300">
                         <li><span className="text-green-500 font-bold">GEMA</span>: (Indonesian) "Echo" or "Resonance" — symbolizing the reach of your voice.</li>
                         <li><span className="text-green-500 font-bold">WEB</span>: Modern, accessible, cloud-native technology.</li>
                         <li><span className="text-green-500 font-bold">CAST</span>: Broadcasting to the world.</li>
                      </ul>
                    </div>
                </div>

                <div className="bg-gray-900 p-4 rounded border border-gray-800 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <a href="https://www.aiprojek01.my.id/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-[#111] rounded border border-gray-700 hover:border-green-500 hover:text-green-500 transition-colors">
                        <span className="text-xl">🚀</span>
                        <span className="text-xs font-bold">{t.devLink}</span>
                      </a>
                      <a href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-[#111] rounded border border-gray-700 hover:border-green-500 hover:text-green-500 transition-colors">
                        <span className="text-xl">⚖️</span>
                        <span className="text-xs font-bold">{t.licenseLink}</span>
                      </a>
                      <a href="https://github.com/topics/webcast-pro" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-[#111] rounded border border-gray-700 hover:border-green-500 hover:text-green-500 transition-colors">
                        <span className="text-xl">🐙</span>
                        <span className="text-xs font-bold">{t.githubLink}</span>
                      </a>
                      <a href="https://t.me/aiprojek_community/32" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-[#111] rounded border border-gray-700 hover:border-cyan-500 hover:text-cyan-500 transition-colors">
                        <span className="text-xl">✈️</span>
                        <span className="text-xs font-bold">{t.telegramLink}</span>
                      </a>
                      <a href="https://lynk.id/aiprojek/s/bvBJvdA" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-[#111] rounded border border-gray-700 hover:border-yellow-500 hover:text-yellow-500 transition-colors col-span-1 md:col-span-2 justify-center">
                        <span className="text-xl">☕</span>
                        <span className="text-xs font-bold">{t.donateLink}</span>
                      </a>
                    </div>
                </div>
              </>
            )}

            {/* TAB: GUIDE */}
            {activeTab === 'guide' && (
              <>
                 <div className="border-b border-gray-700 pb-2 mb-4">
                    <h3 className="text-lg text-white font-bold">{t.sectionGuide}</h3>
                </div>
                <div className="bg-gray-900 p-4 rounded border border-gray-800 space-y-4">
                    <div className="space-y-4 text-gray-400 text-xs leading-relaxed max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                      <div className="space-y-1">
                        <strong className="text-white block border-l-2 border-green-500 pl-2">1. Setup Audio</strong>
                        <p className="pl-2.5">Go to the <b>Audio Devices</b> tab. Select your microphone or mixer input. Adjust the <i>Input Gain</i> until the VU meter peaks in the green/yellow zone (around 70-80%).</p>
                      </div>
                      <div className="space-y-1">
                        <strong className="text-white block border-l-2 border-green-500 pl-2">2. Configure Server</strong>
                        <p className="pl-2.5">In <b>Server Profiles</b>, create a new profile. Enter your Icecast or Shoutcast credentials (address, port, password). Click 'Save' to persist.</p>
                      </div>
                      <div className="space-y-1">
                        <strong className="text-white block border-l-2 border-green-500 pl-2">3. Streaming</strong>
                        <p className="pl-2.5">Set your desired codec (MP3/AAC) and bitrate in the <b>Streaming</b> tab. Return to the dashboard and click <b>START STREAM</b>. The indicator will turn green when connected.</p>
                      </div>
                      <div className="space-y-1">
                        <strong className="text-white block border-l-2 border-green-500 pl-2">4. Recording</strong>
                        <p className="pl-2.5">You can record locally while streaming or offline. Go to the <b>Recording</b> tab to set format (OPUS recommended for quality). Click <b>REC LOCAL</b> on the dashboard. Files save to your Downloads folder.</p>
                      </div>
                      <div className="space-y-1">
                        <strong className="text-white block border-l-2 border-green-500 pl-2">5. DSP & Effects</strong>
                        <p className="pl-2.5">Enable the <b>Compressor</b> in the DSP tab to even out your voice levels. Use the <b>Equalizer</b> to boost bass or clarity depending on your microphone.</p>
                      </div>
                      <div className="space-y-1">
                        <strong className="text-white block border-l-2 border-green-500 pl-2">6. AI Copilot</strong>
                        <p className="pl-2.5">Use the panel on the right to generate scripts. Type a topic (e.g., "Intro for Jazz hour"), select a tone, and click Generate.</p>
                      </div>
                    </div>
                </div>
              </>
            )}

            {/* TAB: CONTACT */}
            {activeTab === 'contact' && (
              <>
                 <div className="border-b border-gray-700 pb-2 mb-4">
                    <h3 className="text-lg text-white font-bold">{t.sectionContact}</h3>
                </div>
                <div className="bg-gray-900 p-4 rounded border border-gray-800 space-y-4">
                    <p className="text-xs text-gray-400">{t.contactText}</p>
                    <div className="flex flex-col gap-4">
                      <a 
                        href="mailto:aiproek01@gmail.com"
                        className="w-full bg-gray-800 hover:bg-gray-700 text-white py-4 rounded text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-gray-600"
                      >
                        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        {t.emailBtn}
                      </a>
                      <button 
                        onClick={handleContactWhatsApp}
                        className="w-full bg-green-900 hover:bg-green-800 text-green-100 py-4 rounded text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-green-700"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                        {t.waBtn}
                      </button>
                    </div>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};