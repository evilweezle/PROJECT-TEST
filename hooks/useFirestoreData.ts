import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocs, writeBatch, setDoc } from 'firebase/firestore';
import { db } from '../services/firebaseService';
import type { 
  Client, Operation, Part, WorkOrder, Employee, Team, Assignment, 
  Skill, Material, NonConformity, Quote, Assembly, DeliveryNote, 
  Invoice, TimeEntry, InboundRequest, Supplier, Purchase, Subcontracting, 
  BendingSettings, LaserSettings, LaserTubeSettings, OutputTemplate, ProfitSettings, TMItem
} from '../types';

export const useFirestoreData = () => {
    const [data, setData] = useState<{
        clients: Client[];
        operations: Operation[];
        parts: Part[];
        assemblies: Assembly[];
        workOrders: WorkOrder[];
        employees: Employee[];
        teams: Team[];
        assignments: Assignment[];
        skills: Skill[];
        materials: Material[];
        nonConformities: NonConformity[];
        quotes: Quote[];
        subcontractings: Subcontracting[];
        deliveryNotes: DeliveryNote[];
        invoices: Invoice[];
        suppliers: Supplier[];
        purchases: Purchase[];
        timeEntries: TimeEntry[];
        inboundRequests: InboundRequest[];
        bendingSettings: BendingSettings;
        laserSettings: LaserSettings;
        laserTubeSettings: LaserTubeSettings;
        outputTemplates: OutputTemplate[];
        profitSettings: ProfitSettings;
        tmItems: TMItem[];
    }>({
        clients: [],
        operations: [],
        parts: [],
        assemblies: [],
        workOrders: [],
        employees: [],
        teams: [],
        assignments: [],
        skills: [],
        materials: [],
        nonConformities: [],
        quotes: [],
        subcontractings: [],
        deliveryNotes: [],
        invoices: [],
        suppliers: [],
        purchases: [],
        timeEntries: [],
        inboundRequests: [],
        bendingSettings: {
            hourlyRate: 85,
            rateWithSecondOperator: 150,
            timePerBend: 1,
            timePerFlip: 0.5,
            setupTimePerSetup: 30,
            neopreneTimePerBend: 1,
            timePerReverse: 0
        },
        laserSettings: {
            machineHourlyRate: 325,
            setupHourlyRate: 65,
            electricityCostPerkW: 0.47,
            gasConsumption6kW: 5,
            gasConsumption12kW: 7,
            costPerPierce: 0.1,
            sheetChangeTimeMinutes: 10,
            sheetChangeHourlyRate: 65
        },
        laserTubeSettings: {
            machineHourlyRate: 325,
            minimumTimeMinutes: 15,
            handlingTimePerBarMinutes: 15,
            electricityCostPerkW: 0.47,
            gasConsumptionRate: 5
        },
        outputTemplates: [],
        profitSettings: {
            materialMargin: 30,
            operationMargin: 10,
            subcontractingUnder1000Margin: 30,
            subcontractingUnder5000Margin: 25,
            subcontractingOver5000Margin: 20
        },
        tmItems: [] as TMItem[]
    });

    const [isLoading, setIsLoading] = useState(true);

    const deduplicate = <T extends {id: string}>(arr: T[]): T[] => {
        const map = new Map<string, T>();
        for (const item of arr) {
            map.set(item.id, item);
        }
        return Array.from(map.values());
    };

    useEffect(() => {
        const unsubClients = onSnapshot(collection(db, 'clients'), (snapshot) => setData(prev => ({ ...prev, clients: deduplicate(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client))) })), (error) => console.error("Clients snapshot error:", error));
        const unsubOperations = onSnapshot(collection(db, 'operations'), (snapshot) => setData(prev => ({ ...prev, operations: deduplicate(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Operation))) })), (error) => console.error("Operations snapshot error:", error));
        const unsubParts = onSnapshot(collection(db, 'parts'), (snapshot) => setData(prev => ({ ...prev, parts: deduplicate(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Part))) })), (error) => console.error("Parts snapshot error:", error));
        const unsubAssemblies = onSnapshot(collection(db, 'assemblies'), (snapshot) => setData(prev => ({ ...prev, assemblies: deduplicate(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assembly))) })), (error) => console.error("Assemblies snapshot error:", error));
        const unsubWorkOrders = onSnapshot(collection(db, 'workOrders'), (snapshot) => setData(prev => ({ ...prev, workOrders: deduplicate(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkOrder))) })), (error) => console.error("WorkOrders snapshot error:", error));
        const unsubEmployees = onSnapshot(collection(db, 'employees'), (snapshot) => setData(prev => ({ ...prev, employees: deduplicate(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee))) })), (error) => console.error("Employees snapshot error:", error));
        const unsubTeams = onSnapshot(collection(db, 'teams'), (snapshot) => setData(prev => ({ ...prev, teams: deduplicate(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team))) })), (error) => console.error("Teams snapshot error:", error));
        const unsubAssignments = onSnapshot(collection(db, 'assignments'), (snapshot) => setData(prev => ({ ...prev, assignments: deduplicate(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment))) })), (error) => console.error("Assignments snapshot error:", error));
        const unsubSkills = onSnapshot(collection(db, 'skills'), (snapshot) => setData(prev => ({ ...prev, skills: deduplicate(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Skill))) })), (error) => console.error("Skills snapshot error:", error));
        const unsubMaterials = onSnapshot(collection(db, 'materials'), (snapshot) => setData(prev => ({ ...prev, materials: deduplicate(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Material))) })), (error) => console.error("Materials snapshot error:", error));
        const unsubNonConformities = onSnapshot(collection(db, 'nonConformities'), (snapshot) => setData(prev => ({ ...prev, nonConformities: deduplicate(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NonConformity))) })), (error) => console.error("NonConformities snapshot error:", error));
        const unsubQuotes = onSnapshot(collection(db, 'quotes'), (snapshot) => setData(prev => ({ ...prev, quotes: deduplicate(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quote))) })), (error) => console.error("Quotes snapshot error:", error));
        const unsubSubcontractings = onSnapshot(collection(db, 'subcontractings'), (snapshot) => setData(prev => ({ ...prev, subcontractings: deduplicate(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subcontracting))) })), (error) => console.error("Subcontractings snapshot error:", error));
        const unsubDeliveryNotes = onSnapshot(collection(db, 'deliveryNotes'), (snapshot) => setData(prev => ({ ...prev, deliveryNotes: deduplicate(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeliveryNote))) })), (error) => console.error("DeliveryNotes snapshot error:", error));
        const unsubInvoices = onSnapshot(collection(db, 'invoices'), (snapshot) => setData(prev => ({ ...prev, invoices: deduplicate(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice))) })), (error) => console.error("Invoices snapshot error:", error));
        const unsubSuppliers = onSnapshot(collection(db, 'suppliers'), (snapshot) => setData(prev => ({ ...prev, suppliers: deduplicate(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier))) })), (error) => console.error("Suppliers snapshot error:", error));
        const unsubPurchases = onSnapshot(collection(db, 'purchases'), (snapshot) => setData(prev => ({ ...prev, purchases: deduplicate(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Purchase))) })), (error) => console.error("Purchases snapshot error:", error));
        const unsubTimeEntries = onSnapshot(collection(db, 'timeEntries'), (snapshot) => setData(prev => ({ ...prev, timeEntries: deduplicate(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimeEntry))) })), (error) => console.error("TimeEntries snapshot error:", error));
        const unsubInboundRequests = onSnapshot(collection(db, 'inboundRequests'), (snapshot) => setData(prev => ({ ...prev, inboundRequests: deduplicate(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InboundRequest))) })), (error) => console.error("InboundRequests snapshot error:", error));
        const unsubTMItems = onSnapshot(collection(db, 'tmItems'), (snapshot) => setData(prev => ({ ...prev, tmItems: deduplicate(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TMItem))) })), (error) => console.error("TMItems snapshot error:", error));
        const unsubOutputTemplates = onSnapshot(collection(db, 'outputTemplates'), (snapshot) => setData(prev => ({ ...prev, outputTemplates: deduplicate(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OutputTemplate))) })), (error) => console.error("OutputTemplates snapshot error:", error));
        const unsubProfitSettings = onSnapshot(collection(db, 'settings'), (snapshot) => {
            const profitDoc = snapshot.docs.find(d => d.id === 'profit_settings');
            if (profitDoc) {
                setData(prev => ({ ...prev, profitSettings: { ...prev.profitSettings, ...profitDoc.data() } as ProfitSettings }));
            }
        });
        
        setIsLoading(false);
        
        return () => {
            unsubClients(); unsubOperations(); unsubParts(); unsubAssemblies(); unsubWorkOrders();
            unsubEmployees(); unsubTeams(); unsubAssignments(); unsubSkills(); unsubMaterials();
            unsubNonConformities(); unsubQuotes(); unsubSubcontractings(); unsubDeliveryNotes();
            unsubInvoices(); unsubSuppliers(); unsubPurchases(); unsubTimeEntries(); unsubInboundRequests();
            unsubTMItems(); unsubOutputTemplates(); unsubProfitSettings();
        };
    }, []);

    // Helper to remove undefined values before saving to Firestore
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stripUndefined = (obj: any): any => {
        if (obj === undefined) return obj;
        if (Array.isArray(obj)) return obj.map(stripUndefined);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (obj !== null && typeof obj === 'object' && obj.constructor === Object) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const newObj: any = {};
            for (const key in obj) {
                if (obj[key] !== undefined) {
                    newObj[key] = stripUndefined(obj[key]);
                }
            }
            return newObj;
        }
        return obj;
    };

    // CRUD Operations
    const addClient = async (client: Omit<Client, 'id'>) => { await addDoc(collection(db, 'clients'), stripUndefined(client)); };
    const updateClient = async (client: Client) => { const { id, ...data } = client; await updateDoc(doc(db, 'clients', id), stripUndefined(data)); };
    const deleteClient = async (id: string) => { await deleteDoc(doc(db, 'clients', id)); };

    const addPart = async (part: Omit<Part, 'id'>) => { 
        const docRef = await addDoc(collection(db, 'parts'), stripUndefined(part)); 
        return docRef.id;
    };
    const updatePart = async (part: Part) => { const { id, ...data } = part; await updateDoc(doc(db, 'parts', id), stripUndefined(data)); };
    const deletePart = async (id: string) => { await deleteDoc(doc(db, 'parts', id)); };

    const addQuote = async (quote: Omit<Quote, 'id' | 'quoteNumber'>) => { 
        const docRef = await addDoc(collection(db, 'quotes'), stripUndefined(quote)); 
        return docRef.id;
    };
    const updateQuote = async (quote: Quote) => { const { id, ...data } = quote; await updateDoc(doc(db, 'quotes', id), stripUndefined(data)); };
    const deleteQuote = async (id: string) => { await deleteDoc(doc(db, 'quotes', id)); };

    // Placeholder for other functions to make the app compile, will need to be implemented one by one or all at once.
    // Given the risk of errors, I will implement all essential ones to stop the crash.
    const updateAll = useCallback(async () => { console.warn("updateAll called but not implemented for Firestore"); }, []);
    const refreshData = useCallback(async () => { console.warn("refreshData called but not implemented for Firestore"); }, []);
    // Function stubs for other collections...
    const addOperation = async (op: Omit<Operation, 'id'>) => { await addDoc(collection(db, 'operations'), stripUndefined(op)); };
    const updateOperation = async (op: Operation) => { const { id, ...data } = op; await updateDoc(doc(db, 'operations', id), stripUndefined(data)); };
    const deleteOperation = async (id: string) => { await deleteDoc(doc(db, 'operations', id)); };
    
    // ... I will need to add ALL of them. 
    const addAssembly = async (a: Omit<Assembly, 'id'>) => { await addDoc(collection(db, 'assemblies'), stripUndefined(a)); };
    const updateAssembly = async (a: Assembly) => { const { id, ...data } = a; await updateDoc(doc(db, 'assemblies', id), stripUndefined(data)); };
    const deleteAssembly = async (id: string) => { await deleteDoc(doc(db, 'assemblies', id)); };
    
    const addWorkOrder = async (w: Omit<WorkOrder, 'id'>) => { await addDoc(collection(db, 'workOrders'), stripUndefined(w)); };
    const updateWorkOrder = async (w: WorkOrder) => { const { id, ...data } = w; await updateDoc(doc(db, 'workOrders', id), stripUndefined(data)); };
    const deleteWorkOrder = async (id: string) => { await deleteDoc(doc(db, 'workOrders', id)); };
    
    // Add remaining stubs for now. This will allow the app to boot.
    const addEmployee = async (e: Omit<Employee, 'id'>) => { await addDoc(collection(db, 'employees'), stripUndefined(e)); };
    const updateEmployee = async (e: Employee) => { const { id, ...data } = e; await updateDoc(doc(db, 'employees', id), stripUndefined(data)); };
    const deleteEmployee = async (id: string) => { await deleteDoc(doc(db, 'employees', id)); };

    const addTeam = async (t: Omit<Team, 'id'>) => { await addDoc(collection(db, 'teams'), stripUndefined(t)); };
    const updateTeam = async (t: Team) => { const { id, ...data } = t; await updateDoc(doc(db, 'teams', id), stripUndefined(data)); };
    const deleteTeam = async (id: string) => { await deleteDoc(doc(db, 'teams', id)); };

    const addSkill = async (s: Omit<Skill, 'id'>) => { await addDoc(collection(db, 'skills'), stripUndefined(s)); };
    const updateSkill = async (s: Skill) => { const { id, ...data } = s; await updateDoc(doc(db, 'skills', id), stripUndefined(data)); };
    const deleteSkill = async (id: string) => { await deleteDoc(doc(db, 'skills', id)); };

    const addMaterial = async (m: Omit<Material, 'id'>) => { await addDoc(collection(db, 'materials'), stripUndefined(m)); };
    const updateMaterial = async (m: Material) => { const { id, ...data } = m; await updateDoc(doc(db, 'materials', id), stripUndefined(data)); };
    const deleteMaterial = async (id: string) => { await deleteDoc(doc(db, 'materials', id)); };

    const addNonConformity = async (n: Omit<NonConformity, 'id'>) => { await addDoc(collection(db, 'nonConformities'), stripUndefined(n)); };
    const updateNonConformity = async (n: NonConformity) => { const { id, ...data } = n; await updateDoc(doc(db, 'nonConformities', id), stripUndefined(data)); };
    const deleteNonConformity = async (id: string) => { await deleteDoc(doc(db, 'nonConformities', id)); };

    const addSubcontracting = async (s: Omit<Subcontracting, 'id' | 'subcontractingNumber'>) => { 
        const docRef = await addDoc(collection(db, 'subcontractings'), stripUndefined(s)); 
        return docRef.id;
    }; 
    const updateSubcontracting = async (s: Subcontracting) => { const { id, ...data } = s; await updateDoc(doc(db, 'subcontractings', id), stripUndefined(data)); }; 
    const deleteSubcontracting = async (id: string) => { await deleteDoc(doc(db, 'subcontractings', id)); };

    const addDeliveryNote = async (d: Omit<DeliveryNote, 'id'>) => { await addDoc(collection(db, 'deliveryNotes'), stripUndefined(d)); };
    const updateDeliveryNote = async (d: DeliveryNote) => { const { id, ...data } = d; await updateDoc(doc(db, 'deliveryNotes', id), stripUndefined(data)); };
    const deleteDeliveryNote = async (id: string) => { await deleteDoc(doc(db, 'deliveryNotes', id)); };

    const addInvoice = async (i: Omit<Invoice, 'id'>) => { await addDoc(collection(db, 'invoices'), stripUndefined(i)); };
    const updateInvoice = async (i: Invoice) => { const { id, ...data } = i; await updateDoc(doc(db, 'invoices', id), stripUndefined(data)); };
    const deleteInvoice = async (id: string) => { await deleteDoc(doc(db, 'invoices', id)); };

    const addSupplier = async (s: Omit<Supplier, 'id'>) => { await addDoc(collection(db, 'suppliers'), stripUndefined(s)); };
    const updateSupplier = async (s: Supplier) => { const { id, ...data } = s; await updateDoc(doc(db, 'suppliers', id), stripUndefined(data)); };
    const deleteSupplier = async (id: string) => { await deleteDoc(doc(db, 'suppliers', id)); };

    const addPurchase = async (p: Omit<Purchase, 'id'>) => { await addDoc(collection(db, 'purchases'), stripUndefined(p)); };
    const updatePurchase = async (p: Purchase) => { const { id, ...data } = p; await updateDoc(doc(db, 'purchases', id), stripUndefined(data)); };
    const deletePurchase = async (id: string) => { await deleteDoc(doc(db, 'purchases', id)); };

    const addTimeEntry = async (t: Omit<TimeEntry, 'id'>) => { await addDoc(collection(db, 'timeEntries'), stripUndefined(t)); };
    const updateTimeEntry = async (t: TimeEntry) => { const { id, ...data } = t; await updateDoc(doc(db, 'timeEntries', id), stripUndefined(data)); };
    const deleteTimeEntry = async (id: string) => { await deleteDoc(doc(db, 'timeEntries', id)); };

    const updateAssignment= async (a: Assignment) => { const { id, ...data } = a; await updateDoc(doc(db, 'assignments', id), stripUndefined(data)); }; 
    const updateOperationAssignment = async () => { console.warn("updateOperationAssignment not refined"); }; 
    const updateAssignmentObject = async (a: Partial<Assignment> & { id: string }) => { const { id, ...data } = a; await updateDoc(doc(db, 'assignments', id), stripUndefined(data)); }; 
    const updateWorkOrderObject = async (w: Partial<WorkOrder> & { id: string }) => { const { id, ...data } = w; await updateDoc(doc(db, 'workOrders', id), stripUndefined(data)); };

    const addInboundRequest = async (i: Omit<InboundRequest, 'id'>) => { await addDoc(collection(db, 'inboundRequests'), stripUndefined(i)); };
    const updateInboundRequest = async (i: InboundRequest) => { const { id, ...data } = i; await updateDoc(doc(db, 'inboundRequests', id), stripUndefined(data)); };
    const deleteInboundRequest = async (id: string) => { await deleteDoc(doc(db, 'inboundRequests', id)); };

    const updateBendingSettings = async (b: BendingSettings) => { await setDoc(doc(db, 'settings', 'bending_settings'), stripUndefined(b)); };
    const updateLaserSettings = async (l: LaserSettings) => { await setDoc(doc(db, 'settings', 'laser_settings'), stripUndefined(l)); };
    const updateLaserTubeSettings = async (l: LaserTubeSettings) => { await setDoc(doc(db, 'settings', 'laser_tube_settings'), stripUndefined(l)); };
    
    const addTMItem = async (t: Omit<TMItem, 'id'>) => { await addDoc(collection(db, 'tmItems'), stripUndefined(t)); };
    const updateTMItem = async (t: TMItem) => { const { id, ...data } = t; await updateDoc(doc(db, 'tmItems', id), stripUndefined(data)); };
    const deleteTMItem = async (id: string) => { await deleteDoc(doc(db, 'tmItems', id)); };
    
    const addOutputTemplate = async (template: Omit<OutputTemplate, 'id'>) => { await addDoc(collection(db, 'outputTemplates'), stripUndefined(template)); };
    const updateOutputTemplate = async (template: OutputTemplate) => { const { id, ...data } = template; await updateDoc(doc(db, 'outputTemplates', id), stripUndefined(data)); };
    const deleteOutputTemplate = async (id: string) => { await deleteDoc(doc(db, 'outputTemplates', id)); };

    const updateProfitSettings = async (s: ProfitSettings) => { await setDoc(doc(db, 'settings', 'profit_settings'), stripUndefined(s)); };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const importData = async (data: any) => {
        if (!window.confirm("This will clear all current Firestore data and import from JSON. Are you sure?")) return;
        setIsLoading(true);
        try {
            for (const collectionName in data) {
                const items = data[collectionName];
                if (Array.isArray(items)) {
                    // Delete existing items
                    const snapshot = await getDocs(collection(db, collectionName));
                    const deleteBatch = writeBatch(db);
                    let deleteCount = 0;
                    snapshot.docs.forEach(docSnap => {
                        deleteBatch.delete(doc(db, collectionName, docSnap.id));
                        deleteCount++;
                    });
                    if (deleteCount > 0) await deleteBatch.commit();

                    // Add new items
                    const addBatch = writeBatch(db);
                    let addCount = 0;
                    for (const item of items) {
                        const id = item.id ? String(item.id) : doc(collection(db, collectionName)).id;
                        addBatch.set(doc(db, collectionName, id), item);
                        addCount++;
                    }
                    if (addCount > 0) await addBatch.commit();
                }
            }
            alert("Import complete! Please refresh the page.");
        } catch (e) {
            console.error("Import failed:", e);
            alert("Import failed, see console.");
        } finally {
            setIsLoading(false);
        }
    };

    return { 
        ...data, isLoading,
        addClient, updateClient, deleteClient,
        addPart, updatePart, deletePart,
        addQuote, updateQuote, deleteQuote,
        addOperation, updateOperation, deleteOperation,
        addAssembly, updateAssembly, deleteAssembly,
        addWorkOrder, updateWorkOrder, deleteWorkOrder,
        addEmployee, updateEmployee, deleteEmployee,
        addTeam, updateTeam, deleteTeam,
        addSkill, updateSkill, deleteSkill,
        addMaterial, updateMaterial, deleteMaterial,
        addNonConformity, updateNonConformity, deleteNonConformity,
        addSubcontracting, updateSubcontracting, deleteSubcontracting,
        addDeliveryNote, updateDeliveryNote, deleteDeliveryNote,
        addInvoice, updateInvoice, deleteInvoice,
        addSupplier, updateSupplier, deleteSupplier,
        addPurchase, updatePurchase, deletePurchase,
        addTimeEntry, updateTimeEntry, deleteTimeEntry,
        updateAssignment, updateOperationAssignment, updateAssignmentObject, updateWorkOrderObject,
        addInboundRequest, updateInboundRequest, deleteInboundRequest,
        updateBendingSettings, updateLaserSettings, updateLaserTubeSettings,
        addOutputTemplate, updateOutputTemplate, deleteOutputTemplate,
        addTMItem, updateTMItem, deleteTMItem, updateProfitSettings,               
        updateAll, refreshData,
        importData
    };
};


