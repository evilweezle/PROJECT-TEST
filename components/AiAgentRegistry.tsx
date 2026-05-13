import React from 'react';
import { motion } from 'motion/react';
import { 
  CpuIcon, 
  ShieldCheckIcon, 
  ZapIcon, 
  BookOpenIcon, 
  BrainCircuitIcon, 
  SettingsIcon,
  SparklesIcon,
  CodeIcon,
  ActivityIcon
} from 'lucide-react';
import { AgentConfig } from '../types';

interface AiAgentRegistryProps {
  agents: AgentConfig[];
  selectedAgentId: string;
  onSelectAgent: (id: string) => void;
}

const AiAgentRegistry: React.FC<AiAgentRegistryProps> = ({ agents, selectedAgentId, onSelectAgent }) => {
  const selectedAgent = agents.find(a => a.id === selectedAgentId) || agents[0];

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] text-white overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tighter flex items-center gap-3">
             <span className="text-cyan-400">FICHES</span> AGENTS
          </h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Profils opérationnels des IA de production</p>
        </div>
        <div className="flex gap-2">
           <div className="px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Sync Factory Active</span>
           </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Sidebar List - Scrollable horizontally on mobile, vertically on desktop */}
        <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-white/5 flex flex-row lg:flex-col p-4 gap-2 overflow-x-auto lg:overflow-y-auto bg-black/20 shrink-0">
          {agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => onSelectAgent(agent.id)}
              className={`min-w-[160px] lg:min-w-0 text-left p-4 rounded-2xl transition-all border ${
                selectedAgentId === agent.id 
                ? 'bg-cyan-500/10 border-cyan-500/30' 
                : 'bg-white/5 border-transparent hover:bg-white/10'
              } group`}
            >
              <div className="flex items-center gap-3 mb-1">
                 <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center transition-colors ${
                   selectedAgentId === agent.id ? 'bg-cyan-500 text-black' : 'bg-white/10 text-white group-hover:bg-cyan-500/20 group-hover:text-cyan-400'
                 }`}>
                    <CpuIcon className="w-4 h-4 lg:w-5 lg:h-5" />
                 </div>
                 <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-xs lg:text-sm tracking-tight truncate">{agent.name}</h3>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">XP: {agent.xp || 0}</p>
                 </div>
              </div>
              <div className="w-full bg-white/10 h-1 rounded-full mt-3 overflow-hidden">
                 <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${((agent.xp || 0) / (agent.maxXp || 1000)) * 100}%` }}
                   className="h-full bg-cyan-400"
                 />
              </div>
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 bg-black/40">
           <div className="max-w-4xl mx-auto space-y-8 lg:space-y-12 pb-24">
              {/* Identity Header */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                 <div>
                    <div className="text-cyan-400 text-[10px] lg:text-xs font-black italic mb-2 tracking-widest">{selectedAgent.roleTitle || 'AGENT DE STRUCTURE'}</div>
                    <h2 className="text-4xl lg:text-6xl font-black tracking-tighter uppercase leading-none">{selectedAgent.name}</h2>
                    <div className="mt-4 flex items-center gap-3">
                       <span className="px-3 py-1 bg-white/5 rounded-full border border-white/10 text-[10px] font-black text-slate-400 tracking-widest uppercase">
                          Identité vérifiée: {selectedAgent.aiIdentity || 'AI-UNSPECIFIED'}
                       </span>
                    </div>
                 </div>
                 <div className="flex flex-col items-start lg:items-end">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Expérience Neurale</div>
                    <div className="flex items-center gap-4">
                       <div className="text-right">
                          <span className="text-xl lg:text-2xl font-black leading-tight text-cyan-400">{selectedAgent.xp || 0}</span>
                          <span className="text-[10px] lg:text-xs text-white/40 ml-1">/ {selectedAgent.maxXp || 1000} XP</span>
                       </div>
                    </div>
                    <div className="w-full lg:w-48 bg-white/5 h-2 rounded-full mt-2 overflow-hidden border border-white/10">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${((selectedAgent.xp || 0) / (selectedAgent.maxXp || 1000)) * 100}%` }}
                         className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400"
                       />
                    </div>
                 </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="bg-white/5 p-6 lg:p-8 rounded-3xl border border-white/10 flex flex-col items-center justify-center text-center">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Niveau Neuronal</div>
                    <div className="text-4xl lg:text-5xl font-black italic text-cyan-400 tracking-tighter">NV.{selectedAgent.level || 1}</div>
                 </div>
                 <div className="bg-white/5 p-6 lg:p-8 rounded-3xl border border-white/10 flex flex-col items-center justify-center text-center">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Précision Actuelle</div>
                    <div className="text-4xl lg:text-5xl font-black italic text-emerald-400 tracking-tighter">{selectedAgent.precision || 0}%</div>
                    <div className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-1">Reliable Result</div>
                 </div>
              </div>

              {/* Dossier de Compétences */}
              <div className="space-y-4">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400">
                       <BookOpenIcon className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl lg:text-2xl font-black tracking-tighter uppercase">Dossier de compétences</h3>
                 </div>
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 text-sm">
                    <div className="space-y-4">
                       <div>
                          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Spécialité Principale</div>
                          <p className="font-bold text-base lg:text-lg text-slate-200">{selectedAgent.specialty || 'Analyse de production'}</p>
                       </div>
                       <div>
                          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Focus IA</div>
                          <p className="font-mono text-cyan-400 text-xs lg:text-sm">{selectedAgent.focus || 'Gemini Pro / RAG'}</p>
                       </div>
                    </div>
                    <div>
                       <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Description Opérationnelle</div>
                       <p className="text-slate-400 font-medium italic leading-relaxed text-xs lg:text-sm">
                          {selectedAgent.description}
                       </p>
                    </div>
                 </div>
              </div>

              {/* Chemin de Connaissance */}
              <div className="space-y-6">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
                       <BrainCircuitIcon className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl lg:text-2xl font-black tracking-tighter uppercase">Chemin de connaissance</h3>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(selectedAgent.knowledgePath || []).map((step, idx) => (
                       <div key={step.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 relative group overflow-hidden">
                          <div className="absolute top-0 right-0 p-2 text-cyan-400/20 group-hover:text-cyan-400/40 transition-colors">
                             <span className="text-3xl lg:text-4xl font-black">{idx + 1}</span>
                          </div>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-4 ${
                            step.status === 'completed' ? 'bg-cyan-500 text-black' : 
                            step.status === 'ongoing' ? 'bg-amber-500/20 text-amber-500 animate-pulse' : 'bg-white/10 text-white/20'
                          }`}>
                             {step.status === 'completed' ? <ShieldCheckIcon className="w-4 h-4" /> : <ZapIcon className="w-4 h-4" />}
                          </div>
                          <h4 className="font-bold text-sm text-slate-100 pr-8">{step.name}</h4>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2">
                             {step.status === 'completed' ? 'Réussite' : 
                              step.status === 'ongoing' ? 'Tuning Actif' : 'En attente'}
                          </p>
                       </div>
                    ))}
                 </div>
              </div>

              {/* Mémoire d'Expertise */}
              <div className="space-y-6">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400">
                       <ActivityIcon className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl lg:text-2xl font-black tracking-tighter uppercase text-slate-100">Mémoire d'Expertise</h3>
                 </div>
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {(selectedAgent.expertiseMemory || []).map((exp) => (
                       <div key={exp.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-start gap-4 hover:border-cyan-500/30 transition-colors group">
                          <div className="p-3 bg-cyan-500/10 rounded-2xl text-cyan-400 group-hover:bg-cyan-500 group-hover:text-black transition-all">
                             <ZapIcon className="w-6 h-6" />
                          </div>
                          <div>
                             <h4 className="font-black text-base lg:text-lg tracking-tight mb-1">{exp.name}</h4>
                             <p className="text-[10px] lg:text-xs text-slate-400 leading-relaxed italic">{exp.description}</p>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>

              {/* Signature section */}
              <div className="pt-12 border-t border-white/5 flex flex-col lg:flex-row gap-8 lg:items-center justify-between">
                 <div className="flex gap-8">
                    <div>
                       <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Température</div>
                       <div className="text-2xl lg:text-3xl font-black italic text-slate-200">
                          {selectedAgent.temperature || 0.5} <span className="text-[8px] lg:text-[10px] font-black text-white/20 uppercase tracking-widest not-italic ml-1">Dynamique</span>
                       </div>
                    </div>
                    <div>
                       <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Consistance</div>
                       <div className="text-2xl lg:text-3xl font-black italic text-cyan-400">
                          94.2% <span className="text-[8px] lg:text-[10px] font-black text-cyan-700 uppercase tracking-widest not-italic ml-1">Reliable</span>
                       </div>
                    </div>
                 </div>
                 <div className="flex gap-2">
                    <button className="p-3 bg-white/5 rounded-full border border-white/10 hover:bg-white/10 transition-colors">
                       <SettingsIcon className="w-5 h-5 text-slate-400" />
                    </button>
                    <button className="p-3 bg-white/5 rounded-full border border-white/10 hover:bg-white/10 transition-colors">
                       <SparklesIcon className="w-5 h-5 text-cyan-400" />
                    </button>
                    <button className="p-3 bg-white/5 rounded-full border border-white/10 hover:bg-white/10 transition-colors">
                       <CodeIcon className="w-5 h-5 text-indigo-400" />
                    </button>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AiAgentRegistry;
