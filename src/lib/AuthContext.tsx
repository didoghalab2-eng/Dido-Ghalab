import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getDocument, subscribeToDocument, setDocument } from '@/lib/firestore';
import { UserRole, AppSettings, UserProfile } from '@/types';

const MASTER_ADMIN_EMAIL = 'didoghalab2@gmail.com';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  settings: AppSettings | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  role: null, 
  settings: null, 
  loading: true 
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Fetch role
        const userData = await getDocument<UserProfile>('users', firebaseUser.uid);
        if (userData) {
          setRole(userData.role);
        } else {
          // New user logic
          const isMasterAdmin = firebaseUser.email === MASTER_ADMIN_EMAIL;
          const newRole: UserRole = isMasterAdmin ? 'admin' : 'expenses'; // Default to lowest privilege
          
          const newProfile: UserProfile = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            role: newRole
          };
          
          await setDocument('users', firebaseUser.uid, newProfile);
          setRole(newRole);
        }
      } else {
        setRole(null);
      }
      
      setLoading(false);
    });

    const unsubscribeSettings = subscribeToDocument<AppSettings>('settings', 'app', (data) => {
      setSettings(data);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeSettings();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, settings, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
