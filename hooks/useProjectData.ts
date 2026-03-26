import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocFromServer
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import type { Client, Operation, Part, WorkOrder, WorkOrderPart, Employee, Team, Assignment, Skill, Material, NonConformity } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const WORK_START_HOUR = 8;
const WORK_END_HOUR = 16;

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addWorkingTime = (startDate: Date, minutesToAdd: number): Date => {
    const currentDate = new Date(startDate);
    let remainingMinutes = minutesToAdd;

    while (remainingMinutes > 0) {
        const day = currentDate.getDay();
        if (day === 6) { // Saturday
            currentDate.setDate(currentDate.getDate() + 2);
            currentDate.setHours(WORK_START_HOUR, 0, 0, 0);
            continue;
        }
        if (day === 0) { // Sunday
            currentDate.setDate(currentDate.getDate() + 1);
            currentDate.setHours(WORK_START_HOUR, 0, 0, 0);
            continue;
        }

        if (currentDate.getHours() >= WORK_END_HOUR) {
            currentDate.setDate(currentDate.getDate() + 1);
            currentDate.setHours(WORK_START_HOUR, 0, 0, 0);
            continue; 
        }

        if (currentDate.getHours() < WORK_START_HOUR) {
            currentDate.setHours(WORK_START_HOUR, 0, 0, 0);
        }

        const endOfDay = new Date(currentDate);
        endOfDay.setHours(WORK_END_HOUR, 0, 0, 0);

        const minutesLeftInDay = (endOfDay.getTime() - currentDate.getTime()) / (1000 * 60);

        if (remainingMinutes <= minutesLeftInDay) {
            currentDate.setMinutes(currentDate.getMinutes() + remainingMinutes);
            remainingMinutes = 0;
        } else {
            remainingMinutes -= minutesLeftInDay;
            currentDate.setDate(currentDate.getDate() + 1);
            currentDate.setHours(WORK_START_HOUR, 0, 0, 0);
        }
    }
    return currentDate;
};

const calculateFinishDate = (startDateString: string, partsForWO: WorkOrderPart[]): string => {
  if (!partsForWO || partsForWO.length === 0 || !startDateString) {
    return startDateString;
  }

  const woStartDate = new Date(startDateString + 'T00:00:00');
  if (isNaN(woStartDate.getTime())) return startDateString;
  woStartDate.setHours(WORK_START_HOUR, 0, 0, 0);
  
  const partFinishDates = new Map<string, Date>();
  let partsToCalculate = [...partsForWO];
  const maxPartIterations = partsToCalculate.length * partsToCalculate.length;
  let partIter = 0;
  let overallLatestEndDate: Date | null = null;

  while (partsToCalculate.length > 0 && partIter < maxPartIterations) {
      const nextBatch = partsToCalculate.filter(part => {
          const dependenciesMet = (part.partDependencies || []).every(depInstanceId => partFinishDates.has(depInstanceId));
          return dependenciesMet;
      });

      if (nextBatch.length === 0) break; // Circular dependency or stuck

      nextBatch.forEach(part => {
          // Base start date for this part
          let partBaseStartDate = new Date(woStartDate);
          (part.partDependencies || []).forEach(depInstanceId => {
              const depFinishDate = partFinishDates.get(depInstanceId)!;
              if (depFinishDate > partBaseStartDate) {
                  partBaseStartDate = new Date(depFinishDate);
              }
          });

          // Calculate operations for this part
          const opEndDates = new Map<string, Date>();
          let opsToCalculate = [...part.operations];
          const maxOpIterations = opsToCalculate.length * opsToCalculate.length;
          let opIter = 0;
          let partLatestEndDate: Date = new Date(partBaseStartDate);

          while(opsToCalculate.length > 0 && opIter < maxOpIterations) {
              opsToCalculate = opsToCalculate.filter(op => {
                  const opDepsMet = op.dependencies.every(depId => opEndDates.has(depId));
                  if (!opDepsMet) return true;

                  let opStartDate = new Date(partBaseStartDate);
                  op.dependencies.forEach(depId => {
                      const prereqEndDate = opEndDates.get(depId)!;
                      if (prereqEndDate > opStartDate) {
                          opStartDate = new Date(prereqEndDate);
                      }
                  });

                  if (op.delayDays > 0) {
                      let delayCounter = op.delayDays;
                      const currentDateForDelay = new Date(opStartDate);
                      while(delayCounter > 0) {
                          currentDateForDelay.setDate(currentDateForDelay.getDate() + 1);
                          const day = currentDateForDelay.getDay();
                          if(day !== 0 && day !== 6) { // only count weekdays
                              delayCounter--;
                          }
                      }
                      opStartDate = currentDateForDelay;
                      opStartDate.setHours(WORK_START_HOUR, 0, 0, 0);
                  }

                  // Ensure start date is a working time.
                  const day = opStartDate.getDay();
                  if (day === 6) { // Saturday
                      opStartDate.setDate(opStartDate.getDate() + 2);
                      opStartDate.setHours(WORK_START_HOUR, 0, 0, 0);
                  } else if (day === 0) { // Sunday
                      opStartDate.setDate(opStartDate.getDate() + 1);
                      opStartDate.setHours(WORK_START_HOUR, 0, 0, 0);
                  } else if (opStartDate.getHours() >= WORK_END_HOUR) {
                      opStartDate.setDate(opStartDate.getDate() + 1);
                      const nextDay = opStartDate.getDay();
                      if (nextDay === 6) opStartDate.setDate(opStartDate.getDate() + 2);
                      if (nextDay === 0) opStartDate.setDate(opStartDate.getDate() + 1);
                      opStartDate.setHours(WORK_START_HOUR, 0, 0, 0);
                  } else if (opStartDate.getHours() < WORK_START_HOUR) {
                      opStartDate.setHours(WORK_START_HOUR, 0, 0, 0);
                  }

                  const opEndDate = addWorkingTime(new Date(opStartDate), op.estimatedTimeMinutes);
                  opEndDates.set(op.operationId, opEndDate);
                  if (opEndDate > partLatestEndDate) {
                      partLatestEndDate = opEndDate;
                  }
                  return false;
              });
              opIter++;
          }

          partFinishDates.set(part.instanceId, partLatestEndDate);
          if (!overallLatestEndDate || partLatestEndDate > overallLatestEndDate) {
              overallLatestEndDate = partLatestEndDate;
          }
          
          // Remove from partsToCalculate
          partsToCalculate = partsToCalculate.filter(p => p.instanceId !== part.instanceId);
      });
      partIter++;
  }

  if (!overallLatestEndDate) return startDateString;
  
  return formatDate(overallLatestEndDate);
};

