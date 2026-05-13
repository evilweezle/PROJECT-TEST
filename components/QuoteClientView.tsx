import React, { useRef } from 'react';
import { Quote, Part, Assembly, Operation, Client, Material, BendingSettings, LaserSettings, LaserTubeSettings, LaserParams, LaserTubeParams, BendingOperationParams } from '../types';
import { DownloadIcon, LockIcon } from './icons';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { calculateLaserCost, calculateLaserTubeCost } from '../lib/laserCalculator';
import { calculateBendingCost } from '../lib/bendingCalculator';

interface QuoteClientViewProps {
  quote: Quote;
  client: Client | undefined;
  parts: Part[];
  assemblies: Assembly[];
  operations: Operation[];
  materials?: Material[];
  laserSettings?: LaserSettings;
  laserTubeSettings?: LaserTubeSettings;
  bendingSettings?: BendingSettings;
  onFinalize: (pdfBase64: string) => void;
  isLocked?: boolean;
}

export const QuoteClientView: React.FC<QuoteClientViewProps> = ({ 
  quote, 
  client, 
  parts, 
  assemblies, 
  operations, 
  materials = [],
  laserSettings,
  laserTubeSettings,
  bendingSettings,
  onFinalize,
  isLocked 
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const getComputedOpTime = (op: { operationId: string; estimatedTimeMinutes?: number; laserParams?: LaserParams; laserTubeParams?: LaserTubeParams; bendingParams?: BendingOperationParams; }, quantity: number, materialId?: string) => {
    const opDef = operations.find(o => o.id === op.operationId);
    let time = Number(op.estimatedTimeMinutes) || 0;
    let cutTime = time;
    let handlingTime = 0;

    if (opDef?.name.toLowerCase().includes('laser') || opDef?.name.toLowerCase().includes('découpe')) {
        if (op.laserParams && laserSettings) {
            const material = materials.find(m => m.id === materialId);
            const res = calculateLaserCost(laserSettings, material, { ...op.laserParams, quantity });
            cutTime = res.cuttingTimeMinutes + (op.laserParams.setupTimeMinutes || 0)/quantity;
            handlingTime = (res.totalTimeMinutes - cutTime * quantity) / quantity;
            time = res.totalTimeMinutes / quantity;
        } else if (op.laserTubeParams && laserTubeSettings) {
            const material = materials.find(m => m.id === materialId);
            const res = calculateLaserTubeCost(laserTubeSettings, material, { ...op.laserTubeParams, quantity });
            cutTime = (res.cuttingTimeMinutes + (op.laserTubeParams.setupTimeMinutes || 0)/quantity); 
            handlingTime = (res.totalTimeMinutes - cutTime * quantity) / quantity;
            time = res.totalTimeMinutes / quantity;
        }
    } else if (opDef?.name.toLowerCase().includes('pliage') || opDef?.name.toLowerCase().includes('bend')) {
        if (op.bendingParams && bendingSettings) {
            const res = calculateBendingCost(bendingSettings, { ...op.bendingParams, quantity });
            time = res.totalTimeMinutes / quantity;
            cutTime = time;
        }
    }
    
    return { time, cutTime, handlingTime };
  };

  const calculateNodeTotalTime = (node: { type: 'part' | 'assembly' | 'project' | 'tm-item'; id: string; quantity: number }): number => {
    let total = 0;
    if (node.type === 'part') {
      const part = parts.find(p => p.id === node.id);
      if (part && part.operations) {
        total = part.operations.reduce((sum, op) => sum + getComputedOpTime(op, itemQuantity(part, node.quantity), part.materialId).time, 0);
      }
    } else if (node.type === 'assembly') {
      const assembly = assemblies.find(a => a.id === node.id);
      if (assembly) {
        if (assembly.operations) {
          total += assembly.operations.reduce((sum, op) => sum + getComputedOpTime(op, itemQuantity(assembly, node.quantity)).time, 0);
        }
        if (assembly.items) {
          total += assembly.items.reduce((sum, sub) => sum + calculateNodeTotalTime(sub), 0);
        }
      }
    }
    return total;
  };

  const itemQuantity = (item: { quantity?: number }, nodeQuantity: number) => {
    return (item.quantity || 1) * nodeQuantity;
  }

  const operationTimes: Record<string, { cutTime: number; handlingTime: number }> = {};
  
  const accumulateTimes = (item: { type: string; id: string; quantity: number }, nodeMultiplier: number) => {
    if (item.type === 'part') {
      const part = parts.find(p => p.id === item.id);
      if (part && part.operations) {
        part.operations.forEach(op => {
          const { cutTime, handlingTime } = getComputedOpTime(op, part.quantity, part.materialId);
          if (!operationTimes[op.operationId]) operationTimes[op.operationId] = { cutTime: 0, handlingTime: 0 };
          operationTimes[op.operationId].cutTime += cutTime * nodeMultiplier * part.quantity;
          operationTimes[op.operationId].handlingTime += handlingTime * nodeMultiplier * part.quantity;
        });
      }
    } else if (item.type === 'assembly') {
      const assembly = assemblies.find(a => a.id === item.id);
      if (assembly) {
        if (assembly.operations) {
          assembly.operations.forEach(op => {
            const { cutTime, handlingTime } = getComputedOpTime(op, assembly.quantity);
            if (!operationTimes[op.operationId]) operationTimes[op.operationId] = { cutTime: 0, handlingTime: 0 };
            operationTimes[op.operationId].cutTime += cutTime * nodeMultiplier * assembly.quantity;
            operationTimes[op.operationId].handlingTime += handlingTime * nodeMultiplier * assembly.quantity;
          });
        }
        if (assembly.items) {
          assembly.items.forEach(subItem => {
            accumulateTimes(subItem, nodeMultiplier * assembly.quantity * subItem.quantity);
          });
        }
      }
    }
  };

  if (quote.items) {
    quote.items.forEach(item => accumulateTimes(item, item.quantity));
  }

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    
    const canvas = await html2canvas(printRef.current, {
      scale: 2,
      useCORS: true,
      logging: false
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    
    if (!isLocked) {
      const pdfBase64 = pdf.output('datauristring');
      onFinalize(pdfBase64);
    }
    
    pdf.save(`${quote.quoteNumber}_Client_Copy.pdf`);
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        <div className="flex justify-between items-center no-print">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            {isLocked ? <LockIcon className="w-5 h-5 text-amber-500" /> : null}
            Aperçu de la Soumission Client
          </h2>
          <div className="flex gap-3">
            <button
              onClick={handleDownloadPdf}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-bold transition-colors shadow-sm ${
                isLocked 
                  ? 'bg-slate-600 text-white hover:bg-slate-700' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <DownloadIcon className="w-4 h-4 mr-2" />
              {isLocked ? 'Télécharger PDF' : 'Finaliser et Télécharger PDF'}
            </button>
          </div>
        </div>

        <div 
          ref={printRef}
          className="bg-white shadow-xl rounded-sm p-12 min-h-[297mm] w-full text-slate-900 font-sans"
        >
          {/* Header */}
          <div className="flex justify-between border-b-2 border-slate-900 pb-8 mb-8">
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-slate-900 mb-1">SOUMISSION</h1>
              <p className="text-xl font-bold text-slate-500">{quote.quoteNumber}</p>
              {quote.revision !== undefined && quote.revision > 0 && (
                <p className="text-sm font-bold text-fmi-red uppercase">Révision {quote.revision}</p>
              )}
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-black text-fmi-red">GROUPE FMI</h2>
              <p className="text-sm text-slate-500 italic">Mécanique industrielle & Soudure</p>
              <p className="text-sm text-slate-500 mt-2">2755, rue de l'Etchemin</p>
              <p className="text-sm text-slate-500">Lévis, QC G6W 7X5</p>
              <p className="text-sm text-slate-500">info@groupefmi.com</p>
            </div>
          </div>

          {/* Info Section */}
          <div className="grid grid-cols-2 gap-12 mb-12">
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Client</h3>
              <p className="text-lg font-bold text-slate-900">{client?.name || 'N/A'}</p>
              <p className="text-sm text-slate-600">{client?.contactPerson}</p>
              <p className="text-sm text-slate-600">{client?.email}</p>
            </div>
            <div className="text-right">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Détails</h3>
              <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Date:</span> {quote.date}</p>
              <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Validité:</span> 30 jours</p>
              <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Référence:</span> {quote.name}</p>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full mb-12">
            <thead>
              <tr className="border-b-2 border-slate-900 text-left">
                <th className="py-3 text-[10px] font-black uppercase tracking-widest text-slate-900">Description</th>
                <th className="py-3 text-[10px] font-black uppercase tracking-widest text-slate-900 text-center">Qté</th>
                <th className="py-3 text-[10px] font-black uppercase tracking-widest text-slate-900 text-center">Temps (Est.)</th>
                <th className="py-3 text-[10px] font-black uppercase tracking-widest text-slate-900 text-right">Prix Unitaire</th>
                <th className="py-3 text-[10px] font-black uppercase tracking-widest text-slate-900 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(quote.items || []).map((item, idx) => {
                const label = item.type === 'project' || item.type === 'tm-item'
                  ? (item.name || 'Temps-Matériel (Budgétaire)')
                  : (item.type === 'part' 
                    ? parts.find(p => p.id === item.id)?.name 
                    : assemblies.find(a => a.id === item.id)?.name);
                const nodeTime = calculateNodeTotalTime(item);
                return (
                  <tr key={idx} className="group">
                    <td className="py-4">
                      <p className="font-bold text-slate-900">{label}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">{item.type === 'project' || item.type === 'tm-item' ? 'Temps-Matériel' : item.type}</p>
                    </td>
                    <td className="py-4 text-center font-bold text-slate-700">{item.quantity}</td>
                    <td className="py-4 text-center font-mono text-xs text-slate-500">{(nodeTime || 0).toFixed(1)} min</td>
                    <td className="py-4 text-right font-bold text-slate-700">${(item.unitPrice || 0).toFixed(2)}</td>
                    <td className="py-4 text-right font-black text-fmi-red">${((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Operation Summary */}
          <div className="mb-12 bg-slate-50 p-6 rounded-sm border border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Sommaire des Opérations</h3>
            <div className="grid grid-cols-2 gap-x-12 gap-y-2">
              {Object.entries(operationTimes).map(([opId, times]) => {
                const op = operations.find(o => o.id === opId);
                const isHandlingSeparate = times.handlingTime > 0;
                return (
                  <React.Fragment key={opId}>
                     <div className="flex justify-between items-center text-xs border-b border-slate-200 pb-1">
                       <span className="text-slate-600 font-medium">{op?.name}</span>
                       <span className="font-mono font-bold text-slate-900">{(times.cutTime || 0).toFixed(1)} min</span>
                     </div>
                     {isHandlingSeparate && (
                       <div className="flex justify-between items-center text-xs border-b border-slate-200 pb-1 pl-4">
                         <span className="text-slate-500 italic">└ Manipulation / Changement</span>
                         <span className="font-mono font-bold text-slate-900">{(times.handlingTime || 0).toFixed(1)} min</span>
                       </div>
                     )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-12">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-bold uppercase">Sous-total</span>
                <span className="font-bold text-slate-900">${(quote.totalAmount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-bold uppercase">Taxes (14.975%)</span>
                <span className="font-bold text-slate-900">${((quote.totalAmount || 0) * 0.14975).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-4 border-t-2 border-slate-900">
                <span className="text-lg font-black uppercase tracking-tighter">Total</span>
                <span className="text-2xl font-black text-fmi-red">${((quote.totalAmount || 0) * 1.14975).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {quote.notes && (
            <div className="mb-12">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Notes & Conditions</h3>
              <p className="text-sm text-slate-600 leading-relaxed italic">{quote.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-auto pt-12 border-t border-slate-100 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Merci de votre confiance</p>
          </div>
        </div>
      </div>
    </div>
  );
};
