import React, { useState } from 'react';
import { Quote, Part, Assembly, Operation, Material } from '../types';
import { ChevronRightIcon, ChevronDownIcon, CubeIcon, LayersIcon, CogIcon } from './icons';

interface QuoteBOMViewProps {
  quote: Quote;
  parts: Part[];
  assemblies: Assembly[];
  operations: Operation[];
  materials: Material[];
}

interface BOMNodeProps {
  item: { type: 'part' | 'assembly' | 'project'; id: string; quantity: number; unitPrice?: number };
  parts: Part[];
  assemblies: Assembly[];
  operations: Operation[];
  materials: Material[];
  depth: number;
}

const BOMNode: React.FC<BOMNodeProps> = ({ item, parts, assemblies, operations, materials, depth }) => {
  const [isOpen, setIsOpen] = useState(true);

  const calculateNodeTotalTime = (node: { type: 'part' | 'assembly'; id: string; quantity: number }): number => {
    let total = 0;
    if (node.type === 'part') {
      const part = parts.find(p => p.id === node.id);
      if (part && part.operations) {
        total = part.operations.reduce((sum, op) => sum + (Number(op.estimatedTimeMinutes) || 0), 0);
      }
    } else {
      const assembly = assemblies.find(a => a.id === node.id);
      if (assembly) {
        if (assembly.operations) {
          total += assembly.operations.reduce((sum, op) => sum + (Number(op.estimatedTimeMinutes) || 0), 0);
        }
        if (assembly.items) {
          total += assembly.items.reduce((sum, sub) => sum + calculateNodeTotalTime(sub), 0);
        }
      }
    }
    return total;
  };

  const nodeTotalTime = calculateNodeTotalTime(item.type === 'project' ? { ...item, type: 'part' } : item as any);

  if (item.type === 'project') {
    return (
      <div className="flex flex-col">
        <div 
          className="flex items-center py-2 px-3 hover:bg-amber-50 border-b border-amber-100 transition-colors"
          style={{ paddingLeft: `${depth * 1.5 + 0.75}rem` }}
        >
          <div className="w-6 h-6 flex items-center justify-center mr-2 text-amber-500">
            <LayersIcon className="w-4 h-4" />
          </div>
          <div className="flex-1 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900">{item.id}</span>
              <span className="ml-2 text-[10px] text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded uppercase font-bold tracking-tight">Temps-Matériel (Budget)</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-slate-700">
                x{item.quantity}
              </div>
              {item.unitPrice !== undefined && (
                <div className="text-[10px] text-amber-600 font-bold">
                  ${item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })} /un
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (item.type === 'part') {
    const part = parts.find(p => p.id === item.id);
    if (!part) return null;
    const material = materials.find(m => m.id === part.materialId);

    return (
      <div className="flex flex-col">
        <div 
          className="flex items-center py-2 px-3 hover:bg-slate-50 border-b border-slate-100 transition-colors"
          style={{ paddingLeft: `${depth * 1.5 + 0.75}rem` }}
        >
          <div className="w-6 h-6 flex items-center justify-center mr-2 text-blue-500">
            <CubeIcon className="w-4 h-4" />
          </div>
          <div className="flex-1 flex items-center justify-between">
            <div>
              <span className="font-medium text-slate-900">{part.name}</span>
              <span className="ml-2 text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded uppercase font-bold">Piece</span>
              {material && (
                <span className="ml-2 text-xs text-slate-400 italic">({material.description})</span>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-slate-700">
                x{item.quantity}
              </div>
              {item.unitPrice !== undefined && (
                <div className="text-[10px] text-blue-600 font-bold">
                  ${item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })} /pc
                </div>
              )}
              <div className="text-[10px] text-slate-400 font-mono">
                {((nodeTotalTime || 0) * (item.quantity || 0)).toFixed(1)} min tot.
              </div>
            </div>
          </div>
        </div>
        {part.operations && part.operations.length > 0 && (
          <div className="bg-slate-50/30">
            {part.operations.map((op, idx) => {
              const opDetails = operations.find(o => o.id === op.operationId);
              const time = Number(op.estimatedTimeMinutes) || 0;
              return (
                <div 
                  key={idx} 
                  className="flex items-center py-1.5 px-3 text-[10px] text-slate-500 border-b border-slate-50/50"
                  style={{ paddingLeft: `${(depth + 1) * 1.5 + 0.75}rem` }}
                >
                  <CogIcon className="w-3 h-3 mr-2 text-slate-300" />
                  <span className="flex-1 uppercase font-medium tracking-tight">{opDetails?.name || 'Unknown Op'}</span>
                  <span className="font-mono bg-slate-100 px-1 rounded">{(time || 0).toFixed(1)} min</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const assembly = assemblies.find(a => a.id === item.id);
  if (!assembly) return null;

  return (
    <div className="flex flex-col">
      <div 
        className="flex items-center py-2 px-3 hover:bg-slate-50 border-b border-slate-100 transition-colors cursor-pointer group"
        style={{ paddingLeft: `${depth * 1.5 + 0.75}rem` }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="w-6 h-6 flex items-center justify-center mr-1 text-slate-400 group-hover:text-blue-500 transition-colors">
          {isOpen ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
        </div>
        <div className="w-6 h-6 flex items-center justify-center mr-2 text-indigo-500">
          <LayersIcon className="w-4 h-4" />
        </div>
        <div className="flex-1 flex items-center justify-between">
          <div>
            <span className="font-bold text-slate-900">{assembly.name}</span>
            <span className="ml-2 text-[10px] text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded font-bold uppercase">Assemblage</span>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-slate-700">
              x{item.quantity}
            </div>
            {item.unitPrice !== undefined && (
              <div className="text-[10px] text-indigo-600 font-bold">
                ${item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })} /pc
              </div>
            )}
            <div className="text-[10px] text-slate-400 font-mono">
              {(nodeTotalTime * item.quantity).toFixed(1)} min tot.
            </div>
          </div>
        </div>
      </div>
      
      {isOpen && (
        <>
          {assembly.operations && assembly.operations.length > 0 && (
            <div className="bg-indigo-50/10">
              {assembly.operations.map((op, idx) => {
                const opDetails = operations.find(o => o.id === op.operationId);
                const time = Number(op.estimatedTimeMinutes) || 0;
                return (
                  <div 
                    key={idx} 
                    className="flex items-center py-1.5 px-3 text-[10px] text-slate-500 border-b border-slate-50/50"
                    style={{ paddingLeft: `${(depth + 1) * 1.5 + 0.75}rem` }}
                  >
                    <CogIcon className="w-3 h-3 mr-2 text-indigo-200" />
                    <span className="flex-1 uppercase font-medium tracking-tight">{opDetails?.name || 'Unknown Op'}</span>
                    <span className="font-mono bg-indigo-50 px-1 rounded">{time.toFixed(1)} min</span>
                  </div>
                );
              })}
            </div>
          )}
          {assembly.items && assembly.items.map((subItem, idx) => (
            <BOMNode 
              key={idx} 
              item={subItem} 
              parts={parts} 
              assemblies={assemblies} 
              operations={operations} 
              materials={materials}
              depth={depth + 1} 
            />
          ))}
        </>
      )}
    </div>
  );
};

export const QuoteBOMView: React.FC<QuoteBOMViewProps> = ({ quote, parts, assemblies, operations, materials }) => {
  const operationTimes: Record<string, number> = {};

  const accumulateTimes = (item: { type: 'part' | 'assembly'; id: string; quantity: number }, multiplier: number) => {
    if (item.type === 'part') {
      const part = parts.find(p => p.id === item.id);
      if (part && part.operations) {
        part.operations.forEach(op => {
          const time = Number(op.estimatedTimeMinutes) || 0;
          operationTimes[op.operationId] = (operationTimes[op.operationId] || 0) + (time * multiplier);
        });
      }
    } else {
      const assembly = assemblies.find(a => a.id === item.id);
      if (assembly) {
        if (assembly.operations) {
          assembly.operations.forEach(op => {
            const time = Number(op.estimatedTimeMinutes) || 0;
            operationTimes[op.operationId] = (operationTimes[op.operationId] || 0) + (time * multiplier);
          });
        }
        if (assembly.items) {
          assembly.items.forEach(subItem => {
            accumulateTimes(subItem, multiplier * subItem.quantity);
          });
        }
      }
    }
  };

  if (quote.items) {
    quote.items.forEach(item => accumulateTimes(item, item.quantity));
  }

  const totalMachineTime = Object.values(operationTimes).reduce((sum, time) => sum + time, 0);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg overflow-hidden border border-slate-200 shadow-sm">
      <div className="bg-slate-50 p-4 border-b border-slate-200">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold text-slate-900">{quote.name}</h3>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
            quote.status === 'Accepted' ? 'bg-green-100 text-green-700' :
            quote.status === 'Sent' ? 'bg-blue-100 text-blue-700' :
            quote.status === 'Rejected' ? 'bg-red-100 text-red-700' :
            'bg-slate-100 text-slate-700'
          }`}>
            {quote.status}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-tight">Date</span>
            <span className="text-slate-700 font-medium">{quote.date}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-tight">Total Amount</span>
            <span className="text-blue-600 font-bold text-lg">${quote.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row">
        <div className="flex-1 border-r border-slate-200">
          <div className="bg-slate-100/50 px-4 py-2 border-b border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Structure BOM</span>
          </div>
          <div className="divide-y divide-slate-100">
            {quote.items && quote.items.length > 0 ? (
              quote.items.map((item, idx) => (
                <BOMNode 
                  key={idx} 
                  item={item} 
                  parts={parts} 
                  assemblies={assemblies} 
                  operations={operations} 
                  materials={materials}
                  depth={0} 
                />
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 italic">
                Aucun item dans cette soumission.
              </div>
            )}
          </div>
        </div>
        
        <div className="w-full lg:w-1/3 bg-slate-50 flex flex-col no-print">
          <div className="bg-slate-100/50 px-4 py-2 border-b border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Temps Machine (Est.)</span>
          </div>
          <div className="p-4 space-y-3">
            {Object.entries(operationTimes).map(([opId, time]) => {
              const op = operations.find(o => o.id === opId);
              if (!op) return null;
              return (
                <div key={opId} className="flex justify-between items-center text-sm">
                  <span className="text-slate-600 flex items-center">
                    <CogIcon className="w-4 h-4 mr-2 text-slate-400" />
                    {op.name}
                  </span>
                  <span className="font-mono font-medium text-slate-900">{(time || 0).toFixed(1)} min</span>
                </div>
              );
            })}
            {Object.keys(operationTimes).length === 0 && (
              <div className="text-sm text-slate-500 italic">Aucune opération requise.</div>
            )}
            
            {Object.keys(operationTimes).length > 0 && (
              <div className="pt-3 mt-3 border-t border-slate-200 flex justify-between items-center">
                <span className="text-sm font-bold text-slate-900">Temps Total</span>
                <span className="font-mono font-bold text-blue-600">{(totalMachineTime || 0).toFixed(1)} min</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {quote.notes && (
        <div className="p-4 bg-amber-50/30 border-t border-slate-200">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest block mb-1">Notes</span>
          <p className="text-sm text-slate-600 italic">{quote.notes}</p>
        </div>
      )}
    </div>
  );
};
