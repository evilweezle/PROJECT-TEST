import React, { useState } from 'react';
import ReactFlow, { Background, Controls, Node, Edge, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  MailIcon, 
  FileTextIcon, 
  PlayIcon, 
  MicIcon, 
  UsersIcon,
  MessageSquareIcon,
  LayoutDashboardIcon,
  CalculatorIcon,
  FileSearchIcon,
  LayersIcon,
  XIcon,
  UserPlusIcon,
  Gamepad2Icon as WrenchIcon
} from 'lucide-react';

interface MockupData {
  title: string;
  type: 'form' | 'calc' | 'data';
  content: React.ReactNode;
}

export const AppStructureMindmap: React.FC = () => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const [selectedMockup, setSelectedMockup] = useState<MockupData | null>(null);

    const nodes: Node[] = [
        // TITRES DES COLONNES
        { 
          id: 'label-ai', 
          data: { label: <div className="font-black text-purple-600 text-[10px] uppercase tracking-tighter">Chemin Automatisé (Robot Jarviss)</div> }, 
          position: { x: 50, y: -60 }, 
          draggable: false, 
          style: { background: 'transparent', border: 'none', width: 220, textAlign: 'center' } 
        },
        { 
          id: 'label-manual', 
          data: { label: <div className="font-black text-blue-600 text-[10px] uppercase tracking-tighter">Chemin Manuel (Ventes & Estimés)</div> }, 
          position: { x: -280, y: -60 }, 
          draggable: false, 
          style: { background: 'transparent', border: 'none', width: 220, textAlign: 'center' } 
        },

        // AGENTS FIXES (SUPÉRIEUR)
        { 
          id: 'agent-voice', 
          data: { label: <div className="flex flex-col items-center gap-1 text-center"><MicIcon className="w-4 h-4 text-red-500"/><span className="font-bold text-[9px] uppercase">Assistant Vocal</span></div> }, 
          position: { x: 100, y: -160 }, 
          style: { background: '#0f172a', color: '#fff', border: '1px solid #ef4444', borderRadius: '12px', padding: '8px', width: 120 } 
        },
        { 
          id: 'agent-chat', 
          data: { label: <div className="flex flex-col items-center gap-1 text-center"><MessageSquareIcon className="w-4 h-4 text-indigo-400"/><span className="font-bold text-[9px] uppercase">Chat Jarviss</span></div> }, 
          position: { x: 230, y: -160 }, 
          style: { background: '#0f172a', color: '#fff', border: '1px solid #4338ca', borderRadius: '12px', padding: '8px', width: 120 } 
        },

        // --- NIVEAU 1 : ENTRÉES ---
        { 
          id: 'manual-entry', 
          data: { label: <div className="flex flex-col gap-1"><div className="flex items-center gap-2 font-bold text-xs"><UserPlusIcon className="w-4 h-4 text-blue-500"/>Saisie Manuelle</div><span className="text-[8px] opacity-70">Saisie des données client (Form)</span></div> }, 
          position: { x: -280, y: 0 }, 
          style: { background: '#f0f9ff', border: '2px solid #3b82f6', borderRadius: '8px', padding: '12px', width: 220 } 
        },
        { 
          id: 'inbound', 
          data: { label: <div className="flex flex-col gap-1"><div className="flex items-center gap-2 font-bold text-xs"><MailIcon className="w-4 h-4 text-blue-500"/>Robot Inbound</div><span className="text-[8px] opacity-70">Extraction PDF/DXF (Robot)</span></div> }, 
          position: { x: 50, y: 0 }, 
          style: { background: '#f0f9ff', border: '1px solid #0ea5e9', borderRadius: '8px', padding: '12px', width: 220 } 
        },

        // --- NIVEAU 2 : ANALYSE & DESSINS ---
        { 
          id: 'dxf-extractor', 
          data: { label: <div className="flex flex-col gap-1 text-center"><FileSearchIcon className="w-5 h-5 text-purple-600 mx-auto"/><span className="font-bold text-xs uppercase tracking-tight">Analyseur de Géométrie</span><span className="text-[7px]">Extraction des vecteurs DXF</span></div> }, 
          position: { x: 50, y: 150 }, 
          style: { background: '#f5f3ff', border: '2px solid #a855f7', borderRadius: '8px', padding: '12px', width: 220 } 
        },

        // --- NIVEAU 3 : MOTEUR DE PRIX ---
        { 
          id: 'calc-engine', 
          data: { label: <div className="flex flex-col gap-1 text-center"><CalculatorIcon className="w-5 h-5 text-purple-800 mx-auto"/><span className="font-bold text-xs uppercase tracking-tighter">Moteur d'Estimation</span></div> }, 
          position: { x: -115, y: 320 }, 
          style: { background: '#faf5ff', border: '3px solid #7e22ce', borderRadius: '12px', padding: '15px', width: 230 } 
        },

        // --- NIVEAU 4 : STRUCTURE DE LA JOB (BOM) ---
        { 
          id: 'job-structure', 
          data: { label: <div className="flex flex-col gap-1"><div className="flex items-center gap-2 font-bold text-xs underline"><LayersIcon className="w-4 h-4 text-emerald-600"/>Structure: SUPPORT MOTEUR</div><span className="text-[8px] opacity-70 font-bold uppercase">ASSEMBLAGE TYPE (BOM)</span></div> }, 
          position: { x: -115, y: 500 }, 
          style: { background: '#ecfdf5', border: '2px solid #10b981', borderRadius: '8px', padding: '12px', width: 230 } 
        },
        { 
          id: 'parts-detail', 
          data: { label: <div className="text-[7px] bg-white p-2 border border-emerald-100 rounded leading-tight">1. Base (Laser + 2 Plis)<br/>2. Bras Gauche (Laser)<br/>3. Bras Droit (Laser)<br/>4. Boulonnerie (Achats)</div> }, 
          position: { x: 150, y: 505 }, 
          style: { width: 140 } 
        },

        // --- NIVEAU 5 : RESSOURCES & EMPLOYÉS ---
        { 
          id: 'employee-rh', 
          data: { label: <div className="flex flex-col gap-1"><div className="flex items-center gap-2 font-bold text-xs"><UsersIcon className="w-4 h-4 text-orange-600"/>Assignation Personnel</div></div> }, 
          position: { x: -380, y: 500 }, 
          style: { background: '#fff7ed', border: '1px solid #f97316', borderRadius: '8px', padding: '12px', width: 220 } 
        },

        // --- NIVEAU 6 : SOUCHMISSION & BON DE TRAVAIL ---
        { 
          id: 'quotes', 
          data: { label: <div className="flex flex-col gap-1"><div className="flex items-center gap-2 font-bold text-xs"><FileTextIcon className="w-4 h-4 text-emerald-800"/>Soumission Finale</div></div> }, 
          position: { x: -115, y: 650 }, 
          style: { background: '#d1fae5', border: '2px solid #059669', borderRadius: '8px', padding: '12px', width: 230 } 
        },
        { 
          id: 'work-orders', 
          data: { label: <div className="flex flex-col gap-1"><div className="flex items-center gap-2 font-bold text-xs"><PlayIcon className="w-4 h-4 text-amber-600"/>Bon de Job (Fab)</div></div> }, 
          position: { x: -115, y: 780 }, 
          style: { background: '#fffbeb', border: '2px solid #f59e0b', borderRadius: '8px', padding: '12px', width: 230 } 
        },

        // --- NIVEAU 7 : PLANCHER ---
        { 
          id: 'shopfloor', 
          data: { label: <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-white"><LayoutDashboardIcon className="w-5 h-5"/>Digital Shopfloor Dashboard</div> }, 
          position: { x: -115, y: 920 }, 
          style: { background: '#1e293b', color: '#fff', border: '3px solid #64748b', borderRadius: '12px', padding: '15px', width: 230, textAlign: 'center' } 
        },
    ];

    const edges: Edge[] = [
        // Flux Manuel
        { id: 'e-manual', source: 'manual-entry', target: 'calc-engine', label: 'Formulaire', labelStyle: { fontSize: 7 } },
        
        // Flux IA
        { id: 'e-inbound', source: 'inbound', target: 'dxf-extractor', animated: true },
        { id: 'e-extract', source: 'dxf-extractor', target: 'calc-engine', markerEnd: { type: MarkerType.ArrowClosed } },
        
        // Cœur du Système
        { id: 'e-pricing', source: 'calc-engine', target: 'job-structure', markerEnd: { type: MarkerType.ArrowClosed } },
        { id: 'e-bom-detail', source: 'job-structure', target: 'parts-detail', style: { strokeDasharray: '4,4' } },
        { id: 'e-rh-assign', source: 'employee-rh', target: 'job-structure', style: { strokeDasharray: '4,4' } },
        { id: 'e-quote', source: 'job-structure', target: 'quotes', markerEnd: { type: MarkerType.ArrowClosed } },
        { id: 'e-fab', source: 'quotes', target: 'work-orders', label: 'COMMANDE RÉELLE', labelStyle: { fontSize: 8, fontBold: 'bold' }, style: { stroke: '#10b981', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed } },
        { id: 'e-floor', source: 'work-orders', target: 'shopfloor', markerEnd: { type: MarkerType.ArrowClosed }, animated: true },
    ];

    const onNodeClick = (_: React.MouseEvent, node: Node) => {
      const mockups: Record<string, MockupData> = {
        'manual-entry': {
          title: 'Fiche de Saisie - Bureau des Ventes',
          type: 'form',
          content: (
            <div className="space-y-4 font-sans text-xs">
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 shadow-sm">
                <p className="font-bold text-blue-800 mb-2 uppercase">Informations de Commande</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[9px] text-slate-500 font-bold block mb-1">PROJET</label><input disabled value="Support Chassis #45" className="w-full p-2 bg-white border rounded text-[10px]"/></div>
                  <div><label className="text-[9px] text-slate-500 font-bold block mb-1">QTÉ</label><input disabled value="25 Unités" className="w-full p-2 bg-white border rounded text-[10px]"/></div>
                  <div className="col-span-2"><label className="text-[9px] text-slate-500 font-bold block mb-1">MATIÈRE</label><input disabled value="ACIER CARBONE (SAE 1020)" className="w-full p-2 bg-white border rounded text-[10px]"/></div>
                </div>
              </div>
              <div className="p-2 border rounded bg-white text-[10px] flex items-center justify-between">
                <span>Dessin PDF : <span className="text-blue-600 font-bold">chassis_v2.pdf</span></span>
                <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded border border-green-200">OK</span>
              </div>
            </div>
          )
        },
        'calc-engine': {
          title: 'Tableau de Calcul des Coûts (Estimation)',
          type: 'calc',
          content: (
            <div className="space-y-3 font-mono text-[10px]">
              <div className="bg-purple-900 text-purple-100 p-3 rounded shadow-inner">
                <p className="border-b border-purple-700 pb-1 mb-2 font-bold uppercase">Laser (Acier 1/4")</p>
                <div className="grid grid-cols-2 gap-1 text-[9px]">
                  <span>Vitesse Coupe :</span><span className="text-right">4.5 m/min</span>
                  <span>Temps de Coupe :</span><span className="text-right">12.4 mins</span>
                  <span className="font-bold border-t pt-1">Coût Laser :</span><span className="text-right border-t pt-1">28.50 $</span>
                </div>
              </div>
              <div className="bg-indigo-900 text-indigo-100 p-3 rounded shadow-inner">
                <p className="border-b border-indigo-700 pb-1 mb-2 font-bold uppercase">Bending (Presse)</p>
                <div className="grid grid-cols-2 gap-1 text-[9px]">
                  <span>Nombre de Plis :</span><span className="text-right">2 par pièce</span>
                  <span>Temps Setup :</span><span className="text-right">15 mins</span>
                  <span className="font-bold border-t pt-1">Coût Pliage :</span><span className="text-right border-t pt-1">11.20 $</span>
                </div>
              </div>
            </div>
          )
        },
        'job-structure': {
          title: 'Structure Job: Support Moteur (BOM)',
          type: 'data',
          content: (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-50 rounded border-2 border-emerald-500 flex items-center gap-3">
                 <LayersIcon className="w-6 h-6 text-emerald-600"/>
                 <div>
                    <h4 className="font-black text-sm text-emerald-900 tracking-tighter">ASSY-MOTOR-004</h4>
                    <p className="text-[10px] text-emerald-700 font-bold">Assemblage Principal (25 pcs)</p>
                 </div>
              </div>
              <div className="space-y-1 relative before:content-[''] before:absolute before:left-3 before:top-4 before:bottom-4 before:w-0.5 before:bg-emerald-200">
                <div className="flex items-center gap-3 p-2 bg-white border border-emerald-100 rounded ml-6">
                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>
                   <div className="flex-1"><p className="text-[10px] font-bold">PIÈCE: BASE-S44</p><p className="text-[8px] opacity-70">Mat: Acier 6mm | Laser + Punch</p></div>
                </div>
                <div className="flex items-center gap-3 p-2 bg-white border border-emerald-100 rounded ml-6">
                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>
                   <div className="flex-1"><p className="text-[10px] font-bold">PIÈCE: BRACKET-L</p><p className="text-[8px] opacity-70">Mat: Acier 6mm | Laser + Plies</p></div>
                </div>
                <div className="flex items-center gap-3 p-2 bg-orange-50 border border-orange-200 rounded ml-6">
                   <WrenchIcon className="w-3 h-3 text-orange-500"/>
                   <div className="flex-1"><p className="text-[10px] font-bold uppercase">Opération: SOUDURE TIG</p><p className="text-[8px] text-orange-700">Temps estimé: 10 mins / unité</p></div>
                </div>
              </div>
            </div>
          )
        },
        'employee-rh': {
          title: 'Gestion de la Main d\'œuvre',
          type: 'data',
          content: (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-white border rounded-lg shadow-sm">
                 <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center font-black text-slate-500">MK</div>
                 <div>
                    <p className="text-xs font-bold leading-none">Marc-André Kingsbury</p>
                    <p className="text-[9px] text-slate-500 mt-1 uppercase font-bold tracking-widest">SOUDEUR CERTIFIÉ CWB</p>
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                 <div className="p-2 bg-emerald-50 border border-emerald-100 rounded flex flex-col items-center">
                    <span className="text-[14px] font-black text-emerald-700">100%</span>
                    <span className="text-[8px] uppercase font-bold text-emerald-600">Disponibilité</span>
                 </div>
                 <div className="p-2 bg-blue-50 border border-blue-100 rounded flex flex-col items-center">
                    <span className="text-[14px] font-black text-blue-700">Level 4</span>
                    <span className="text-[8px] uppercase font-bold text-blue-600">Skill Level</span>
                 </div>
              </div>
            </div>
          )
        }
      };

      if (mockups[node.id]) {
        setSelectedMockup(mockups[node.id]);
      }
    };

    return (
        <div className="h-full w-full bg-slate-50 flex flex-col relative overflow-hidden">
            {/* Header / Titre */}
            <div className="p-4 bg-white border-b border-gray-100 shadow-sm z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                    Structure Digitale FMI (Usine 4.0)
                  </h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                    Bureau & Robot Jarviss • Flux de Données Réels
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                   <div className="px-2 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200 rounded uppercase">Saisie Ventes</div>
                   <div className="px-2 py-1 bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200 rounded uppercase">IA Automatique</div>
                   <div className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 rounded uppercase">Structure d'Usine</div>
                </div>
              </div>
            </div>

            {/* Zone Flow */}
            <div className="flex-1 bg-white relative">
              <ReactFlow 
                nodes={nodes} 
                edges={edges} 
                onNodeClick={onNodeClick}
                fitView
                fitViewOptions={{ padding: isMobile ? 0.4 : 0.2 }}
                minZoom={0.05}
                maxZoom={1}
                nodesDraggable={!isMobile}
              >
                  <Background color="#f1f5f9" gap={25} size={1} />
                  <Controls showInteractive={false} className="bg-white" />
              </ReactFlow>
            </div>

            {/* Modal de Mockup Details */}
            {selectedMockup && (
              <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6">
                 <div className="bg-white w-full max-w-sm rounded-[24px] shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                       <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">{selectedMockup.title}</h3>
                       <button onClick={() => setSelectedMockup(null)} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                          <XIcon className="w-5 h-5 text-slate-400"/>
                       </button>
                    </div>
                    <div className="p-6">
                       {selectedMockup.content}
                    </div>
                    <div className="p-5 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3">
                       <button onClick={() => setSelectedMockup(null)} className="px-6 py-2.5 bg-slate-900 text-white text-[10px] font-black uppercase rounded-xl hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200">
                          Terminé
                       </button>
                    </div>
                 </div>
              </div>
            )}

            {/* Legende Flottante */}
            <div className="absolute bottom-6 left-6 p-4 bg-white/95 backdrop-blur border border-slate-200 rounded-2xl shadow-xl z-10 flex flex-col gap-2.5 max-w-[200px]">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">Légende Process</p>
               <div className="flex items-center gap-3 text-[10px] font-bold text-slate-700">
                  <div className="w-4 h-4 rounded-lg bg-blue-500 shadow-sm shadow-blue-200"/> Bureau / Saisie
               </div>
               <div className="flex items-center gap-3 text-[10px] font-bold text-slate-700">
                  <div className="w-4 h-4 rounded-lg bg-purple-500 shadow-sm shadow-purple-200"/> Robot IA / Calculs
               </div>
               <div className="flex items-center gap-3 text-[10px] font-bold text-slate-700">
                  <div className="w-4 h-4 rounded-lg bg-emerald-500 shadow-sm shadow-emerald-200"/> Ingénierie / Job
               </div>
               <div className="flex items-center gap-3 text-[10px] font-bold text-slate-700">
                  <div className="w-4 h-4 rounded-lg bg-slate-900 shadow-sm shadow-slate-400"/> Sortie Usine
               </div>
               <p className="text-[9px] text-blue-600 font-bold mt-1 bg-blue-50 p-1.5 rounded-lg text-center">💡 Cliquer sur les cases</p>
            </div>
        </div>
    );
};


