import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, firebaseReady } from '@/lib/firebase';
import { registerOrLoginMockUser } from '@/lib/mockUserDb';

const COLLEGE_DOMAIN = 'college.edu';

export type AppUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: 'admin' | 'staff' | 'student';
  department?: 'labA' | 'labB' | 'library' | 'adminoffice' | 'faculty' | 'network' | 'hostel';
  isMock?: boolean;
};

export type UserProfile = {
  isFirstLogin: boolean;
  source: 'firestore' | 'mock';
};

type AuthContextValue = {
  user: AppUser | null;
  loading: boolean;
  profileLoading: boolean;
  userProfile: UserProfile | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string, mode: 'signin' | 'signup') => Promise<void>;
  loginMock: (email: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isCollegeEmail(email: string | null | undefined) {
  return Boolean(email && email.toLowerCase().endsWith(`@${COLLEGE_DOMAIN}`));
}

function roleFromEmail(email: string | null): 'admin' | 'staff' | 'student' {
  if (!email) return 'student';
  
  const lower = email.toLowerCase();
  
  // Check for admin
  if (lower.includes('admin') || lower.includes('it.')) {
    return 'admin';
  }
  
  // Check for student
  if (lower.includes('student')) {
    return 'student';
  }
  
  // All other college.edu accounts are staff
  if (lower.endsWith('college.edu')) {
    return 'staff';
  }
  
  // Default to student for other accounts
  return 'student';
}

function mapFirebaseUser(user: User): AppUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    role: roleFromEmail(user.email),
  };
}

async function enforceCollegeDomain(user: User) {
  if (isCollegeEmail(user.email)) return;
  await signOut(auth!);
  throw new Error(`Only @${COLLEGE_DOMAIN} accounts can access Antigravity.`);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!firebaseReady || !auth) {
      const raw = localStorage.getItem('mock_user');
      if (raw) {
        try {
          const mock = JSON.parse(raw) as { email?: string; uid?: string; role?: string };
          setUser({
            uid: mock.uid || 'mock',
            email: mock.email || null,
            displayName: null,
            role: mock.role === 'admin' ? 'admin' : 'staff',
            isMock: true,
          });
          setUserProfile({ isFirstLogin: false, source: 'mock' });
        } catch {
          localStorage.removeItem('mock_user');
        }
      }
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && !isCollegeEmail(firebaseUser.email)) {
        await signOut(auth);
        setUser(null);
        setUserProfile(null);
        setProfileLoading(false);
        setLoading(false);
        return;
      }

      setUser(firebaseUser ? mapFirebaseUser(firebaseUser) : null);
      if (!firebaseUser) {
        setUserProfile(null);
        setProfileLoading(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || user.isMock || !db) {
      if (!user) setUserProfile(null);
      return;
    }

    let cancelled = false;
    setProfileLoading(true);

    (async () => {
      try {
        const ref = doc(db, 'users', user.uid);
        const snapshot = await getDoc(ref);
        if (cancelled) return;

        if (!snapshot.exists()) {
          const role = roleFromEmail(user.email);
          await setDoc(ref, {
            email: user.email,
            displayName: user.displayName,
            role: role === 'admin' ? 'admin' : 'staff',
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
          });
          setUser((current) => (current ? { ...current, role } : current));
          setUserProfile({ isFirstLogin: true, source: 'firestore' });
        } else {
          const data = snapshot.data() as { role?: string };
          const role = data.role === 'admin' || data.role === 'staff' ? data.role : roleFromEmail(user.email);
          setUser((current) => (current ? { ...current, role } : current));
          await updateDoc(ref, { lastLoginAt: serverTimestamp() });
          setUserProfile({ isFirstLogin: false, source: 'firestore' });
        }
      } catch {
        if (!cancelled) {
          setUserProfile({ isFirstLogin: false, source: 'firestore' });
        }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid, user?.isMock]);

  const signInWithGoogle = useCallback(async () => {
    if (!firebaseReady || !auth) {
      throw new Error('Firebase is not configured. Use demo login or set VITE_FIREBASE_* env vars.');
    }
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ hd: COLLEGE_DOMAIN, prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    await enforceCollegeDomain(result.user);
  }, []);

  const signInWithEmail = useCallback(
    async (email: string, password: string, mode: 'signin' | 'signup') => {
      if (!firebaseReady || !auth) {
        throw new Error('Firebase is not configured.');
      }
      if (!isCollegeEmail(email)) {
        throw new Error(`Use your @${COLLEGE_DOMAIN} email address.`);
      }
      if (mode === 'signup') {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await enforceCollegeDomain(result.user);
        return;
      }
      const result = await signInWithEmailAndPassword(auth, email, password);
      await enforceCollegeDomain(result.user);
    },
    []
  );

  const loginMock = useCallback(async (email: string) => {
    if (!isCollegeEmail(email)) {
      throw new Error(`Demo access also requires @${COLLEGE_DOMAIN} emails.`);
    }
    const { isFirstLogin } = registerOrLoginMockUser(email);
    const role = roleFromEmail(email);
    const mock: AppUser = {
      uid: `mock_${Math.random().toString(36).slice(2, 9)}`,
      email,
      displayName: null,
      role,
      isMock: true,
    };
    localStorage.setItem('mock_user', JSON.stringify({ email, uid: mock.uid, role: mock.role }));
    setUser(mock);
    setUserProfile({ isFirstLogin, source: 'mock' });
    setProfileLoading(false);
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem('mock_user');
    setUserProfile(null);
    if (firebaseReady && auth) {
      await signOut(auth);
    }
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      profileLoading,
      userProfile,
      signInWithGoogle,
      signInWithEmail,
      loginMock,
      logout,
    }),
    [user, loading, profileLoading, userProfile, signInWithGoogle, signInWithEmail, loginMock, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuthContext must be used within AuthProvider');
  return context;
}
