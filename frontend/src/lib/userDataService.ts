import { doc, getDoc, setDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthContext } from '@/context/AuthContext';

export type SavedPrompt = {
  id: string;
  prompt: string;
  createdAt: any;
  updatedAt: any;
};

export type SavedPdf = {
  id: string;
  fileName: string;
  content: string;
  createdAt: any;
  updatedAt: any;
  isValidated: boolean;
};

export type UserData = {
  prompts: SavedPrompt[];
  pdfs: SavedPdf[];
};

// Save a prompt for the current user
export async function savePrompt(prompt: string): Promise<void> {
  const { user } = useAuthContext();
  if (!user || !db) throw new Error('User not authenticated');

  const userRef = doc(db, 'user_data', user.uid);
  const promptId = `prompt_${Date.now()}`;
  
  const newPrompt: SavedPrompt = {
    id: promptId,
    prompt,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      // Create new user data document
      await setDoc(userRef, {
        prompts: [newPrompt],
        pdfs: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      // Update existing user data
      const userData = userDoc.data() as UserData;
      const updatedPrompts = [...(userData.prompts || []), newPrompt];
      await updateDoc(userRef, {
        prompts: updatedPrompts,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error saving prompt:', error);
    throw error;
  }
}

// Save a PDF for the current user
export async function savePdf(fileName: string, content: string, isValidated: boolean): Promise<void> {
  const { user } = useAuthContext();
  if (!user || !db) throw new Error('User not authenticated');

  const userRef = doc(db, 'user_data', user.uid);
  const pdfId = `pdf_${Date.now()}`;
  
  const newPdf: SavedPdf = {
    id: pdfId,
    fileName,
    content,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isValidated,
  };

  try {
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      // Create new user data document
      await setDoc(userRef, {
        prompts: [],
        pdfs: [newPdf],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      // Update existing user data
      const userData = userDoc.data() as UserData;
      const updatedPdfs = [...(userData.pdfs || []), newPdf];
      await updateDoc(userRef, {
        pdfs: updatedPdfs,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error saving PDF:', error);
    throw error;
  }
}

// Get all user data
export async function getUserData(): Promise<UserData | null> {
  const { user } = useAuthContext();
  if (!user || !db) return null;

  try {
    const userRef = doc(db, 'user_data', user.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return { prompts: [], pdfs: [] };
    }
    
    return userDoc.data() as UserData;
  } catch (error) {
    console.error('Error getting user data:', error);
    return { prompts: [], pdfs: [] };
  }
}

// Delete a prompt
export async function deletePrompt(promptId: string): Promise<void> {
  const { user } = useAuthContext();
  if (!user || !db) throw new Error('User not authenticated');

  try {
    const userRef = doc(db, 'user_data', user.uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserData;
      const updatedPrompts = userData.prompts?.filter(p => p.id !== promptId) || [];
      await updateDoc(userRef, {
        prompts: updatedPrompts,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error deleting prompt:', error);
    throw error;
  }
}

// Delete a PDF
export async function deletePdf(pdfId: string): Promise<void> {
  const { user } = useAuthContext();
  if (!user || !db) throw new Error('User not authenticated');

  try {
    const userRef = doc(db, 'user_data', user.uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserData;
      const updatedPdfs = userData.pdfs?.filter(p => p.id !== pdfId) || [];
      await updateDoc(userRef, {
        pdfs: updatedPdfs,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error deleting PDF:', error);
    throw error;
  }
}

// Real-time listener for user data
export function subscribeToUserData(callback: (data: UserData) => void) {
  const { user } = useAuthContext();
  if (!user || !db) return () => {};

  const userRef = doc(db, 'user_data', user.uid);
  
  return onSnapshot(userRef, (doc) => {
    if (doc.exists()) {
      callback(doc.data() as UserData);
    } else {
      callback({ prompts: [], pdfs: [] });
    }
  });
}
