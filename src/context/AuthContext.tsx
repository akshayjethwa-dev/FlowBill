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
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../firebase'; 
import { Merchant, UserProfile } from '../types'; 

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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // ✅ FIX: Set the user IMMEDIATELY so the UI navigates away from the Login screen!
        setUser(firebaseUser);

        try {
          // Check if custom claims exist on the current token
          const idTokenResult = await firebaseUser.getIdTokenResult();
          
          if (!idTokenResult.claims.merchantId) {
            // It's a new user. We can attempt to call the backend function to set up DB docs,
            // but we wrap it in a try/catch so it doesn't break the UI if functions aren't deployed.
            try {
              const setupUserAccount = httpsCallable(functions, 'setupUserAccount');
              await setupUserAccount();
              await firebaseUser.getIdToken(true); // Refresh token in background
            } catch (functionError) {
              console.warn("Backend setup function pending/failed, relying on frontend onboarding.", functionError);
            }
          }

          // Fetch User Profile
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = { id: userSnap.id, ...userSnap.data() } as UserProfile;
            setUserProfile(userData);

            // Fetch linked Merchant Profile
            const merchantRef = doc(db, 'merchants', userData.merchantId);
            const merchantSnap = await getDoc(merchantRef);
            
            if (merchantSnap.exists()) {
              setMerchantProfile({ id: merchantSnap.id, ...merchantSnap.data() } as Merchant);
            } else {
              setMerchantProfile(null);
            }
          } else {
            setUserProfile(null);
            setMerchantProfile(null);
          }
        } catch (error) {
          console.error("Error fetching profiles", error);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setMerchantProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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