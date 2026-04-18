import React, { useState } from 'react';
import type { Client, Operation, Part, Assembly, WorkOrder, WorkOrderPart, Employee, Team, Skill, Material, NonConformity, Assignment, Quote, QuoteStatus } from './types';
import { motion } from 'motion/react';
import { Sidebar } from './components/Sidebar';
import { ShopfloorDashboard } from './components/ShopfloorDashboard';
import { EmployeeScheduleDashboard } from './components/EmployeeScheduleDashboard';
import { InboundQuotesManager } from './components/InboundQuotesManager';
import { ManagementPane } from './components/ManagementPane';
import { ExcelUpload } from './components/ExcelUpload';
import { DataMindmap } from './components/DataMindmap';
import { useProjectData } from './hooks/useProjectData';
import { ClientForm, OperationForm, PartForm, AssemblyForm, WorkOrderForm, EmployeeForm, TeamForm, SkillForm, MaterialForm, NonConformityForm, QuoteForm, SubcontractingForm, DeliveryNoteForm, InvoiceForm, SupplierForm, PurchaseForm } from './components/Forms';
import { BendingSettingsForm } from './components/BendingSettingsForm';
import { LaserSettingsForm } from './components/LaserSettingsForm';
import { CheckCircleIcon, MenuIcon, Loader2Icon, DownloadIcon, UploadIcon, ClipboardListIcon } from './components/icons';
import { Modal } from './components/Modal';
import { WorkOrderDetailsView } from './components/WorkOrderPrintView';
import { QuoteBOMView } from './components/QuoteBOMView';
import { QuoteClientView } from './components/QuoteClientView';
import { TimeSheetModule } from './components/TimeSheetModule';
import * as XLSX from 'xlsx';

type View = 'shopfloor' | 'schedule' | 'mindmap' | 'work-orders' | 'quotes' | 'timesheets' | 'parts' | 'assemblies' | 'clients' | 'operations' | 'employees' | 'teams' | 'skills' | 'materials' | 'non-conformities' | 'import' | 'settings' | 'subcontractings' | 'delivery-notes' | 'invoices' | 'purchases' | 'suppliers' | 'inbox' | 'showcase';

import { AiQuoteChatbox } from './components/AiQuoteChatbox';
import { AiQuoteGenerator } from './components/AiQuoteGenerator';
import { GeminiLiveVoice } from './components/GeminiLiveVoice';
import { AgentCommandCenter } from './components/AgentCommandCenter';
import { ShowcaseView } from './components/ShowcaseView';
import { SparklesIcon, MicIcon, TerminalIcon } from 'lucide-react';
import { AgentConfig } from './types';

