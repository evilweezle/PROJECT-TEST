import React, { useState, useEffect } from 'react';
import { db } from '../services/firebaseService';
import { collection, onSnapshot, doc, updateDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { SparklesIcon, ClockIcon, PlayIcon } from 'lucide-react';
import { Employee, Assignment, WorkOrder } from '../types';

export const ProductionDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [closingAssignment, setClosingAssignment] = useState<Assignment | null>(null);
  const [closeComment, setCloseComment] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Map the User profile to an Employee record based on email, or create one if it doesn't exist conceptually
  // Since we haven't tightly coupled Auth user to Employee list, we'll try to find an employee with matching email/name, or just show dashboard based on profile string.
  // We'll query Employees collection if it exists
  useEffect(() => {
    if (!profile) return;
    // Assuming there's an employees collection
    const unsub = onSnapshot(collection(db, 'employees'), async (snap) => {
      const emps = snap.docs.map(d => ({...d.data(), id: d.id}) as Employee);
      const currentEmp = emps.find(e => e.name === profile.displayName) || null;
      setEmployee(currentEmp);
      
      // Auto-create employee record if it doesn't exist
      if (!currentEmp && profile.displayName) {
        try {
          const newEmpDoc = doc(collection(db, 'employees'));
          await setDoc(newEmpDoc, {
            name: profile.displayName,
            role: 'Production',
            employeeNumber: Math.floor(100 + Math.random() * 900).toString(),
            punchIn: null,
            punchOut: null,
            aiSuggestions: []
          });
        } catch(err) {
          console.error("Couldn't create employee auto record", err);
        }
      }
    });

    const unsubWO = onSnapshot(collection(db, 'workOrders'), (snap) => {
      setWorkOrders(snap.docs.map(d => d.data() as WorkOrder));
    });

    const unsubAssign = onSnapshot(collection(db, 'assignments'), (snap) => {
      setAssignments(snap.docs.map(d => ({id: d.id, ...d.data()}) as Assignment));
    });

    return () => {
      unsub();
      unsubWO();
      unsubAssign();
    };
  }, [profile]);

  const togglePunch = async () => {
    if (!employee) {
      alert("Votre profil employé n'est pas lié.");
      return;
    }
    const isPunchedIn = employee.punchIn && !employee.punchOut;
    try {
      const val = isPunchedIn 
        ? { punchOut: new Date().toISOString() } 
        : { punchIn: new Date().toISOString(), punchOut: null };
      await updateDoc(doc(db, 'employees', employee.id), val);
    } catch(err) {
      console.error(err);
    }
  };

  const isPunchedIn = employee?.punchIn && !employee?.punchOut;

  // Filter assignments for this employee
  const myAssignments = assignments.filter(a => employee && a.employeeIds?.includes(employee.id));
  const activeAssignments = myAssignments.filter(a => a.status === 'In Progress');
  const pendingAssignments = myAssignments.filter(a => a.status === 'Pending');

  return (
    <div className="flex-1 bg-slate-50 overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header & Punch Station */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800">Bonjour, {profile?.displayName} !</h1>
            <p className="text-slate-500">Prêt pour une nouvelle journée de production ?</p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-3xl font-mono font-black text-slate-800">
                {currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                {currentTime.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
            </div>

            <button 
              onClick={togglePunch}
              className={`w-32 h-16 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 ${isPunchedIn ? 'bg-amber-500 shadow-amber-200' : 'bg-green-500 shadow-green-200'}`}
            >
              <ClockIcon className="w-5 h-5" />
              {isPunchedIn ? 'Punch OUT' : 'Punch IN'}
            </button>
          </div>
        </div>

        {/* Status Warning if not punched in */}
        {!isPunchedIn && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-center gap-3">
            <ClockIcon className="w-5 h-5" />
            <span className="font-bold">Vous n'êtes pas punché. Veuillez faire un "Punch IN" avant de commencer vos tâches.</span>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Main Tasks List */}
          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h2 className="font-black text-slate-800 flex items-center gap-2">
                  <PlayIcon className="w-4 h-4 text-emerald-500" /> Tâche Active
                </h2>
              </div>
              <div className="p-0">
                {activeAssignments.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 font-medium">Aucune tâche en cours</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {activeAssignments.map(a => (
                      <div key={a.id} className="p-4 hover:bg-slate-50 transition-colors">
                        <div className="font-bold text-slate-800">Job {workOrders.find(w => w.id === a.workOrderId)?.workOrderNumber}</div>
                        <div className="text-sm text-slate-500 mt-1">Opération ID: {a.operationId}</div>
                        <div className="mt-4 flex gap-2">
                          <button 
                            onClick={() => setClosingAssignment(a)}
                            className="px-4 py-2 bg-red-50 text-red-600 font-bold rounded-lg text-sm border border-red-200 hover:bg-red-100"
                          >
                            Fermer la job / Signaler
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h2 className="font-black text-slate-800">Prochaines Tâches (À faire)</h2>
              </div>
              <div className="p-0">
                {pendingAssignments.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 font-medium">Rien à l'horizon</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                     {pendingAssignments.map(a => (
                      <div key={a.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center">
                        <div>
                          <div className="font-bold text-slate-800">Job {workOrders.find(w => w.id === a.workOrderId)?.workOrderNumber}</div>
                          <div className="text-xs text-slate-500">Operation: {a.operationId}</div>
                        </div>
                        <button disabled={!isPunchedIn} className="px-3 py-1.5 bg-blue-50 text-blue-600 font-bold rounded text-xs border border-blue-200 hover:bg-blue-100 disabled:opacity-50">
                          Commencer
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* AI Sidebar Area */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-5">
              <div className="flex items-center gap-2 text-indigo-800 mb-3">
                <SparklesIcon className="w-5 h-5" />
                <h3 className="font-black text-lg">Conseils IA</h3>
              </div>
              <div className="space-y-3">
                {employee?.aiSuggestions && employee.aiSuggestions.length > 0 ? (
                  employee.aiSuggestions.map((s, i) => (
                    <div key={i} className="bg-white/80 p-3 rounded-lg shadow-sm border border-white text-sm text-slate-700 leading-relaxed font-medium">
                      {s}
                    </div>
                  ))
                ) : (
                  <div className="bg-white/80 p-3 rounded-lg shadow-sm border border-white text-sm text-slate-700 leading-relaxed font-medium">
                    Manque de données pour vous conseiller, prenez l'habitude de commenter vos fermeture de jobs!
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h3 className="font-black text-slate-800 mb-4">Résumé de vos Job Closes</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded border border-slate-100">
                  <span className="text-sm font-medium text-slate-600">Jobs terminés cette semaine</span>
                  <span className="font-black text-lg text-slate-800">14</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded border border-slate-100">
                  <span className="text-sm font-medium text-slate-600">Signaux Qualité</span>
                  <span className="font-black text-lg text-red-500">2</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>

      {closingAssignment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8">
            <h3 className="text-xl font-black text-slate-800 mb-2">Fermeture de la tâche</h3>
            <p className="text-sm text-slate-500 mb-6">Avez-vous des commentaires ou incidents à signaler pour cette opération ? Ces notes aideront Jarviss à formuler de meilleurs conseils pour la suite.</p>
            
            <textarea 
              value={closeComment}
              onChange={e => setCloseComment(e.target.value)}
              placeholder="Ex: 'Difficulté avec le retrait laser', 'Le pliage a craqué', 'Outil manquant'..."
              className="w-full p-4 border-2 border-slate-200 rounded-2xl min-h-[150px] mb-6 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all resize-none text-slate-700"
            />

            <div className="flex gap-4">
              <button 
                onClick={() => {
                  setClosingAssignment(null);
                  setCloseComment('');
                }}
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-colors"
              >
                ANNULER
              </button>
              <button 
                onClick={async () => {
                  if (closingAssignment) {
                    try {
                      await updateDoc(doc(db, 'assignments', closingAssignment.id), {
                        status: 'Completed',
                        completionComment: closeComment
                      });
                      setClosingAssignment(null);
                      setCloseComment('');
                    } catch(err) {
                      console.error("Failed to complete assignment", err);
                      alert("Erreur lors de la fermeture de la tâche.");
                    }
                  }
                }}
                className="flex-1 py-4 bg-green-500 text-white rounded-2xl font-black shadow-lg shadow-green-500/30 hover:bg-green-600 transition-colors"
              >
                CONFIRMER
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
