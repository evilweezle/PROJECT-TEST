export interface UserProfile {
  uid: string;
  email: string;
  roleLevel: number;
  displayName?: string;
  createdAt?: string;
}

export const ROLE_LEVELS = {
  ADMIN: 500,
  GESTIONNAIRE: 499,
  PRODUCTION: 300,
  VENTES_DIRECTOR: 201,
  VENTES: 200,
  CLIENTS: 100
};

export interface ContactInfo {
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  website?: string;
  notes?: string;
}

export interface Client extends ContactInfo {
  id: string;
  name: string;
  tier?: 'Regular' | 'AdvantagePlus';
  portalAccess?: boolean;
  portalEmail?: string;
  points?: number;
  totalSubmissions?: number;
  benchmarkScore?: number;
}

export interface Operation {
  id: string;
  name: string;
  rate: number; // Hourly rate
  availableIn?: ('part' | 'assembly' | 'quote')[];
  requiredSkillId?: string;
}

export interface Material {
  id: string;
  description: string;
  type: string; // Should be material categories like sheet, bar, tube
  materialType: string;
  thickness: number;
  profileDimensions?: string;
  densityLbs: number;
  weightPerLinearFt: number;
  weightPerSqFt: number;
  costPerLb: number;
  costPerSqFt: number;
  costPerLinearFt: number;
  laserAdvance6kW?: number; // Cutting speed in inches per minute
  laserAdvance12kW?: number; // Cutting speed in inches per minute
  stockQuantity?: number;
  allocatedQuantity?: number;
}

export interface SupplierLink {
  supplierId: string;
  price: number;
  deliveryDays: number;
}

export interface Subcontracting {
  id: string;
  subcontractingNumber: string;
  name: string;
  defaultCost: number;
  workOrderId?: string;
  quoteId?: string;
  partId?: string;
  assemblyId?: string;
  targetItemIds?: string[];
  applyType?: 'once' | 'distributed' | 'perUnit';
  cost?: number;
  supplierLinks?: SupplierLink[];
}

export interface SubcontractingItem {
  id?: string;
  subcontractingId: string;
  description?: string;
  cost: number;
  expectedDeliveryDate?: string;
  status?: JobStatus;
  workOrderNumber?: string;
  applyType: 'once' | 'distributed' | 'perUnit';
  targetItemIds?: string[];
}

export interface PartOperation {
  id?: string; // Unique ID for this instance of the operation in the part/assembly
  operationId: string;
  estimatedTimeMinutes: number;
  dependencies: string[]; // List of operationIds on the same part
  delayDays: number; // Delay in days before this operation can start after dependencies are met
  requiredSkillId?: string; // Override the template skill if needed
  requiresHelper?: boolean;
  helperTimeMinutes?: number;
  status?: JobStatus; // Track if the operation is pending, in progress, completed, or blocked
  blockedReason?: string; // e.g., 'Manque de matériel'
  bendingResult?: BendingOperationResult;
  bendingParams?: {
    numberOfSetups: number;
    numberOfBends: number;
    numberOfReverses: number;
    areaSqIn: number;
    weightLbs: number;
    useNeoprene: boolean;
    quantity: number;
  };
  laserParams?: {
    cutLengthInches: number;
    yieldPercentage: number; // Percentage of actual part compared to blank (e.g. 80 for 80%)
    powerkW: 6 | 12;
    blankAreaSqIn: number;
    numberOfPierces: number;
    realSurfaceAreaSqIn?: number;
    numberOfSharpCorners?: number;
    numberOfBends?: number;
    numberOfSheets?: number;
    sheetAreaSqIn?: number;
    setupTimeMinutes?: number;
    materialCostSelection?: 'blank' | 'real' | 'nest';
  };
  laserTubeParams?: {
    cutLengthInches: number;
    numberOfBars: number;
    powerkW: number;
    setupTimeMinutes?: number;
    numberOfPierces?: number;
  };
  laserResult?: LaserOperationResult;
  laserTubeResult?: LaserOperationResult; // Reusing same result structure or similar
  isConfirmed?: boolean;
}

