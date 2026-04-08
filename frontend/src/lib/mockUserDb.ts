/**
 * Browser "DB" for demo login — persists registered emails in localStorage.
 * First time an email appears = first login; returning email = repeat visit.
 */
const KEY = 'sanpt_user_registry';

export type MockUserRecord = {
  email: string;
  createdAt: number;
  lastLoginAt: number;
};

function readRegistry(): MockUserRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as MockUserRecord[]) : [];
  } catch {
    return [];
  }
}

function writeRegistry(rows: MockUserRecord[]) {
  localStorage.setItem(KEY, JSON.stringify(rows));
}

/** Register new email or update lastLoginAt for existing. */
export function registerOrLoginMockUser(email: string): {
  isFirstLogin: boolean;
  record: MockUserRecord;
} {
  const norm = email.trim().toLowerCase();
  const rows = readRegistry();
  const i = rows.findIndex((r) => r.email.toLowerCase() === norm);
  const now = Date.now();
  if (i >= 0) {
    const record = { ...rows[i], lastLoginAt: now };
    rows[i] = record;
    writeRegistry(rows);
    return { isFirstLogin: false, record };
  }
  const mockUsers = {
    // Admin Account
    'admin@college.edu': {
      uid: 'mock-admin-001',
      email: 'admin@college.edu',
      displayName: 'System Administrator',
      role: 'admin',
      isMock: true,
    },
    
    // Staff Accounts - Department Based
    'labA@college.edu': {
      uid: 'mock-staff-labA-001',
      email: 'labA@college.edu',
      displayName: 'Lab A Technician',
      role: 'staff',
      department: 'labA',
      isMock: true,
    },
    'labB@college.edu': {
      uid: 'mock-staff-labB-001',
      email: 'labB@college.edu',
      displayName: 'Lab B Technician',
      role: 'staff',
      department: 'labB',
      isMock: true,
    },
    'library@college.edu': {
      uid: 'mock-staff-library-001',
      email: 'library@college.edu',
      displayName: 'Library Staff',
      role: 'staff',
      department: 'library',
      isMock: true,
    },
    'adminoffice@college.edu': {
      uid: 'mock-staff-office-001',
      email: 'adminoffice@college.edu',
      displayName: 'Office Administrator',
      role: 'staff',
      department: 'adminoffice',
      isMock: true,
    },
    'faculty@college.edu': {
      uid: 'mock-staff-faculty-001',
      email: 'faculty@college.edu',
      displayName: 'Faculty Member',
      role: 'staff',
      department: 'faculty',
      isMock: true,
    },
    'network@college.edu': {
      uid: 'mock-staff-network-001',
      email: 'network@college.edu',
      displayName: 'Network Administrator',
      role: 'staff',
      department: 'network',
      isMock: true,
    },
    'hostel@college.edu': {
      uid: 'mock-staff-hostel-001',
      email: 'hostel@college.edu',
      displayName: 'Hostel Network Manager',
      role: 'staff',
      department: 'hostel',
      isMock: true,
    },
    
    // Student Account (uses Google Sign-In)
    'student@college.edu': {
      uid: 'mock-student-999',
      email: 'student@college.edu',
      displayName: 'Demo Student',
      role: 'student',
      isMock: true,
    },
  };
  const record: MockUserRecord = mockUsers[norm] || {
    email: norm,
    createdAt: now,
    lastLoginAt: now,
  };
  rows.push(record);
  writeRegistry(rows);
  return { isFirstLogin: true, record };
}
