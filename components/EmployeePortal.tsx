import React, { useState } from 'react';
import { Employee, Assignment, TimeEntry, WorkOrder, Operation, NonConformity, Client, JobStatus, Quote } from '../types';
import { UserIcon, ClockIcon, ShieldCheckIcon, ChevronRightIcon, XIcon as LogOutIcon, ClipboardListIcon, ChartBarIcon } from './icons';
import { motion } from 'motion/react';
import { ShopfloorDashboard } from './ShopfloorDashboard';
import { TimeSheetModule } from './TimeSheetModule';
import { SalesPortalView } from './SalesPortalView';

interface EmployeePortalProps {
  employees: Employee[];
  assignments: Assignment[];
  timeEntries: TimeEntry[];
  workOrders: WorkOrder[];
  skills: Skill[];
  operations: Operation[];
  nonConformities: NonConformity[];
  clients: Client[];
  quotes?: Quote[];
  onUpdateAssignment: (assignment: Assignment) => void;
  onUpdateWorkOrder: (workOrder: WorkOrder) => void;
  onReportNonConformity: () => void;
  onViewWorkOrderDetails: (workOrder: WorkOrder) => void;
  onAddDeliveryNote: (workOrderId: string) => void;
  onAddInvoice: (workOrderId: string) => void;
  onRefresh: () => void;
  onAddTimeEntry: (entry: Omit<TimeEntry, 'id'>) => void;
  onUpdateTimeEntry: (entry: TimeEntry) => void;
  onDeleteTimeEntry: (id: string) => void;
  onUpdateAssignmentFlexible: (workOrderId: string, partInstanceIds: string | string[], operationId: string, employeeIds: string[], scheduledDate?: string, status?: JobStatus, splitId?: string, isLocked?: boolean) => void;
  materials?: Material[];
  onCreateQuote?: () => void;
  onEditQuote?: (q: Quote) => void;
  onOpenVoiceChat?: () => void;
  onOpenAiQuoteGenerator?: () => void;
}

export const EmployeePortal: React.FC<EmployeePortalProps> = ({
  employees, assignments, timeEntries, workOrders, operations, nonConformities, clients, materials = [], quotes = [],
  onUpdateAssignment, onUpdateWorkOrder, onReportNonConformity, onViewWorkOrderDetails,
  onAddDeliveryNote, onAddInvoice, onRefresh, onAddTimeEntry, onUpdateTimeEntry, onUpdateAssignmentFlexible,
  onCreateQuote, onEditQuote, onOpenVoiceChat, onOpenAiQuoteGenerator
}) => {
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [authenticatedEmployeeId, setAuthenticatedEmployeeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'timesheets'>('dashboard');

  const employee = employees.find(e => e.id === authenticatedEmployeeId);

  const handleLogin = (e?: React.FormEvent) => {
    e?.preventDefault();
    const found = employees.find(e => e.id.slice(-4) === accessCode || (e.name.toLowerCase().includes(accessCode.toLowerCase()) && accessCode.length > 2));
    
    if (found) {
      setAuthenticatedEmployeeId(found.id);
      setAccessCode('');
      setError(null);
    } else {
      setError("Code invalide ou employé non trouvé.");
    }
  };

  if (!employee) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 w-full max-w-md text-center"
        >
          <div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-600">
            <UserIcon className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Portail Employé</h2>
          <p className="text-slate-500 mb-8 text-sm font-medium">Entrez votre code d'accès pour voir votre espace de travail.</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-semibold">
                {error}
              </div>
            )}
            <input 
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={accessCode}
              onChange={e => {
                setAccessCode(e.target.value);
                setError(null);
                
                // Auto-login logic if code is exactly 4 digits
                if (e.target.value.length === 4) {
                   const found = employees.find(emp => emp.id.slice(-4) === e.target.value);
                   if (found) {
                     setAuthenticatedEmployeeId(found.id);
                     setAccessCode('');
                   }
                }
              }}
              placeholder="Code (4 chiffres)"
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-center text-2xl font-black tracking-widest focus:border-indigo-500 outline-none transition-all"
              autoFocus
            />
            <button 
              type="submit"
              className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
            >
              Accéder à mon espace
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4 text-[10px] uppercase font-bold text-slate-400">
            <div className="flex flex-col items-center gap-1">
              <ShieldCheckIcon className="w-4 h-4 text-green-500" />
              Sécurisé
            </div>
            <div className="flex flex-col items-center gap-1">
              <ClockIcon className="w-4 h-4 text-blue-500" />
              Temps Réel
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Employee Mini Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          {(() => {
            const roleLower = employee?.role?.toLowerCase() || '';
            const isSales = roleLower.includes('vent') || roleLower.includes('sal') || roleLower.includes('vend');
            
            if (isSales) {
              return (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black bg-indigo-50 text-indigo-700">
                  <ChartBarIcon className="w-4 h-4" />
                  PORTAIL VENDEUR
                </div>
              );
            }
            return (
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button 
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <ClipboardListIcon className="w-4 h-4" />
                  DASHBOARD
                </button>
                <button 
                  onClick={() => setActiveTab('timesheets')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'timesheets' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <ClockIcon className="w-4 h-4" />
                  FEUILLES DE TEMPS
                </button>
              </div>
            );
          })()}
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-black text-slate-800">{employee.name}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{employee.role || 'Production'}</div>
          </div>
          <button 
            onClick={() => setAuthenticatedEmployeeId(null)}
            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
            title="Déconnexion"
          >
            <LogOutIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {(() => {
          const roleLower = employee?.role?.toLowerCase() || '';
          const isSales = roleLower.includes('vent') || roleLower.includes('sal') || roleLower.includes('vend');
          
          if (isSales) {
            return (
              <div className="h-full overflow-hidden relative">
                <SalesPortalView
                  quotes={quotes}
                  clients={clients}
                  workOrders={workOrders}
                  onCreateQuote={onCreateQuote || (() => {})}
                  onEditQuote={onEditQuote || (() => {})}
                  onOpenVoiceChat={onOpenVoiceChat || (() => {})}
                  onOpenAiQuoteGenerator={onOpenAiQuoteGenerator || (() => {})}
                />
              </div>
            );
          }

          return activeTab === 'dashboard' ? (
            <ShopfloorDashboard 
              workOrders={workOrders}
              assignments={assignments}
              employees={employees}
              operations={operations}
              nonConformities={nonConformities}
              timeEntries={timeEntries}
              onUpdateAssignment={onUpdateAssignment}
              onUpdateWorkOrder={onUpdateWorkOrder}
              onReportNonConformity={onReportNonConformity}
              onViewWorkOrderDetails={onViewWorkOrderDetails}
              onAddDeliveryNote={onAddDeliveryNote}
              onAddInvoice={onAddInvoice}
              onRefresh={onRefresh}
              materials={materials}
            />
          ) : (
            <div className="h-full p-6 overflow-y-auto custom-scrollbar">
              <TimeSheetModule 
                timeEntries={timeEntries}
                employees={employees}
                workOrders={workOrders}
                operations={operations}
                clients={clients}
                assignments={assignments}
                addTimeEntry={onAddTimeEntry as (entry: Omit<TimeEntry, 'id'>) => string}
                updateTimeEntry={onUpdateTimeEntry}
                updateAssignment={onUpdateAssignmentFlexible}
              />
            </div>
          );
        })()}
      </div>
    </div>
  );
};