export interface Part {
  id: string;
  name: string;
  ownerId?: string; // Client ID or 'FMI'
  isClientDraft?: boolean;
  materialId?: string;
  dimensionX?: number;
  dimensionY?: number;
  dimensionZ?: number;
  weight?: number;
  operations: PartOperation[];
  quantity: number;
  filePdf?: string;
  filePdfName?: string;
  fileDxf?: string;
  fileDxfName?: string;
  fileStep?: string;
  fileStepName?: string;
  subcontractingItems?: SubcontractingItem[];
  supplierLinks?: SupplierLink[];
  isAiGenerated?: boolean;
  dxfData?: {
    cutLength?: number;
    area?: number;
    weight?: number;
    pierces?: number;
    sharpCorners?: number;
    blankX?: number;
    blankY?: number;
    realSurface?: number;
    bends?: number;
    autoFilledFields?: string[]; // To track which fields were auto-filled
  };
}

export interface AssemblyItem {
  type: 'part' | 'assembly';
  id: string;
  quantity: number;
  tempId?: string;
}

export interface Assembly {
  id: string;
  name: string;
  ownerId?: string; // Client ID or 'FMI'
  isClientDraft?: boolean;
  items: AssemblyItem[];
  operations: PartOperation[];
  quantity: number;
  filePdf?: string;
  filePdfName?: string;
  fileDxf?: string;
  fileDxfName?: string;
  fileStep?: string;
  fileStepName?: string;
  subcontractingItems?: SubcontractingItem[];
  isAiGenerated?: boolean;
}

export type JobStatus = 'Pending' | 'In Progress' | 'Completed' | 'Blocked';

export interface WorkOrderPart extends Part {
  instanceId: string;
  partDependencies?: string[]; // List of instanceIds of other parts in the same work order
  status: JobStatus;
  parentAssemblyId?: string; // Track which assembly this part belongs to
  productionFeedback?: ProductionFeedback[];
}

export interface ProductionFeedback {
  id: string;
  employeeId: string;
  date: string;
  comment: string;
  operationId: string;
  partInstanceId: string;
  isAiFlagged?: boolean;
  aiContextReference?: string; // Reference to drawing details or previous cases
  materialConsumedId?: string;
  materialConsumedQuantity?: number;
  materialConsumedDimensions?: string; // e.g. "48x96 feuilles" ou "120 pouces"
}

export interface WorkOrderItem {
  type: 'part' | 'assembly';
  id: string;
  quantity: number;
  tempId: string;
  dependencies: string[];
  productionFeedback?: ProductionFeedback[];
  aiPostFabAnalysis?: string;
}

export interface WorkOrder {
  id: string;
  workOrderNumber: string;
  name: string;
  clientId: string;
  parts: WorkOrderPart[];
  items?: WorkOrderItem[]; // Store the original items (parts/assemblies) for editing
  assemblyId?: string; // Legacy
  quoteId?: string; // Optional reference to a quote
  startDate: string; // YYYY-MM-DD
  finishDate: string; // YYYY-MM-DD
  status: JobStatus;
  subcontractingItems?: SubcontractingItem[];
  customerPoNumber?: string;
  customerPoFile?: string;
  customerPoFileName?: string;
  deliveryNoteNumber?: string;
  invoiceNumber?: string;
}

export interface EmployeeSkill {
  skillId: string;
  certified: boolean;
}

export interface Employee {
  id:string;
  name: string;
  role: string;
  employeeNumber: string; // 3-digit code
  skills?: EmployeeSkill[];
  isManager?: boolean;
  punchIn?: string; // ISO string
  punchOut?: string; // ISO string
  aiSuggestions?: string[]; // Evolutionary suggestions from Jarviss
  photo?: string;
}

export interface Team {
  id: string;
  name: string;
  employeeIds: string[];
}

export interface TimeSegment {
  id: string;
  startTime: string; // ISO string
  endTime?: string; // ISO string
  durationMinutes?: number;
}

