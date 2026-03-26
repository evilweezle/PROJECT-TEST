import React, { useState, useEffect } from 'react';
import type { Client, Operation, Part, WorkOrder, Employee, Team, Skill, Material, NonConformity } from './types';
import { Sidebar } from './components/Sidebar';
import { ManagementPane } from './components/ManagementPane';
import { useProjectData } from './hooks/useProjectData';
import { ClientForm, OperationForm, PartForm, WorkOrderForm, EmployeeForm, TeamForm, SkillForm, MaterialForm, NonConformityForm } from './components/Forms';
import { CheckCircleIcon, MenuIcon, LogInIcon, LogOutIcon, UserIcon, Loader2Icon } from './components/icons';
import { Modal } from './components/Modal';
import { WorkOrderDetailsView } from './components/WorkOrderPrintView';
import { auth } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';

type View = 'work-orders' | 'parts' | 'clients' | 'operations' | 'employees' | 'teams' | 'skills' | 'materials' | 'non-conformities';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2Icon className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-600 font-medium">Initializing SharePoint List Hub...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-200">
          <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <CheckCircleIcon className="w-12 h-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">SharePoint List Hub</h1>
          <p className="text-slate-600 mb-8">
            Welcome to your centralized data management portal. Please sign in to access your organization's lists.
          </p>
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-200"
          >
            <LogInIcon className="w-5 h-5" />
            Sign in with Google
          </button>
          <p className="mt-6 text-xs text-slate-400">
            Secure enterprise access powered by Firebase Authentication
          </p>
        </div>
      </div>
    );
  }

  return <MainApp user={user} handleLogout={handleLogout} />;
};

