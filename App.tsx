import React, { useState, useEffect } from 'react';
import type { Client, Operation, Part, Assembly, WorkOrder, WorkOrderPart, Employee, Team, Skill, Material, NonConformity, Assignment, Quote, QuoteStatus } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './components/Sidebar';
import { ShopfloorDashboard } from './components/ShopfloorDashboard';
import { EmployeeScheduleDashboard } from './components/EmployeeScheduleDashboard';
import { InboundQuotesManager } from './components/InboundQuotesManager';
import { ManagementPane } from './components/ManagementPane';
import { ExcelUpload } from './components/ExcelUpload';
import { DataMindmap } from './components/DataMindmap';
import { useFirestoreData } from './hooks/useFirestoreData';
import { ClientForm, OperationForm, PartForm, AssemblyForm, WorkOrderForm, EmployeeForm, TeamForm, SkillForm, MaterialForm, NonConformityForm, QuoteForm, SubcontractingForm, DeliveryNoteForm, InvoiceForm, SupplierForm, PurchaseForm } from './components/Forms';
import { BendingSettingsForm } from './components/BendingSettingsForm';
import { LaserSettingsForm } from './components/LaserSettingsForm';
import { LaserTubeSettingsForm } from './components/LaserTubeSettingsForm';
import { TMItemsManager } from './components/TMItemsManager';
import { ProfitSettingsForm } from './components/ProfitSettingsForm';
import { CheckCircleIcon, MenuIcon, Loader2Icon, DownloadIcon, UploadIcon, ClipboardListIcon } from './components/icons';
import { Modal } from './components/Modal';
import { WorkOrderDetailsView } from './components/WorkOrderPrintView';
import { QuoteBOMView } from './components/QuoteBOMView';
import { QuoteClientView } from './components/QuoteClientView';
import { TimeSheetModule } from './components/TimeSheetModule';
import * as XLSX from 'xlsx';

type View = 'sales-director' | 'sales-portal' | 'shopfloor' | 'schedule' | 'mindmap' | 'client-portal' | 'employee-portal' | 'app-structure' | 'work-orders' | 'quotes' | 'timesheets' | 'parts' | 'assemblies' | 'tm-items' | 'clients' | 'operations' | 'employees' | 'teams' | 'skills' | 'materials' | 'non-conformities' | 'import' | 'settings' | 'subcontractings' | 'delivery-notes' | 'invoices' | 'purchases' | 'suppliers' | 'inbox' | 'showcase' | 'ia-config' | 'users' | 'production-dashboard' | 'performance-dashboard' | 'inventory';

import { AiQuoteChatbox } from './components/AiQuoteChatbox';
import { InventoryDashboard } from './components/InventoryDashboard';
import { AiQuoteGenerator } from './components/AiQuoteGenerator';
import { GeminiLiveVoice } from './components/GeminiLiveVoice';
import { AgentCommandCenter } from './components/AgentCommandCenter';
import { OutputTemplatesSettings } from './components/OutputTemplatesSettings';
import { IAConfigPage } from './components/IAConfigPage';
import { AppStructureMindmap } from './components/AppStructureMindmap';
import { ShowcaseView } from './components/ShowcaseView';
import { INDUSTRIAL_MATERIALS } from './lib/industrialMaterials';
import { SalesPortalView } from './components/SalesPortalView';
import { SalesDirectorPortalView } from './components/SalesDirectorPortalView';
import { KioskMode, EmployeeDailyView } from './components/KioskMode';
import DiagnosticLogs from './components/DiagnosticLogs';
import { SparklesIcon, MicIcon, TerminalIcon, UserIcon, Copy, LogOut as LogOutIcon } from 'lucide-react';
import { AgentConfig, WorkOrderItem, JobStatus, SubcontractingItem } from './types';
import { useAuth } from './hooks/useAuth';
import { AuthPage } from './components/AuthPage';
import { UserManagement } from './components/UserManagement';
import { ProductionDashboard } from './components/ProductionDashboard';
import { PerformanceDashboard } from './components/PerformanceDashboard';
import { ClientPortal } from './components/ClientPortal';
import { EmployeePortal } from './components/EmployeePortal';

