import { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider, appleProvider } from '../lib/firebase';
import { sendWelcomeSignupEmail } from '../lib/emailService';

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let profileUnsub;
    
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      try {
        if (firebaseUser) {
          // 1. Immediately set base user to unblock routing & UI instantly
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            isPartial: true
          });
          setLoading(false);

          // 2. Subscribe to profile to get roles and firmId organically
          if (profileUnsub) profileUnsub(); // cleanup previous
          profileUnsub = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
            if (docSnap.exists()) {
              setUser(prev => ({
                ...(prev || {}),
                ...docSnap.data(),
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                isPartial: false
              }));
            } else {
              // User document is missing. We must clear isPartial so DashboardLayout handles them.
              setUser(prev => ({
                ...(prev || {}),
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                isPartial: false
              }));
            }
          }, (err) => {
            console.error('Profile snapshot error:', err);
          });
        } else {
          if (profileUnsub) {
            profileUnsub();
            profileUnsub = null;
          }
          setUser(null);
          setLoading(false);
        }
      } catch (err) {
        console.error('Auth state observer error:', err);
        setUser(firebaseUser ? { uid: firebaseUser.uid, email: firebaseUser.email } : null);
        setLoading(false);
      }
    });

    return () => {
      unsub();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  const loginWithEmail = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  };

  const signupWithEmail = async (email, password, displayName) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName });
    // Create user doc in Firestore
    await setDoc(doc(db, 'users', result.user.uid), {
      email,
      displayName,
      role: 'admin',
      onboardingComplete: false,
      createdAt: serverTimestamp(),
    });
    // Send 7-day urgency lock welcome email asynchronously (fire and forget)
    sendWelcomeSignupEmail(email, displayName).catch(console.error);
    return result.user;
  };

  const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    // Create user doc if first login
    const userDoc = await getDoc(doc(db, 'users', result.user.uid));
    if (!userDoc.exists()) {
      await setDoc(doc(db, 'users', result.user.uid), {
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        role: 'admin',
        onboardingComplete: false,
        createdAt: serverTimestamp(),
      });
      // Fire and forget email queueing
      sendWelcomeSignupEmail(result.user.email, result.user.displayName).catch(console.error);
    }
    return result.user;
  };

  const loginWithApple = async () => {
    const result = await signInWithPopup(auth, appleProvider);
    const userDoc = await getDoc(doc(db, 'users', result.user.uid));
    if (!userDoc.exists()) {
      await setDoc(doc(db, 'users', result.user.uid), {
        email: result.user.email,
        displayName: result.user.displayName || '',
        photoURL: result.user.photoURL || '',
        role: 'admin',
        onboardingComplete: false,
        createdAt: serverTimestamp(),
      });
      sendWelcomeSignupEmail(result.user.email, result.user.displayName).catch(console.error);
    }
    return result.user;
  };

  const logout = () => signOut(auth);

  const value = {
    user,
    loading,
    loginWithEmail,
    signupWithEmail,
    loginWithGoogle,
    loginWithApple,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
