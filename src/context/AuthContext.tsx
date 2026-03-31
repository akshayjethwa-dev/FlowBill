import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../firebase'; 
import { Merchant, UserProfile } from '../types/user'; 

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  merchantProfile: Merchant | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [merchantProfile, setMerchantProfile] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let profileUnsub: () => void;
    let merchantUnsub: () => void;

    const authUnsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        try {
          // 8. Session Refresh: Listen to user membership doc in real-time
          // This immediately catches if an admin suspends this user while they are logged in.
          const userRef = doc(db, 'users', firebaseUser.uid);
          
          profileUnsub = onSnapshot(userRef, async (userSnap) => {
            if (userSnap.exists()) {
              const userData = { id: userSnap.id, ...userSnap.data() } as UserProfile;
              setUserProfile(userData);

              // Now listen to the linked Merchant document
              const merchantRef = doc(db, 'merchants', userData.merchantId);
              merchantUnsub = onSnapshot(merchantRef, (merchantSnap) => {
                if (merchantSnap.exists()) {
                  setMerchantProfile({ id: merchantSnap.id, ...merchantSnap.data() } as Merchant);
                }
                setLoading(false);
              });
            } else {
              // Trigger backend setup if the profile doc doesn't exist yet
              try {
                const setupUserAccount = httpsCallable(functions, 'setupUserAccount');
                await setupUserAccount();
                await firebaseUser.getIdToken(true); 
              } catch (err) {
                console.warn("Backend setup function pending/failed.");
                setLoading(false);
              }
            }
          });

        } catch (error) {
          console.error("Error fetching profiles", error);
          setLoading(false);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setMerchantProfile(null);
        setLoading(false);
        if (profileUnsub) profileUnsub();
        if (merchantUnsub) merchantUnsub();
      }
    });

    return () => {
      authUnsub();
      if (profileUnsub) profileUnsub();
      if (merchantUnsub) merchantUnsub();
    };
  }, []);

  // ... (keep loginWithGoogle, loginWithEmail, registerWithEmail, logout implementations exactly as they were)

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const registerWithEmail = async (email: string, pass: string) => {
    await createUserWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ 
      user, userProfile, merchantProfile, loading, 
      loginWithGoogle, loginWithEmail, registerWithEmail, logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};