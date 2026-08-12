import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { UserProfile, LogRecord } from './types';
import OnlineOrders from './components/OnlineOrders';
import AuthScreen from './components/AuthScreen';
import Header from './components/Header';
import LogForms from './components/LogForms';
import LogSheets from './components/LogSheets';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import { ClipboardList, Loader2, AlertCircle } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'forms' | 'logs' | 'dashboard'>('orders');
  const [error, setError] = useState<string>('');

  // 1. Firebase Auth state listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
      
      if (firebaseUser) {
        setProfileLoading(true);
        setError('');
        const profilePath = `users/${firebaseUser.uid}`;
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            setProfile(userDoc.data() as UserProfile);
          } else {
            // Self-healing: create default profile for the authenticated user
            console.warn('User authenticated but profile document not found in Firestore. Creating a default profile.');
            const defaultDept = (firebaseUser.email?.toLowerCase().includes('admin') || 
                                 firebaseUser.email?.toLowerCase().includes('manager') || 
                                 firebaseUser.email?.toLowerCase().includes('supervisor') || 
                                 firebaseUser.email?.toLowerCase().includes('ceo') || 
                                 firebaseUser.email?.toLowerCase().includes('pharmacist') || 
                                 firebaseUser.email === 'enyitang56@gmail.com' ||
                                 firebaseUser.email === 'josephek602@gmail.com') ? 'MANAGEMENT' : 'SALES';
            const defaultRole = defaultDept === 'MANAGEMENT' ? 'Supervisor' : 'Sales Associate';
            const defaultProfile: UserProfile = {
              uid: firebaseUser.uid,
              fullName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Alltrust Staff',
              email: firebaseUser.email || '',
              department: defaultDept as any,
              role: defaultRole as any,
              createdAt: new Date().toISOString()
            };
            
            const { setDoc } = await import('firebase/firestore');
            await setDoc(userDocRef, defaultProfile);
            setProfile(defaultProfile);
            console.log('Successfully self-healed user profile.');
          }
        } catch (err: any) {
          console.error('Error fetching user profile:', err);
          setError('Failed to load user profile details. Check connection.');
          try {
            handleFirestoreError(err, OperationType.GET, profilePath);
          } catch (e) {
            // error thrown as per guideline
          }
        } finally {
          setProfileLoading(false);
        }
      } else {
        setProfile(null);
        setLogs([]);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. Real-time Firebase Firestore database snapshots synchronizer
  useEffect(() => {
    if (!user || !profile) return;

    // Determine if the user is part of management
    const isUserManagement = profile.department === 'MANAGEMENT' || 
      profile.role === 'CEO' || 
      profile.role === 'Pharmacist' || 
      profile.role === 'Supervisor';

    // Create reactive listener: management gets all logs, non-management gets only logs they created
    const logsQuery = isUserManagement 
      ? query(collection(db, 'logs'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'logs'), where('loggedBy', '==', user.uid));

    const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
      const logsList: LogRecord[] = [];
      snapshot.forEach((doc) => {
        logsList.push({ ...doc.data(), id: doc.id } as LogRecord);
      });
      // Sort client-side desc by createdAt to ensure consistent ordering without index issues
      logsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setLogs(logsList);
    }, (err) => {
      console.error('Firestore real-time snapshot subscription failed:', err);
      try {
        handleFirestoreError(err, OperationType.LIST, 'logs');
      } catch (e) {
        // error thrown as per guideline
      }
    });

    return () => unsubscribeLogs();
  }, [user, profile]);

  // Loading Screens
  if (authLoading || profileLoading) {
    return (
      <div id="global_loader" className="min-h-screen bg-blue-50 flex flex-col items-center justify-center space-y-4 font-sans">
        <div className="mx-auto h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
          <ClipboardList className="h-6 w-6 text-white" />
        </div>
        <div className="flex items-center space-x-2 text-blue-700">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <span className="text-sm font-semibold">Loading Alltrust Reporting...</span>
        </div>
      </div>
    );
  }

  // Auth Screen
  if (!user || !profile) {
    return <AuthScreen />;
  }

  // Admin Dashboard view override
  if (user.uid === '8jCULC5vGBey4j7gNgZ4FwXRas63') {
    return <AdminDashboard />;
  }

  return (
    <div id="app_root" className="min-h-screen bg-blue-50 flex flex-col justify-between font-sans">
      
      {/* Workspace Header & Nav tabs */}
      <Header 
        profile={profile} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />

      {/* Main Workspace content */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Error notification banner if any */}
        {error && (
          <div id="global_error_alert" className="mb-6 p-4 bg-red-50 text-red-800 border-l-4 border-red-500 rounded flex items-start space-x-2.5">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <div className="text-sm">
              <span className="font-bold">Database Sync Warning: </span>
              {error}
            </div>
          </div>
        )}

        {/* Tab Selection router */}
        <div className="animate-fade-in transition-all">
          {activeTab === 'orders' && (
            <OnlineOrders currentUser={profile} />
          )}

          {activeTab === 'forms' && (
            <LogForms 
              currentUser={profile} 
              onLogAdded={() => console.log('New logs synced.')} 
            />
          )}

          {activeTab === 'logs' && (
            <LogSheets 
              currentUser={profile} 
              logs={logs} 
              onLogUpdated={() => console.log('Logs modified.')} 
            />
          )}

          {activeTab === 'dashboard' && (
            <Dashboard 
              currentUser={profile} 
              logs={logs} 
            />
          )}
        </div>

      </main>

      {/* Footer Branding */}
      <footer id="app_footer" className="bg-white border-t border-gray-100 py-5 text-center text-xs text-gray-400 font-sans mt-auto">
        <div className="max-w-7xl mx-auto px-4">
          <p>© {new Date().getFullYear()} Alltrust Group Operations. Powered by AppSheet Cloud Sync. Strict compliance protocols in effect.</p>
        </div>
      </footer>

    </div>
  );
}
