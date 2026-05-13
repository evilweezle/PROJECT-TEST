import React, { useState } from 'react';
import { LaserTubeSettings, Operation } from '../types';
import { ChevronDownIcon, ChevronRightIcon } from './icons';
import { motion, AnimatePresence } from 'motion/react';

interface LaserTubeSettingsFormProps {
  settings: LaserTubeSettings;
  operations: Operation[];
  onSave: (settings: LaserTubeSettings) => void;
}

export const LaserTubeSettingsForm: React.FC<LaserTubeSettingsFormProps> = ({ settings, operations, onSave }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'params' | 'instructions'>('params');
  const [activeTip, setActiveTip] = useState<string | null>(null);

  const laserTubeOpRate = operations.find(o => o.name.toLowerCase().includes('laser tube'))?.rate || settings.machineHourlyRate || 0;

  const [localSettings, setLocalSettings] = useState<LaserTubeSettings>({
    machineHourlyRate: laserTubeOpRate,
    minimumTimeMinutes: settings.minimumTimeMinutes ?? 15,
    setupHourlyRate: settings.setupHourlyRate ?? laserTubeOpRate,
    costPerPierce: settings.costPerPierce ?? 0.10,
    handlingTimePerPartMinutes: settings.handlingTimePerPartMinutes ?? 1.5,
    handlingTimePerBarMinutes: settings.handlingTimePerBarMinutes ?? 15,
    electricityCostPerkW: settings.electricityCostPerkW ?? 0.47,
    gasConsumptionRate: settings.gasConsumptionRate ?? 5,
  });

  const handleChange = (field: keyof LaserTubeSettings, value: number) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
  };

  const tips: Record<string, string> = {
    machineHourlyRate: "Défini dans la table des opérations. Ce taux est appliqué au temps de coupe pour calculer le coût machine.",
    setupHourlyRate: "Défini dans la table des opérations. Taux appliqué au temps d'installation machine.",
    costPerPierce: "Coût ajouté pour chaque perçage défini dans les paramètres de la pièce.",
    handlingTimePerPartMinutes: "Temps alloué pour la manipulation de chaque pièce finie découpée.",
    minimumTimeMinutes: "Temps facturable minimum pour la préparation et la coupe, quelle que soit la quantité.",
    handlingTimePerBarMinutes: "Temps alloué pour la manipulation de chaque longue barre à charger sur la machine.",
    electricityCostPerkW: "Multiplié par la puissance de coupe et le temps effectif pour estimer le coût énergétique.",
    gasConsumptionRate: "Coût horaire estimé du gaz utilisé pendant la coupe (azote, oxygène, etc.)."
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-6">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors text-left"
      >
        <h3 className="text-xl font-bold text-slate-900 uppercase">MOTEUR DE CALCUL - LASER TUBE</h3>
        {isOpen ? (
          <ChevronDownIcon className="w-6 h-6 text-slate-500" />
        ) : (
          <ChevronRightIcon className="w-6 h-6 text-slate-500" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="border-t border-slate-100 flex overflow-x-auto bg-slate-50/50">
              <button 
                onClick={() => setActiveTab('params')}
                className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'params' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                Paramètres
              </button>
              <button 
                onClick={() => setActiveTab('instructions')}
                className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'instructions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                Instructions de calcul
              </button>
            </div>

            {activeTab === 'params' ? (
            <div className="p-6 space-y-8 border-t border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Paramètres de Taux et Coûts</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Taux horaire machine ($/hr)</label>
                    <input type="number" readOnly value={laserTubeOpRate} 
                           onFocus={() => setActiveTip(tips.machineHourlyRate)}
                           onBlur={() => setActiveTip(null)}
                           className="block w-full rounded-lg border-slate-300 shadow-sm bg-slate-100 text-slate-500 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Taux horaire setup ($/hr)</label>
                    <input type="number" readOnly value={laserTubeOpRate} 
                           onFocus={() => setActiveTip(tips.setupHourlyRate)}
                           onBlur={() => setActiveTip(null)}
                           className="block w-full rounded-lg border-slate-300 shadow-sm bg-slate-100 text-slate-500 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Coût par perçage ($)</label>
                    <input type="number" step="0.01" value={localSettings.costPerPierce} 
                           onChange={e => handleChange('costPerPierce', parseFloat(e.target.value))} 
                           onFocus={() => setActiveTip(tips.costPerPierce)}
                           onBlur={() => setActiveTip(null)}
                           className="block w-full rounded-lg border-slate-300 shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Temps manipulation / pièce (min)</label>
                    <input type="number" step="0.1" value={localSettings.handlingTimePerPartMinutes} 
                           onChange={e => handleChange('handlingTimePerPartMinutes', parseFloat(e.target.value))} 
                           onFocus={() => setActiveTip(tips.handlingTimePerPartMinutes)}
                           onBlur={() => setActiveTip(null)}
                           className="block w-full rounded-lg border-slate-300 shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Minimum applicable (min)</label>
                    <input type="number" value={localSettings.minimumTimeMinutes} 
                           onChange={e => handleChange('minimumTimeMinutes', parseFloat(e.target.value))} 
                           onFocus={() => setActiveTip(tips.minimumTimeMinutes)}
                           onBlur={() => setActiveTip(null)}
                           className="block w-full rounded-lg border-slate-300 shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Temps de manipulation / barre (min)</label>
                    <input type="number" value={localSettings.handlingTimePerBarMinutes} 
                           onChange={e => handleChange('handlingTimePerBarMinutes', parseFloat(e.target.value))} 
                           onFocus={() => setActiveTip(tips.handlingTimePerBarMinutes)}
                           onBlur={() => setActiveTip(null)}
                           className="block w-full rounded-lg border-slate-300 shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Coût électricité ($/kW)</label>
                    <input type="number" step="0.01" value={localSettings.electricityCostPerkW} 
                           onChange={e => handleChange('electricityCostPerkW', parseFloat(e.target.value))} 
                           onFocus={() => setActiveTip(tips.electricityCostPerkW)}
                           onBlur={() => setActiveTip(null)}
                           className="block w-full rounded-lg border-slate-300 shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Consommation gaz ($/hr)</label>
                    <input type="number" value={localSettings.gasConsumptionRate} 
                           onChange={e => handleChange('gasConsumptionRate', parseFloat(e.target.value))} 
                           onFocus={() => setActiveTip(tips.gasConsumptionRate)}
                           onBlur={() => setActiveTip(null)}
                           className="block w-full rounded-lg border-slate-300 shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200 flex flex-col md:flex-row gap-4 items-start md:items-center">
                <button 
                  onClick={() => onSave({ ...localSettings, machineHourlyRate: laserTubeOpRate, setupHourlyRate: laserTubeOpRate })} 
                  className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap"
                >
                  Enregistrer les paramètres
                </button>
                
                <AnimatePresence>
                  {activeTip && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="bg-blue-50 border border-blue-200 text-blue-800 text-sm px-4 py-3 rounded-lg shadow-sm flex-1 flex items-start gap-2"
                    >
                      <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{activeTip}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            ) : (
                <div className="p-6 bg-slate-50 text-slate-800 text-sm">
                    <h4 className="font-bold uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Logique de Calcul (Laser Tube)</h4>
                    
                    <div className="space-y-4 font-mono text-xs">
                        <section>
                            <div className="font-bold text-slate-600 mb-1">1. Temps de Coupe (Machine)</div>
                            <div className="bg-white p-3 rounded border border-slate-200">
                                <p>avance = powerkW == 12 ? laserAdvance12kW : laserAdvance6kW</p>
                                <p>tempsCoupeMinParPiece = cutLengthInches / avance</p>
                            </div>
                        </section>
                        
                        <section>
                            <div className="font-bold text-slate-600 mb-1">2. Temps de Manipulation</div>
                            <div className="bg-white p-3 rounded border border-slate-200">
                                <p>tempsManipBarres = numberOfBars * handlingTimePerBarMinutes</p>
                                <p>tempsManipPieces = handlingTimePerPartMinutes</p>
                                <p>tempsManipTotal = tempsManipBarres + tempsManipPieces</p>
                            </div>
                        </section>

                        <section>
                            <div className="font-bold text-slate-600 mb-1">3. Calcul des Coûts Individuels</div>
                            <div className="bg-white p-3 rounded border border-slate-200">
                                <p>tempsTotalOpe = tempsCoupeMinParPiece + tempsManipTotal + setupTimeMinutes</p>
                                <p>coutMachine = (tempsTotalOpe / 60) * machineHourlyRate</p>
                                <p>coutElectricite = (tempsCoupeMinParPiece / 60) * powerkW * electricityCostPerkW</p>
                                <p>coutGaz = (tempsCoupeMinParPiece / 60) * gasConsumptionRate</p>
                                <p>coutPercages = numberOfPierces * costPerPierce</p>
                                <p>coutSetup = (setupTimeMinutes / 60) * setupHourlyRate</p>
                            </div>
                        </section>
                        
                        <section>
                            <div className="font-bold text-slate-600 mb-1">4. Coût Total</div>
                            <div className="bg-white p-3 rounded border border-slate-200">
                                <p>coutTotal = coutMachine + coutElectricite + coutGaz + coutPercages + coutSetup</p>
                            </div>
                        </section>
                    </div>
                </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
