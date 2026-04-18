import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  SparklesIcon, 
  MicIcon, 
  LayersIcon, 
  ClipboardListIcon,
  PlayIcon,
  PauseIcon,
  RotateCcwIcon
} from 'lucide-react';

interface Slide {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  accent: string;
  narrative: string;
  visualType: 'erp' | 'estimation' | 'materials' | 'shopfloor' | 'skills' | 'assistant' | 'monitoring' | 'quality' | 'semantic' | 'concept';
}

const slides: Slide[] = [
  {
    id: 1,
    title: "Gestion Industrielle",
    subtitle: "La fondation ERP 4.0",
    description: "Une gestion complète du cycle de vie de votre atelier. Des clients à la facturation, en passant par le Shopfloor.",
    icon: ClipboardListIcon,
    accent: "bg-fmi-red",
    visualType: 'erp',
    narrative: "Bonjour! C'est un vrai plaisir de vous accueillir. Commençons par le coeur de votre succès : votre ERP. C'est ici que tout se passe, de la gestion des clients jusqu'à la facturation. C'est simple, fluide, et surtout, fini la paperasse qui se perd!"
  },
  {
    id: 2,
    title: "Cerveau IA",
    subtitle: "Estimation Laser & Pliage",
    description: "Extraire la structure de prix de fichiers Excel complexes en quelques secondes. Précision laser garantie.",
    icon: SparklesIcon,
    accent: "bg-purple-600",
    visualType: 'estimation',
    narrative: "Regardez bien ça, c'est notre cerveau technologique. Il 'lit' vos listes de pièces complexes en un clin d'oeil pour calculer vos prix laser et vos temps de pliage. C'est comme avoir un expert à vos côtés, 24 heures sur 24."
  },
  {
    id: 3,
    title: "Bibliothèque de Matières",
    subtitle: "Précision & Configuration",
    description: "Besoins d'acier, alu ou inox? Les épaisseurs et vitesses d'avance sont déjà pré-configurées.",
    icon: LayersIcon,
    accent: "bg-slate-700",
    visualType: 'materials',
    narrative: "Une bonne job, ça prend la bonne matière. Notre catalogue est ultra complet. Acier, alu, stainless... tous les réglages machine sont déjà là. Vous choisissez l'épaisseur et le système fait le reste, sans aucune erreur."
  },
  {
    id: 4,
    title: "Logistique du Plancher",
    subtitle: "Organisation Manuelle ou Auto",
    description: "Organisez vos séquences de production. Glissez vos commandes manuellement ou laissez l'IA optimiser le flux.",
    icon: LayersIcon,
    accent: "bg-indigo-600",
    visualType: 'shopfloor',
    narrative: "Maintenant, parlons de votre plancher. Vous pouvez organiser vos séquences manuellement en glissant les commandes, ou mieux encore, laisser notre algorithme optimiser tout ça automatiquement pour sauver un temps précieux."
  },
  {
    id: 5,
    title: "Aptitudes des Opérateurs",
    subtitle: "Le Bon Talent, au Bon Poste",
    description: "Attribution des tâches selon les compétences. Le système sait qui est votre meilleur plieur ou soudeur.",
    icon: ClipboardListIcon,
    accent: "bg-cyan-600",
    visualType: 'skills',
    narrative: "Ici, on s'assure que la bonne personne est sur le bon poste. Le système suggère les opérateurs selon leurs talents réels : pliage, soudure ou peinture. C'est valorisant pour votre équipe et ultra efficace pour votre usine."
  },
  {
    id: 6,
    title: "Assistant Gemini Live",
    subtitle: "La Voix de l'Atelier",
    description: "Contrôlez votre usine par la voix. Affichez des pièces ou modifiez des statuts sans lâcher vos outils.",
    icon: MicIcon,
    accent: "bg-emerald-600",
    visualType: 'assistant',
    narrative: "Vous avez les mains occupées sur une pièce? Pas de problème! 'Hé Gemini, montre-moi le plan'. Votre assistant vocal vous répond instantanément. C'est comme un compagnon fidèle qui ne vous quitte jamais."
  },
  {
    id: 7,
    title: "Suivi Temps Réel",
    subtitle: "Productivité Instantanée",
    description: "Voyez l'avancement global de l'usine. Qui travaille sur quoi? Quelle commande est en retard?",
    icon: SparklesIcon,
    accent: "bg-orange-600",
    visualType: 'monitoring',
    narrative: "Restez branché sur votre productivité en tout temps. Voyez en temps réel qui travaille sur quoi et l'avancement de vos projets. On arrête de deviner, on sait exactement où on s'en va. C'est rassurant, n'est-ce pas?"
  },
  {
    id: 8,
    title: "Qualité & Approbation",
    subtitle: "Standard d'Excellence",
    description: "Validation d'étapes et contrôle qualité rigoureux. Signez numériquement pour passer à l'étape suivante.",
    icon: ClipboardListIcon,
    accent: "bg-rose-600",
    visualType: 'quality',
    narrative: "Parce que votre réputation nous tient à coeur. On a intégré des listes de vérification et des approbations par les chefs d'atelier. Une petite erreur évitée, c'est un client heureux gagné! C'est aussi simple que ça."
  },
  {
    id: 9,
    title: "Intelligence Sémantique",
    subtitle: "Le MindMap de Données",
    description: "Visualisez les liens cachés entre vos clients, vos soumissions et vos pièces historiques.",
    icon: LayersIcon,
    accent: "bg-amber-600",
    visualType: 'semantic',
    narrative: "Voici mon petit préféré : le mindmap sémantique. C'est une façon visuelle vraiment géniale de voir comment tout est relié dans votre entreprise. On décode vos données complexes pour vous aider à prendre les meilleures décisions."
  },
  {
    id: 10,
    title: "Vision de Concept",
    subtitle: "Réseau Neuronal Industriel",
    description: "Une architecture de données sans frontières. Pour une usine plus intelligente et connectée.",
    icon: SparklesIcon,
    accent: "bg-violet-600",
    visualType: 'concept',
    narrative: "Pour finir, imaginez ce réseau de neurones industriels. C'est notre vision globale : chaque point est une opportunité, chaque lien est une force. C'est ça, la vraie puissance d'un écosystème connecté. Merci d'être avec nous!"
  }
];