const DEFAULT_AGENT_CONFIGS: AgentConfig[] = [
  {
    id: 'jarviss-live',
    name: 'Jarviss Live Voice',
    description: 'Assistant vocal en temps réel',
    systemPrompt: "Tu t'appelles Jarviss. Salue toujours Karl par son nom. Ajoute une phrase courte avec un brind'humour pour annoncer que tu es prêt et présent. Tu es un assistant expert en fabrication industrielle pour le Groupe FMI. Tu aides les utilisateurs à traiter des demandes de soumission, à analyser les pièces et à gérer l'atelier. Tu peux maintenant créer des 'Soumissions Temps-Matériel' (Budgétaires) pour des estimations rapides (ex: demandes de sucre, édulcorant, ou matériel vague sans détails techniques). Si l'utilisateur exprime un besoin sans pièces précises, propose de créer une soumission budgétaire. Tu as accès à des outils pour afficher des soumissions (view_quote), afficher des pièces (view_part), mettre à jour des statuts, ou créer une soumission budgétaire (create_budgetary_quote). Réponds de manière concise.",
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'jarviss-generator',
    name: 'Jarviss Quote Generator',
    description: 'Générateur de soumissions par fichiers ou texte',
    systemPrompt: "Tu es Jarviss, l'expert IA du Groupe FMI. Salue toujours Karl par son nom avec humour. Tu analyses des fichiers ou du texte pour créer des soumissions. Tu peux créer des Soumissions Temps-Matériel (Budgétaires). Si l'utilisateur demande un estimé rapide ou décrit des besoins vagues (ex: sucre, service), utilise isProject: true. Priorise les données DXF.",
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'jarviss-chat',
    name: 'Jarviss Text Chat',
    description: 'Chat textuel avec support vocal simple',
    systemPrompt: "Tu es Jarviss, l'expert IA du Groupe FMI. Salue toujours l'utilisateur par son nom (Karl) avec une touche d'humour. Le but est d'aider Karl à créer des soumissions, incluant des 'Soumissions Temps-Matériel' (Budgétaires). Si l'utilisateur décrit des besoins sans matériel précis (ex: beaucoup de sucre, édulcorant), crée des items avec 'type': 'project'.",
    lastUpdated: new Date().toISOString()
  }
];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('shopfloor');
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );
  
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editingOperation, setEditingOperation] = useState<Operation | null>(null);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [editingAssembly, setEditingAssembly] = useState<Assembly | null>(null);
  const [editingWorkOrder, setEditingWorkOrder] = useState<WorkOrder | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [editingNonConformity, setEditingNonConformity] = useState<NonConformity | null>(null);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [editingSubcontracting, setEditingSubcontracting] = useState<Subcontracting | null>(null);
  const [editingDeliveryNote, setEditingDeliveryNote] = useState<DeliveryNote | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [prefilledDeliveryNote, setPrefilledDeliveryNote] = useState<{ workOrderId: string } | null>(null);
  const [prefilledInvoice, setPrefilledInvoice] = useState<{ workOrderId?: string; deliveryNoteId?: string } | null>(null);
  const [isAddingNonConformity, setIsAddingNonConformity] = useState(false);
  const [detailedWorkOrder, setDetailedWorkOrder] = useState<WorkOrder | null>(null);
  const [detailedQuote, setDetailedQuote] = useState<Quote | null>(null);
  const [isClientCopyView, setIsClientCopyView] = useState(false);
  const [isAiQuoteModalOpen, setIsAiQuoteModalOpen] = useState(false);
  const [isAiChatModalOpen, setIsAiChatModalOpen] = useState(false);
  const [isAgentConfigOpen, setIsAgentConfigOpen] = useState(false);
  const [agentConfigs, setAgentConfigs] = useState<AgentConfig[]>(() => {
    const saved = localStorage.getItem('agent_configs');
    return saved ? JSON.parse(saved) : DEFAULT_AGENT_CONFIGS;
  });

  const updateAgentConfig = (config: AgentConfig) => {
    const next = agentConfigs.map(c => c.id === config.id ? config : c);
    setAgentConfigs(next);
    localStorage.setItem('agent_configs', JSON.stringify(next));
  };

  const resetAgentConfigs = () => {
    setAgentConfigs(DEFAULT_AGENT_CONFIGS);
    localStorage.setItem('agent_configs', JSON.stringify(DEFAULT_AGENT_CONFIGS));
  };

  const handleCreateBudgetaryQuote = (data: { project_name: string; items: { name: string; quantity: number; description?: string }[]; client_name?: string }) => {
    const client = clients.find(c => c.name.toLowerCase().includes(data.client_name?.toLowerCase() || '')) || clients[0];
    
    const newQuote: Omit<Quote, 'id' | 'quoteNumber'> = {
      name: data.project_name,
      clientId: client?.id || 'unknown',
      status: 'AI_Draft',
      date: new Date().toISOString().split('T')[0],
      items: data.items.map(item => ({
        type: 'project',
        id: Math.random().toString(36).slice(2, 11),
        name: item.name,
        quantity: item.quantity,
        unitPrice: 0,
        isAiGenerated: true,
        aiStatus: 'Pending'
      })),
      totalAmount: 0,
      description: data.items.map(i => `${i.name}: ${i.description || ''}`).join('; '),
      isAiGenerated: true
    };
    
    addQuote(newQuote);
    return { status: "success", message: `Soumission budgétaire (Temps-Matériel) "${data.project_name}" créée avec succès.` };
  };

  const {
    clients, operations, parts, assemblies, workOrders, employees, teams, assignments, skills, materials, nonConformities, quotes, bendingSettings, laserSettings, subcontractings, deliveryNotes, invoices, suppliers, purchases, timeEntries, inboundRequests,
    addClient, addOperation, addPart, addAssembly, addWorkOrder, addEmployee, addTeam, addSkill, addMaterial, addNonConformity, addQuote, addSubcontracting, addDeliveryNote, addInvoice, addSupplier, addPurchase, addTimeEntry, updateBendingSettings, updateLaserSettings,
    deleteClient, deleteOperation, deletePart, deleteAssembly, deleteWorkOrder, deleteEmployee, deleteTeam, deleteSkill, deleteMaterial, deleteNonConformity, deleteQuote, deleteSubcontracting, deleteDeliveryNote, deleteInvoice, deleteSupplier, deletePurchase,
    updateClient, updateOperation, updatePart, updateAssembly, updateWorkOrder, updateEmployee, updateTeam, updateSkill, updateMaterial, updateNonConformity, updateQuote, updateSubcontracting, updateDeliveryNote, updateInvoice, updateSupplier, updatePurchase, updateTimeEntry,
    updateAssignment, updateOperationAssignment, updateAssignmentObject, updateWorkOrderObject, updateAll, refreshData,
    addInboundRequest, updateInboundRequest, deleteInboundRequest,
    isLoading: isDataLoading
  } = useProjectData();

  // Debug logging
  React.useEffect(() => {
    console.log('App Data Update:', {
      workOrdersCount: workOrders.length,
      assignmentsCount: assignments.length,
      firstWorkOrderStatus: workOrders[0]?.status
    });
  }, [workOrders, assignments]);

  const handleFullExport = () => {
    const wb = XLSX.utils.book_new();
    
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(clients), 'Clients');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(suppliers), 'Suppliers');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(operations), 'Operations');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(materials), 'Materials');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(skills), 'Skills');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(parts.map(p => ({
      ...p, 
      operations: JSON.stringify(p.operations || []),
      supplierLinks: JSON.stringify(p.supplierLinks || [])
    }))), 'Parts');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(assemblies.map(a => ({
      ...a, 
      parts: JSON.stringify(a.parts || []), 
      operations: JSON.stringify(a.operations || [])
    }))), 'Assemblies');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(employees.map(e => ({...e, skills: JSON.stringify(e.skills || [])}))), 'Employees');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(teams.map(t => ({...t, employeeIds: JSON.stringify(t.employeeIds || [])}))), 'Teams');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(workOrders.map(wo => ({...wo, parts: JSON.stringify(wo.parts || [])}))), 'WorkOrders');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(assignments.map(a => ({...a, employeeIds: JSON.stringify(a.employeeIds || [])}))), 'Assignments');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(nonConformities), 'NonConformities');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(timeEntries || []), 'TimeEntries');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(quotes.map(q => ({...q, items: JSON.stringify(q.items || [])}))), 'Quotes');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(subcontractings.map(s => ({
      ...s,
      supplierLinks: JSON.stringify(s.supplierLinks || [])
    }))), 'Subcontractings');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(purchases.map(p => ({...p, items: JSON.stringify(p.items || [])}))), 'Purchases');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invoices.map(i => ({...i, items: JSON.stringify(i.items || [])}))), 'Invoices');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(deliveryNotes.map(dn => ({...dn, items: JSON.stringify(dn.items || [])}))), 'DeliveryNotes');
    
    // Settings
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([bendingSettings]), 'BendingSettings');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([laserSettings]), 'LaserSettings');

    XLSX.writeFile(wb, `ProjectData_Backup_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleFullImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      
      const parseSheet = (name: string) => {
        const ws = wb.Sheets[name];
        return ws ? XLSX.utils.sheet_to_json(ws) : [];
      };

      const safeParse = (str: unknown, defaultValue: unknown = []) => {
        if (str === undefined || str === null) return defaultValue;
        const s = String(str).trim();
        // Catch "undefined", 'undefined', undefined, "null", etc.
        if (s === '' || /^["']?undefined["']?$/i.test(s) || /^["']?null["']?$/i.test(s)) return defaultValue;
        try { 
          return typeof str === 'string' ? JSON.parse(str) : str; 
        } catch (e) { 
          console.warn('JSON parse failed for:', str, e);
          return defaultValue; 
        }
      };

      const newClients = parseSheet('Clients') as Client[];
      const newSuppliers = parseSheet('Suppliers') as Supplier[];
      const newOperations = parseSheet('Operations') as Operation[];
      const newMaterials = parseSheet('Materials') as Material[];
      const newSkills = parseSheet('Skills') as Skill[];
      const newParts = (parseSheet('Parts') as Record<string, unknown>[]).map(p => ({
        ...p, 
        operations: safeParse(p.operations),
        supplierLinks: safeParse(p.supplierLinks)
      }));
      const newAssemblies = (parseSheet('Assemblies') as Record<string, unknown>[]).map(a => ({...a, parts: safeParse(a.parts), operations: safeParse(a.operations)}));
      const newEmployees = (parseSheet('Employees') as Record<string, unknown>[]).map(e => ({...e, skills: safeParse(e.skills)}));
      const newTeams = (parseSheet('Teams') as Record<string, unknown>[]).map(t => ({...t, employeeIds: safeParse(t.employeeIds)}));
      const newWorkOrders = (parseSheet('WorkOrders') as Record<string, unknown>[]).map(wo => ({
        ...wo, 
        parts: (safeParse(wo.parts) as WorkOrderPart[]).map(p => ({ ...p, status: p.status || 'Pending' })),
        status: wo.status || 'Pending'
      })) as WorkOrder[];
      const newAssignments = (parseSheet('Assignments') as Record<string, unknown>[]).map(a => ({
        ...a, 
        employeeIds: safeParse(a.employeeIds),
        status: a.status || 'Pending'
      })) as Assignment[];
      const newNonConformities = parseSheet('NonConformities') as NonConformity[];
      const newQuotes = (parseSheet('Quotes') as Record<string, unknown>[]).map(q => ({...q, items: safeParse(q.items)})) as Quote[];
      const newSubcontractings = (parseSheet('Subcontractings') as Record<string, unknown>[]).map(s => ({
        ...s,
        supplierLinks: safeParse(s.supplierLinks)
      })) as Subcontracting[];
      const newPurchases = (parseSheet('Purchases') as Record<string, unknown>[]).map(p => ({...p, items: safeParse(p.items)})) as Purchase[];
      const newInvoices = (parseSheet('Invoices') as Record<string, unknown>[]).map(i => ({...i, items: safeParse(i.items)})) as Invoice[];
      const newDeliveryNotes = (parseSheet('DeliveryNotes') as Record<string, unknown>[]).map(dn => ({...dn, items: safeParse(dn.items)})) as DeliveryNote[];
      
      const newBendingSettings = (parseSheet('BendingSettings')[0] || bendingSettings) as BendingSettings;
      const newLaserSettings = (parseSheet('LaserSettings')[0] || laserSettings) as LaserSettings;

      await updateAll({
        clients: newClients,
        suppliers: newSuppliers,
        operations: newOperations,
        materials: newMaterials,
        skills: newSkills,
        parts: newParts,
        assemblies: newAssemblies,
        employees: newEmployees,
        teams: newTeams,
        workOrders: newWorkOrders,
        assignments: newAssignments,
        nonConformities: newNonConformities,
        quotes: newQuotes,
        subcontractings: newSubcontractings,
        purchases: newPurchases,
        invoices: newInvoices,
        deliveryNotes: newDeliveryNotes,
        bendingSettings: newBendingSettings,
        laserSettings: newLaserSettings
      });
      
      alert('Data imported successfully!');
    };
    reader.readAsBinaryString(file);
  };

  if (isDataLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2Icon className="w-10 h-10 text-fmi-red animate-spin mb-4" />
        <p className="text-slate-600 font-medium italic tracking-tight">Groupe FMI - Chargement des données...</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (currentView) {
      case 'shopfloor':
        return (
          <ShopfloorDashboard 
            workOrders={workOrders}
            assignments={assignments}
            employees={employees}
            operations={operations}
            nonConformities={nonConformities}
            timeEntries={timeEntries}
            onUpdateAssignment={updateAssignmentObject}
            onUpdateWorkOrder={updateWorkOrderObject}
            onReportNonConformity={() => {
              setIsAddingNonConformity(true);
            }}
            onViewWorkOrderDetails={(wo) => setDetailedWorkOrder(wo)}
            onAddDeliveryNote={(woId) => setPrefilledDeliveryNote({ workOrderId: woId })}
            onAddInvoice={(woId) => setPrefilledInvoice({ workOrderId: woId })}
            onRefresh={refreshData}
          />
        );
      case 'schedule':
        return (
          <EmployeeScheduleDashboard
            employees={employees}
            workOrders={workOrders}
            assignments={assignments}
            operations={operations}
            skills={skills}
            updateAssignment={updateAssignment}
          />
        );
      case 'mindmap':
        return (
          <DataMindmap
            clients={clients}
            quotes={quotes}
            workOrders={workOrders}
            deliveryNotes={deliveryNotes}
            invoices={invoices}
            purchases={purchases}
            operations={operations}
          />
        );
      case 'showcase':
        return <ShowcaseView />;
      case 'work-orders':
        return (
          <ManagementPane<WorkOrder>
            modalSize="7xl"
            title="Work Orders"
            items={workOrders}
            columns={[
              { key: 'workOrderNumber', header: 'WO#' },
              { key: 'name', header: 'Name' },
              { 
                key: 'clientId', 
                header: 'Client', 
                filterable: true,
                filterOptions: clients.map(c => ({ value: c.id, label: c.name })),
                render: (wo) => clients.find(c => c.id === wo.clientId)?.name || 'N/A' 
              },
              { 
                key: 'status', 
                header: 'Status', 
                filterable: true,
                filterOptions: [
                  { value: 'Pending', label: 'Pending' },
                  { value: 'In Progress', label: 'In Progress' },
                  { value: 'Completed', label: 'Completed' },
                  { value: 'Blocked', label: 'Blocked' }
                ],
                render: (wo) => (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  wo.status === 'Completed' ? 'bg-green-100 text-green-700' :
                  wo.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                  wo.status === 'Blocked' ? 'bg-red-100 text-red-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {wo.status || 'Pending'}
                </span>
              )},
              { key: 'startDate', header: 'Start Date' },
              { key: 'finishDate', header: 'Finish Date' },
              { key: 'deliveryNoteNumber', header: 'BDL#' },
              { key: 'invoiceNumber', header: 'INV#' },
              { key: 'parts', header: 'Parts Count', render: (wo) => (wo.parts || []).length },
            ]}
            customActions={(wo) => (
              <div className="flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPrefilledDeliveryNote({ workOrderId: wo.id });
                  }}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  title="Convert to BDL"
                >
                  <ClipboardListIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPrefilledInvoice({ workOrderId: wo.id });
                  }}
                  className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                  title="Convert to Invoice"
                >
                  <CheckCircleIcon className="w-4 h-4" />
                </button>
              </div>
            )}
            onDeleteItem={deleteWorkOrder}
            onEditItem={setEditingWorkOrder}
            onViewItem={setDetailedWorkOrder}
            renderForm={(onClose) => <WorkOrderForm clients={clients} parts={parts} assemblies={assemblies} subcontractings={subcontractings || []} onAddDeliveryNote={(dn) => { addDeliveryNote(dn); onClose(); }} onSubmit={(data) => { addWorkOrder(data); onClose(); }} onCancel={onClose} />}
          />
        );
      case 'quotes':
        return (
          <ManagementPane<Quote>
            modalSize="7xl"
            title="Soumissions"
            items={quotes}
            columns={[
              { key: 'name', header: 'Reference' },
              { 
                key: 'clientId', 
                header: 'Client', 
                filterable: true,
                filterOptions: clients.map(c => ({ value: c.id, label: c.name })),
                render: (q) => clients.find(c => c.id === q.clientId)?.name || 'N/A' 
              },
              { key: 'date', header: 'Date' },
              { 
                key: 'status', 
                header: 'Status', 
                filterable: true,
                filterOptions: [
                  { value: 'Draft', label: 'Draft' },
                  { value: 'AI_Draft', label: 'Brouillon IA' },
                  { value: 'Sent', label: 'Envoyé' },
                  { value: 'Accepted', label: 'Accepté' },
                  { value: 'Rejected', label: 'Refusé' }
                ],
                render: (q) => (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  q.status === 'Accepted' ? 'bg-green-100 text-green-700' :
                  q.status === 'Sent' ? 'bg-blue-100 text-blue-700' :
                  q.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                  q.status === 'AI_Draft' ? 'bg-purple-100 text-purple-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {q.status === 'AI_Draft' ? 'IA' : q.status}
                </span>
              )},
              { key: 'totalAmount', header: 'Total', render: (q) => `$${(q.totalAmount || 0).toFixed(2)}` },
            ]}
            onDeleteItem={deleteQuote}
            onEditItem={setEditingQuote}
            onViewItem={setDetailedQuote}
            renderHeaderActions={() => null}
            renderForm={(onClose) => (
              <QuoteForm 
                clients={clients} 
                parts={parts} 
                assemblies={assemblies} 
                materials={materials}
                operations={operations}
                subcontractings={subcontractings || []}
                suppliers={suppliers}
                bendingSettings={bendingSettings}
                laserSettings={laserSettings}
                onSubmit={(data) => { addQuote(data as Omit<Quote, 'id' | 'quoteNumber'>); onClose(); }} 
                onCancel={onClose} 
                onAddPart={async (data) => addPart(data)}
                onAddAssembly={async (data) => addAssembly(data)}
                onUpdatePart={updatePart}
                onUpdateAssembly={updateAssembly}
              />
            )}
          />
        );
      case 'inbox':
        return (
          <InboundQuotesManager 
            inboundRequests={inboundRequests || []}
            clients={clients}
            onDeleteRequest={deleteInboundRequest}
            onUpdateRequest={updateInboundRequest}
            onAddRequest={addInboundRequest}
            onAddQuote={addQuote}
            parts={parts}
            materials={materials}
            operations={operations}
          />
        );
      case 'timesheets':
        return (
          <TimeSheetModule 
            employees={employees}
            assignments={assignments}
            workOrders={workOrders}
            operations={operations}
            clients={clients}
            timeEntries={timeEntries}
            addTimeEntry={addTimeEntry}
            updateTimeEntry={updateTimeEntry}
            updateAssignment={updateAssignment}
          />
        );
      case 'settings':
        return (
          <div className="p-6 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Settings</h2>
            <div className="space-y-6">
              {bendingSettings ? (
                <BendingSettingsForm settings={bendingSettings} onSave={updateBendingSettings} />
              ) : (
                <p>Loading bending settings...</p>
              )}
              
              {laserSettings ? (
                <LaserSettingsForm settings={laserSettings} onSave={updateLaserSettings} />
              ) : (
                <p>Loading laser settings...</p>
              )}
            </div>
          </div>
        );
      case 'subcontractings':
        return (
          <ManagementPane<Subcontracting>
            modalSize="7xl"
            title="Sous-traitance"
            items={subcontractings || []}
            columns={[
              { key: 'name', header: 'Description' },
              { key: 'defaultCost', header: 'Coût par défaut', render: (s) => `$${(s.defaultCost || 0).toFixed(2)}` },
            ]}
            onDeleteItem={deleteSubcontracting}
            onEditItem={setEditingSubcontracting}
            renderForm={(onClose) => (
              <SubcontractingForm 
                workOrders={workOrders}
                quotes={quotes}
                parts={parts}
                assemblies={assemblies}
                suppliers={suppliers}
                onSubmit={(data) => { addSubcontracting(data); onClose(); }} 
                onCancel={onClose} 
              />
            )}
          />
        );
      case 'delivery-notes':
        return (
          <ManagementPane<DeliveryNote>
            modalSize="7xl"
            title="Bons de livraison"
            items={deliveryNotes || []}
            columns={[
              { key: 'deliveryNoteNumber', header: 'Numéro' },
              { key: 'workOrderId', header: 'Work Order', render: (dn) => workOrders.find(wo => wo.id === dn.workOrderId)?.workOrderNumber || dn.workOrderId },
              { key: 'date', header: 'Date' },
              { key: 'carrier', header: 'Transporteur' },
              { key: 'trackingNumber', header: 'Tracking' },
            ]}
            customActions={(dn) => (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPrefilledInvoice({ workOrderId: dn.workOrderId, deliveryNoteId: dn.id });
                }}
                className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                title="Convert to Invoice"
              >
                <CheckCircleIcon className="w-4 h-4" />
              </button>
            )}
            onDeleteItem={deleteDeliveryNote}
            onEditItem={setEditingDeliveryNote}
            renderForm={(onClose) => (
              <DeliveryNoteForm 
                workOrders={workOrders}
                parts={parts}
                assemblies={assemblies}
                onSubmit={(data) => { addDeliveryNote(data); onClose(); }} 
                onCancel={onClose} 
                onAddInvoice={(data) => { 
                  setPrefilledInvoice({ workOrderId: data.workOrderId, deliveryNoteId: data.deliveryNoteId });
                  onClose(); 
                }}
              />
            )}
          />
        );
      case 'invoices':
        return (
          <ManagementPane<Invoice>
            modalSize="7xl"
            title="Factures"
            items={invoices || []}
            columns={[
              { key: 'invoiceNumber', header: 'Numéro' },
              { key: 'workOrderId', header: 'Work Order', render: (inv) => inv.workOrderId ? (workOrders.find(wo => wo.id === inv.workOrderId)?.workOrderNumber || inv.workOrderId) : '-' },
              { key: 'deliveryNoteId', header: 'BDL', render: (inv) => inv.deliveryNoteId ? (deliveryNotes.find(dn => dn.id === inv.deliveryNoteId)?.deliveryNoteNumber || inv.deliveryNoteId) : '-' },
              { key: 'date', header: 'Date' },
              { key: 'totalAmount', header: 'Total', render: (inv) => `$${(inv.totalAmount || 0).toFixed(2)}` },
            ]}
            onDeleteItem={deleteInvoice}
            onEditItem={setEditingInvoice}
            renderForm={(onClose) => (
              <InvoiceForm 
                workOrders={workOrders}
                quotes={quotes}
                deliveryNotes={deliveryNotes}
                parts={parts}
                assemblies={assemblies}
                onSubmit={(data) => { addInvoice(data); onClose(); }} 
                onCancel={onClose} 
              />
            )}
          />
        );
      case 'purchases':
        return (
          <ManagementPane<Purchase>
            modalSize="7xl"
            title="Achats"
            items={purchases || []}
            columns={[
              { key: 'purchaseNumber', header: 'ACH#' },
              { 
                key: 'supplierId', 
                header: 'Fournisseur',
                render: (p) => suppliers.find(s => s.id === p.supplierId)?.name || 'N/A'
              },
              { 
                key: 'isSent', 
                header: 'Envoyé',
                render: (p) => p.isSent ? `Oui (${p.sentDate})` : 'Non'
              },
              { 
                key: 'isReceived', 
                header: 'Reçu',
                render: (p) => p.isReceived ? `Oui (${p.receivedDate})` : 'Non'
              },
              { key: 'totalAmount', header: 'Total', render: (p) => `$${(p.totalAmount || 0).toFixed(2)}` },
            ]}
            onDeleteItem={deletePurchase}
            onEditItem={setEditingPurchase}
            renderForm={(onClose) => (
              <PurchaseForm 
                suppliers={suppliers}
                quotes={quotes}
                workOrders={workOrders}
                materials={materials}
                parts={parts}
                subcontractings={subcontractings || []}
                onSubmit={(data) => { addPurchase(data); onClose(); }} 
                onCancel={onClose} 
              />
            )}
          />
        );
      case 'suppliers':
        return (
          <ManagementPane<Supplier>
            modalSize="7xl"
            title="Fournisseurs"
            items={suppliers || []}
            columns={[
              { key: 'name', header: 'Nom' },
              { key: 'contactEmail', header: 'Email' },
              { key: 'phone', header: 'Téléphone' },
            ]}
            onDeleteItem={deleteSupplier}
            onEditItem={setEditingSupplier}
            renderForm={(onClose) => (
              <SupplierForm 
                onSubmit={(data) => { addSupplier(data); onClose(); }} 
                onCancel={onClose} 
              />
            )}
          />
        );
      case 'parts':
        return (
          <ManagementPane<Part>
            title="Parts"
            items={parts}
            columns={[
              { key: 'name', header: 'Name' },
              { key: 'quantity', header: 'Quantity' },
              { 
                key: 'materialId', 
                header: 'Material', 
                filterable: true,
                filterOptions: materials.map(m => ({ value: m.id, label: m.description })),
                render: (part) => materials.find(m => m.id === part.materialId)?.description || 'N/A' 
              },
              { key: 'operations', header: 'Operations', render: (part) => 
                  (part.operations || []).map(op => {
                    const opDetails = operations.find(o => o.id === op.operationId);
                    return `${opDetails?.name || 'N/A'} (${op.estimatedTimeMinutes} min)`;
                  }).join(', ')
              },
            ]}
            onDeleteItem={deletePart}
            onEditItem={setEditingPart}
            modalSize="7xl"
            renderForm={(onClose) => (
              <PartForm 
                materials={materials} 
                operations={operations} 
                suppliers={suppliers}
                subcontractings={subcontractings || []} 
                bendingSettings={bendingSettings} 
                laserSettings={laserSettings} 
                onSubmit={(data) => { addPart(data); onClose(); }} 
                onCancel={onClose} 
              />
            )}
          />
        );
      case 'assemblies':
        return (
          <ManagementPane<Assembly>
            modalSize="7xl"
            title="Assemblages"
            items={assemblies}
            columns={[
              { key: 'name', header: 'Name' },
              { key: 'items', header: 'Items', render: (a) => (a.items || []).map(item => {
                  const label = item.type === 'part' 
                    ? parts.find(p => p.id === item.id)?.name 
                    : assemblies.find(subA => subA.id === item.id)?.name;
                  return `${label || 'N/A'} (x${item.quantity})`;
              }).join(', ') },
              { key: 'operations', header: 'Assembly Ops', render: (a) => (a.operations || []).map(op => operations.find(o => o.id === op.operationId)?.name || 'N/A').join(', ') },
            ]}
            onDeleteItem={deleteAssembly}
            onEditItem={setEditingAssembly}
            renderForm={(onClose) => (
              <AssemblyForm 
                parts={parts} 
                assemblies={assemblies}
                operations={operations} 
                materials={materials}
                suppliers={suppliers}
                subcontractings={subcontractings || []}
                bendingSettings={bendingSettings}
                laserSettings={laserSettings}
                onSubmit={(data) => { addAssembly(data); onClose(); }} 
                onCancel={onClose} 
                onAddPart={async (data) => addPart(data)}
                onAddAssembly={async (data) => addAssembly(data)}
              />
            )}
          />
        );
      case 'clients':
        return (
          <ManagementPane<Client>
            modalSize="7xl"
            title="Clients"
            items={clients}
            columns={[{ key: 'name', header: 'Name' }]}
            onDeleteItem={deleteClient}
            onEditItem={setEditingClient}
            renderForm={(onClose) => <ClientForm onSubmit={(data) => { addClient(data); onClose(); }} onCancel={onClose} />}
          />
        );
      case 'operations':
        return (
          <ManagementPane<Operation>
            modalSize="7xl"
            title="Operations"
            items={operations}
            columns={[
              { key: 'name', header: 'Name' },
              { key: 'rate', header: 'Hourly Rate', render: (op) => `$${(op.rate || 0).toFixed(2)}` },
            ]}
            onDeleteItem={deleteOperation}
            onEditItem={setEditingOperation}
            renderForm={(onClose) => <OperationForm skills={skills} onSubmit={(data) => { addOperation(data); onClose(); }} onCancel={onClose} />}
          />
        );
      case 'materials':
        return (
          <ManagementPane<Material>
            modalSize="7xl"
            title="Materials"
            items={materials}
            columns={[
              { key: 'description', header: 'Description' },
              { 
                key: 'type', 
                header: 'Type',
                filterable: true,
                filterOptions: Array.from(new Set(materials.map(m => m.type))).map(t => ({ value: t, label: t }))
              },
              { 
                key: 'materialType', 
                header: 'Matière',
                filterable: true,
                filterOptions: Array.from(new Set(materials.map(m => m.materialType))).map(t => ({ value: t, label: t }))
              },
              { key: 'profileDimensions', header: 'Dimensions du profilé' },
              { key: 'thickness', header: 'Épaisseur' },
              { key: 'densityLbs', header: 'Densité (lbs)' },
              { key: 'weightPerLinearFt', header: 'Poids/pied lin.' },
              { key: 'weightPerSqFt', header: 'Poids/pied sq.' },
              { key: 'costPerLb', header: 'Coutant/lb', render: (m) => `$${(m.costPerLb || 0).toFixed(2)}` },
              { key: 'costPerSqFt', header: 'Coutant/sq. ft.', render: (m) => `$${(m.costPerSqFt || 0).toFixed(2)}` },
              { key: 'costPerLinearFt', header: 'Coutant/lin. ft.', render: (m) => `$${(m.costPerLinearFt || 0).toFixed(2)}` },
              { key: 'laserAdvance6kW', header: 'Avance Laser 6kW (IPM)', render: (m) => m.laserAdvance6kW || '—' },
              { key: 'laserAdvance12kW', header: 'Avance Laser 12kW (IPM)', render: (m) => m.laserAdvance12kW || '—' },
            ]}
            onDeleteItem={deleteMaterial}
            onEditItem={setEditingMaterial}
            renderForm={(onClose) => <MaterialForm onSubmit={(data) => { addMaterial(data); onClose(); }} onCancel={onClose} />}
          />
        );
      case 'employees':
        return (
          <ManagementPane<Employee>
            modalSize="7xl"
            title="Employees"
            items={employees}
            columns={[
              { key: 'name', header: 'Name' },
              { 
                key: 'role', 
                header: 'Role',
                filterable: true,
                filterOptions: Array.from(new Set(employees.map(e => e.role))).map(r => ({ value: r, label: r }))
              },
              { key: 'skills', header: 'Skills', render: (emp) => (
                <div className="flex flex-wrap gap-1">
                  {emp.skills?.map(s => {
                    const skillInfo = skills.find(skill => skill.id === s.skillId);
                    if (!skillInfo) return null;
                    return s.certified ? (
                      <span key={s.skillId} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircleIcon className="w-4 h-4 mr-1 -ml-0.5" />
                        {skillInfo.name}
                      </span>
                    ) : (
                      <span key={s.skillId} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                        {skillInfo.name}
                      </span>
                    )
                  }) || '—'}
                </div>
              )},
            ]}
            onDeleteItem={deleteEmployee}
            onEditItem={setEditingEmployee}
            renderForm={(onClose) => <EmployeeForm skills={skills} onSubmit={(data) => { addEmployee(data); onClose(); }} onCancel={onClose} />}
          />
        );
      case 'teams':
        return (
          <ManagementPane<Team>
            modalSize="7xl"
            title="Teams"
            items={teams}
            columns={[
              { key: 'name', header: 'Name' },
              { key: 'employeeIds', header: 'Members', render: (team) => (team.employeeIds || []).map(empId => employees.find(e => e.id === empId)?.name).join(', ') || 'No members' },
            ]}
            onDeleteItem={deleteTeam}
            onEditItem={setEditingTeam}
            renderForm={(onClose) => <TeamForm employees={employees} onSubmit={(data) => { addTeam(data); onClose(); }} onCancel={onClose} />}
          />
        );
      case 'skills':
        return (
          <ManagementPane<Skill>
            modalSize="7xl"
            title="Skills"
            items={skills}
            columns={[{ key: 'name', header: 'Name' }]}
            onDeleteItem={deleteSkill}
            onEditItem={setEditingSkill}
            renderForm={(onClose) => <SkillForm onSubmit={(data) => { addSkill(data); onClose(); }} onCancel={onClose} />}
          />
        );
      case 'non-conformities':
        return (
          <ManagementPane<NonConformity>
            modalSize="7xl"
            title="Non-Conformities"
            items={nonConformities}
            columns={[
              { key: 'description', header: 'Description', render: (nc) => <p className="whitespace-normal w-48">{nc.description}</p>},
              { 
                key: 'workOrderId', 
                header: 'Work Order',
                filterable: true,
                filterOptions: workOrders.map(wo => ({ value: wo.id, label: wo.name })),
                render: (nc) => workOrders.find(wo => wo.id === nc.workOrderId)?.name || 'N/A' 
              },
              { key: 'partInstanceId', header: 'Part', render: (nc) => {
                  const wo = workOrders.find(wo => wo.id === nc.workOrderId);
                  return wo?.parts.find(p => p.instanceId === nc.partInstanceId)?.name || 'N/A';
              }},
              { key: 'operationId', header: 'Operation', render: (nc) => operations.find(o => o.id === nc.operationId)?.name || 'N/A' },
              { 
                key: 'status', 
                header: 'Status',
                filterable: true,
                filterOptions: [
                  { value: 'Open', label: 'Open' },
                  { value: 'In Review', label: 'In Review' },
                  { value: 'Resolved', label: 'Resolved' },
                  { value: 'Closed', label: 'Closed' }
                ]
              },
              { 
                key: 'severity', 
                header: 'Severity',
                filterable: true,
                filterOptions: [
                  { value: 'Low', label: 'Low' },
                  { value: 'Medium', label: 'Medium' },
                  { value: 'High', label: 'High' },
                  { value: 'Critical', label: 'Critical' }
                ]
              },
              { key: 'dateReported', header: 'Date Reported' },
            ]}
            onDeleteItem={deleteNonConformity}
            onEditItem={setEditingNonConformity}
            renderForm={(onClose) => <NonConformityForm workOrders={workOrders} operations={operations} onSubmit={(data) => { addNonConformity(data as Omit<NonConformity, 'id'>); onClose(); }} onCancel={onClose} />}
          />
        );
      case 'import':
        return (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <DownloadIcon className="w-5 h-5 text-blue-600" />
                Full System Backup
              </h2>
              <p className="text-slate-600 mb-6 text-sm">
                Download your entire database as a multi-sheet Excel workbook. This includes all clients, parts, work orders, and historical data.
              </p>
              <button
                onClick={handleFullExport}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-all font-medium"
              >
                <DownloadIcon className="w-4 h-4" />
                Export Full Workbook
              </button>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <UploadIcon className="w-5 h-5 text-green-600" />
                Full System Restore
              </h2>
              <p className="text-slate-600 mb-6 text-sm">
                Restore your entire database from a previously exported Excel workbook. <span className="text-red-600 font-medium">Warning: This will overwrite all current data.</span>
              </p>
              <label className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl transition-all font-medium cursor-pointer w-fit">
                <UploadIcon className="w-4 h-4" />
                Import Full Workbook
                <input type="file" accept=".xlsx,.xls" onChange={handleFullImport} className="hidden" />
              </label>
            </div>

            <div className="pt-8 border-t border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900 mb-6">Template-based Import</h2>
              <ExcelUpload 
                dataSources={{
                  clients,
                  operations,
                  materials,
                  skills,
                  parts,
                  employees,
                  teams,
                  nonConformities,
                  workOrders,
                  assemblies,
                  quotes
                }}
                onUpload={async (type, data) => {
                  for (const item of data as Record<string, unknown>[]) {
                    switch (type) {
                      case 'clients': await addClient(item as unknown as Omit<Client, 'id'>); break;
                      case 'operations': await addOperation({ ...item, rate: Number(item.rate) } as unknown as Omit<Operation, 'id'>); break;
                      case 'materials': {
                        const parseNum = (val: unknown): number => {
                          if (val === undefined || val === null || val === '') return 0;
                          if (typeof val === 'number') return val;
                          const s = String(val).replace(',', '.').replace(/[^-0.9.]/g, '');
                          return parseFloat(s) || 0;
                        };
                        await addMaterial({
                          description: (item['description'] as string) || '',
                          type: (item['type'] as string) || '',
                          materialType: (item['matière'] as string) || '',
                          thickness: parseNum(item['épaisseur']),
                          densityLbs: parseNum(item['densité en livres']),
                          weightPerLinearFt: parseNum(item['poids/pied linéaire']),
                          weightPerSqFt: parseNum(item['poids/pied carré']),
                          costPerLb: parseNum(item['coutant à la livre']),
                          costPerSqFt: parseNum(item['coutant au pied carré']),
                          costPerLinearFt: parseNum(item['coutant au pied linéaire']),
                          laserAdvance6kW: parseNum(item['avance laser 6kW']),
                          laserAdvance12kW: parseNum(item['avance laser 12kW'])
                        });
                        break;
                      }
                      case 'skills': await addSkill(item as unknown as Omit<Skill, 'id'>); break;
                      case 'parts': {
                        const material = materials.find(m => m.description === item.materialDescription);
                        const opNames = ((item.operationNames as string) || '').split(',').map((n: string) => n.trim());
                        const partOps = opNames
                          .map((name: string) => {
                            const op = operations.find(o => o.name === name);
                            return op ? { operationId: op.id, estimatedTimeMinutes: 60, dependencies: [], delayDays: 0 } : null;
                          })
                          .filter((op): op is { operationId: string; estimatedTimeMinutes: number; dependencies: string[]; delayDays: number } => op !== null);
                        
                        if (material) {
                          await addPart({
                            name: item.name as string,
                            materialId: material.id,
                            operations: partOps
                          });
                        }
                        break;
                      }
                      case 'employees': await addEmployee(item); break;
                      case 'teams': {
                        const employeeNames = (item.employeeNames || '').split(',').map((n: string) => n.trim());
                        const employeeIds = employeeNames
                          .map((name: string) => employees.find(e => e.name === name)?.id)
                          .filter(Boolean) as string[];
                        await addTeam({ name: item.name, employeeIds });
                        break;
                      }
                      case 'nonConformities': {
                        const wo = workOrders.find(w => w.name === item.workOrderName);
                        const part = wo?.parts.find(p => p.name === item.partName);
                        const op = operations.find(o => o.name === item.operationName);
                        
                        if (wo && part && op) {
                          await addNonConformity({
                            description: item.description,
                            workOrderId: wo.id,
                            partInstanceId: part.instanceId,
                            operationId: op.id,
                            status: item.status || 'Open',
                            severity: item.severity || 'Medium',
                            dateReported: item.dateReported || new Date().toISOString().split('T')[0],
                            actionsTaken: item.actionsTaken || ''
                          });
                        }
                        break;
                      }
                      case 'workOrders': {
                        const client = clients.find(c => c.name === item.clientName);
                        const partNames = (item.partNames || '').split(',').map((n: string) => n.trim());
                        const partItems = partNames
                          .map((name: string) => {
                            const part = parts.find(p => p.name === name);
                            return part ? { partId: part.id, quantity: 1, tempId: Math.random().toString(36).slice(2, 11), dependencies: [] } : null;
                          })
                          .filter(Boolean) as { partId: string; quantity: number; tempId: string; dependencies: string[] }[];
                        
                        if (client && partItems.length > 0) {
                          await addWorkOrder({
                            name: item.name as string,
                            clientId: client.id,
                            startDate: (item.startDate as string) || new Date().toISOString().split('T')[0],
                            partItems
                          });
                        }
                        break;
                      }
                      case 'assemblies': {
                        const partNames = ((item.partNames as string) || '').split(',').map((n: string) => n.trim());
                        const assemblyParts = partNames
                          .map((name: string) => {
                            const part = parts.find(p => p.name === name);
                            return part ? { partId: part.id, quantity: 1 } : null;
                          })
                          .filter((p): p is { partId: string; quantity: number } => p !== null);
                        
                        const opNames = ((item.operationNames as string) || '').split(',').map((n: string) => n.trim());
                        const assemblyOps = opNames
                          .map((name: string) => {
                            const op = operations.find(o => o.name === name);
                            return op ? { operationId: op.id, estimatedTimeMinutes: 60, dependencies: [], delayDays: 0 } : null;
                          })
                          .filter((op): op is { operationId: string; estimatedTimeMinutes: number; dependencies: string[]; delayDays: number } => op !== null);

                        await addAssembly({
                          name: item.name as string,
                          parts: assemblyParts,
                          operations: assemblyOps
                        });
                        break;
                      }
                      case 'quotes': {
                        const client = clients.find(c => c.name === item.clientName);
                        if (client) {
                          await addQuote({
                            name: item.name as string,
                            clientId: client.id,
                            date: (item.date as string) || new Date().toISOString().split('T')[0],
                            status: (item.status as QuoteStatus) || 'Draft',
                            items: [], // Items are complex, usually not imported via simple template
                            totalAmount: Number(item.totalAmount) || 0,
                            notes: (item.notes as string) || ''
                          });
                        }
                        break;
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-screen w-screen bg-slate-50 flex overflow-hidden">
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex-shrink-0 flex items-center px-4 sm:px-6 justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <motion.div
                animate={{ rotate: isSidebarOpen ? 90 : 0 }}
                transition={{ type: 'spring', damping: 15, stiffness: 200 }}
              >
                <MenuIcon className="w-6 h-6" />
              </motion.div>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <CheckCircleIcon className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-slate-800 hidden sm:block">Excel Data Manager</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsAgentConfigOpen(true)}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
              title="Console de commande des agents"
            >
              <TerminalIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsAiChatModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 border border-purple-200 rounded-full text-purple-700 hover:bg-purple-200 transition-colors"
            >
              <MicIcon className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Chat Vocal</span>
            </button>
            <button
              onClick={() => setIsAiQuoteModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 border border-blue-200 rounded-full text-blue-700 hover:bg-blue-200 transition-colors"
            >
              <SparklesIcon className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Soumission de Projets (IA)</span>
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-100 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-green-700 uppercase tracking-wider">Local Mode</span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F3F2F1]">
          {renderContent()}
        </main>
      </div>

      {editingClient && (
        <Modal isOpen={!!editingClient} onClose={() => setEditingClient(null)} title="Edit Client" size="7xl">
          <ClientForm
            initialData={editingClient}
            onSubmit={(data) => {
              if ('id' in data && data.id) {
                updateClient(data as Client);
              }
              setEditingClient(null);
            }}
            onCancel={() => setEditingClient(null)}
          />
        </Modal>
      )}

      {editingOperation && (
        <Modal isOpen={!!editingOperation} onClose={() => setEditingOperation(null)} title="Edit Operation" size="7xl">
          <OperationForm
            initialData={editingOperation}
            onSubmit={(data) => {
              if ('id' in data && data.id) {
                updateOperation(data as Operation);
              }
              setEditingOperation(null);
            }}
            onCancel={() => setEditingOperation(null)}
          />
        </Modal>
      )}
      
      {editingPart && (
        <Modal isOpen={!!editingPart} onClose={() => setEditingPart(null)} title="Edit Part" size="7xl">
          <PartForm
            materials={materials}
            operations={operations}
            suppliers={suppliers}
            subcontractings={subcontractings || []}
            bendingSettings={bendingSettings}
            laserSettings={laserSettings}
            initialData={editingPart}
            onSubmit={(data) => {
              if ('id' in data && data.id) {
                updatePart(data as Part);
              }
              setEditingPart(null);
            }}
            onCancel={() => setEditingPart(null)}
          />
        </Modal>
      )}

      {editingAssembly && (
        <Modal isOpen={!!editingAssembly} onClose={() => setEditingAssembly(null)} title="Edit Assembly" size="7xl">
          <AssemblyForm
            parts={parts}
            assemblies={assemblies}
            operations={operations}
            materials={materials}
            suppliers={suppliers}
            subcontractings={subcontractings || []}
            bendingSettings={bendingSettings}
            laserSettings={laserSettings}
            initialData={editingAssembly}
            onSubmit={(data) => {
              if ('id' in data && data.id) {
                updateAssembly(data as Assembly);
              }
              setEditingAssembly(null);
            }}
            onCancel={() => setEditingAssembly(null)}
          />
        </Modal>
      )}

      {editingWorkOrder && (
        <Modal 
          isOpen={!!editingWorkOrder} 
          onClose={() => setEditingWorkOrder(null)} 
          title={editingWorkOrder.id ? 'Modifier le Work Order' : ((editingWorkOrder as { quoteId?: string }).quoteId ? 'Convertir Soumission en Work Order' : 'Ajouter un Work Order')} 
          size="7xl"
        >
          <WorkOrderForm
            clients={clients}
            parts={parts}
            assemblies={assemblies}
            subcontractings={subcontractings || []}
            initialData={editingWorkOrder}
            onSubmit={(data) => {
              console.log('WorkOrderForm onSubmit triggered with data:', data);
              if ('id' in data && data.id) {
                console.log('Updating existing Work Order:', data.id);
                updateWorkOrder(data as Omit<WorkOrder, 'parts' | 'finishDate'> & { 
                  items?: WorkOrderItem[];
                  partItems?: { partId: string; quantity: number; tempId: string; dependencies: string[] }[]; 
                  assemblyId?: string;
                  status?: JobStatus;
                  subcontractingItems?: SubcontractingItem[];
                });
              } else {
                console.log('Adding new Work Order');
                addWorkOrder(data as unknown as Parameters<typeof addWorkOrder>[0]);
              }
              setEditingWorkOrder(null);
            }}
            onCancel={() => setEditingWorkOrder(null)}
          />
        </Modal>
      )}

      {editingEmployee && (
        <Modal isOpen={!!editingEmployee} onClose={() => setEditingEmployee(null)} title="Edit Employee" size="7xl">
          <EmployeeForm
            skills={skills}
            initialData={editingEmployee}
            onSubmit={(data) => {
              if ('id' in data && data.id) {
                updateEmployee(data as Employee);
              }
              setEditingEmployee(null);
            }}
            onCancel={() => setEditingEmployee(null)}
          />
        </Modal>
      )}

      {editingTeam && (
        <Modal isOpen={!!editingTeam} onClose={() => setEditingTeam(null)} title="Edit Team" size="7xl">
          <TeamForm
            employees={employees}
            initialData={editingTeam}
            onSubmit={(data) => {
              if ('id' in data && data.id) {
                updateTeam(data as Team);
              }
              setEditingTeam(null);
            }}
            onCancel={() => setEditingTeam(null)}
          />
        </Modal>
      )}
      
      {editingSkill && (
        <Modal isOpen={!!editingSkill} onClose={() => setEditingSkill(null)} title="Edit Skill" size="7xl">
          <SkillForm
            initialData={editingSkill}
            onSubmit={(data) => {
              if ('id' in data && data.id) {
                updateSkill(data as Skill);
              }
              setEditingSkill(null);
            }}
            onCancel={() => setEditingSkill(null)}
          />
        </Modal>
      )}

      {editingMaterial && (
        <Modal isOpen={!!editingMaterial} onClose={() => setEditingMaterial(null)} title="Edit Material" size="7xl">
          <MaterialForm
            initialData={editingMaterial}
            onSubmit={(data) => {
              if ('id' in data && data.id) {
                updateMaterial(data as Material);
              }
              setEditingMaterial(null);
            }}
            onCancel={() => setEditingMaterial(null)}
          />
        </Modal>
      )}

      {isAddingNonConformity && (
        <Modal isOpen={isAddingNonConformity} onClose={() => setIsAddingNonConformity(false)} title="Report Non-Conformity" size="7xl">
          <NonConformityForm 
            workOrders={workOrders}
            operations={operations}
            onSubmit={(data) => {
              addNonConformity(data);
              setIsAddingNonConformity(false);
            }}
            onCancel={() => setIsAddingNonConformity(false)}
          />
        </Modal>
      )}

      {editingNonConformity && (
        <Modal isOpen={!!editingNonConformity} onClose={() => setEditingNonConformity(null)} title="Edit Non-Conformity" size="7xl">
          <NonConformityForm
            workOrders={workOrders}
            operations={operations}
            initialData={editingNonConformity}
            onSubmit={(data) => {
              if ('id' in data && data.id) {
                updateNonConformity(data as NonConformity);
              }
              setEditingNonConformity(null);
            }}
            onCancel={() => setEditingNonConformity(null)}
          />
        </Modal>
      )}

      {editingQuote && (
        <Modal isOpen={!!editingQuote} onClose={() => setEditingQuote(null)} title="Edit Quote" size="7xl">
          <QuoteForm
            clients={clients}
            parts={parts}
            assemblies={assemblies}
            materials={materials}
            operations={operations}
            subcontractings={subcontractings || []}
            suppliers={suppliers}
            bendingSettings={bendingSettings}
            laserSettings={laserSettings}
            initialData={editingQuote}
            onSubmit={(data) => {
              if ('id' in data && data.id) {
                updateQuote(data as Quote);
              }
              setEditingQuote(null);
            }}
            onCancel={() => setEditingQuote(null)}
          />
        </Modal>
      )}

      {(editingDeliveryNote || prefilledDeliveryNote) && (
        <Modal 
          isOpen={!!editingDeliveryNote || !!prefilledDeliveryNote} 
          onClose={() => { setEditingDeliveryNote(null); setPrefilledDeliveryNote(null); }} 
          title={editingDeliveryNote ? "Edit Delivery Note" : "New Delivery Note"} 
          size="7xl"
        >
          <DeliveryNoteForm 
            workOrders={workOrders}
            parts={parts}
            assemblies={assemblies}
            initialData={editingDeliveryNote || (prefilledDeliveryNote ? { workOrderId: prefilledDeliveryNote.workOrderId } as unknown as DeliveryNote : null)}
            onSubmit={(data) => {
              if (editingDeliveryNote) {
                updateDeliveryNote({ ...editingDeliveryNote, ...data });
              } else {
                addDeliveryNote(data);
              }
              setEditingDeliveryNote(null);
              setPrefilledDeliveryNote(null);
            }}
            onCancel={() => { setEditingDeliveryNote(null); setPrefilledDeliveryNote(null); }}
            onAddInvoice={(data) => {
              setPrefilledInvoice({ workOrderId: data.workOrderId, deliveryNoteId: data.deliveryNoteId });
              setEditingDeliveryNote(null);
              setPrefilledDeliveryNote(null);
            }}
          />
        </Modal>
      )}

      {editingInvoice || prefilledInvoice ? (
        <Modal 
          isOpen={!!editingInvoice || !!prefilledInvoice} 
          onClose={() => { setEditingInvoice(null); setPrefilledInvoice(null); }} 
          title={editingInvoice ? "Edit Invoice" : "New Invoice"} 
          size="7xl"
        >
          <InvoiceForm 
            workOrders={workOrders}
            quotes={quotes}
            deliveryNotes={deliveryNotes}
            parts={parts}
            assemblies={assemblies}
            initialData={editingInvoice || (prefilledInvoice ? { workOrderId: prefilledInvoice.workOrderId, deliveryNoteId: prefilledInvoice.deliveryNoteId } as unknown as Invoice : null)}
            onSubmit={(data) => {
              if (editingInvoice) {
                updateInvoice({ ...editingInvoice, ...data });
              } else {
                addInvoice(data);
              }
              setEditingInvoice(null);
              setPrefilledInvoice(null);
            }}
            onCancel={() => { setEditingInvoice(null); setPrefilledInvoice(null); }}
          />
        </Modal>
      ) : null}

      {editingSupplier && (
        <Modal isOpen={!!editingSupplier} onClose={() => setEditingSupplier(null)} title="Edit Supplier" size="7xl">
          <SupplierForm
            initialData={editingSupplier}
            onSubmit={(data) => {
              updateSupplier({ ...editingSupplier, ...data });
              setEditingSupplier(null);
            }}
            onCancel={() => setEditingSupplier(null)}
          />
        </Modal>
      )}

      {editingPurchase && (
        <Modal isOpen={!!editingPurchase} onClose={() => setEditingPurchase(null)} title="Edit Purchase" size="7xl">
          <PurchaseForm
            suppliers={suppliers}
            quotes={quotes}
            workOrders={workOrders}
            materials={materials}
            parts={parts}
            subcontractings={subcontractings || []}
            initialData={editingPurchase}
            onSubmit={(data) => {
              updatePurchase({ ...editingPurchase, ...data });
              setEditingPurchase(null);
            }}
            onCancel={() => setEditingPurchase(null)}
          />
        </Modal>
      )}

      {editingSubcontracting && (
        <Modal isOpen={!!editingSubcontracting} onClose={() => setEditingSubcontracting(null)} title="Edit Subcontracting">
          <SubcontractingForm
            workOrders={workOrders}
            quotes={quotes}
            parts={parts}
            assemblies={assemblies}
            suppliers={suppliers}
            initialData={editingSubcontracting}
            onSubmit={(data) => {
              updateSubcontracting({ ...data, id: editingSubcontracting.id } as Subcontracting);
              setEditingSubcontracting(null);
            }}
            onCancel={() => setEditingSubcontracting(null)}
          />
        </Modal>
      )}

      {detailedWorkOrder && (
        <Modal isOpen={!!detailedWorkOrder} onClose={() => setDetailedWorkOrder(null)} title={`Work Order Details: ${detailedWorkOrder.name}`} size="4xl">
          <WorkOrderDetailsView 
            workOrder={detailedWorkOrder} 
            clients={clients}
            materials={materials}
            operations={operations} 
            employees={employees}
            assignments={assignments}
            updateAssignment={updateAssignment}
            updateOperationAssignment={updateOperationAssignment}
            onAddDeliveryNote={(woId) => {
              setPrefilledDeliveryNote({ workOrderId: woId });
              setDetailedWorkOrder(null);
            }}
            onAddInvoice={(woId) => {
              setPrefilledInvoice({ workOrderId: woId });
              setDetailedWorkOrder(null);
            }}
          />
        </Modal>
      )}

      {detailedQuote && (
        <Modal 
          isOpen={!!detailedQuote} 
          onClose={() => {
            setDetailedQuote(null);
            setIsClientCopyView(false);
          }} 
          title={isClientCopyView ? `Copie Client: ${detailedQuote.quoteNumber}` : `BOM Soumission: ${detailedQuote.name}`} 
          size="5xl"
        >
          <div className="flex flex-col h-full">
            <div className="flex border-b border-slate-200 mb-4">
              <button
                onClick={() => setIsClientCopyView(false)}
                className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${!isClientCopyView ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                Vue Interne (BOM)
              </button>
              <button
                onClick={() => setIsClientCopyView(true)}
                className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${isClientCopyView ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                Copie Client (PDF)
              </button>
            </div>

            {isClientCopyView ? (
              <QuoteClientView 
                quote={detailedQuote}
                client={clients.find(c => c.id === detailedQuote.clientId)}
                parts={parts}
                assemblies={assemblies}
                operations={operations}
                materials={materials}
                isLocked={detailedQuote.isLocked}
                onFinalize={(pdfBase64) => {
                  updateQuote({
                    ...detailedQuote,
                    isLocked: true,
                    status: 'Locked',
                    clientCopyPdf: pdfBase64
                  });
                  setDetailedQuote({
                    ...detailedQuote,
                    isLocked: true,
                    status: 'Locked',
                    clientCopyPdf: pdfBase64
                  });
                }}
              />
            ) : (
              <>
                <QuoteBOMView 
                  quote={detailedQuote}
                  parts={parts}
                  assemblies={assemblies}
                  operations={operations}
                  materials={materials}
                />
                <div className="mt-6 flex justify-between items-center">
                  <div>
                    {detailedQuote.isLocked && (
                      <button
                        onClick={() => {
                          const revisionNumber = (detailedQuote.revision || 0) + 1;
                          const baseNumber = detailedQuote.quoteNumber.split('-R')[0];
                          const newQuoteNumber = `${baseNumber}-R${revisionNumber}`;
                          
                          const newQuote: Quote = {
                            ...detailedQuote,
                            id: Math.random().toString(36).slice(2, 11),
                            quoteNumber: newQuoteNumber,
                            revision: revisionNumber,
                            status: 'Draft',
                            isLocked: false,
                            clientCopyPdf: undefined,
                            date: new Date().toISOString().split('T')[0]
                          };
                          
                          // We need to use a custom add function or update addQuote to accept a full quote
                          // For now, let's just use updateAll to add it manually
                          updateAll(prev => ({
                            ...prev,
                            quotes: [...prev.quotes, newQuote]
                          }));
                          
                          setDetailedQuote(newQuote);
                          setIsClientCopyView(false);
                        }}
                        className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 font-bold text-sm flex items-center gap-2"
                      >
                        <PlusIcon className="w-4 h-4" />
                        Créer une Révision
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setDetailedQuote(null);
                      setIsAiChatModalOpen(true);
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-bold text-sm flex items-center gap-2"
                  >
                    <MicIcon className="w-4 h-4" />
                    Reprendre la discussion
                  </button>
                  <button
                    onClick={() => {
                      setEditingWorkOrder({
                        name: `WO from Quote: ${detailedQuote.name}`,
                        clientId: detailedQuote.clientId,
                        startDate: new Date().toISOString().split('T')[0],
                        quoteItems: detailedQuote.items,
                        subcontractingItems: detailedQuote.subcontractingItems || [],
                        status: 'Pending',
                        quoteId: detailedQuote.id
                      } as unknown as WorkOrder);
                      setDetailedQuote(null);
                    }}
                    className="px-4 py-2 bg-[#0078d4] text-white rounded-md hover:bg-[#005a9e] font-medium text-sm"
                  >
                    Convertir en Work Order
                  </button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {isAiChatModalOpen && (
        <Modal 
          isOpen={isAiChatModalOpen} 
          onClose={() => setIsAiChatModalOpen(false)} 
          title="Assistant Vocal IA"
          size="2xl"
        >
          <AiQuoteChatbox 
            quoteId="new" 
            onUpdateQuote={() => {}} 
            systemPrompt={agentConfigs.find(c => c.id === 'jarviss-chat')?.systemPrompt}
          />
        </Modal>
      )}

      {isAiQuoteModalOpen && (
        <Modal 
          isOpen={isAiQuoteModalOpen} 
          onClose={() => setIsAiQuoteModalOpen(false)} 
          title="Générateur de Soumission IA"
          size="5xl"
        >
          <AiQuoteGenerator
            clients={clients}
            parts={parts}
            assemblies={assemblies}
            materials={materials}
            operations={operations}
            subcontractings={subcontractings || []}
            onAddPart={addPart}
            onQuoteGenerated={(quote) => {
              addQuote(quote);
              setIsAiQuoteModalOpen(false);
            }}
            onClose={() => setIsAiQuoteModalOpen(false)}
            systemPrompt={agentConfigs.find(c => c.id === 'jarviss-generator')?.systemPrompt}
          />
        </Modal>
      )}

      <AgentCommandCenter 
        isOpen={isAgentConfigOpen}
        onClose={() => setIsAgentConfigOpen(false)}
        configs={agentConfigs}
        onUpdateConfig={updateAgentConfig}
        onResetConfigs={resetAgentConfigs}
      />

      <GeminiLiveVoice 
        quotes={quotes}
        parts={parts}
        workOrders={workOrders}
        clients={clients}
        setDetailedQuote={setDetailedQuote}
        setDetailedWorkOrder={setDetailedWorkOrder}
        setEditingPart={setEditingPart}
        setCurrentView={setCurrentView}
        updateQuote={updateQuote}
        onCreateBudgetaryQuote={handleCreateBudgetaryQuote}
        systemInstruction={agentConfigs.find(c => c.id === 'jarviss-live')?.systemPrompt}
      />
    </div>
  );
};

export default App;
