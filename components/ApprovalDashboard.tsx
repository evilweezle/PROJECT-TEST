import React from 'react';
import { QuoteItem } from '../types';
import { CheckIcon, XIcon } from 'lucide-react';

interface ApprovalDashboardProps {
  items: QuoteItem[];
  onApprove: (tempId: string) => void;
  onReject: (tempId: string) => void;
}

export const ApprovalDashboard: React.FC<ApprovalDashboardProps> = ({ items, onApprove, onReject }) => {
  const pendingItems = items.filter(item => item.isAiGenerated && item.aiStatus === 'Pending');

  if (pendingItems.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mt-4">
      <h3 className="text-sm font-bold text-amber-800 mb-2">Items générés par IA en attente d'approbation</h3>
      <div className="space-y-2">
        {pendingItems.map(item => (
          <div key={item.tempId} className="flex items-center justify-between bg-white p-2 rounded-lg border border-amber-100">
            <span className="text-sm text-slate-700">
              {item.type === 'part' ? 'Pièce' : 'Assemblage'} - {item.quantity} x {item.unitPrice}$
            </span>
            <div className="flex gap-2">
              <button onClick={() => onApprove(item.tempId!)} className="p-1 bg-green-100 text-green-700 rounded"><CheckIcon className="w-4 h-4" /></button>
              <button onClick={() => onReject(item.tempId!)} className="p-1 bg-red-100 text-red-700 rounded"><XIcon className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
