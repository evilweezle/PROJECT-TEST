import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Part, WorkOrder, Team, Material, NonConformity, Assembly, Quote } from '../types';

interface ExcelUploadProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpload: (type: string, data: any[]) => Promise<void>;
  dataSources?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any[];
  };
}

const TEMPLATES = {
  clients: {
    name: 'Clients',
    columns: ['name'],
    sample: [{ name: 'Acme Corp' }, { name: 'Global Industries' }]
  },
  operations: {
    name: 'Operations',
    columns: ['name', 'rate'],
    sample: [{ name: 'Cutting', rate: 50 }, { name: 'Welding', rate: 75 }]
  },
  materials: {
    name: 'Materials',
    columns: ['description', 'type', 'matière', 'épaisseur', 'densité en livres', 'poids/pied linéaire', 'poids/pied carré', 'coutant à la livre', 'coutant au pied carré', 'coutant au pied linéaire', 'avance laser 6kW', 'avance laser 12kW'],
    sample: [{ 
      'description': 'Acier Ga.(0.250")', 
      'type': 'Plaque', 
      'matière': 'A36', 
      'épaisseur': 0.25, 
      'densité en livres': 0.284, 
      'poids/pied linéaire': 10.2, 
      'poids/pied carré': 10.2, 
      'coutant à la livre': 0.85, 
      'coutant au pied carré': 8.67,
      'coutant au pied linéaire': 8.67,
      'avance laser 6kW': 120,
      'avance laser 12kW': 240
    }]
  },
  skills: {
    name: 'Skills',
    columns: ['name'],
    sample: [{ name: 'TIG Welding' }, { name: 'CNC Programming' }]
  },
  parts: {
    name: 'Parts',
    columns: ['name', 'materialDescription', 'operationNames'],
    sample: [{ name: 'Main Bracket', materialDescription: 'Acier Ga.(0.250")', operationNames: 'Cutting, Welding, Inspection' }]
  },
  employees: {
    name: 'Employees',
    columns: ['name', 'role'],
    sample: [{ name: 'John Doe', role: 'Senior Welder' }, { name: 'Jane Smith', role: 'Operator' }]
  },
  teams: {
    name: 'Teams',
    columns: ['name', 'employeeNames'],
    sample: [{ name: 'Team Alpha', employeeNames: 'John Doe, Jane Smith' }]
  },
  nonConformities: {
    name: 'Non-Conformities',
    columns: ['description', 'workOrderName', 'partName', 'operationName', 'status', 'severity', 'dateReported'],
    sample: [{ 
      description: 'Scratch on surface', 
      workOrderName: 'WO-1001', 
      partName: 'Main Bracket', 
      operationName: 'Cutting', 
      status: 'Open', 
      severity: 'Medium', 
      dateReported: '2024-03-26' 
    }]
  },
  workOrders: {
    name: 'Work Orders',
    columns: ['name', 'clientName', 'partNames', 'startDate'],
    sample: [{ name: 'WO-001', clientName: 'Acme Corp', partNames: 'Main Bracket, Side Panel', startDate: '2026-04-01' }]
  },
  assemblies: {
    name: 'Assemblages',
    columns: ['name', 'partNames', 'operationNames'],
    sample: [{ name: 'Main Assembly', partNames: 'Main Bracket, Side Panel', operationNames: 'Assembly, Final Inspection' }]
  },
  quotes: {
    name: 'Soumissions',
    columns: ['name', 'clientName', 'date', 'status', 'totalAmount', 'notes'],
    sample: [{ name: 'QT-001', clientName: 'Acme Corp', date: '2026-04-01', status: 'Draft', totalAmount: 1500.50, notes: 'Standard terms apply.' }]
  }
};

