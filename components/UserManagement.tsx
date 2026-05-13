import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebaseService';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useAuth } from '../hooks/useAuth';
import { ROLE_LEVELS, UserProfile } from '../types';

export const UserManagement: React.FC = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  // Avoid 'any'
  interface Invitation { id?: string; email?: string; roleLevel?: number; createdBy?: string; createdAt?: string; }
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState('');
  const [roleLevel, setRoleLevel] = useState(100);

  useEffect(() => {
    if (!profile || profile.roleLevel < ROLE_LEVELS.GESTIONNAIRE) return;

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => d.data() as UserProfile));
    });

    const unsubInvs = onSnapshot(collection(db, 'invitations'), (snap) => {
      setInvitations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubUsers();
      unsubInvs();
    };
  }, [profile]);

  if (!profile || profile.roleLevel < ROLE_LEVELS.GESTIONNAIRE) {
    return <div className="p-4">Accès refusé.</div>;
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    if (roleLevel >= profile.roleLevel && profile.roleLevel !== ROLE_LEVELS.ADMIN) {
      alert("Vous ne pouvez pas créer un rôle égal ou supérieur au vôtre.");
      return;
    }

    try {
      await setDoc(doc(db, 'invitations', email.toLowerCase()), {
        email: email.toLowerCase(),
        roleLevel: Number(roleLevel),
        createdBy: profile.uid,
        createdAt: new Date().toISOString()
      });
      setEmail('');
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      }
    }
  };

  const handleUpdateRole = async (uid: string, newRole: number, currentRole: number) => {
    if (newRole >= profile.roleLevel && profile.roleLevel !== ROLE_LEVELS.ADMIN) {
      alert("Vous ne pouvez pas assigner ce rôle.");
      return;
    }
    if (currentRole >= profile.roleLevel && profile.roleLevel !== ROLE_LEVELS.ADMIN) {
      alert("Vous ne pouvez pas modifier un utilisateur ayant un rôle égal ou supérieur.");
      return;
    }
    
    try {
      await setDoc(doc(db, 'users', uid), { roleLevel: newRole }, { merge: true });
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      }
    }
  };

  const handleResetPassword = async (userEmail: string, currentRole: number) => {
    if (currentRole >= profile.roleLevel && profile.roleLevel !== ROLE_LEVELS.ADMIN) {
      alert("Vous ne pouvez pas réinitialiser le mot de passe d'un utilisateur ayant un rôle égal ou supérieur.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, userEmail);
      alert('Un courriel de réinitialisation a été envoyé à ' + userEmail);
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      }
    }
  };

  const availableRoles = [
    { label: 'Admin (500)', value: 500 },
    { label: 'Gestionnaire (499)', value: 499 },
    { label: 'Production (300)', value: 300 },
    { label: 'Directeur des Ventes (201)', value: 201 },
    { label: 'Vendeur (200)', value: 200 },
    { label: 'Clients (100)', value: 100 },
    { label: 'En attente (0)', value: 0 }
  ];

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4 border-b pb-2">Gestion des Utilisateurs</h2>

      <div className="mb-8 bg-slate-50 p-4 rounded border">
        <h3 className="font-bold mb-2">Pré-approuver un courriel (Invitation)</h3>
        <form onSubmit={handleInvite} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full border p-2 rounded"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 mb-1">Rôle</label>
            <select
              className="w-full border p-2 rounded"
              value={roleLevel}
              onChange={e => setRoleLevel(Number(e.target.value))}
            >
              {availableRoles.map(r => (
                <option 
                  key={r.value} 
                  value={r.value}
                  disabled={r.value >= profile.roleLevel && profile.roleLevel !== ROLE_LEVELS.ADMIN}
                >
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700">
            Autoriser
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="font-bold mb-2 text-lg">Candidatures en attente / Invitations</h3>
          <div className="space-y-2">
            {invitations.map(inv => (
              <div key={inv.id} className="flex justify-between items-center p-3 bg-slate-50 border rounded text-sm">
                <span>{inv.email}</span>
                <span className="font-mono bg-blue-100 text-blue-800 px-2 rounded">Niveau {inv.roleLevel}</span>
              </div>
            ))}
            {invitations.length === 0 && <p className="text-sm text-slate-500">Aucune invitation active.</p>}
          </div>
        </div>

        <div>
          <h3 className="font-bold mb-2 text-lg">Utilisateurs Enregistrés</h3>
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.uid} className="flex justify-between items-center p-3 bg-slate-50 border rounded text-sm">
                <div>
                  <div className="font-bold">{u.displayName || 'Sans nom'}</div>
                  <div className="text-slate-500 text-xs">{u.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="border p-1 text-xs rounded bg-white"
                    value={u.roleLevel}
                    onChange={e => handleUpdateRole(u.uid, Number(e.target.value), u.roleLevel)}
                    disabled={
                      (u.roleLevel >= profile.roleLevel && profile.roleLevel !== ROLE_LEVELS.ADMIN) || 
                      u.email === 'karllecours@gmail.com'
                    }
                  >
                    {availableRoles.map(r => (
                      <option 
                        key={r.value} 
                        value={r.value}
                        disabled={r.value >= profile.roleLevel && profile.roleLevel !== ROLE_LEVELS.ADMIN}
                      >
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleResetPassword(u.email, u.roleLevel)}
                    className="text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded"
                    title="Envoyer un lien de réinitialisation de mot de passe"
                  >
                    Mot de passe
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