const DEFAULT_AGENT_CONFIGS: AgentConfig[] = [
  {
    id: 'jarviss-live',
    name: 'Jarviss Live Voice',
    roleTitle: 'COMMUNICATEUR NEURONAL',
    aiIdentity: 'AI-LV-100',
    level: 4,
    xp: 3200,
    maxXp: 5000,
    precision: 96.8,
    specialty: 'Interaction vocale & Vision',
    focus: 'Gemini 2.0 Flash / Multimodal',
    description: 'Assistant vocal en temps réel capable de traiter la vision et le langage naturel avec une faible latence.',
    systemPrompt: "Tu t'appelles Jarviss. Salue toujours Karl par son nom. Ajoute une phrase courte avec un brind'humour pour annoncer que tu es prêt et présent. IMPORTANT: Tu t'exprimes exclusivement en français québécois naturel et professionnel (avec les expressions typiques du Québec). Tu es un assistant expert en fabrication industrielle pour le Groupe FMI. Tu aides les utilisateurs à traiter des demandes de soumission, à analyser les pièces et à gérer l'atelier. Tu peux maintenant créer des 'Soumissions Temps-Matériel' (Budgétaires) pour des estimations rapides (ex: demandes de sucre, édulcorant, ou matériel vague sans détails techniques). Si l'utilisateur exprime un besoin sans pièces précises, propose de créer une soumission budgétaire. Tu as accès à des outils pour afficher des soumissions (view_quote), afficher des pièces (view_part), mettre à jour des statuts, ou créer une soumission budgétaire (create_budgetary_quote). Réponds de manière concise.",
    lastUpdated: new Date().toISOString(),
    temperature: 0.7,
    voiceName: 'Puck',
    sourceCodePreview: `// GeminiLiveVoice.tsx
const client = useLiveAPI({
  model: 'models/gemini-2.0-flash-exp',
  systemInstruction: {
    parts: [{ text: systemPrompt }]
  },
  generationConfig: {
    temperature: config.temperature || 0.7,
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName: config.voiceName || 'Puck' }
      }
    }
  }
});`,
    knowledgePath: [
      { id: '1', name: 'Traitement Audio', status: 'completed' },
      { id: '2', name: 'Reconnaissance Visuelle', status: 'completed' },
      { id: '3', name: 'Synthèse Émotionnelle', status: 'ongoing' }
    ],
    expertiseMemory: [
      { id: 'e1', name: 'Echo Cancellation', description: 'Filtre les bruits de machines industrielles jusqu\'à 85dB.' }
    ]
  },
  {
    id: 'jarviss-generator',
    name: 'Jarviss Quote Generator',
    roleTitle: 'ARCHITECTE DE PRIX',
    aiIdentity: 'AI-QG-200',
    level: 5,
    xp: 4800,
    maxXp: 5000,
    precision: 99.2,
    specialty: 'Document Analysis & Extraction',
    focus: 'Gemini 2.5 Pro / Vision-To-Data',
    description: 'Expert en extraction de données à partir de plans techniques DXF/STEP et de documents PDF complexes.',
    systemPrompt: "Tu es Jarviss, l'expert IA du Groupe FMI. Salue toujours Karl avec humour. IMPORTANT: Tu rédiges tes réponses et descriptions en français québécois. Tu peux monter 2 types de soumissions: 1. STANDARDS (Pièces/Assemblages précis avec DXF/STEP, opérations et matériaux) 2. TEMPS&MATERIEL (Estimés budgétaires vagues, utilise isProject: true). Analyse les fichiers pour extraire le Client, Nom de soumission, Pièces, Quantités et identifie toute Sous-traitance requise (ex: Peinture, Galva) même si elle n'existe pas.",
    lastUpdated: new Date().toISOString(),
    temperature: 0.2,
    sourceCodePreview: `// AiQuoteGenerator.tsx
const response = await ai.models.generateContent({
  model: 'gemini-2.5-pro',
  contents: promptContents,
  config: {
    temperature: config.temperature || 0.2,
    responseMimeType: "application/json",
    systemInstruction: config.systemPrompt
  }
});`,
    knowledgePath: [
      { id: '1', name: 'Parseur DXF', status: 'completed' },
      { id: '2', name: 'Calculateur Laser', status: 'completed' },
      { id: '3', name: 'Optimisation de Nesting', status: 'ongoing' }
    ]
  },
  {
    id: 'jarviss-chat',
    name: 'Jarviss Text Chat',
    roleTitle: 'ASSISTANT ANALYTIQUE',
    aiIdentity: 'AI-CH-300',
    level: 3,
    xp: 1500,
    maxXp: 3000,
    precision: 94.1,
    specialty: 'Traitement du langage & Logique',
    focus: 'Gemini 2.5 Flash / Fast Response',
    description: 'Agent rapide pour les questions-réponses et la structuration de données textuelles.',
    systemPrompt: "Tu es Jarviss, l'expert IA du Groupe FMI. Salue toujours l'utilisateur par son nom (Karl) avec une touche d'humour. IMPORTANT: Rédige toutes tes réponses en français québécois (vocabulaire et expressions du Québec). Le but est d'aider Karl à créer des soumissions, incluant des 'Soumissions Temps-Matériel' (Budgétaires). Si l'utilisateur décrit des besoins sans matériel précis (ex: beaucoup de sucre, édulcorant), crée des items avec 'type': 'project'.",
    lastUpdated: new Date().toISOString(),
    temperature: 0.5,
    sourceCodePreview: `// AiQuoteChatbox.tsx
const chat = ai.chats.create({
  model: "gemini-2.5-flash",
  config: {
    temperature: config.temperature || 0.5,
    systemInstruction: config.systemPrompt
  }
});
const response = await chat.sendMessage({ message: text });`,
    knowledgePath: [
      { id: '1', name: 'Base Linguistique QC', status: 'completed' },
      { id: '2', name: 'Contexte FMI', status: 'completed' }
    ]
  },
  {
    id: 'jarviss-shopfloor',
    name: 'Jarviss Assistant Production',
    roleTitle: 'RÉGULATEUR D\'ATELIER',
    aiIdentity: 'AI-SF-400',
    level: 2,
    xp: 800,
    maxXp: 2000,
    precision: 92.5,
    specialty: 'Suivi Terrain & Feedback',
    focus: 'Gemini 2.0 Flash / IoT Sync',
    description: 'Support direct pour les employés, collecte de feedback et suivi des temps operatoires.',
    systemPrompt: "Tu es Jarviss, l'assistant production du Groupe FMI. Ton rôle est de saluer vocalement l'employé et de lui demander s'il veut : 1. Voir les infos de sa job, 2. Inscrire un début/arrêt de temps, 3. Ajouter des commentaires de fabrication. Si l'assignation est en dépassement de temps (ALERTE DÉPASSEMENT), tu DOIS obligatoirement demander à l'employé la raison de ce délai supplémentaire (ex: problème de machine, plan pas clair, matériel défectueux) et l'enregistrer comme feedback. Pose des questions brèves et pertinentes sur la fabrication pour enrichir le dossier (ex: 'Est-ce que le pliage a été difficile à cause du grain?', 'Y a-t-il eu des bavures excessives au laser?'). Réfère-toi aux dessins si possible. Récupère les commentaires et utilise l'outil 'add_production_feedback' pour les enregistrer. Sois concis et utilise un français québécois naturel.",
    lastUpdated: new Date().toISOString(),
    temperature: 0.5,
    voiceName: 'Puck',
    knowledgePath: [
      { id: '1', name: 'Suivi de Temps', status: 'completed' },
      { id: '2', name: 'Validation Qualité', status: 'ongoing' }
    ]
  }
];

// removed jsonData import