export interface Assignment {
  id: string;
  assignmentNumber?: string;
  workOrderId: string;
  partInstanceId: string;
  operationId: string;
  employeeIds: string[];
  status: JobStatus;
  startTime?: string;
  endTime?: string;
  scheduledDate?: string; // YYYY-MM-DD
  splitId?: string;
  isLocked?: boolean;
  completionComment?: string;
  
  // Real-time tracking
  timeSegments?: TimeSegment[];
  totalActualMinutes?: number;
  isTimerRunning?: boolean;
  estimatedMinutes?: number; // Snapshot of estimate at time of assignment or from partOp
}

export interface Skill {
  id: string;
  name: string;
}

export type NonConformityStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';
export type NonConformitySeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export interface NonConformity {
  id: string;
  description: string;
  workOrderId: string;
  partInstanceId: string;
  operationId: string;
  status: NonConformityStatus;
  severity: NonConformitySeverity;
  dateReported: string; // YYYY-MM-DD
  actionsTaken?: string;
}

export type QuoteStatus = 'Draft' | 'In Progress' | 'Sent' | 'Accepted' | 'Rejected' | 'AI_Draft' | 'Locked';

export interface QuoteItem {
  tempId?: string;
  type: 'part' | 'assembly' | 'project' | 'tm-item';
  id: string;
  name?: string; // For project/budgetary items
  quantity: number;
  unitPrice: number;
  isAiGenerated?: boolean;
  aiStatus?: 'Pending' | 'Approved' | 'Rejected';
}

export interface Quote {
  id: string;
  quoteNumber: string;
  name: string;
  clientId: string;
  status: QuoteStatus;
  date: string;
  salesPersonId?: string;
  items: QuoteItem[];
  totalAmount: number;
  notes?: string;
  subcontractingItems?: SubcontractingItem[];
  materialSummary?: { materialId: string; totalSqFt: number }[];
  isAiGenerated?: boolean;
  aiSuggestions?: string;
  isLocked?: boolean;
  description?: string;
  revision?: number;
  clientCopyPdf?: string;
  source?: 'staff' | 'client_portal';
  clientDiscountApplied?: number;
  interventionsRequired?: number;
  qualityScore?: number;
}

export interface DeliveryNote {
  id: string;
  deliveryNoteNumber: string;
  workOrderId: string;
  date: string;
  items: { type: 'part' | 'assembly'; id: string; quantity: number }[];
  trackingNumber?: string;
  carrier?: string;
  isCustomerPickup?: boolean;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  workOrderId?: string;
  deliveryNoteId?: string;
  quoteId?: string;
  date: string;
  items: { type: 'part' | 'assembly'; id: string; quantity: number; unitPrice: number }[];
  totalAmount: number;
}

export interface Supplier extends ContactInfo {
  id: string;
  name: string;
}

export interface PurchaseItem {
  type: 'material' | 'part' | 'other';
  id: string;
  description?: string;
  quantity: number;
  unitPrice: number;
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  quoteId?: string;
  workOrderId?: string;
  supplierId: string;
  items: PurchaseItem[];
  isSent: boolean;
  sentDate?: string;
  isReceived: boolean;
  receivedDate?: string;
  totalAmount: number;
  notes?: string;
}

export interface BendingOperationResult {
  bendingTimePerPiece: number;
  totalSetupTime: number;
  secondOperatorRequired: boolean;
  totalTimeMinutes: number;
  totalCost: number;
  unitPrice: number;
  // Audit trail
  settingsSnapshot: BendingSettings;
}

export interface LaserSettings {
  machineHourlyRate: number;
  setupHourlyRate: number;
  electricityCostPerkW: number;
  gasConsumption6kW: number; // $/hour
  gasConsumption12kW: number; // $/hour
  costPerPierce: number;
  sheetChangeTimeMinutes: number;
  sheetChangeHourlyRate: number;
}

