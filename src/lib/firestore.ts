import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  Timestamp,
  getDocFromServer,
  getDocs,
  where,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}

export const subscribeToCollection = <T>(path: string, callback: (data: T[]) => void) => {
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    callback(data);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const createDocument = async (path: string, data: any) => {
  try {
    const docRef = await addDoc(collection(db, path), {
      ...data,
      createdAt: new Date().toISOString(),
      createdBy: auth.currentUser?.uid || 'system'
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateDocument = async (path: string, id: string, data: any) => {
  try {
    const docRef = doc(db, path, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${path}/${id}`);
  }
};

export const deleteDocument = async (path: string, id: string) => {
  try {
    const docRef = doc(db, path, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${path}/${id}`);
  }
};

export const getDocuments = async <T>(path: string) => {
  try {
    const querySnapshot = await getDocs(collection(db, path));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const queryDocuments = async <T>(path: string, field: string, operator: any, value: any) => {
  try {
    const q = query(collection(db, path), where(field, operator, value));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const setDocument = async (path: string, id: string, data: any) => {
  try {
    const docRef = doc(db, path, id);
    await setDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${path}/${id}`);
  }
};

export const getDocument = async <T>(path: string, id: string) => {
  try {
    const docRef = doc(db, path, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as T;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${path}/${id}`);
  }
};

export const subscribeToDocument = <T>(path: string, id: string, callback: (data: T | null) => void) => {
  const docRef = doc(db, path, id);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() } as T);
    } else {
      callback(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `${path}/${id}`);
  });
};