const App: React.FC = () => {
  const { user, profile, loading: authLoading, logout } = useAuth();
  
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [currentView, setCurrentView] = useState<View>(() => {
    if (profile?.roleLevel === 300) return 'production-dashboard';
    if (profile?.roleLevel === 201) return 'sales-director';
    if (profile?.roleLevel === 200) return 'sales-portal';
    if (profile?.roleLevel === 100) return 'client-portal';
    return 'shopfloor';
  });

  // Keep it properly synced if profile loads after mount
  useEffect(() => {
    if (profile?.roleLevel === 300 && currentView !== 'production-dashboard') {
      setTimeout(() => setCurrentView('production-dashboard'), 0);
    } else if (profile?.roleLevel === 201 && currentView !== 'sales-director') {
      setTimeout(() => setCurrentView('sales-director'), 0);
    } else if (profile?.roleLevel === 200 && currentView !== 'sales-portal') {
      setTimeout(() => setCurrentView('sales-portal'), 0);
    } else if (profile?.roleLevel === 100 && currentView !== 'client-portal') {
      setTimeout(() => setCurrentView('client-portal'), 0);
    }
  }, [profile?.roleLevel, currentView]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);
  
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
  const [isKioskOpen, setIsKioskOpen] = useState(false);
  const [currentSettingsTab, setCurrentSettingsTab] = useState<'general' | 'templates'>('general');
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [, setActiveJarvissAssignment] = useState<Assignment | null>(null);
  const [agentConfigs, setAgentConfigs] = useState<AgentConfig[]>(() => {
    const saved = localStorage.getItem('agent_configs');
    return saved ? JSON.parse(saved) : DEFAULT_AGENT_CONFIGS;
  });

  const [simulatedRole, setSimulatedRole] = useState<'admin' | 'sales-director' | 'sales' | 'shopfloor' | 'client'>('admin');

  useEffect(() => {
    setTimeout(() => {
      if (simulatedRole === 'sales-director') setCurrentView('sales-director');
      else if (simulatedRole === 'sales') setCurrentView('sales-portal');
      else if (simulatedRole === 'shopfloor') setCurrentView('shopfloor');
      else if (simulatedRole === 'client') setCurrentView('client-portal');
    }, 0);
  }, [simulatedRole]);

  const {
    clients, operations, parts, assemblies, workOrders, employees, teams, assignments, skills, materials, nonConformities, quotes, bendingSettings, laserSettings, laserTubeSettings, subcontractings, deliveryNotes, invoices, suppliers, purchases, timeEntries, inboundRequests, tmItems, profitSettings, outputTemplates,
    addClient, addOperation, addPart, addAssembly, addWorkOrder, addEmployee, addTeam, addSkill, addMaterial, addNonConformity, addQuote, addSubcontracting, addDeliveryNote, addInvoice, addSupplier, addPurchase, addTimeEntry, updateBendingSettings, updateLaserSettings, updateLaserTubeSettings, addTMItem, updateTMItem, deleteTMItem, updateProfitSettings, addOutputTemplate, updateOutputTemplate,
    deleteClient, deleteOperation, deletePart, deleteAssembly, deleteWorkOrder, deleteEmployee, deleteTeam, deleteSkill, deleteMaterial, deleteNonConformity, deleteQuote, deleteSubcontracting, deleteDeliveryNote, deleteInvoice, deleteSupplier, deletePurchase, deleteTimeEntry,
    updateClient, updateOperation, updatePart, updateAssembly, updateWorkOrder, updateEmployee, updateTeam, updateSkill, updateMaterial, updateNonConformity, updateQuote, updateSubcontracting, updateDeliveryNote, updateInvoice, updateSupplier, updatePurchase, updateTimeEntry,
    updateAssignment, updateOperationAssignment, updateAssignmentObject, updateWorkOrderObject, updateAll, refreshData,
    addInboundRequest, updateInboundRequest, deleteInboundRequest,
    isLoading: isDataLoading
  } = useFirestoreData();

  const seedIndustrialMaterials = async () => {
    if (!window.confirm(`Voulez-vous ajouter les ${INDUSTRIAL_MATERIALS.length} matériaux industriels standards ?`)) return;
    setIsActionLoading(true);
    try {
      for (const mat of INDUSTRIAL_MATERIALS) {
        await addMaterial(mat);
      }
      logService.addLog({ level: 'success', source: 'System', message: `${INDUSTRIAL_MATERIALS.length} matériaux ajoutés avec succès.` });
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'ajout des matériaux.");
    } finally {
      setIsActionLoading(false);
    }
  };
  
  React.useEffect(() => {
    const handleClose = () => setIsAiChatModalOpen(false);
    window.addEventListener('closeAiChat', handleClose);
    return () => window.removeEventListener('closeAiChat', handleClose);
  }, []);

  const toggleAssignmentTimer = React.useCallback((assignmentId: string) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) return;

    const isRunning = !!assignment.isTimerRunning;
    const now = new Date().toISOString();

    const updatedSegments = [...(assignment.timeSegments || [])];
    let totalMinutes = assignment.totalActualMinutes || 0;

    if (!isRunning) {
      // Start timer
      const newId = now.replace(/[^0-9]/g, '');
      updatedSegments.push({
        id: newId,
        startTime: now
      });
    } else {
      // Stop timer
      const lastSegmentIndex = updatedSegments.findIndex(s => !s.endTime);
      if (lastSegmentIndex !== -1) {
        const lastSegment = { ...updatedSegments[lastSegmentIndex] };
        lastSegment.endTime = now;
        const start = new Date(lastSegment.startTime).getTime();
        const end = new Date(now).getTime();
        const diffMinutes = (end - start) / (1000 * 60);
        lastSegment.durationMinutes = diffMinutes;
        updatedSegments[lastSegmentIndex] = lastSegment;
        totalMinutes += diffMinutes;
      }
    }

    updateAssignmentObject({
      ...assignment,
      isTimerRunning: !isRunning,
      timeSegments: updatedSegments,
      totalActualMinutes: totalMinutes,
      status: !isRunning ? 'In Progress' : assignment.status
    });
  }, [assignments, updateAssignmentObject]);

  const handlePunchIn = React.useCallback((employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    if (employee) {
      updateEmployee({ ...employee, punchIn: new Date().toISOString() });
    }
  }, [employees, updateEmployee]);

  const handlePunchOut = React.useCallback((employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    if (employee) {
      updateEmployee({ ...employee, punchOut: new Date().toISOString() });
    }
  }, [employees, updateEmployee]);

  const handleCompleteAssignment = React.useCallback((assignmentId: string, comment?: string, materialQuantity?: number, materialDimensions?: string, returnedToStock?: { dimension: string, location: string }) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    if (assignment) {
      updateAssignmentObject({ ...assignment, status: 'Completed' as JobStatus, completionComment: comment });

      // If material info was provided, update material stock and add production feedback
      if (materialQuantity || materialDimensions || returnedToStock) {
        let returnComment = "";
        if (returnedToStock && returnedToStock.dimension) {
           returnComment = ` | Remis en stock: ${returnedToStock.dimension} (Loc: ${returnedToStock.location || 'N/A'})`;
        }

        const wo = workOrders.find(w => w.id === assignment.workOrderId);
        if (wo) {
          const part = wo.parts.find(p => p.instanceId === assignment.partInstanceId);
          if (part && part.materialId) {
             const mat = materials.find(m => m.id === part.materialId);
             if (mat) {
               // Adjust material stock
               const deduction = materialQuantity || 1;
               updateMaterial({
                 ...mat,
                 stockQuantity: (mat.stockQuantity || 0) - deduction
               });
             }

             // Add production feedback on WorkOrderPart
             const feedback = {
               id: Math.random().toString(36).slice(2, 11),
               employeeId: assignment.employeeIds[0], // simplified
               date: new Date().toISOString(),
               comment: (comment || 'Action: Consommation de matériel') + returnComment,
               operationId: assignment.operationId,
               partInstanceId: assignment.partInstanceId,
               materialConsumedQuantity: materialQuantity,
               materialConsumedDimensions: materialDimensions
             };
             const newPart = { ...part, productionFeedback: [...(part.productionFeedback || []), feedback] };
             updateWorkOrderObject({ ...wo, parts: wo.parts.map(p => p.instanceId === part.instanceId ? newPart : p) });
          }
        }
      }
    }
    // Trigger manager review if needed
  }, [assignments, workOrders, materials, updateAssignmentObject, updateMaterial, updateWorkOrderObject]);

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
    console.log("Creating budgetary quote:", data);
    const detectedName = data.client_name?.trim();
    const client = detectedName 
      ? clients.find(c => c.name.toLowerCase().includes(detectedName.toLowerCase())) 
      : null;
    
    const newQuote: Omit<Quote, 'id' | 'quoteNumber'> = {
      name: data.project_name,
      clientId: client?.id || (clients.length > 0 ? clients[0].id : 'unknown'),
      status: 'AI_Draft',
      date: new Date().toISOString().split('T')[0],
      items: (data.items || []).map(item => ({
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
    console.log("Budgetary quote added:", newQuote);
    setCurrentView('quotes');
    return { status: "success", message: `Soumission budgétaire (Temps-Matériel) "${data.project_name}" créée avec succès.` };
  };

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

  const handleAddProductionFeedback = (feedback: {
    workOrderId: string;
    employeeId: string;
    operationId: string;
    partInstanceId: string;
    comment: string;
  }) => {
    const wo = workOrders.find(w => w.id === feedback.workOrderId);
    if (!wo) return { status: 'error', message: 'Work Order not found' };
    
    const updatedWo = { ...wo };
    const newFeedback = {
      id: Math.random().toString(36).slice(2, 11),
      employeeId: feedback.employeeId,
      operationId: feedback.operationId,
      partInstanceId: feedback.partInstanceId,
      comment: feedback.comment,
      timestamp: new Date().toISOString()
    };
    
    if (updatedWo.items) {
      updatedWo.items = updatedWo.items.map(item => {
        if (item.tempId === feedback.partInstanceId || item.id === feedback.partInstanceId) {
          return {
            ...item,
            productionFeedback: [...(item.productionFeedback || []), newFeedback]
          };
        }
        return item;
      });
    }

    if (updatedWo.parts) {
      updatedWo.parts = updatedWo.parts.map(part => {
        if (part.instanceId === feedback.partInstanceId) {
          return {
            ...part,
            productionFeedback: [...(part.productionFeedback || []), newFeedback]
          };
        }
        return part;
      });
    }

    updateWorkOrder(updatedWo);
    return { status: 'success', message: 'Commentaire enregistré avec succès.' };
  };

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
      case 'sales-director':
        return (
          <SalesDirectorPortalView
            quotes={quotes}
            clients={clients}
            workOrders={workOrders}
            onCreateQuote={() => setEditingQuote({} as Quote)}
            onEditQuote={(q) => setEditingQuote(q)}
            onOpenVoiceChat={() => setIsVoiceChatOpen(true)}
            onOpenAiQuoteGenerator={() => setIsAiQuoteGenOpen(true)}
          />
        );
      case 'sales-portal':
        return (
          <SalesPortalView
            quotes={quotes}
            clients={clients}
            workOrders={workOrders}
            onCreateQuote={() => setEditingQuote({} as Quote)}
            onEditQuote={(q) => setEditingQuote(q)}
            onOpenVoiceChat={() => setIsAiChatModalOpen(true)}
            onOpenAiQuoteGenerator={() => setIsAiQuoteModalOpen(true)}
          />
        );
      case 'app-structure':
        return <AppStructureMindmap />;
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
                filterOptions: (clients || []).map(c => ({ value: c.id, label: c.name })),
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
            renderForm={(onClose) => <WorkOrderForm 
              clients={clients} 
              parts={parts} 
              assemblies={assemblies} 
              subcontractings={subcontractings || []} 
              onAddDeliveryNote={(dn) => { addDeliveryNote(dn); onClose(); }} 
              onSubmit={async (data) => { 
                // Material availability check
                const missingMaterials: { materialId: string, needed: number, stock: number }[] = [];
                data.parts?.forEach(wp => {
                  let isMissing = false;
                  if (wp.materialId) {
                    const mat = materials.find(m => m.id === wp.materialId);
                    if (mat) {
                      const needed = wp.quantity || 1;
                      if ((mat.stockQuantity || 0) < needed) {
                        isMissing = true;
                        const existing = missingMaterials.find(m => m.materialId === mat.id);
                        if (existing) existing.needed += needed;
                        else missingMaterials.push({ materialId: mat.id, needed, stock: mat.stockQuantity || 0 });
                      }
                    }
                  }
                  
                  // Mark operations as blocked if missing materials
                  if (isMissing && wp.operations) {
                    wp.operations.forEach(op => {
                      op.status = 'Blocked';
                      op.blockedReason = 'Manque de matériel';
                    });
                    wp.status = 'Blocked';
                    data.status = 'Blocked'; // Also mark the whole WO as Blocked
                  }
                });

                await addWorkOrder(data); 

                if (missingMaterials.length > 0) {
                  const items = missingMaterials.map(mm => ({
                     type: 'material' as const,
                     id: mm.materialId,
                     quantity: mm.needed - mm.stock,
                     unitPrice: materials.find(m => m.id === mm.materialId)?.costPerLb || 0
                  }));
                  // Generate an alert or automatic purchase requisition
                  await addPurchase({
                    purchaseNumber: `REQ-${Date.now().toString().slice(-6)}`,
                    supplierId: suppliers[0]?.id || 'supplier-placeholder',
                    items,
                    isSent: false,
                    isReceived: false,
                    totalAmount: 0 // Placeholder
                  });
                  alert("Work order partially blocked: Purchase requisition generated for missing materials.");
                }

                // Promote draft items used in this work order
                const itemIds = data.quoteItems?.map(i => i.id) || [];
                for (const itemId of itemIds) {
                  const p = parts.find(part => part.id === itemId);
                  if (p?.isClientDraft) {
                    await updatePart({ ...p, isClientDraft: false });
                  }
                  const a = assemblies.find(ass => ass.id === itemId);
                  if (a?.isClientDraft) {
                    await updateAssembly({ ...a, isClientDraft: false });
                  }
                }
                onClose(); 
              }} 
              onCancel={onClose} 
            />}
          />
        );
      case 'quotes':
        return (
          <ManagementPane<Quote>
            modalSize="full"
            title="Soumissions"
            items={quotes}
            columns={[
              { key: 'name', header: 'Reference' },
              { 
                key: 'clientId', 
                header: 'Client', 
                filterable: true,
                filterOptions: (clients || []).map(c => ({ value: c.id, label: c.name })),
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
                tmItems={tmItems}
                profitSettings={profitSettings}
                materials={materials}
                operations={operations}
                subcontractings={subcontractings || []}
                suppliers={suppliers}
                bendingSettings={bendingSettings}
                laserSettings={laserSettings}
                laserTubeSettings={laserTubeSettings}
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
          <div className="flex flex-col h-full overflow-hidden">
            <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-800">Paramètres Système</h2>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button 
                  onClick={() => setCurrentSettingsTab('general')}
                  className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${currentSettingsTab === 'general' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                   GÉNÉRAL
                </button>
                <button 
                  onClick={() => setCurrentSettingsTab('templates')}
                  className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${currentSettingsTab === 'templates' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  MODÈLES OUTPUT
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              {currentSettingsTab === 'general' ? (
                <div className="p-6 max-w-4xl mx-auto overflow-y-auto h-full space-y-6">
                  {bendingSettings ? (
                    <BendingSettingsForm settings={bendingSettings} operations={operations} onSave={updateBendingSettings} />
                  ) : (
                    <p>Loading bending settings...</p>
                  )}
                  
                  {laserSettings ? (
                    <>
                      <LaserSettingsForm settings={laserSettings} operations={operations} onSave={updateLaserSettings} />
                      <LaserTubeSettingsForm settings={laserTubeSettings} operations={operations} onSave={updateLaserTubeSettings} />
                    </>
                  ) : (
                    <p>Loading laser settings...</p>
                  )}
                  
                  {profitSettings ? (
                    <ProfitSettingsForm settings={profitSettings} onSave={updateProfitSettings} />
                  ) : (
                    <p>Loading profit settings...</p>
                  )}
                </div>
              ) : (
                <OutputTemplatesSettings 
                  templates={outputTemplates || []}
                  onAddTemplate={addOutputTemplate}
                  onUpdateTemplate={updateOutputTemplate}
                />
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
      case 'tm-items':
        return (
          <TMItemsManager
            items={tmItems || []}
            materials={materials}
            operations={operations}
            subcontractings={subcontractings || []}
            suppliers={suppliers || []}
            clients={clients}
            profitSettings={profitSettings}
            onAdd={addTMItem}
            onUpdate={updateTMItem}
            onDelete={deleteTMItem}
          />
        );
      case 'parts':
        return (
          <ManagementPane<Part>
            title="Parts"
            items={parts.filter(p => !p.isClientDraft)}
            columns={[
              { key: 'name', header: 'Name' },
              { 
                key: 'ownerId', 
                header: 'Client', 
                filterable: true,
                filterOptions: [{value: "generic", label: "Générique (Sans client)"}, ...clients.map(c => ({ value: c.id, label: c.name }))],
                render: (part) => clients.find(c => c.id === part.ownerId)?.name || 'Générique' 
              },
              { 
                key: 'materialId', 
                header: 'Material', 
                filterable: true,
                filterOptions: (materials || []).map(m => ({ value: m.id, label: m.description })),
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
                clients={clients}
                materials={materials} 
                operations={operations} 
                suppliers={suppliers}
                subcontractings={subcontractings || []} 
                bendingSettings={bendingSettings} 
                laserSettings={laserSettings} 
                laserTubeSettings={laserTubeSettings}
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
            items={assemblies.filter(a => !a.isClientDraft)}
            columns={[
              { key: 'name', header: 'Name' },
              { 
                key: 'ownerId', 
                header: 'Client', 
                filterable: true,
                filterOptions: [{value: "generic", label: "Générique (Sans client)"}, ...clients.map(c => ({ value: c.id, label: c.name }))],
                render: (assembly) => clients.find(c => c.id === assembly.ownerId)?.name || 'Générique' 
              },
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
                clients={clients}
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
            columns={[
              { key: 'name', header: 'Name' },
              { key: 'tier', header: 'Catégorie', render: (c) => c.tier === 'AdvantagePlus' ? 'Avantage+' : 'Régulier' },
              { key: 'points', header: 'Points' },
              { key: 'totalSubmissions', header: 'Soumissions Portail' },
            ]}
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
      case 'inventory':
        return (
          <InventoryDashboard
            materials={materials}
            parts={parts}
            assemblies={assemblies}
            onOpenMaterials={() => setCurrentView('materials')}
            onOpenParts={() => setCurrentView('parts')}
          />
        );
      case 'materials':
        return (
          <ManagementPane<Material>
            alwaysShowFilters={true}
            modalSize="7xl"
            title="Materials"
            items={materials}
            columns={[
              { 
                key: 'description', 
                header: 'Description',
                filterable: true,
              },
              { 
                key: 'type', 
                header: 'Type',
                filterable: true,
                filterOptions: Array.from(new Set((materials || []).map(m => m.type))).map(t => ({ value: t, label: t }))
              },
              { 
                key: 'materialType', 
                header: 'Matière',
                filterable: true,
                filterOptions: Array.from(new Set((materials || []).map(m => m.materialType))).map(t => ({ value: t, label: t }))
              },
              { key: 'profileDimensions', header: 'Dimensions du profilé', filterable: true },
              { key: 'thickness', header: 'Épaisseur', filterable: true },
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
            renderHeaderActions={() => (
              <button
                onClick={seedIndustrialMaterials}
                disabled={isActionLoading}
                className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-sm hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {isActionLoading ? <Loader2Icon className="w-4 h-4 mr-2 animate-spin" /> : <UploadIcon className="w-4 h-4 mr-2" />}
                Seed Standards
              </button>
            )}
            renderForm={(onClose) => <MaterialForm onSubmit={(data) => { addMaterial(data); onClose(); }} onCancel={onClose} />}
            customActions={(item) => (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const { id, ...rest } = item;
                  addMaterial({ ...rest, description: rest.description + " (copy)" });
                }}
                className="p-1.5 text-[#0078D4] hover:bg-blue-50 rounded-md transition-colors"
                title="Duplicate"
              >
                <Copy className="w-4 h-4" />
              </button>
            )}
          />
        );
      case 'employees':
        return (
          <ManagementPane<Employee>
            modalSize="7xl"
            title="Employees"
            items={employees}
            columns={[
              { key: 'employeeNumber', header: 'Code' },
              { key: 'name', header: 'Name' },
              { 
                key: 'role', 
                header: 'Role',
                filterable: true,
                filterOptions: Array.from(new Set((employees || []).map(e => e.role))).map(r => ({ value: r, label: r }))
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
                filterOptions: (workOrders || []).map(wo => ({ value: wo.id, label: wo.name })),
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
      case 'ia-config':
        return (
          <IAConfigPage
            configs={agentConfigs}
            onUpdateConfig={updateAgentConfig}
            onResetConfigs={resetAgentConfigs}
          />
        );
      case 'users':
        if (profile?.roleLevel !== undefined && profile.roleLevel >= 499) {
          return <UserManagement />;
        }
        return <div className="p-8 text-red-500 font-bold">Accès refusé</div>;
      case 'production-dashboard':
        return <ProductionDashboard />;
      case 'performance-dashboard':
        if (profile && profile.roleLevel >= 400) {
          return <PerformanceDashboard 
            employees={employees}
            assignments={assignments}
            timeEntries={timeEntries}
            workOrders={workOrders}
            nonConformities={nonConformities}
          />;
        }
        return <div className="p-8 text-red-500 font-bold">Accès refusé</div>;
      case 'client-portal':
        return (
          <ClientPortal 
            clients={clients} 
            parts={parts} 
            assemblies={assemblies} 
            tmItems={tmItems || []}
            materials={materials} 
            operations={operations}
            suppliers={suppliers}
            subcontractings={subcontractings}
            bendingSettings={bendingSettings}
            laserSettings={laserSettings}
            quotes={quotes}
            onAddQuote={addQuote}
            onUpdateQuote={updateQuote}
            onAddPart={addPart}
            onAddAssembly={addAssembly}
          />
        );
      case 'employee-portal':
        return (
          <EmployeePortal 
            employees={employees}
            assignments={assignments}
            timeEntries={timeEntries}
            workOrders={workOrders}
            skills={skills}
            operations={operations}
            nonConformities={nonConformities}
            clients={clients}
            materials={materials}
            quotes={quotes}
            onUpdateAssignment={updateAssignmentObject}
            onUpdateWorkOrder={updateWorkOrderObject}
            onReportNonConformity={() => setIsAddingNonConformity(true)}
            onViewWorkOrderDetails={(wo) => setDetailedWorkOrder(wo)}
            onAddDeliveryNote={(woId) => setPrefilledDeliveryNote({ workOrderId: woId })}
            onAddInvoice={(woId) => setPrefilledInvoice({ workOrderId: woId })}
            onRefresh={refreshData}
            onAddTimeEntry={addTimeEntry}
            onUpdateTimeEntry={updateTimeEntry}
            onDeleteTimeEntry={deleteTimeEntry}
            onUpdateAssignmentFlexible={updateAssignment}
            onCreateQuote={() => setEditingQuote({} as Quote)}
            onEditQuote={(q) => setEditingQuote(q)}
            onOpenVoiceChat={() => setIsAiChatModalOpen(true)}
            onOpenAiQuoteGenerator={() => setIsAiQuoteModalOpen(true)}
          />
        );
      default:
        return null;
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen w-screen bg-slate-50 flex items-center justify-center">
        <Loader2Icon className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  if (profile?.roleLevel === 0) {
    return (
      <div className="h-screen w-screen bg-slate-50 flex items-center justify-center flex-col p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4 text-slate-800">Compte en attente</h2>
          <p className="text-slate-600 mb-6">Votre profil a été créé mais nécessite l'approbation d'un administrateur avant de pouvoir accéder à l'application.</p>
          <p className="text-sm text-slate-500">Veuillez contacter votre gestionnaire.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-slate-50 flex overflow-hidden">
      <AnimatePresence>
        {isKioskOpen && (
          <KioskMode 
            key="kiosk-mode"
            employees={employees}
            assignments={assignments}
            workOrders={workOrders}
            operations={operations}
            onLogin={(emp) => {
              setCurrentEmployee(emp);
              setIsKioskOpen(false);
            }}
            onClose={() => setIsKioskOpen(false)}
          />
        )}

        {currentEmployee && (
          (() => {
            const roleLower = currentEmployee.role?.toLowerCase() || '';
            const isSales = roleLower.includes('vent') || roleLower.includes('sal') || roleLower.includes('vend');

            if (isSales) {
              return (
                <motion.div 
                  key="sales-portal-view" 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-slate-100 z-[100] flex flex-col overflow-hidden"
                >
                  <div className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm shrink-0">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                        <UserIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{currentEmployee.name}</div>
                        <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider">PORTAIL VENDEUR</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setCurrentEmployee(null)} 
                      className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-700 rounded-lg text-sm font-bold transition-all border border-slate-200 hover:border-red-200 shadow-sm"
                    >
                      <XIcon className="w-4 h-4" /> Déconnexion
                    </button>
                  </div>
                  <div className="flex-1 overflow-hidden relative flex">
                    <SalesPortalView
                      quotes={quotes}
                      clients={clients}
                      workOrders={workOrders}
                      onCreateQuote={() => setEditingQuote({} as Quote)}
                      onEditQuote={(q) => setEditingQuote(q)}
                      onOpenVoiceChat={() => setIsVoiceChatOpen(true)}
                      onOpenAiQuoteGenerator={() => setIsAiQuoteGenOpen(true)}
                    />
                  </div>
                </motion.div>
              );
            }

            return (
              <EmployeeDailyView 
                key="employee-daily-view"
                employee={currentEmployee}
                assignments={assignments}
                workOrders={workOrders}
                operations={operations}
                onLogout={() => setCurrentEmployee(null)}
                onPunchIn={handlePunchIn}
                onPunchOut={handlePunchOut}
                onToggleAssignmentTimer={toggleAssignmentTimer}
                onCompleteAssignment={handleCompleteAssignment}
                onOpenJarviss={(a) => {
                  setActiveJarvissAssignment(a);
                  const instruction = agentConfigs.find(c => c.id === 'jarviss-shopfloor')?.systemPrompt || "Assistant Production";
                  
                  // Budget info injection
                  const wo = workOrders.find(w => w.id === a.workOrderId);
                  const part = wo?.parts.find(p => p.instanceId === a.partInstanceId);
                  const op = operations.find(o => o.id === a.operationId);
                  const partOp = part?.operations.find(pop => pop.operationId === a.operationId);
                  const estimate = a.estimatedMinutes || partOp?.estimatedTimeMinutes || 0;
                  const actual = a.totalActualMinutes || 0;
                  const isOverBudget = actual > estimate && estimate > 0;
                  const budgetInfo = isOverBudget 
                    ? `ATTENTION: ALERTE DÉPASSEMENT. Temps prévu: ${estimate} min, Temps actuel: ${actual.toFixed(1)} min. TU DOIS DEMANDER LA RAISON.`
                    : `Budget: ${estimate} min, Actuel: ${actual.toFixed(1)} min.`;

                  window.dispatchEvent(new CustomEvent('openGeminiLive', { 
                    detail: { 
                      autoStart: true, 
                      instruction: `${instruction}. L'employé actuel est ${currentEmployee.name}. Le bon de travail est ${wo?.workOrderNumber}. L'opération est ${op?.name}. ${budgetInfo}. L'ID de l'employé est ${currentEmployee.id}. L'ID du WO est ${a.workOrderId}. L'ID de l'instance de pièce est ${a.partInstanceId}. L'ID de l'opération est ${a.operationId}.`
                    } 
                  }));
                }}
              />
            );
          })()
        )}
      </AnimatePresence>
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen}
        profile={profile}
        simulatedRole={simulatedRole}
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

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-4">
              {profile?.roleLevel === 500 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-bold text-slate-500">Vue:</span>
                  <select
                    value={simulatedRole}
                    onChange={e => setSimulatedRole(e.target.value as Parameters<typeof setSimulatedRole>[0])}
                    className="text-sm rounded border-slate-200 py-1 bg-white font-medium text-slate-700 shadow-sm"
                  >
                    <option value="admin">Administrateur (Tout)</option>
                    <option value="sales-director">Directeur des ventes (201)</option>
                    <option value="sales">Vendeur (200)</option>
                    <option value="shopfloor">Shopfloor</option>
                    <option value="client">Client Portal</option>
                  </select>
                </div>
              )}
              <button
                onClick={() => setIsKioskOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-full text-slate-600 hover:bg-slate-200 transition-colors shrink-0"
              >
                <UserIcon className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Accès Rapide</span>
              </button>
              <button
                onClick={() => setIsAgentConfigOpen(true)}
                className="p-2 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                title="Console de commande des agents"
              >
                <TerminalIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsAiQuoteModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 border border-blue-200 rounded-full text-blue-700 hover:bg-blue-200 transition-colors shrink-0"
              >
                <SparklesIcon className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Soumission IA</span>
              </button>
            </div>

            {/* Mobile Actions Dropdown */}
            <div className="lg:hidden relative">
              <button 
                onClick={(e) => {
                  const target = e.currentTarget;
                  const menu = target.nextElementSibling as HTMLElement;
                  if (menu) {
                    menu.classList.toggle('hidden');
                  }
                }}
                className="p-2 bg-white text-slate-600 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
              <div className="hidden absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-2">
                {profile?.roleLevel === 500 && (
                  <div className="px-4 py-2 border-b border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Vue simulée</span>
                    <select
                      value={simulatedRole}
                      onChange={e => {
                        setSimulatedRole(e.target.value as Parameters<typeof setSimulatedRole>[0]);
                        (e.currentTarget.parentElement?.parentElement as HTMLElement)?.classList.add('hidden');
                      }}
                      className="w-full text-sm rounded border border-slate-200 py-1.5 px-2 bg-white font-medium text-slate-700 shadow-sm"
                    >
                      <option value="admin">Administrateur</option>
                      <option value="sales-director">Directeur des ventes</option>
                      <option value="sales">Vendeur</option>
                      <option value="shopfloor">Shopfloor</option>
                      <option value="client">Client Portal</option>
                    </select>
                  </div>
                )}
                <button
                  onClick={(e) => { setIsKioskOpen(true); (e.currentTarget.parentElement as HTMLElement)?.classList.add('hidden'); }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 text-slate-700 font-medium text-sm flex items-center gap-3 border-b border-slate-100"
                >
                  <UserIcon className="w-4 h-4 text-slate-500" />
                  Accès Rapide
                </button>
                <button
                  onClick={(e) => { setIsAgentConfigOpen(true); (e.currentTarget.parentElement as HTMLElement)?.classList.add('hidden'); }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 text-slate-700 font-medium text-sm flex items-center gap-3 border-b border-slate-100"
                >
                  <TerminalIcon className="w-4 h-4 text-slate-500" />
                  Console CMD Agents
                </button>
                {/* Vocal removed as requested */}
                <button
                  onClick={(e) => { setIsAiQuoteModalOpen(true); (e.currentTarget.parentElement as HTMLElement)?.classList.add('hidden'); }}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 text-blue-700 font-medium text-sm flex items-center gap-3"
                >
                  <SparklesIcon className="w-4 h-4" />
                  Soumission IA assistée
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 border-l-2 border-slate-200 pl-3 sm:pl-4">
              <div className="flex flex-col justify-center text-right hidden lg:flex">
                <div className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">{profile?.displayName || 'Sans nom'}</div>
                <div className="text-[10px] text-slate-500 font-mono leading-tight">Niveau {profile?.roleLevel}</div>
              </div>
              <button
                onClick={logout}
                className="text-xs text-red-600 font-bold hover:underline bg-red-50 px-2 py-1.5 rounded transition-colors"
                title="Déconnexion"
              >
                <span className="hidden sm:inline">Déconnexion</span>
                <span className="inline sm:hidden"><LogOutIcon className="w-4 h-4" /></span>
              </button>
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
              } else {
                addClient(data as Omit<Client, 'id'>);
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
              } else {
                addOperation(data as Omit<Operation, 'id'>);
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
            clients={clients}
            materials={materials}
            operations={operations}
            suppliers={suppliers}
            subcontractings={subcontractings || []}
            bendingSettings={bendingSettings}
            laserSettings={laserSettings}
            laserTubeSettings={laserTubeSettings}
            initialData={editingPart}
            onSubmit={(data) => {
              if ('id' in data && data.id) {
                updatePart(data as Part);
              } else {
                addPart(data as Omit<Part, 'id'>);
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
            clients={clients}
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
              } else {
                addAssembly(data as Omit<Assembly, 'id'>);
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
              } else {
                addEmployee(data as Omit<Employee, 'id'>);
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
              } else {
                addTeam(data as Omit<Team, 'id'>);
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
              } else {
                addSkill(data as Omit<Skill, 'id'>);
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
              } else {
                addMaterial(data as Omit<Material, 'id'>);
              }
              setEditingMaterial(null);
            }}
            onDuplicate={(data) => {
              addMaterial(data);
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
              } else {
                addNonConformity(data as Omit<NonConformity, 'id'>);
              }
              setEditingNonConformity(null);
            }}
            onCancel={() => setEditingNonConformity(null)}
          />
        </Modal>
      )}

      {editingQuote && (
        <Modal isOpen={!!editingQuote} onClose={() => setEditingQuote(null)} title="Edit Quote" size="full">
          <QuoteForm
            clients={clients}
            parts={parts}
            assemblies={assemblies}
            tmItems={tmItems}
            profitSettings={profitSettings}
            materials={materials}
            operations={operations}
            subcontractings={subcontractings || []}
            suppliers={suppliers}
            bendingSettings={bendingSettings}
            laserSettings={laserSettings}
            laserTubeSettings={laserTubeSettings}
            initialData={editingQuote.id ? editingQuote : null}
            onSubmit={(data) => {
              if ('id' in data && data.id) {
                updateQuote(data as Quote);
              } else {
                addQuote(data as Omit<Quote, 'id' | 'quoteNumber'>);
              }
              setEditingQuote(null);
            }}
            onCancel={() => setEditingQuote(null)}
            onAddPart={async (data) => addPart(data)}
            onAddAssembly={async (data) => addAssembly(data)}
            onUpdatePart={updatePart}
            onUpdateAssembly={updateAssembly}
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
          size="full"
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
                laserSettings={laserSettings}
                laserTubeSettings={laserTubeSettings}
                bendingSettings={bendingSettings}
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
                  tmItems={tmItems}
                  laserSettings={laserSettings}
                  laserTubeSettings={laserTubeSettings}
                  bendingSettings={bendingSettings}
                />
                <div className="mt-6 flex justify-between items-center">
                  <div className="flex gap-2">
                    {detailedQuote.source === 'client_portal' && !detailedQuote.qualityScore && (
                      <button
                        onClick={() => {
                          const score = window.prompt("Évaluez la soumission du client (0 à 100) selon la qualité des données :");
                          if (score !== null) {
                            const numericScore = parseInt(score);
                            if (!isNaN(numericScore) && numericScore >= 0 && numericScore <= 100) {
                              updateQuote({ ...detailedQuote, qualityScore: numericScore });
                              const c = clients.find(cl => cl.id === detailedQuote.clientId);
                              if (c) {
                                const earnedPoints = numericScore >= 80 ? 50 : numericScore >= 50 ? 10 : -20;
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                updateClient({ ...c, points: Math.max(0, (c.points || 0) + earnedPoints), totalSubmissions: (c.totalSubmissions || 0) + 1 } as any);
                                alert(`Soumission évaluée. Client ${earnedPoints >= 0 ? 'gagne' : 'perd'} ${Math.abs(earnedPoints)} points.`);
                              }
                            } else {
                              alert("Score invalide. Doit être entre 0 et 100.");
                            }
                          }
                        }}
                        className="px-4 py-2 bg-indigo-500 text-white rounded font-bold text-sm shadow animate-pulse hover:bg-indigo-600 transition-colors"
                      >
                        Évaluer (Portail Client)
                      </button>
                    )}
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
          size="full"
          hideHeader={true}
        >
          <AiQuoteChatbox 
            quoteId="new" 
            onUpdateQuote={(suggestions: unknown[]) => {
              if (!suggestions || !Array.isArray(suggestions)) return;
              
              interface Suggestion { type?: string; name: string; quantity?: number; unitPrice?: number; estimatedMinutes?: number; }
              
              updateAll(prev => {
                const newParts: Part[] = [];
                const quoteItems: QuoteItem[] = (suggestions as Suggestion[]).map((s) => {
                  if (s.type === 'part') {
                    const newId = Math.random().toString(36).slice(2, 11);
                    newParts.push({
                      id: newId,
                      name: s.name,
                      quantity: s.quantity || 1,
                      operations: [],
                      isAiGenerated: true
                    } as Part);
                    return {
                      type: 'part',
                      id: newId,
                      quantity: s.quantity || 1,
                      unitPrice: s.unitPrice || 0,
                      isAiGenerated: true,
                      aiStatus: 'Approved'
                    } as QuoteItem;
                  }
                  return {
                    type: 'project',
                    id: Math.random().toString(36).slice(2, 11),
                    name: s.name,
                    quantity: s.quantity || 1,
                    unitPrice: s.unitPrice || 0,
                    isAiGenerated: true
                  } as QuoteItem;
                });
                
                // Quote calculation logic
                const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '');
                const prefix = `GEM-${dateStr}-`;
                const todayPrefix = prefix;
                
                const todayQuotes = prev.quotes.filter(q => q.quoteNumber?.startsWith(todayPrefix));
                const nextNumber = (todayQuotes.length + 1).toString().padStart(2, '0');
                const quoteNumber = `${todayPrefix}${nextNumber}`;
                
                const newQuote: Quote = {
                  id: Math.random().toString(36).slice(2, 11),
                  quoteNumber: quoteNumber,
                  name: `Soumission Jarviss - ${new Date().toLocaleDateString()}`,
                  clientId: (prev.clients.length > 0 ? prev.clients[0].id : 'unknown'),
                  status: 'AI_Draft',
                  date: new Date().toISOString().split('T')[0],
                  items: quoteItems,
                  totalAmount: quoteItems.reduce((acc, item) => acc + ((item.unitPrice || 0) * (item.quantity || 1)), 0),
                  description: `Généré par Jarviss assisté par Karl.`,
                  isAiGenerated: true
                };

                return {
                    parts: [...prev.parts, ...newParts],
                    quotes: [...prev.quotes, newQuote]
                };
              });

              // logService.addLog({ level: 'success', source: 'AiChat', message: `Soumission créée et pièces enregistrées.` });
              alert(`La soumission a été créée et les pièces ont été ajoutées à la base de données !`);
              setIsAiChatModalOpen(false);
            }} 
            systemPrompt={agentConfigs.find(c => c.id === 'jarviss-chat')?.systemPrompt}
            temperature={agentConfigs.find(c => c.id === 'jarviss-chat')?.temperature}
          />
        </Modal>
      )}

      {isAiQuoteModalOpen && (
        <Modal 
          isOpen={isAiQuoteModalOpen} 
          onClose={() => setIsAiQuoteModalOpen(false)} 
          title="Générateur de Soumission IA"
          size="full"
          hideHeader={true}
        >
          <AiQuoteGenerator
            clients={clients}
            parts={parts}
            assemblies={assemblies}
            materials={materials}
            operations={operations}
            subcontractings={subcontractings || []}
            onAddPart={addPart}
            onAddSubcontracting={addSubcontracting}
            onQuoteGenerated={async (quote) => {
              const id = await addQuote(quote);
              setIsAiQuoteModalOpen(false);
              // To open the quote, we need the full object. 
              // We can construct it with the ID we just got.
              // We don't have the quoteNumber yet (assigned by Firestore trigger or just not in Omit), 
              // but detailed view can handle it or show 'Pending'.
              setDetailedQuote({ ...quote, id, quoteNumber: '...' } as Quote);
              setCurrentView('quotes');
            }}
            onClose={() => setIsAiQuoteModalOpen(false)}
            systemPrompt={agentConfigs.find(c => c.id === 'jarviss-generator')?.systemPrompt}
            temperature={agentConfigs.find(c => c.id === 'jarviss-generator')?.temperature}
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
        employees={employees}
        operations={operations}
        assignments={assignments}
        setDetailedQuote={setDetailedQuote}
        setDetailedWorkOrder={setDetailedWorkOrder}
        setEditingPart={setEditingPart}
        setCurrentView={setCurrentView}
        updateQuote={updateQuote}
        onCreateBudgetaryQuote={handleCreateBudgetaryQuote}
        onCreatePart={async (partData) => { 
          await addPart({ ...partData, revisions: [] } as Omit<Part, 'id'>); 
          setCurrentView('parts'); 
          return { status: 'success', message: 'Pièce créée avec succès.' }; 
        }}
        onAddProductionFeedback={handleAddProductionFeedback}
        systemInstruction={agentConfigs.find(c => c.id === 'jarviss-live')?.systemPrompt}
        temperature={agentConfigs.find(c => c.id === 'jarviss-live')?.temperature}
        voiceName={agentConfigs.find(c => c.id === 'jarviss-live')?.voiceName}
      />

      <AnimatePresence>
        {isDiagnosticOpen && (
          <DiagnosticLogs onClose={() => setIsDiagnosticOpen(false)} />
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsDiagnosticOpen(true)}
        className="fixed bottom-24 right-5 p-3 bg-gray-900/80 backdrop-blur-md text-gray-400 hover:text-indigo-400 rounded-full shadow-lg border border-gray-800 z-40 transition-all hover:scale-110"
        title="Journal Diagnostic Jarviss"
      >
        <TerminalIcon className="h-5 w-5" />
      </button>
    </div>
  );
};

export default App;