export interface LaserTubeSettings {
  machineHourlyRate: number;
  setupHourlyRate: number; // Added
  minimumTimeMinutes: number;
  handlingTimePerBarMinutes: number;
  handlingTimePerPartMinutes: number; // Added
  electricityCostPerkW: number;
  gasConsumptionRate: number; // $/hour
  costPerPierce: number; // Added
}

export interface LaserOperationResult {
  cuttingTimeMinutes: number;
  machineCost: number;
  setupCost?: number;
  electricityCost: number;
  gasCost: number;
  piercingCost: number;
  sheetChangeCost: number;
  totalOperationCost: number;
  unitPrice: number;
  // Audit trail
  settingsSnapshot: LaserSettings;
}

export interface TimeEntry {
  id: string;
  employeeId: string;
  workOrderId: string;
  partInstanceId: string;
  operationId: string;
  startTime: string; // ISO string
  endTime?: string; // ISO string
  totalMinutes?: number;
}

export interface InboundRequest {
  id: string;
  from: string;
  subject: string;
  body: string;
  date: string;
  attachments: {
    name: string;
    type: string;
    data?: string; // base64
    url?: string;
  }[];
  isProcessed: boolean;
  quoteId?: string;
  analysis?: {
    missingFiles: string[];
    detectedOperations: string[];
    suggestedItems: {
      name: string;
      quantity: number;
    }[];
  };
  thread: {
    role: 'user' | 'ai';
    text: string;
    date: string;
  }[];
}

export interface BendingSettings {
  machineHourlyRate: number;
  setupRateMinutes: number;
  flipRateMinutes: number;
  weightPenaltyFactor: number;
  areaPenaltyFactor: number;
  neopreneRateMinutes: number;
  helperThresholdLbs: number;
  minSetupTimeMinutes: number;
}

export interface AgentKnowledgeStep {
  id: string;
  name: string;
  status: 'completed' | 'ongoing' | 'waiting';
}

export interface AgentExpertise {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  lastUpdated: string;
  temperature?: number;
  voiceName?: string;
  sourceCodePreview?: string;
  
  // New Humanized Identity Props
  aiIdentity?: string; // e.g. AI-77-100
  level?: number;
  xp?: number;
  maxXp?: number;
  precision?: number;
  specialty?: string;
  focus?: string;
  knowledgePath?: AgentKnowledgeStep[];
  expertiseMemory?: AgentExpertise[];
  roleTitle?: string;
}

export interface OutputTemplate {
  id: string;
  name: string;
  description: string;
  html: string;
  css: string;
  placeholders: string[];
}

export interface ProfitSettings {
  id?: string;
  materialMargin: number;
  operationMargin: number;
  subcontractingUnder1000Margin: number;
  subcontractingUnder5000Margin: number;
  subcontractingOver5000Margin: number;
}

export interface TMItemMaterial {
  id: string; // unique internal ID
  materialId: string;
  type?: string; 
  thickness?: number;
  width?: number; // for sheets/plates
  length?: number; // for sheets/plates or tubes
  weight?: number; // for volume/pound based
  quantity: number; // raw quantity or multiplier
  notes?: string;
}

export interface TMItemOperation {
  id: string; // unique internal ID
  operationId: string; // corresponds to Operation list
  estimatedTimeHours: number;
  notes?: string;
}

export interface TMItemSubcontracting {
  id: string; // unique internal ID
  subcontractingId: string; // from list
  globalPrice: number;
  notes?: string;
}

export interface TMItemPurchase {
  id: string; // unique internal ID
  description: string;
  globalPrice: number;
  supplierId: string; // Required association
  notes?: string;
}

export interface TMItemFile {
  id: string;
  name: string;
  base64: string; 
  type?: string;
}

export interface TMItem {
  id: string;
  clientId?: string;
  name: string;
  description?: string;
  notes?: string;
  materials: TMItemMaterial[];
  operations: TMItemOperation[];
  subcontractings: TMItemSubcontracting[];
  purchases: TMItemPurchase[];
  files: TMItemFile[];
  scans?: unknown[];
}
