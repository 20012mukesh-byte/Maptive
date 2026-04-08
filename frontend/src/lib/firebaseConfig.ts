import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore, collection, addDoc, Timestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
};

export const firebaseReady = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (firebaseReady) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

// Initialize with sample incidents
export async function initializeSampleData() {
  if (!db) {
    console.log('ℹ️ Firestore not initialized');
    return;
  }
  
  try {
    const incidentsRef = collection(db, 'incident_reports');
    
    const sampleIncidents = [
      {
        edge_source: 'router-1',
        edge_target: 'switch-a',
        incident_type: 'link_failure',
        severity: 'critical',
        summary: 'Fiber cut detected on North Campus backbone',
        location: 'North Campus, Building A',
        latency_ms: 2500,
        packet_loss_percent: 85,
        bandwidth_mbps: 100,
        explanation: 'Physical fiber optic cable severed. Requires immediate repair.',
        opened_at: Timestamp.fromDate(new Date(Date.now() - 3600000)),
        resolved_at: null,
        broken: true,
      },
      {
        edge_source: 'switch-b',
        edge_target: 'firewall-1',
        incident_type: 'congestion',
        severity: 'warning',
        summary: 'High bandwidth utilization detected',
        location: 'Central Campus, Server Room',
        latency_ms: 150,
        packet_loss_percent: 2,
        bandwidth_mbps: 8500,
        explanation: 'Network congestion due to backup traffic. Consider load balancing.',
        opened_at: Timestamp.fromDate(new Date(Date.now() - 7200000)),
        resolved_at: Timestamp.fromDate(new Date(Date.now() - 600000)),
        broken: false,
      },
      {
        edge_source: 'core-1',
        edge_target: 'core-2',
        incident_type: 'latency_spike',
        severity: 'info',
        summary: 'Transient latency increase observed',
        location: 'Main Data Center',
        latency_ms: 450,
        packet_loss_percent: 0.5,
        bandwidth_mbps: 5000,
        explanation: 'Temporary spike resolved. Likely due to traffic rerouting.',
        opened_at: Timestamp.fromDate(new Date(Date.now() - 1800000)),
        resolved_at: Timestamp.fromDate(new Date(Date.now() - 600000)),
        broken: false,
      },
    ];

    for (const incident of sampleIncidents) {
      await addDoc(incidentsRef, incident);
    }
    
    console.log('✅ Sample incidents initialized');
  } catch (err) {
    console.log('ℹ️ Using existing Firestore data');
  }
}

export { app, auth, db, firebaseConfig };