const MockERPScreen = () => (
  <div className="w-full h-full bg-white p-4 flex flex-col gap-3">
    <div className="flex justify-between items-center mb-2">
      <div className="flex flex-col leading-none">
        <span className="text-[8px] font-black text-fmi-red tracking-tighter">GROUPE</span>
        <span className="text-xs font-black text-slate-800 tracking-tighter leading-none">FMI</span>
      </div>
      <div className="w-8 h-8 bg-red-50 rounded-full border border-red-100" />
    </div>
    {[1, 2, 3, 4, 5].map(i => (
      <motion.div 
        key={i}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.1 }}
        className="h-10 border border-slate-100 rounded-lg flex items-center px-3 gap-4"
      >
        <div className="w-4 h-4 rounded bg-slate-200" />
        <div className="flex-1 space-y-2">
          <div className="w-2/3 h-2 bg-slate-100 rounded" />
          <div className="w-1/3 h-1.5 bg-slate-50 rounded" />
        </div>
        <div className="w-12 h-4 bg-red-50 rounded" />
      </motion.div>
    ))}
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="mt-2 p-3 bg-fmi-red rounded-xl text-white text-[10px] font-bold text-center"
    >
      PRODUCTION ACTIVE : 85%
    </motion.div>
  </div>
);

const MockEstimationScreen = () => (
  <div className="w-full h-full bg-slate-900 p-6 flex flex-col items-center justify-center gap-6 overflow-hidden">
    <motion.div 
      animate={{ 
        y: [0, -10, 0],
        rotate: [0, 5, -5, 0]
      }}
      transition={{ duration: 4, repeat: Infinity }}
      className="p-6 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-xl relative"
    >
      <div className="flex gap-2 mb-4">
        <div className="w-3 h-3 rounded-full bg-red-400" />
        <div className="w-3 h-3 rounded-full bg-amber-400" />
        <div className="w-3 h-3 rounded-full bg-emerald-400" />
      </div>
      <div className="space-y-3">
        <div className="w-48 h-2 bg-white/20 rounded" />
        <div className="w-32 h-2 bg-white/10 rounded" />
        <div className="w-40 h-2 bg-white/10 rounded" />
      </div>
      
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute -right-4 -bottom-4 p-4 bg-purple-600 rounded-xl shadow-2xl border border-purple-400"
      >
        <div className="text-[10px] font-bold text-purple-200 mb-1">ANALYSE IA</div>
        <div className="text-xl font-black text-white">$14,250.00</div>
        <div className="flex gap-2 mt-2">
          <div className="w-8 h-1 bg-white/40 rounded" />
          <div className="w-8 h-1 bg-white/40 rounded" />
        </div>
      </motion.div>
    </motion.div>
    <div className="flex gap-4">
      {[1,2,3].map(i => (
        <motion.div 
          key={i}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
          className="w-1.5 h-1.5 rounded-full bg-purple-400"
        />
      ))}
    </div>
  </div>
);

