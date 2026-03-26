export interface Client {
  id: string;
  name: string;
}

export interface Operation {
  id: string;
  name: string;
  rate: number; // Hourly rate
}

export interface Material {
  id: string;
  name: string;
  grade: string;
  thicknessGauge: number;
  pricePerLbs: number;
  pricePerSqFt: number;
  cost: number; // Cost per unit/sheet
}

export interface PartOperation {
  operationId: string;
  estimatedTimeMinutes: number;
  dependencies: string[]; // List of operationIds on the same part
  delayDays: number; // Delay in days before this operation can start after dependencies are met
}

export interface Part {
  id: string;
  name: string;
  materialId: string;
  operations: PartOperation[];
}

export interface WorkOrderPart extends Part {
  instanceId: string;
  partDependencies?: string[]; // List of instanceIds of other parts in the same work order
}

export interface WorkOrder {
  id: string;
  name: string;
  clientId: string;
  parts: WorkOrderPart[];
  startDate: string; // YYYY-MM-DD
  finishDate: string; // YYYY-MM-DD
}

export interface EmployeeSkill {
  skillId: string;
  certified: boolean;
}

export interface Employee {
  id:string;
  name: string;
  role: string;
  skills?: EmployeeSkill[];
}

export interface Team {
  id: string;
  name: string;
  employeeIds: string[];
}

export interface Assignment {
  id: string;
  workOrderId: string;
  partInstanceId: string;
  operationId: string;
  employeeIds: string[];
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
