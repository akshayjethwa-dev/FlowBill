import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../firebase'; // Ensure functions is imported
import { Merchant, UserProfile } from '../types'; // Ensure UserProfile is imported

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  merchantProfile: Merchant | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
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
        try {
          // 1. Check if custom claims exist on the current token
          const idTokenResult = await firebaseUser.getIdTokenResult();
          
          if (!idTokenResult.claims.merchantId) {
            // No claims = first login. Call backend to create profiles.
            const setupUserAccount = httpsCallable(functions, 'setupUserAccount');
            await setupUserAccount();

            // Force token refresh to pick up the new claims.
            // This will re-trigger onAuthStateChanged, so we return early here.
            await firebaseUser.getIdToken(true);
            return;
          }

          setUser(firebaseUser);

          // 2. Fetch User Profile
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = { id: userSnap.id, ...userSnap.data() } as UserProfile;
            setUserProfile(userData);

            // 3. Fetch linked Merchant Profile using the merchantId from the user profile
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
          console.error("Error setting up user account or fetching profiles", error);
          setUserProfile(null);
          setMerchantProfile(null);
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

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, merchantProfile, loading, loginWithGoogle, loginWithEmail, logout }}>
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