export const ExcelUpload: React.FC<ExcelUploadProps> = ({ onUpload, dataSources = {} }) => {
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'loading' | null, message: string }>({ type: null, message: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedType, setSelectedType] = useState<string>('clients');

  const downloadTemplate = (type: keyof typeof TEMPLATES) => {
    const template = TEMPLATES[type];
    const currentData = dataSources[type] || [];
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let dataToExport: any[];

    if (currentData.length > 0) {
      dataToExport = currentData.map(item => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: any = {};
        template.columns.forEach(col => {
          if (type === 'materials') {
            const m = item as Material;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mapping: any = {
              'description': m.description,
              'type': m.type,
              'matière': m.materialType,
              'épaisseur': m.thickness,
              'densité en livres': m.densityLbs,
              'poids/pied linéaire': m.weightPerLinearFt,
              'poids/pied carré': m.weightPerSqFt,
              'coutant à la livre': m.costPerLb,
              'coutant au pied carré': m.costPerSqFt,
              'coutant au pied linéaire': m.costPerLinearFt,
              'avance laser 6kW': m.laserAdvance6kW,
              'avance laser 12kW': m.laserAdvance12kW
            };
            mapped[col] = mapping[col];
          } else if (type === 'parts') {
            const p = item as Part;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mapping: any = {
              'name': p.name,
              'materialDescription': (dataSources['materials'] || []).find(m => m.id === p.materialId)?.description || '',
              'operationNames': (p.operations || []).map(op => (dataSources['operations'] || []).find(o => o.id === op.operationId)?.name || '').join(', ')
            };
            mapped[col] = mapping[col];
          } else if (type === 'teams') {
            const t = item as Team;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mapping: any = {
              'name': t.name,
              'employeeNames': (t.employeeIds || []).map(id => (dataSources['employees'] || []).find(e => e.id === id)?.name || '').join(', ')
            };
            mapped[col] = mapping[col];
          } else if (type === 'nonConformities') {
            const nc = item as NonConformity;
            const wo = (dataSources['workOrders'] || []).find(w => w.id === nc.workOrderId);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mapping: any = {
              'description': nc.description,
              'workOrderName': wo?.name || '',
              'partName': (wo?.parts || []).find(p => p.instanceId === nc.partInstanceId)?.name || '',
              'operationName': (dataSources['operations'] || []).find(o => o.id === nc.operationId)?.name || '',
              'status': nc.status,
              'severity': nc.severity,
              'dateReported': nc.dateReported
            };
            mapped[col] = mapping[col];
          } else if (type === 'workOrders') {
            const wo = item as WorkOrder;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mapping: any = {
              'name': wo.name,
              'clientName': (dataSources['clients'] || []).find(c => c.id === wo.clientId)?.name || '',
              'partNames': (wo.parts || []).map(p => p.name).join(', '),
              'startDate': wo.startDate
            };
            mapped[col] = mapping[col];
          } else if (type === 'assemblies') {
            const a = item as Assembly;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mapping: any = {
              'name': a.name,
              'partNames': (a.items || []).map(p => (dataSources['parts'] || []).find(part => part.id === p.id)?.name || '').join(', '),
              'operationNames': (a.operations || []).map(op => (dataSources['operations'] || []).find(o => o.id === op.operationId)?.name || '').join(', ')
            };
            mapped[col] = mapping[col];
          } else if (type === 'quotes') {
            const q = item as Quote;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mapping: any = {
              'name': q.name,
              'clientName': (dataSources['clients'] || []).find(c => c.id === q.clientId)?.name || '',
              'date': q.date,
              'status': q.status,
              'totalAmount': q.totalAmount,
              'notes': q.notes
            };
            mapped[col] = mapping[col];
          } else {
            mapped[col] = item[col];
          }
        });
        return mapped;
      });
    } else {
      dataToExport = template.sample;
    }

    const ws = XLSX.utils.json_to_sheet(dataToExport, { header: template.columns });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, template.name);
    XLSX.writeFile(wb, `${template.name}_Template.xlsx`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus({ type: 'loading', message: 'Processing file...' });

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          throw new Error('The uploaded file is empty.');
        }

        await onUpload(selectedType, data);
        setStatus({ type: 'success', message: `Successfully uploaded ${data.length} items to ${TEMPLATES[selectedType as keyof typeof TEMPLATES].name}.` });
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (error) {
        console.error('Upload error:', error);
        setStatus({ type: 'error', message: error instanceof Error ? error.message : 'Failed to process file. Please ensure it matches the template.' });
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-emerald-50 rounded-lg">
          <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Excel Data Import</h2>
          <p className="text-sm text-slate-500 text-balance">Download templates and upload your data in bulk.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Templates Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-700 uppercase tracking-wider">1. Download Templates</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(Object.keys(TEMPLATES) as Array<keyof typeof TEMPLATES>).map((type) => (
              <button
                key={type}
                onClick={() => downloadTemplate(type)}
                className="flex items-center justify-between p-3 text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors group"
              >
                <span className="text-sm font-medium text-slate-700">{TEMPLATES[type].name}</span>
                <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              </button>
            ))}
          </div>
        </div>

        {/* Upload Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-700 uppercase tracking-wider">2. Upload Data</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Select Data Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              >
                {(Object.keys(TEMPLATES) as Array<keyof typeof TEMPLATES>).map((type) => (
                  <option key={type} value={type}>{TEMPLATES[type].name}</option>
                ))}
              </select>
            </div>

            <div 
              onClick={() => fileInputRef.current?.click()}
              className="relative border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-emerald-400 hover:bg-emerald-50/30 transition-all cursor-pointer group"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx, .xls, .csv"
                className="hidden"
              />
              <Upload className="w-8 h-8 text-slate-300 group-hover:text-emerald-500 mx-auto mb-3 transition-colors" />
              <p className="text-sm font-medium text-slate-600">Click to upload or drag and drop</p>
              <p className="text-xs text-slate-400 mt-1">Excel (.xlsx, .xls) or CSV files</p>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {status.type && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`mt-6 p-4 rounded-lg flex items-start gap-3 ${
              status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
              status.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
              'bg-blue-50 text-blue-700 border border-blue-100'
            }`}
          >
            {status.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> :
             status.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> :
             <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />}
            <p className="text-sm font-medium">{status.message}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
