import { db, auth, storage } from './clientApp';
import { collection, doc, setDoc, getDoc, updateDoc, addDoc, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, uploadBytes } from 'firebase/storage';
import { updateProfile, updateEmail, updatePassword, deleteUser } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase/clientApp';



export interface Box {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  qrCodeUrl: string;
}

export interface BoxContent {
  id: string;
  type: 'text' | 'audio' | 'image' | 'document';
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

export const uploadDesign = async (userId: string, boxId: string, designSvg: string): Promise<string> => {
  const designRef = ref(storage, `designs/${userId}/${boxId}.svg`);
  await uploadString(designRef, designSvg, 'data_url');
  return await getDownloadURL(designRef);
};

export const createUser = async (uid: string, email: string, displayName: string) => {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    email,
    displayName,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });
};

export const deactivateAccount = async (uid: string) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    isActive: false,
    deactivatedAt: new Date()
  });
};

export const reactivateAccount = async (uid: string) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    isActive: true,
    deactivatedAt: null
  });
};

export const deleteAccount = async (uid: string) => {
  // Delete user data from Firestore
  await deleteDoc(doc(db, 'users', uid));
  
  // Delete user authentication
  const user = auth.currentUser;
  if (user) {
    await deleteUser(user);
  }
};

export const updateUserProfile = async (uid: string, updates: {
  displayName?: string;
  email?: string;
  password?: string;
}) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  if (updates.displayName) {
    await updateProfile(user, { displayName: updates.displayName });
  }
  
  if (updates.email) {
    await updateEmail(user, updates.email);
  }
  
  if (updates.password) {
    await updatePassword(user, updates.password);
  }

  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    ...(updates.displayName && { displayName: updates.displayName }),
    ...(updates.email && { email: updates.email }),
    updatedAt: new Date()
  });
};

export const getUserDetails = async (uid: string) => {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    return userSnap.data();
  } else {
    throw new Error('User not found');
  }
};

export const createBox = async (name: string, description: string, designSvg: string): Promise<string> => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  
  const boxesRef = collection(db, 'boxes');
  const newBox = await addDoc(boxesRef, {
    userId: user.uid,
    name,
    description,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  const qrCodeUrl = await uploadDesign(user.uid, newBox.id, designSvg);
  await updateDoc(doc(db, 'boxes', newBox.id), { qrCodeUrl });
  
  return newBox.id;
};
export const deleteBox = async (boxId: string) => {
  const boxRef = doc(db, 'boxes', boxId);
  await deleteDoc(boxRef);
};

export const addContentToBox = async (boxId: string, type: 'text' | 'audio' | 'image' | 'document', value: string) => {
  const contentsRef = collection(db, 'contents');
  await addDoc(contentsRef, {
    boxId,
    type,
    value,
    createdAt: new Date(),
    updatedAt: new Date()
  });
};

export const uploadFile = async (file: File, path: string): Promise<string> => {
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
};

export const getUserBoxes = async (userId: string): Promise<Box[]> => {
  const boxesRef = collection(db, 'boxes');
  const q = query(boxesRef, where('userId', '==', userId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as Omit<Box, 'id'>),
    createdAt: doc.data().createdAt.toDate(),
    updatedAt: doc.data().updatedAt.toDate()
  }));
};

export const deleteBoxContent = async (contentId: string) => {
  const contentRef = doc(db, 'contents', contentId);
  await deleteDoc(contentRef);
};

export const getBoxContents = async (boxId: string): Promise<BoxContent[]> => {
  const contentsRef = collection(db, 'contents');
  const q = query(contentsRef, where('boxId', '==', boxId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as Omit<BoxContent, 'id'>),
    createdAt: doc.data().createdAt.toDate(),
    updatedAt: doc.data().updatedAt.toDate()
  }));
};

export const getBoxDetails = async (boxId: string): Promise<Box> => {
  const boxRef = doc(db, 'boxes', boxId);
  const boxSnap = await getDoc(boxRef);
  
  if (boxSnap.exists()) {
    const data = boxSnap.data() as Omit<Box, 'id'>;
    return {
      id: boxId,
      ...data,
      createdAt: data.createdAt instanceof Date ? data.createdAt : (data.createdAt as any).toDate(),
      updatedAt: data.updatedAt instanceof Date ? data.updatedAt : (data.updatedAt as any).toDate()
    };
  } else {
    throw new Error('Box not found');
  }
};


export const sendDeactivationEmail = async (email: string) => {
  const sendEmail = httpsCallable(functions, 'sendDeactivationEmail');
  await sendEmail({ email });
};