export const useProjectData = (user: User | null) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [nonConformities, setNonConformities] = useState<NonConformity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const unsubscribers: (() => void)[] = [];
    const collections = [
      { name: 'clients', setter: setClients },
      { name: 'operations', setter: setOperations },
      { name: 'parts', setter: setParts },
      { name: 'workOrders', setter: setWorkOrders },
      { name: 'employees', setter: setEmployees },
      { name: 'teams', setter: setTeams },
      { name: 'assignments', setter: setAssignments },
      { name: 'skills', setter: setSkills },
      { name: 'materials', setter: setMaterials },
      { name: 'nonConformities', setter: setNonConformities },
    ];

    const loadedCollections = new Set<string>();

    collections.forEach(col => {
      const unsub = onSnapshot(collection(db, col.name), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as (Client | Operation | Part | WorkOrder | Employee | Team | Assignment | Skill | Material | NonConformity)[];
        col.setter(data as (Client & Operation & Part & WorkOrder & Employee & Team & Assignment & Skill & Material & NonConformity)[]);
        
        loadedCollections.add(col.name);
        if (loadedCollections.size === collections.length) {
          setIsLoading(false);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, col.name);
      });
      unsubscribers.push(unsub);
    });

    return () => unsubscribers.forEach(unsub => unsub());
  }, [user]);

  // Add functions
  const addClient = async (client: Omit<Client, 'id'>) => {
    try {
      await addDoc(collection(db, 'clients'), client);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'clients');
    }
  };

  const addOperation = async (operation: Omit<Operation, 'id'>) => {
    try {
      await addDoc(collection(db, 'operations'), operation);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'operations');
    }
  };
  
  const addPart = async (part: Omit<Part, 'id'>) => {
    try {
      await addDoc(collection(db, 'parts'), part);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'parts');
    }
  };

  const addWorkOrder = async (workOrder: Omit<WorkOrder, 'id' | 'parts' | 'finishDate'> & { 
      partIds: string[]; 
      partDependencies?: Record<string, string[]> 
  }) => {
    try {
      const workOrderParts: WorkOrderPart[] = workOrder.partIds.map((partId) => {
          const partTemplate = parts.find(p => p.id === partId);
          if (!partTemplate) throw new Error(`Part with id ${partId} not found`);
          return {
              ...partTemplate,
              instanceId: Math.random().toString(36).slice(2, 11),
              operations: partTemplate.operations.map(op => ({...op, delayDays: 0, dependencies: op.dependencies || [] })),
              partDependencies: []
          }
      });

      if (workOrder.partDependencies) {
          workOrderParts.forEach(part => {
              const deps = workOrder.partDependencies![part.id] || [];
              part.partDependencies = deps.map(depPartId => {
                  const depPart = workOrderParts.find(p => p.id === depPartId);
                  return depPart ? depPart.instanceId : '';
              }).filter(id => id !== '');
          });
      }

      const finishDate = calculateFinishDate(workOrder.startDate, workOrderParts);

      const newWorkOrder = {
          name: workOrder.name,
          clientId: workOrder.clientId,
          startDate: workOrder.startDate,
          finishDate: finishDate,
          parts: workOrderParts
      };
      await addDoc(collection(db, 'workOrders'), newWorkOrder);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'workOrders');
    }
  };

  const addEmployee = async (employee: Omit<Employee, 'id'>) => {
    try {
      await addDoc(collection(db, 'employees'), employee);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'employees');
    }
  };

  const addTeam = async (team: Omit<Team, 'id'>) => {
    try {
      await addDoc(collection(db, 'teams'), team);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'teams');
    }
  };
  
  const addSkill = async (skill: Omit<Skill, 'id'>) => {
    try {
      await addDoc(collection(db, 'skills'), skill);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'skills');
    }
  };

  const addMaterial = async (material: Omit<Material, 'id'>) => {
    try {
      await addDoc(collection(db, 'materials'), material);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'materials');
    }
  };

  const addNonConformity = async (nonConformity: Omit<NonConformity, 'id'>) => {
    try {
      await addDoc(collection(db, 'nonConformities'), nonConformity);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'nonConformities');
    }
  };

  // Delete functions
  const deleteClient = async (id: string) => {
    if (!id) {
      console.error("Cannot delete client: ID is missing");
      return;
    }
    if (workOrders.some(wo => wo.clientId === id)) {
        alert("Cannot delete client that is part of a work order.");
        return;
    }
    try {
      await deleteDoc(doc(db, 'clients', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `clients/${id}`);
    }
  };

  const deleteOperation = async (id: string) => {
    if (!id) {
      console.error("Cannot delete operation: ID is missing");
      return;
    }
     if (parts.some(p => p.operations.some(op => op.operationId === id))) {
        alert("Cannot delete operation that is used in a part.");
        return;
    }
    try {
      await deleteDoc(doc(db, 'operations', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `operations/${id}`);
    }
  };
  
  const deletePart = async (id: string) => {
    if (!id) {
      console.error("Cannot delete part: ID is missing");
      return;
    }
    if (workOrders.some(wo => wo.parts.some(p => p.id === id))) {
        alert("Cannot delete part that is used in a work order.");
        return;
    }
    try {
      await deleteDoc(doc(db, 'parts', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `parts/${id}`);
    }
  };

  const deleteWorkOrder = async (id: string) => {
    if (!id) {
      console.error("Cannot delete work order: ID is missing");
      return;
    }
    try {
      await deleteDoc(doc(db, 'workOrders', id));
      // Cleanup assignments
      const relatedAssignments = assignments.filter(a => a.workOrderId === id);
      for (const asgn of relatedAssignments) {
        await deleteDoc(doc(db, 'assignments', asgn.id));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `workOrders/${id}`);
    }
  };

  const deleteEmployee = async (id: string) => {
    if (!id) {
      console.error("Cannot delete employee: ID is missing");
      return;
    }
    if (teams.some(t => t.employeeIds.includes(id))) {
      alert("Cannot delete employee who is a member of a team.");
      return;
    }
    try {
      await deleteDoc(doc(db, 'employees', id));
      // Update assignments
      const relatedAssignments = assignments.filter(a => a.employeeIds.includes(id));
      for (const asgn of relatedAssignments) {
        const newEmployeeIds = asgn.employeeIds.filter(empId => empId !== id);
        if (newEmployeeIds.length === 0) {
          await deleteDoc(doc(db, 'assignments', asgn.id));
        } else {
          await updateDoc(doc(db, 'assignments', asgn.id), { employeeIds: newEmployeeIds });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `employees/${id}`);
    }
  };

  const deleteTeam = async (id: string) => {
    if (!id) {
      console.error("Cannot delete team: ID is missing");
      return;
    }
    try {
      await deleteDoc(doc(db, 'teams', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `teams/${id}`);
    }
  };

  const deleteSkill = async (id: string) => {
    if (!id) {
      console.error("Cannot delete skill: ID is missing");
      return;
    }
    try {
      await deleteDoc(doc(db, 'skills', id));
      // Update employees
      const affectedEmployees = employees.filter(e => e.skills?.some(s => s.skillId === id));
      for (const emp of affectedEmployees) {
        await updateDoc(doc(db, 'employees', emp.id), {
          skills: emp.skills?.filter(s => s.skillId !== id)
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `skills/${id}`);
    }
  };

  const deleteMaterial = async (id: string) => {
    if (!id) {
      console.error("Cannot delete material: ID is missing");
      return;
    }
    if (parts.some(p => p.materialId === id)) {
        alert("Cannot delete material that is used in a part.");
        return;
    }
    try {
      await deleteDoc(doc(db, 'materials', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `materials/${id}`);
    }
  };

  const deleteNonConformity = async (id: string) => {
    if (!id) {
      console.error("Cannot delete non-conformity: ID is missing");
      return;
    }
    try {
      await deleteDoc(doc(db, 'nonConformities', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `nonConformities/${id}`);
    }
  };

  // Update functions
  const updateClient = async (updatedClient: Client) => {
    if (!updatedClient.id) {
      console.error("Cannot update client: ID is missing");
      return;
    }
    try {
      const { id, ...data } = updatedClient;
      await updateDoc(doc(db, 'clients', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `clients/${updatedClient.id}`);
    }
  };

  const updateOperation = async (updatedOperation: Operation) => {
    if (!updatedOperation.id) {
      console.error("Cannot update operation: ID is missing");
      return;
    }
    try {
      const { id, ...data } = updatedOperation;
      await updateDoc(doc(db, 'operations', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `operations/${updatedOperation.id}`);
    }
  };

  const updatePart = async (updatedPart: Part) => {
    if (!updatedPart.id) {
      console.error("Cannot update part: ID is missing");
      return;
    }
    try {
      const { id, ...data } = updatedPart;
      await updateDoc(doc(db, 'parts', id), data);
      
      // Update parts within existing work orders
      const affectedWos = workOrders.filter(wo => wo.parts.some(p => p.id === id));
      for (const wo of affectedWos) {
        const updatedPartsForWO = wo.parts.map(p => {
          if (p.id === id) {
            const newOps = updatedPart.operations.map(newOpTemplate => {
              const existingOpInstance = p.operations.find(oldOp => oldOp.operationId === newOpTemplate.operationId);
              return {
                ...newOpTemplate,
                delayDays: existingOpInstance?.delayDays || 0,
              };
            });
            return { ...updatedPart, instanceId: p.instanceId, operations: newOps, partDependencies: p.partDependencies || [] };
          }
          return p;
        });
        await updateDoc(doc(db, 'workOrders', wo.id), {
          parts: updatedPartsForWO,
          finishDate: calculateFinishDate(wo.startDate, updatedPartsForWO)
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `parts/${updatedPart.id}`);
    }
  };

  const updateWorkOrder = async (updatedWorkOrderData: Omit<WorkOrder, 'parts' | 'finishDate'> & { 
      partIds: string[]; 
      partDependencies?: Record<string, string[]> 
  }) => {
    if (!updatedWorkOrderData.id) {
      console.error("Cannot update work order: ID is missing");
      return;
    }
    try {
      const wo = workOrders.find(w => w.id === updatedWorkOrderData.id);
      if (!wo) return;

      const workOrderParts: WorkOrderPart[] = updatedWorkOrderData.partIds.map((partId) => {
          const partTemplate = parts.find(p => p.id === partId);
          if (!partTemplate) throw new Error(`Part with id ${partId} not found`);
          const existingPart = wo.parts.find(p => p.id === partId);
          return {
              ...partTemplate,
              instanceId: existingPart?.instanceId || Math.random().toString(36).slice(2, 11),
              operations: partTemplate.operations.map(opTemplate => {
                const existingOp = existingPart?.operations.find(o => o.operationId === opTemplate.operationId);
                return { ...opTemplate, delayDays: existingOp?.delayDays || 0 };
              }),
              partDependencies: []
          }
      });

      if (updatedWorkOrderData.partDependencies) {
          workOrderParts.forEach(part => {
              const deps = updatedWorkOrderData.partDependencies![part.id] || [];
              part.partDependencies = deps.map(depPartId => {
                  const depPart = workOrderParts.find(p => p.id === depPartId);
                  return depPart ? depPart.instanceId : '';
              }).filter(id => id !== '');
          });
      }

      const newPartInstanceIds = new Set(workOrderParts.map(p => p.instanceId));
      const removedInstanceIds = wo.parts
          .map(p => p.instanceId)
          .filter(id => !newPartInstanceIds.has(id));
    
      if (removedInstanceIds.length > 0) {
          const relatedAssignments = assignments.filter(a => a.workOrderId === wo.id && removedInstanceIds.includes(a.partInstanceId));
          for (const asgn of relatedAssignments) {
            await deleteDoc(doc(db, 'assignments', asgn.id));
          }
      }

      const finishDate = calculateFinishDate(updatedWorkOrderData.startDate, workOrderParts);

      await updateDoc(doc(db, 'workOrders', updatedWorkOrderData.id), {
        name: updatedWorkOrderData.name,
        clientId: updatedWorkOrderData.clientId,
        startDate: updatedWorkOrderData.startDate,
        finishDate: finishDate,
        parts: workOrderParts,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `workOrders/${updatedWorkOrderData.id}`);
    }
  };

  const updateEmployee = async (updatedEmployee: Employee) => {
    if (!updatedEmployee.id) {
      console.error("Cannot update employee: ID is missing");
      return;
    }
    try {
      const { id, ...data } = updatedEmployee;
      await updateDoc(doc(db, 'employees', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `employees/${updatedEmployee.id}`);
    }
  };

  const updateTeam = async (updatedTeam: Team) => {
    if (!updatedTeam.id) {
      console.error("Cannot update team: ID is missing");
      return;
    }
    try {
      const { id, ...data } = updatedTeam;
      await updateDoc(doc(db, 'teams', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `teams/${updatedTeam.id}`);
    }
  };
  
  const updateSkill = async (updatedSkill: Skill) => {
    if (!updatedSkill.id) {
      console.error("Cannot update skill: ID is missing");
      return;
    }
    try {
      const { id, ...data } = updatedSkill;
      await updateDoc(doc(db, 'skills', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `skills/${updatedSkill.id}`);
    }
  };
  
  const updateMaterial = async (updatedMaterial: Material) => {
    if (!updatedMaterial.id) {
      console.error("Cannot update material: ID is missing");
      return;
    }
    try {
      const { id, ...data } = updatedMaterial;
      await updateDoc(doc(db, 'materials', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `materials/${updatedMaterial.id}`);
    }
  };

  const updateNonConformity = async (updatedNonConformity: NonConformity) => {
    if (!updatedNonConformity.id) {
      console.error("Cannot update non-conformity: ID is missing");
      return;
    }
    try {
      const { id, ...data } = updatedNonConformity;
      await updateDoc(doc(db, 'nonConformities', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `nonConformities/${updatedNonConformity.id}`);
    }
  };

  const updateAssignment = async (workOrderId: string, partInstanceId: string, operationId: string, employeeIds: string[]) => {
    if (!workOrderId || !partInstanceId || !operationId) {
      console.error("Cannot update assignment: Missing required IDs");
      return;
    }
    try {
      const existing = assignments.find(a =>
        a.workOrderId === workOrderId &&
        a.partInstanceId === partInstanceId &&
        a.operationId === operationId
      );
      
      if (employeeIds.length === 0) {
        if (existing) {
          await deleteDoc(doc(db, 'assignments', existing.id));
        }
        return;
      }

      if (existing) {
        await updateDoc(doc(db, 'assignments', existing.id), { employeeIds });
      } else {
        const newAssignment = {
          workOrderId,
          partInstanceId,
          operationId,
          employeeIds,
        };
        await addDoc(collection(db, 'assignments'), newAssignment);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'assignments');
    }
  };

  return {
    clients,
    operations,
    parts,
    workOrders,
    employees,
    teams,
    assignments,
    skills,
    materials,
    nonConformities,
    isLoading,
    addClient,
    addOperation,
    addPart,
    addWorkOrder,
    addEmployee,
    addTeam,
    addSkill,
    addMaterial,
    addNonConformity,
    deleteClient,
    deleteOperation,
    deletePart,
    deleteWorkOrder,
    deleteEmployee,
    deleteTeam,
    deleteSkill,
    deleteMaterial,
    deleteNonConformity,
    updateClient,
    updateOperation,
    updatePart,
    updateWorkOrder,
    updateEmployee,
    updateTeam,
    updateSkill,
    updateMaterial,
    updateNonConformity,
    updateAssignment,
  };
};