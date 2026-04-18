import React, { useState, useEffect, useRef } from 'react';
import { RefreshCcwIcon, XIcon, TerminalSquareIcon, SettingsIcon } from './icons';
import { motion, AnimatePresence } from 'motion/react';
import { AgentConfig } from '../types';

interface AgentCommandCenterProps {
  isOpen: boolean;
  onClose: () => void;
  configs: AgentConfig[];
  onUpdateConfig: (config: AgentConfig) => void;
  onResetConfigs: () => void;
}

export const AgentCommandCenter: React.FC<AgentCommandCenterProps> = ({ 
  isOpen, 
  onClose, 
  configs, 
  onUpdateConfig,
  onResetConfigs
}) => {
  const [activeTab, setActiveTab] = useState<'terminal' | 'configs'>('terminal');
  const [cmdInput, setCmdInput] = useState('');
  const [terminalOutput, setTerminalOutput] = useState<{msg: string, type: 'info' | 'error' | 'success'}[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  const addOutput = (msg: string, type: 'info' | 'error' | 'success' = 'info') => {
    setTerminalOutput(prev => [...prev, { msg, type }]);
  };

  const processCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    addOutput(`> ${trimmed}`, 'info');

    // Simple command parser: /agent [id] set [field] [value]
    const parts = trimmed.split(' ');
    const command = parts[0].toLowerCase();

    if (command === '/help') {
      addOutput('Commandes disponibles :');
      addOutput('/list - Liste les agents configurés');
      addOutput('/set [id] [field] [value] - Modifie un agent (field: name, prompt)');
      addOutput('/reset - Réinitialise tous les agents aux valeurs d\'usine');
      addOutput('/clear - Efface le terminal');
    } else if (command === '/list') {
      configs.forEach(c => {
        addOutput(`${c.id}: ${c.name}`, 'success');
      });
    } else if (command === '/clear') {
      setTerminalOutput([]);
    } else if (command === '/reset') {
      onResetConfigs();
      addOutput('Tous les agents ont été réinitialisés.', 'success');
    } else if (command === '/set') {
      const id = parts[1];
      const field = parts[2];
      const value = parts.slice(3).join(' ').replace(/^"(.*)"$/, '$1');

      const config = configs.find(c => c.id === id);
      if (!config) {
        addOutput(`Agent "${id}" non trouvé.`, 'error');
        return;
      }

      const updated = { ...config, lastUpdated: new Date().toISOString() };
      if (field === 'name') {
        updated.name = value;
      } else if (field === 'prompt' || field === 'systemPrompt') {
        updated.systemPrompt = value;
      } else {
        addOutput(`Champ "${field}" invalide. Utilisez "name" ou "prompt".`, 'error');
        return;
      }

      onUpdateConfig(updated);
      addOutput(`Agent ${id} mis à jour : ${field} = ${value}`, 'success');
    } else {
      addOutput(`Commande inconnue : ${command}. Tapez /help pour voir la liste.`, 'error');
    }

    setCmdInput('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[800px] sm:h-[600px] bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl overflow-hidden flex flex-col z-[101]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center border border-blue-500/30">
                  <TerminalSquareIcon className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Console des Agents</h2>
                  <p className="text-xs text-slate-400">Gérez Jarviss et les structures de commande</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex bg-slate-800 p-1 rounded-lg">
                  <button 
                    onClick={() => setActiveTab('terminal')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${activeTab === 'terminal' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                  >
                    Terminal CMD
                  </button>
                  <button 
                    onClick={() => setActiveTab('configs')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${activeTab === 'configs' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                  >
                    Configuration
                  </button>
                </div>
                <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors">
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden relative">
              {activeTab === 'terminal' ? (
                <div className="h-full flex flex-col font-mono text-sm leading-relaxed">
                  <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-2 custom-scrollbar">
                    <div className="text-slate-500 mb-4 italic">
                      Bienvenue dans la console de commande Jarviss. Tapez /help pour commencer.
                    </div>
                    {terminalOutput.map((out, i) => (
                      <div key={i} className={`
                        ${out.type === 'error' ? 'text-red-400' : ''}
                        ${out.type === 'success' ? 'text-green-400' : ''}
                        ${out.type === 'info' ? 'text-blue-300' : ''}
                      `}>
                        {out.msg}
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-slate-800/50 border-t border-slate-700">
                    <div className="flex items-center gap-3">
                      <span className="text-blue-500 font-bold">$</span>
                      <input
                        autoFocus
                        type="text"
                        value={cmdInput}
                        onChange={(e) => setCmdInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && processCommand(cmdInput)}
                        placeholder="Tapez une commande (ex: /list, /set jarviss-chat name 'Jarviss Pro')"
                        className="flex-1 bg-transparent border-none text-white focus:ring-0 placeholder:text-slate-600"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-900">
                  {configs.map(config => (
                    <div key={config.id} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                            <SettingsIcon className="w-4 h-4 text-blue-400" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white">{config.name}</h3>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest">{config.id}</p>
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Mis à jour : {new Date(config.lastUpdated).toLocaleString()}
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Nom de l'agent</label>
                          <input 
                            type="text" 
                            value={config.name}
                            onChange={(e) => onUpdateConfig({...config, name: e.target.value, lastUpdated: new Date().toISOString()})}
                            className="w-full bg-slate-900 border-slate-700 rounded-lg text-sm text-slate-300 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">System Prompt (Functionnement)</label>
                          <textarea 
                            rows={4}
                            value={config.systemPrompt}
                            onChange={(e) => onUpdateConfig({...config, systemPrompt: e.target.value, lastUpdated: new Date().toISOString()})}
                            className="w-full bg-slate-900 border-slate-700 rounded-lg text-sm text-slate-300 focus:ring-blue-500 focus:border-blue-500 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex justify-end pt-4">
                    <button 
                      onClick={onResetConfigs}
                      className="flex items-center gap-2 px-4 py-2 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 rounded-lg transition-all text-sm"
                    >
                      <RefreshCcwIcon className="w-4 h-4" />
                      Réinitialiser tout
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
              .custom-scrollbar::-webkit-scrollbar {
                width: 6px;
              }
              .custom-scrollbar::-webkit-scrollbar-track {
                background: transparent;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb {
                background: #1e293b;
                border-radius: 10px;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: #334155;
              }
            `}} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
