import { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
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
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      // CIRCUIT BREAKER: Don't let a hanging getDoc block the entire app boot
      const timeoutPromise = new Promise(resolve => setTimeout(() => resolve('TIMEOUT'), 2500));
      
      try {
        if (firebaseUser) {
          // Attempt to fetch profile with a strict timeout
          const docRef = doc(db, 'users', firebaseUser.uid);
          const result = await Promise.race([
            getDoc(docRef),
            timeoutPromise
          ]);

          if (result === 'TIMEOUT') {
            console.warn('Auth: Firestore profile fetch timed out. Proceeding with basic auth data.');
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              isPartial: true
            });
          } else {
            const userDoc = result;
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              ...(userDoc.exists() ? userDoc.data() : {}),
            });
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Auth state observer error:', err);
        setUser(firebaseUser ? { uid: firebaseUser.uid, email: firebaseUser.email } : null);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
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
    // Send 7-day urgency lock welcome email
    await sendWelcomeSignupEmail(email, displayName);
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
      await sendWelcomeSignupEmail(result.user.email, result.user.displayName);
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
      await sendWelcomeSignupEmail(result.user.email, result.user.displayName);
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