const MockMaterialsScreen = () => {
  const materials = [
    { name: "Acier Ga.(0.250\")", type: "Plate", color: "bg-slate-500" },
    { name: "HRS Ga.(0.1875\")", type: "Plate", color: "bg-slate-600" },
    { name: "ALU 3003-H14", type: "Sheet", color: "bg-blue-300" },
    { name: "SS304 Ga.(0.141\")", type: "Plate", color: "bg-slate-400" },
    { name: "Flat Bar 2.5\"", type: "Profile", color: "bg-slate-700" },
    { name: "Angle 2x2", type: "Profile", color: "bg-indigo-600" },
    { name: "Galva Ga.(10 Ga)", type: "Plate", color: "bg-slate-300" }
  ];

  return (
    <div className="w-full h-full bg-slate-100 flex flex-col p-4 overflow-hidden relative">
      <div className="flex-none p-2 mb-4 bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Matières Premières</div>
        <div className="h-2 w-32 bg-slate-100 rounded" />
      </div>
      
      <div className="flex-1 relative overflow-hidden">
        <motion.div 
          animate={{ y: [0, -400] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="flex flex-col gap-3"
        >
          {[...materials, ...materials].map((m, i) => (
            <div key={i} className="flex-none bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-lg ${m.color} flex items-center justify-center text-white font-black text-xs`}>
                {m.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-slate-800">{m.name}</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-tighter">{m.type}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold text-fmi-red">DÉCOUPE OK</div>
                <div className="w-12 h-1 bg-red-50 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-fmi-red w-[70%]" />
                </div>
              </div>
            </div>
          ))}
        </motion.div>
        
        {/* Fade overlays */}
        <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-slate-100 to-transparent z-10" />
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-100 to-transparent z-10" />
      </div>
    </div>
  );
};

const MockShopfloorOrg = () => {
  const [items] = React.useState([
    { id: '1', label: 'CMD-882', status: 'WAIT' },
    { id: '2', label: 'CMD-901', status: 'PROC' },
    { id: '3', label: 'CMD-774', status: 'WAIT' },
  ]);

  return (
    <div className="w-full h-full bg-indigo-50 p-6 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="text-[10px] font-black text-indigo-900/40 uppercase tracking-widest">Séquençage Shopfloor</div>
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full"
        />
      </div>
      
      <div className="flex-1 flex flex-col gap-3">
        {items.map((item) => (
          <motion.div
            key={item.id}
            layout
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            className="p-4 bg-white rounded-xl shadow-sm border border-indigo-100 flex items-center justify-between cursor-grab active:cursor-grabbing"
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-8 bg-indigo-200 rounded-full" />
              <div>
                <div className="text-xs font-bold text-indigo-900">{item.label}</div>
                <div className="text-[8px] text-indigo-400">PRIORITÉ HAUTE</div>
              </div>
            </div>
            <div className={`px-2 py-0.5 rounded text-[8px] font-bold ${item.status === 'PROC' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              {item.status}
            </div>
          </motion.div>
        ))}
        
        <motion.div 
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="p-3 border-2 border-dashed border-indigo-200 rounded-xl flex items-center justify-center"
        >
          <div className="text-[9px] font-bold text-indigo-300">DÉPOSER ICI POUR OPTIMISER</div>
        </motion.div>
      </div>
    </div>
  );
};

const MockSkillsMatching = () => (
  <div className="w-full h-full bg-cyan-950 p-6 flex flex-col gap-4">
    <div className="text-[10px] font-black text-cyan-400/50 uppercase tracking-widest text-center mt-2">MATRICE DES COMPÉTENCES</div>
    
    <div className="flex-1 flex flex-col gap-4 justify-center">
      {[
        { name: "Marc-André L.", skill: "PLIAGE EXPERT", level: 95, color: "bg-cyan-500" },
        { name: "Sophie G.", skill: "SOUDURE TIG", level: 88, color: "bg-cyan-400" },
        { name: "Jean-Phillippe", skill: "LOGISTIQUE", level: 92, color: "bg-cyan-600" }
      ].map((op, i) => (
        <motion.div
          key={i}
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: i * 0.2 }}
          className="bg-cyan-900/30 border border-cyan-800 p-3 rounded-2xl flex items-center gap-4"
        >
          <div className={`w-10 h-10 rounded-full ${op.color} flex items-center justify-center text-white font-black text-xs shadow-[0_0_15px_rgba(6,182,212,0.3)]`}>
            {op.name.substring(0, 1)}
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-end mb-1">
              <div className="text-[10px] font-bold text-white">{op.name}</div>
              <div className="text-[8px] font-bold text-cyan-400 uppercase">{op.skill}</div>
            </div>
            <div className="h-1.5 w-full bg-cyan-900 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${op.level}%` }}
                transition={{ duration: 1.5, delay: 0.5 + i * 0.2 }}
                className="h-full bg-cyan-400"
              />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
    
    <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-center">
      <div className="text-[9px] font-bold text-emerald-400">OPTIMISATION ATTEINTE : 98%</div>
    </div>
  </div>
);

const MockAssistantScreen = () => (
  <div className="w-full h-full bg-emerald-950 p-6 flex flex-col gap-4 overflow-hidden">
    <div className="flex-1 flex flex-col justify-end gap-3">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-emerald-900/50 p-3 rounded-2xl rounded-bl-none border border-emerald-800 self-start max-w-[80%]"
      >
        <div className="text-[10px] text-emerald-400 font-bold mb-1">UTILISATEUR</div>
        <div className="text-xs text-white">"Affiche moi la pièce laser P-102"</div>
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1 }}
        className="bg-emerald-600 p-3 rounded-2xl rounded-br-none self-end max-w-[80%] shadow-lg"
      >
        <div className="text-[10px] text-emerald-100 font-bold mb-1">GEMINI</div>
        <div className="text-xs text-white">"Certainement, j'ouvre la fiche technique de la pièce P-102 pour vous."</div>
      </motion.div>
    </div>
    
    <div className="h-20 bg-emerald-900/40 rounded-3xl flex items-center justify-center border border-emerald-800">
      <div className="flex items-center gap-1.5">
        {[20, 45, 15, 30, 50, 25, 40, 35].map((h, i) => (
          <motion.div
            key={i}
            animate={{ 
              height: [8, h, 8],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.05 }}
            className="w-1 bg-emerald-400 rounded-full"
          />
        ))}
      </div>
    </div>
  </div>
);

const MockRealtimeMonitoring = () => (
  <div className="w-full h-full bg-slate-900 p-8 flex flex-col gap-8 items-center justify-center overflow-hidden">
    <div className="flex gap-12">
      {[
        { label: "PRODUCTION", val: "84%", color: "text-orange-500", deg: 270 },
        { label: "EFFICIENCE", val: "92%", color: "text-emerald-500", deg: 290 }
      ].map((g, i) => (
        <div key={i} className="relative w-32 h-32 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
            <motion.circle 
              cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent"
              className={g.color}
              initial={{ strokeDasharray: "0 400" }}
              animate={{ strokeDasharray: `${g.deg} 400` }}
              transition={{ duration: 2, delay: 0.5 }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-2xl font-black text-white">{g.val}</div>
            <div className="text-[8px] font-black text-white/40 tracking-widest">{g.label}</div>
          </div>
        </div>
      ))}
    </div>
    <div className="w-full space-y-4">
      {[
        { label: "PO #1204 Laser", p: 70 },
        { label: "PO #1208 Pliage", p: 45 }
      ].map((bar, i) => (
        <div key={i} className="space-y-1">
          <div className="flex justify-between text-[8px] font-bold text-white/50">
            <span>{bar.label}</span>
            <span>{bar.p}%</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${bar.p}%` }}
              className="h-full bg-orange-500 rounded-full"
            />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const MockQualityControl = () => (
  <div className="w-full h-full bg-rose-50 p-6 flex flex-col gap-4 overflow-hidden relative">
    <div className="bg-white p-6 rounded-3xl shadow-xl space-y-6">
      <div className="flex justify-between items-center border-b border-rose-100 pb-4">
        <div className="space-y-1">
          <div className="text-[10px] font-black text-rose-600 uppercase">Fiche Qualité</div>
          <div className="text-xs font-bold">PIÈCE_REF_102.DXF</div>
        </div>
        <div className="w-10 h-10 bg-rose-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
          <ClipboardListIcon className="w-5 h-5" />
        </div>
      </div>
      
      <div className="space-y-3">
        {[
          { text: "Dimensions vérifiées", checked: true },
          { text: "Angle de pliage à 90.5°", checked: true },
          { text: "Ébavurage conforme", checked: false },
          { text: "Inspection visuelle", checked: false }
        ].map((item, i) => (
          <motion.div 
            key={i}
            initial={{ x: -10, opacity: 0 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.2 }}
            className="flex items-center gap-3"
          >
            <div className={`w-5 h-5 rounded-lg flex items-center justify-center border-2 transition-colors ${item.checked ? 'bg-rose-500 border-rose-500 text-white' : 'border-rose-200'}`}>
              {item.checked && <PlayIcon className="w-2.5 h-2.5 rotate-90" />}
            </div>
            <span className={`text-xs ${item.checked ? 'text-slate-800 font-medium' : 'text-slate-400 italic'}`}>{item.text}</span>
          </motion.div>
        ))}
      </div>
    </div>
    
    <motion.div 
      initial={{ scale: 0, rotate: 10 }}
      animate={{ scale: 1 }}
      transition={{ delay: 1, type: "spring" }}
      className="absolute bottom-10 right-10 w-24 h-24 bg-emerald-500/20 border-4 border-emerald-500 rounded-full flex items-center justify-center transform -rotate-12 backdrop-blur-sm"
    >
      <div className="text-center">
        <div className="text-[8px] font-black text-emerald-600 uppercase">APPROUVÉ</div>
        <div className="text-[6px] font-bold text-emerald-800 italic">Chef d'atelier</div>
      </div>
    </motion.div>
  </div>
);

const MockSemanticScreen = () => (
  <div className="w-full h-full bg-slate-50 p-6 relative overflow-hidden">
    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
    <svg className="absolute inset-0 w-full h-full">
      <motion.g initial={{ opacity: 0 }} animate={{ opacity: 0.3 }} transition={{ duration: 1 }}>
        {[
          { x1: "20%", y1: "20%", x2: "50%", y2: "50%" },
          { x1: "80%", y1: "30%", x2: "50%", y2: "50%" },
          { x1: "50%", y1: "80%", x2: "50%", y2: "50%" },
          { x1: "15%", y1: "70%", x2: "20%", y2: "20%" },
          { x1: "85%", y1: "75%", x2: "80%", y2: "30%" }
        ].map((line, i) => (
          <motion.line 
            key={i}
            x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} 
            stroke="currentColor" strokeWidth="1.5"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 2, delay: i * 0.3, repeat: Infinity, repeatType: "reverse" }}
          />
        ))}
      </motion.g>
    </svg>
    
    <div className="relative z-10 w-full h-full">
      <motion.div 
        animate={{ scale: [1, 1.05, 1], y: [0, -5, 0] }}
        transition={{ duration: 5, repeat: Infinity }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 bg-amber-500 rounded-full shadow-[0_0_40px_rgba(245,158,11,0.4)] flex flex-col items-center justify-center text-white text-center p-2"
      >
        <LayersIcon className="w-8 h-8 mb-1" />
        <div className="text-[7px] font-black leading-tight">MINDMAP CENTRAL</div>
      </motion.div>
      
      {[
        { top: '15%', left: '15%', label: 'DONNÉES CLIENTS', color: 'bg-amber-100', delay: 0 },
        { top: '25%', right: '15%', label: 'HISTORIQUE PIÈCES', color: 'bg-white', delay: 1 },
        { bottom: '15%', left: '20%', label: 'SOUUMISSIONS', color: 'bg-white', delay: 0.5 },
        { bottom: '20%', right: '10%', label: 'TENDANCES', color: 'bg-amber-50', delay: 1.5 }
      ].map((node, i) => (
        <motion.div 
          key={i}
          animate={{ y: [0, i % 2 === 0 ? 10 : -10, 0] }}
          transition={{ duration: 4 + i, repeat: Infinity, delay: node.delay }}
          className={`absolute p-2 rounded-lg shadow-sm border border-amber-200 ${node.color}`}
          style={{ top: node.top, left: node.left, right: node.right }}
        >
          <div className="text-[8px] font-bold text-amber-800">{node.label}</div>
          <div className="w-8 h-1 bg-amber-200 rounded mt-1" />
        </motion.div>
      ))}
    </div>
  </div>
);

const CONCEPT_PARTICLES = Array.from({ length: 15 }).map((_, i) => ({
  id: i,
  x1: (i * 7) % 100,
  y1: (i * 13) % 100,
  x2: (i * 19) % 100,
  y2: (i * 5) % 100,
  duration: 4 + (i % 3),
  rot: i * 24
}));

const MockAbstractConcept = () => (
  <div className="w-full h-full bg-slate-950 p-6 relative flex items-center justify-center overflow-hidden">
    <div className="absolute inset-0">
      {CONCEPT_PARTICLES.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, x: `${p.x1}%`, y: `${p.y1}%` }}
          animate={{ 
            opacity: [0, 0.4, 0],
            scale: [0.5, 1.5, 0.5],
            x: [`${p.x1}%`, `${p.x2}%`, `${p.x1}%`],
            y: [`${p.y1}%`, `${p.y2}%`, `${p.y1}%`] 
          }}
          transition={{ 
            duration: p.duration,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute w-1 h-24 bg-violet-400/20 blur-xl"
          style={{ rotate: p.rot }}
        />
      ))}
    </div>
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      className="relative w-40 h-40 border border-violet-500/20 rounded-full flex items-center justify-center"
    >
      <div className="absolute inset-0 border border-violet-400/10 rounded-full scale-110" />
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="w-10 h-10 bg-violet-500 rounded-2xl blur-[1px] shadow-[0_0_60px_rgba(139,92,246,0.9)]"
      />
    </motion.div>
    <div className="absolute bottom-12 text-center space-y-2">
      <div className="text-[10px] font-black text-violet-300 tracking-[0.6em] opacity-80 uppercase">L'ADN de votre Usine</div>
    </div>
  </div>
);

export const ShowcaseView: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = (text: string) => {
    // Force cleanup
    window.speechSynthesis.cancel();
    
    // Split long text into parts to prevent timeout/cut-off in some browsers
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let sentenceIndex = 0;

    const speakSentence = (index: number) => {
      if (index >= sentences.length) {
        setIsSpeaking(false);
        if (isPlaying) {
          if (currentSlide < slides.length - 1) {
            setTimeout(() => setCurrentSlide(prev => prev + 1), 1500);
          } else {
            setIsPlaying(false);
          }
        }
        return;
      }

      const utterance = new SpeechSynthesisUtterance(sentences[index].trim());
      utterance.lang = 'fr-CA'; // Prioritize Canadian French
      utterance.rate = 1.0; 
      utterance.pitch = 1.0;
      
      // Try to find a better voice (prefer Canadian French)
      const voices = window.speechSynthesis.getVoices();
      const bestVoice = voices.find(v => v.lang.includes('fr-CA') && v.name.includes('Google')) ||
                        voices.find(v => v.lang.includes('fr-CA')) ||
                        voices.find(v => v.lang.startsWith('fr') && v.name.includes('Google')) || 
                        voices.find(v => v.lang.startsWith('fr'));
      if (bestVoice) utterance.voice = bestVoice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        sentenceIndex++;
        speakSentence(sentenceIndex);
      };
      utterance.onerror = (e) => {
        console.error("Speech error", e);
        setIsSpeaking(false);
      };

      speechRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    };

    speakSentence(0);
  };

  useEffect(() => {
    // Initial voice load
    window.speechSynthesis.getVoices();
    return () => window.speechSynthesis.cancel();
  }, []);

  useEffect(() => {
    if (isPlaying) {
      speak(slides[currentSlide].narrative);
    }
  }, [currentSlide, isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePlayback = () => {
    if (isPlaying) {
      setIsPlaying(false);
      setIsSpeaking(false);
      window.speechSynthesis.cancel();
    } else {
      setIsPlaying(true);
    }
  };

  const renderVisual = () => {
    switch (slides[currentSlide].visualType) {
      case 'erp': return <MockERPScreen />;
      case 'estimation': return <MockEstimationScreen />;
      case 'materials': return <MockMaterialsScreen />;
      case 'shopfloor': return <MockShopfloorOrg />;
      case 'skills': return <MockSkillsMatching />;
      case 'assistant': return <MockAssistantScreen />;
      case 'monitoring': return <MockRealtimeMonitoring />;
      case 'quality': return <MockQualityControl />;
      case 'semantic': return <MockSemanticScreen />;
      case 'concept': return <MockAbstractConcept />;
      default: return null;
    }
  };

  return (
    <div className="min-h-full bg-slate-50 flex flex-col items-center justify-center p-8 overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
        <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'linear-gradient(45deg, #0f172a 25%, transparent 25%, transparent 50%, #0f172a 50%, #0f172a 75%, transparent 75%, transparent)', backgroundSize: '100px 100px' }} />
      </div>

      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
        
        {/* Left Side: Text and Navigation */}
        <div className="space-y-10">
          <div className="flex flex-col gap-4">
            <motion.div 
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="inline-flex w-fit items-center gap-2 px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold uppercase tracking-[0.2em]"
            >
              <SparklesIcon className="w-3 h-3" />
              Intelligence Opérationnelle
            </motion.div>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                className="space-y-6"
              >
                <h1 className="text-7xl font-black text-slate-900 leading-[0.9] tracking-tighter">
                  {slides[currentSlide].title.split(' ').map((word, i) => (
                    <span key={i} className="block">{word}</span>
                  ))}
                </h1>
                <div className="h-1 w-20 bg-fmi-red rounded-full" />
                <p className="text-2xl text-slate-400 font-medium">
                  {slides[currentSlide].subtitle}
                </p>
                <p className="text-xl text-slate-600 leading-relaxed max-w-md italic border-l-4 border-slate-200 pl-6 py-2">
                  "{slides[currentSlide].description}"
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-6 pt-4">
            <button
              onClick={togglePlayback}
              className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-500 scale-100 active:scale-95 ${
                isPlaying ? 'bg-slate-900 text-white shadow-2xl shadow-slate-200 rotate-0' : 'bg-fmi-red text-white shadow-2xl shadow-red-200 rotate-3 hover:rotate-0'
              }`}
            >
              {isPlaying ? <PauseIcon className="w-10 h-10" /> : <PlayIcon className="w-10 h-10 ml-1" />}
            </button>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  window.speechSynthesis.cancel();
                  setIsPlaying(false);
                  setIsSpeaking(false);
                  setCurrentSlide(0);
                }}
                className="w-10 h-10 rounded-xl border border-slate-200 text-slate-400 flex items-center justify-center hover:bg-white hover:text-slate-600 hover:border-slate-300 transition-all"
              >
                <RotateCcwIcon className="w-5 h-5" />
              </button>
              <div className="flex gap-1.5">
                {slides.map((_, idx) => (
                  <button 
                    key={idx}
                    onClick={() => {
                      window.speechSynthesis.cancel();
                      setCurrentSlide(idx);
                    }}
                    className={`h-2 rounded-full transition-all duration-500 ${
                      idx === currentSlide ? 'w-8 bg-fmi-red' : 'w-2 bg-slate-200 hover:bg-slate-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Visual Representation */}
        <div className="relative group">
          {/* Subtle background glow */}
          <div className={`absolute inset-0 blur-[100px] opacity-20 rounded-full transition-colors duration-1000 ${slides[currentSlide].accent}`} />
          
          <div className="relative z-10 aspect-[4/3] w-full max-w-xl perspective-1000">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, rotateY: 20, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, rotateY: 0, scale: 1, y: 0 }}
                exit={{ opacity: 0, rotateY: -20, scale: 1.1, y: -20 }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
                className="w-full h-full rounded-[40px] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.2)] border-8 border-white bg-white"
              >
                {renderVisual()}
              </motion.div>
            </AnimatePresence>

            {/* Decorative Icon */}
            <motion.div 
              key={`icon-${currentSlide}`}
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              className={`absolute -top-6 -right-6 w-20 h-20 rounded-3xl ${slides[currentSlide].accent} text-white flex items-center justify-center shadow-2xl z-20`}
            >
              {React.createElement(slides[currentSlide].icon, { className: "w-10 h-10" })}
            </motion.div>
          </div>

          {/* Narration Indicator */}
          <AnimatePresence>
            {isSpeaking && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/50 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/50 shadow-xl"
              >
                <div className="flex gap-1 items-end h-6">
                  {[1,2,3,4,5].map(i => (
                    <motion.div
                      key={i}
                      animate={{ height: [8, 24, 8] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                      className="w-1.5 bg-fmi-red rounded-full"
                    />
                  ))}
                </div>
                <span className="text-xs font-black text-slate-900 tracking-widest uppercase">Analyse vocale active</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