const MainApp: React.FC<{ user: User; handleLogout: () => void }> = ({ user, handleLogout }) => {
  const [currentView, setCurrentView] = useState<View>('work-orders');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editingOperation, setEditingOperation] = useState<Operation | null>(null);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [editingWorkOrder, setEditingWorkOrder] = useState<WorkOrder | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [editingNonConformity, setEditingNonConformity] = useState<NonConformity | null>(null);
  const [detailedWorkOrder, setDetailedWorkOrder] = useState<WorkOrder | null>(null);

  const {
    clients, operations, parts, workOrders, employees, teams, assignments, skills, materials, nonConformities,
    addClient, addOperation, addPart, addWorkOrder, addEmployee, addTeam, addSkill, addMaterial, addNonConformity,
    deleteClient, deleteOperation, deletePart, deleteWorkOrder, deleteEmployee, deleteTeam, deleteSkill, deleteMaterial, deleteNonConformity,
    updateClient, updateOperation, updatePart, updateWorkOrder, updateEmployee, updateTeam, updateSkill, updateMaterial, updateNonConformity,
    updateAssignment,
    isLoading: isDataLoading
  } = useProjectData(user);

  if (isDataLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2Icon className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-600 font-medium">Loading organization data...</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (currentView) {
      case 'work-orders':
        return (
          <ManagementPane<WorkOrder>
            title="Work Orders"
            items={workOrders}
            columns={[
              { key: 'name', header: 'Name' },
              { key: 'clientId', header: 'Client', render: (wo) => clients.find(c => c.id === wo.clientId)?.name || 'N/A' },
              { key: 'startDate', header: 'Start Date' },
              { key: 'finishDate', header: 'Finish Date' },
              { key: 'parts', header: 'Parts Count', render: (wo) => wo.parts.length },
            ]}
            onDeleteItem={deleteWorkOrder}
            onEditItem={setEditingWorkOrder}
            onViewItem={setDetailedWorkOrder}
            renderForm={(onClose) => <WorkOrderForm clients={clients} parts={parts} onSubmit={(data) => { addWorkOrder(data); onClose(); }} onCancel={onClose} />}
          />
        );
      case 'parts':
        return (
          <ManagementPane<Part>
            title="Parts"
            items={parts}
            columns={[
              { key: 'name', header: 'Name' },
              { key: 'materialId', header: 'Material', render: (part) => materials.find(m => m.id === part.materialId)?.name || 'N/A' },
              { key: 'operations', header: 'Operations', render: (part) => 
                  part.operations.map(op => {
                    const opDetails = operations.find(o => o.id === op.operationId);
                    return `${opDetails?.name || 'N/A'} (${op.estimatedTimeMinutes} min)`;
                  }).join(', ')
              },
            ]}
            onDeleteItem={deletePart}
            onEditItem={setEditingPart}
            renderForm={(onClose) => <PartForm materials={materials} operations={operations} onSubmit={(data) => { addPart(data); onClose(); }} onCancel={onClose} />}
          />
        );
      case 'clients':
        return (
          <ManagementPane<Client>
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
            title="Operations"
            items={operations}
            columns={[
              { key: 'name', header: 'Name' },
              { key: 'rate', header: 'Hourly Rate', render: (op) => `$${op.rate.toFixed(2)}` },
            ]}
            onDeleteItem={deleteOperation}
            onEditItem={setEditingOperation}
            renderForm={(onClose) => <OperationForm onSubmit={(data) => { addOperation(data); onClose(); }} onCancel={onClose} />}
          />
        );
      case 'materials':
        return (
          <ManagementPane<Material>
            title="Materials"
            items={materials}
            columns={[
              { key: 'name', header: 'Name' },
              { key: 'grade', header: 'Grade' },
              { key: 'thicknessGauge', header: 'Thickness (Gauge)' },
              { key: 'pricePerLbs', header: 'Price ($/lbs)', render: (m) => `$${m.pricePerLbs.toFixed(2)}` },
              { key: 'pricePerSqFt', header: 'Price (sq/ft)', render: (m) => `$${m.pricePerSqFt.toFixed(2)}` },
              { key: 'cost', header: 'Cost ($/unit)', render: (m) => `$${m.cost.toFixed(2)}` },
            ]}
            onDeleteItem={deleteMaterial}
            onEditItem={setEditingMaterial}
            renderForm={(onClose) => <MaterialForm onSubmit={(data) => { addMaterial(data); onClose(); }} onCancel={onClose} />}
          />
        );
      case 'employees':
        return (
          <ManagementPane<Employee>
            title="Employees"
            items={employees}
            columns={[
              { key: 'name', header: 'Name' },
              { key: 'role', header: 'Role' },
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
            title="Teams"
            items={teams}
            columns={[
              { key: 'name', header: 'Name' },
              { key: 'employeeIds', header: 'Members', render: (team) => team.employeeIds.map(empId => employees.find(e => e.id === empId)?.name).join(', ') || 'No members' },
            ]}
            onDeleteItem={deleteTeam}
            onEditItem={setEditingTeam}
            renderForm={(onClose) => <TeamForm employees={employees} onSubmit={(data) => { addTeam(data); onClose(); }} onCancel={onClose} />}
          />
        );
      case 'skills':
        return (
          <ManagementPane<Skill>
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
            title="Non-Conformities"
            items={nonConformities}
            columns={[
              { key: 'description', header: 'Description', render: (nc) => <p className="whitespace-normal w-48">{nc.description}</p>},
              { key: 'workOrderId', header: 'Work Order', render: (nc) => workOrders.find(wo => wo.id === nc.workOrderId)?.name || 'N/A' },
              { key: 'partInstanceId', header: 'Part', render: (nc) => {
                  const wo = workOrders.find(wo => wo.id === nc.workOrderId);
                  return wo?.parts.find(p => p.instanceId === nc.partInstanceId)?.name || 'N/A';
              }},
              { key: 'operationId', header: 'Operation', render: (nc) => operations.find(o => o.id === nc.operationId)?.name || 'N/A' },
              { key: 'status', header: 'Status' },
              { key: 'severity', header: 'Severity' },
              { key: 'dateReported', header: 'Date Reported' },
            ]}
            onDeleteItem={deleteNonConformity}
            onEditItem={setEditingNonConformity}
            renderForm={(onClose) => <NonConformityForm workOrders={workOrders} operations={operations} onSubmit={(data) => { addNonConformity(data as Omit<NonConformity, 'id'>); onClose(); }} onCancel={onClose} />}
          />
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
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
              <MenuIcon className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <CheckCircleIcon className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-slate-800 hidden sm:block">SharePoint List Hub</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || ''} className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon className="w-5 h-5 text-slate-400" />
              )}
              <span className="text-sm font-medium text-slate-700 max-w-[150px] truncate">
                {user.displayName || user.email}
              </span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOutIcon className="w-5 h-5" />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F3F2F1]">
          {renderContent()}
        </main>
      </div>

      {editingClient && (
        <Modal isOpen={!!editingClient} onClose={() => setEditingClient(null)} title="Edit Client">
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
        <Modal isOpen={!!editingOperation} onClose={() => setEditingOperation(null)} title="Edit Operation">
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
        <Modal isOpen={!!editingPart} onClose={() => setEditingPart(null)} title="Edit Part">
          <PartForm
            materials={materials}
            operations={operations}
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

      {editingWorkOrder && (
        <Modal isOpen={!!editingWorkOrder} onClose={() => setEditingWorkOrder(null)} title="Edit Work Order">
          <WorkOrderForm
            clients={clients}
            parts={parts}
            initialData={editingWorkOrder}
            onSubmit={(data) => {
              if ('id' in data && data.id) {
                updateWorkOrder(data as Omit<WorkOrder, 'parts' | 'finishDate'> & { 
                  partIds: string[]; 
                  partDependencies?: Record<string, string[]> 
                });
              }
              setEditingWorkOrder(null);
            }}
            onCancel={() => setEditingWorkOrder(null)}
          />
        </Modal>
      )}

      {editingEmployee && (
        <Modal isOpen={!!editingEmployee} onClose={() => setEditingEmployee(null)} title="Edit Employee">
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
        <Modal isOpen={!!editingTeam} onClose={() => setEditingTeam(null)} title="Edit Team">
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
        <Modal isOpen={!!editingSkill} onClose={() => setEditingSkill(null)} title="Edit Skill">
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
        <Modal isOpen={!!editingMaterial} onClose={() => setEditingMaterial(null)} title="Edit Material">
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

      {editingNonConformity && (
        <Modal isOpen={!!editingNonConformity} onClose={() => setEditingNonConformity(null)} title="Edit Non-Conformity">
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
          />
        </Modal>
      )}

    </div>
  );
};

export default App;
