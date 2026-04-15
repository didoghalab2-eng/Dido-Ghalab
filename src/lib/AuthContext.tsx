import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getDocument, subscribeToDocument } from '@/lib/firestore';
import { UserRole, AppSettings, UserProfile } from '@/types';

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
          // Default role for now
          setRole('admin'); 
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
