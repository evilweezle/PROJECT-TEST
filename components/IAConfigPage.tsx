import React, { useState } from 'react';
import { AgentConfig } from '../types';
import AiAgentRegistry from './AiAgentRegistry';
import { RefreshCcwIcon, SettingsIcon, XIcon, SaveIcon } from 'lucide-react';

interface IAConfigPageProps {
  configs: AgentConfig[];
  onUpdateConfig: (config: AgentConfig) => void;
  onResetConfigs: () => void;
}

const VOICES = [
  { id: 'Kore', label: 'Kore (Femme - Claire et aiguë)' },
  { id: 'Aoede', label: 'Aoede (Femme - Chaleureuse et posée)' },
  { id: 'Charon', label: 'Charon (Homme - Voix très grave)' },
  { id: 'Fenrir', label: 'Fenrir (Homme - Dynamique)' },
  { id: 'Puck', label: 'Puck (Homme - Naturelle/Standard)' },
];

export const IAConfigPage: React.FC<IAConfigPageProps> = ({
  configs,
  onUpdateConfig,
  onResetConfigs
}) => {
  const [selectedAgentId, setSelectedAgentId] = useState(configs[0]?.id || '');
  const [isEditing, setIsEditing] = useState(false);

  const selectedAgent = configs.find(c => c.id === selectedAgentId) || configs[0];

  return (
    <div className="relative h-full overflow-hidden flex flex-col">
      {/* Top Banner Actions */}
      <div className="absolute top-6 right-8 z-50 flex gap-4">
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className={`flex items-center gap-2 px-6 py-2 border rounded-full transition-all font-black text-[10px] uppercase tracking-widest ${
            isEditing 
            ? 'bg-amber-500 border-amber-600 text-black shadow-lg shadow-amber-500/20' 
            : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
          }`}
        >
          {isEditing ? <XIcon className="w-3 h-3" /> : <SettingsIcon className="w-3 h-3" />}
          {isEditing ? 'Fermer Panel' : 'Configuration Technique'}
        </button>
        <button 
          onClick={onResetConfigs}
          className="flex items-center gap-2 px-6 py-2 bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all font-black text-[10px] uppercase tracking-widest"
        >
          <RefreshCcwIcon className="w-3 h-3" />
          Purge Système
        </button>
      </div>

      <div className="flex-1">
        <AiAgentRegistry 
          agents={configs} 
          selectedAgentId={selectedAgentId} 
          onSelectAgent={setSelectedAgentId} 
        />
      </div>

      {/* Editor Overlay */}
      {isEditing && selectedAgent && (
        <div className="absolute inset-y-0 right-0 w-[500px] bg-[#0c0c0e] border-l border-white/10 shadow-2xl z-50 p-8 flex flex-col animate-in slide-in-from-right duration-300">
           <div className="flex items-center justify-between mb-8">
              <div>
                 <h2 className="text-xl font-black tracking-tight text-white uppercase">Paramètres: {selectedAgent.name}</h2>
                 <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Configuration du modèle de langage</p>
              </div>
              <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-white/5 rounded-full text-slate-400">
                 <XIcon className="w-6 h-6" />
              </button>
           </div>

           <div className="flex-1 overflow-y-auto space-y-8 pr-2">
              <div className="space-y-4">
                 <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Instruction Système (System Prompt)</label>
                    <textarea 
                      rows={12}
                      value={selectedAgent.systemPrompt}
                      onChange={(e) => onUpdateConfig({...selectedAgent, systemPrompt: e.target.value, lastUpdated: new Date().toISOString()})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-slate-300 font-mono focus:ring-cyan-500 focus:border-cyan-500 transition-all leading-relaxed"
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Température</label>
                       <div className="flex items-center gap-4">
                          <input 
                            type="range" min="0" max="1" step="0.05"
                            value={selectedAgent.temperature || 0.5}
                            onChange={(e) => onUpdateConfig({...selectedAgent, temperature: parseFloat(e.target.value), lastUpdated: new Date().toISOString()})}
                            className="flex-1 accent-cyan-400"
                          />
                          <span className="text-sm font-black text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded">{(selectedAgent.temperature || 0.5).toFixed(2)}</span>
                       </div>
                    </div>
                    {selectedAgent.voiceName !== undefined && (
                      <div>
                         <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">ID Voix</label>
                         <select 
                           value={selectedAgent.voiceName}
                           onChange={(e) => onUpdateConfig({...selectedAgent, voiceName: e.target.value, lastUpdated: new Date().toISOString()})}
                           className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:ring-cyan-500"
                         >
                           {VOICES.map(v => <option key={v.id} value={v.id} className="bg-[#0c0c0e]">{v.label}</option>)}
                         </select>
                      </div>
                    )}
                 </div>
              </div>

              {selectedAgent.sourceCodePreview && (
                <div className="space-y-4">
                   <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Aperçu Intégration Code</h3>
                   <div className="bg-black/40 rounded-2xl border border-white/5 p-4 overflow-hidden">
                      <pre className="text-[10px] font-mono text-indigo-300">
                         {selectedAgent.sourceCodePreview}
                      </pre>
                   </div>
                </div>
              )}
           </div>

           <div className="pt-6 border-t border-white/10 flex justify-end">
              <button 
                onClick={() => setIsEditing(false)}
                className="flex items-center gap-2 px-8 py-3 bg-cyan-500 text-black rounded-full font-black text-xs uppercase tracking-widest shadow-xl shadow-cyan-500/20 active:scale-95 transition-all"
              >
                 <SaveIcon className="w-4 h-4" />
                 Sauvegarder
              </button>
           </div>
        </div>
      )}
    </div>
  );
};
