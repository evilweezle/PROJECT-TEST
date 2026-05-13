import { useState, useEffect, createContext, useContext } from 'react';
import { auth, db } from '../services/firebaseService';
import {
  onAuthStateChanged,
  User as FirebaseUser,
  signOut
} from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { UserProfile, ROLE_LEVELS } from '../types';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Subscribe to user profile
        const userRef = doc(db, 'users', firebaseUser.uid);
        const unsubscribeProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            // Wait, what if profile doesn't exist?
            // User was created but profile not set in users?
            // Normally, an admin generates an invitation/profile via email,
            // or we handle initial creation.
            // If the user's email is not the super admin, and profile missing,
            // we could restrict access.
            // Let's hardcode the first user as level 500 Admin based on email (karllecours@gmail.com) -> we will use the user profile if established, else create it if email matches admin email.
            setProfile(null);
          }
          setLoading(false);
        });

        return () => {
          unsubscribeProfile();
        };
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Initialize Karl as Super Admin if not exist
  useEffect(() => {
    if (user && !profile && !loading) {
      const initAdmin = async () => {
        if (user.email === 'karllecours@gmail.com') { // Hardcode the super admin as requested
          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email,
            roleLevel: ROLE_LEVELS.ADMIN,
            displayName: user.displayName || 'Admin Karl',
            createdAt: new Date().toISOString(),
          };
          await setDoc(doc(db, 'users', user.uid), newProfile);
        }
      };
      initAdmin();
    }
  }, [user, profile, loading]);

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
