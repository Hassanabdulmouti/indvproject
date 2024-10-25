import { db, auth, storage } from './clientApp';
import { collection, doc, setDoc, getDoc, updateDoc, addDoc, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, uploadBytes } from 'firebase/storage';
import { updateProfile, updateEmail, updatePassword, deleteUser } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase/clientApp';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Contact {
  id: string;
  userId: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsuranceItem {
  id: string;
  name: string;
  value: number;
  currency?: string;
  imageUrl?: string;
  description?: string;
}

export interface InsuranceCompany {
  id: string;
  name: string;
  logoUrl: string;
  primaryColor: string;
}

export interface Box {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  qrCodeUrl: string;
  isPrivate: boolean;
  accessCode?: string;
}

export interface InsuranceLabel extends Box {
  type: 'insurance';
  insuranceCompany: InsuranceCompany;
  items: InsuranceItem[];
  totalValue: number;
  currency: string;
}

export const isInsuranceLabel = (item: Box | InsuranceLabel): item is InsuranceLabel => {
  return 'type' in item && item.type === 'insurance';
};

export interface BoxContent {
  id: string;
  type: 'text' | 'audio' | 'image' | 'document';
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsuranceItem {
  id: string;
  name: string;
  value: number;
  currency?: string;
  imageUrl?: string;
  description?: string;
}

export interface InsuranceCompany {
  id: string;
  name: string;
  logoUrl: string;
  primaryColor: string;
}



export const createInsuranceLabel = async (
  name: string,
  description: string,
  designSvg: string,
  insuranceCompany: InsuranceCompany,
  items: InsuranceItem[],
  currency: string,
  isPrivate: boolean,
  accessCode?: string
): Promise<string> => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  
  const totalValue = items.reduce((sum, item) => sum + item.value, 0);
  
  const boxesRef = collection(db, 'boxes');
  const newBox = await addDoc(boxesRef, {
    userId: user.uid,
    type: 'insurance',
    name,
    description,
    createdAt: new Date(),
    updatedAt: new Date(),
    isPrivate,
    insuranceCompany,
    items,
    totalValue,
    currency,
    ...(isPrivate && accessCode && { accessCode })
  });
  
  const qrCodeUrl = await uploadDesign(user.uid, newBox.id, designSvg);
  await updateDoc(doc(db, 'boxes', newBox.id), { qrCodeUrl });
  
  return newBox.id;
};


export const uploadDesign = async (userId: string, boxId: string, designSvg: string): Promise<string> => {
  const designRef = ref(storage, `designs/${userId}/${boxId}.svg`);
  await uploadString(designRef, designSvg, 'data_url');
  return await getDownloadURL(designRef);
};

export const createUser = async (uid: string, email: string, displayName: string, isAdmin: boolean = false) => {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    email,
    displayName,
    isAdmin,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });
};

export const updateBoxPrivacy = async (boxId: string, isPrivate: boolean, accessCode?: string): Promise<void> => {
  const boxRef = doc(db, 'boxes', boxId);

  if (isPrivate && (!accessCode || accessCode.length !== 6)) {
    throw new Error('Access code must be 6 digits for private boxes');
  }

  const updateData: { isPrivate: boolean; accessCode?: string | null } = { isPrivate };

  if (isPrivate) {
    updateData.accessCode = accessCode;
  } else {
    updateData.accessCode = null;
  }

  await updateDoc(boxRef, {
    ...updateData,
    updatedAt: new Date()
  });
};

export const getAllUsers = async (): Promise<User[]> => {
  const getAllUsersFunction = httpsCallable(functions, 'getAllUsers');
  const result = await getAllUsersFunction();
  const data = result.data as { users: User[] };
  return data.users;
};

export const deactivateAccount = async (uid: string) => {
  const toggleAccountActivationFunction = httpsCallable(functions, 'toggleAccountActivation');
  await toggleAccountActivationFunction({ targetUid: uid, isActive: false });
};

export const reactivateAccount = async (uid: string) => {
  const toggleAccountActivationFunction = httpsCallable(functions, 'toggleAccountActivation');
  await toggleAccountActivationFunction({ targetUid: uid, isActive: true });
};

export const deleteAccount = async (uid: string) => {
  const deleteUserAccountFunction = httpsCallable(functions, 'deleteUserAccount');
  await deleteUserAccountFunction({ targetUid: uid });
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
    return userSnap.data() as User;
  } else {
    throw new Error('User not found');
  }
};

export const createBox = async (name: string, description: string, designSvg: string, isPrivate: boolean, accessCode?: string): Promise<string> => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  
  const boxesRef = collection(db, 'boxes');
  const newBox = await addDoc(boxesRef, {
    userId: user.uid,
    name,
    description,
    createdAt: new Date(),
    updatedAt: new Date(),
    isPrivate,
    ...(isPrivate && accessCode && { accessCode })
  });
  
  const qrCodeUrl = await uploadDesign(user.uid, newBox.id, designSvg);
  await updateDoc(doc(db, 'boxes', newBox.id), { qrCodeUrl });
  
  return newBox.id;
};

export const deleteBox = async (boxId: string) => {
  const boxRef = doc(db, 'boxes', boxId);
  await deleteDoc(boxRef);
};

export const addContentToBox = async (boxId: string, type: 'text' | 'audio' | 'image' | 'document', content: string | File) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  let value: string;

  if (typeof content === 'string') {
    value = content;
  } else {
    // File upload
    const storageRef = ref(storage, `boxes/${boxId}/${type}/${content.name}`);
    await uploadBytes(storageRef, content);
    value = await getDownloadURL(storageRef);
  }

  const contentsRef = collection(db, 'contents');
  const newContent = await addDoc(contentsRef, {
    boxId,
    type,
    value,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  return newContent.id;
};

export const uploadFile = async (file: File, path: string): Promise<string> => {
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
};

export const getUserBoxes = async (userId: string): Promise<(Box | InsuranceLabel)[]> => {
  const boxesRef = collection(db, 'boxes');
  const q = query(boxesRef, where('userId', '==', userId));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    const base = {
      id: doc.id,
      ...data,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate()
    };
    
    if (data.type === 'insurance') {
      return base as InsuranceLabel;
    }
    
    return base as Box;
  });
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

export const validateAccessCode = async (boxId: string, accessCode: string): Promise<boolean> => {
  const boxRef = doc(db, 'boxes', boxId);
  const boxSnap = await getDoc(boxRef);
  
  if (boxSnap.exists()) {
    const boxData = boxSnap.data() as Box;
    return boxData.accessCode === accessCode;
  }
  
  return false;
};

export const sendDeactivationEmail = async (email: string) => {
  const sendEmail = httpsCallable(functions, 'sendDeactivationEmail');
  await sendEmail({ email });
};

export const setAdminStatus = async (uid: string, isAdmin: boolean) => {
  const setAdminStatusFunction = httpsCallable(functions, 'setAdminStatus');
  await setAdminStatusFunction({ targetUid: uid, isAdmin });
};

export const isCurrentUserAdmin = async (): Promise<boolean> => {
  const user = auth.currentUser;
  if (!user) return false;
  
  const userDetails = await getUserDetails(user.uid);
  return userDetails.isAdmin === true;
};


export const createContact = async (name: string, email: string): Promise<string> => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  
  const contactsRef = collection(db, 'contacts');
  const newContact = await addDoc(contactsRef, {
    userId: user.uid,
    name,
    email,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  return newContact.id;
};

export const getUserContacts = async (): Promise<Contact[]> => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const contactsRef = collection(db, 'contacts');
  const q = query(contactsRef, where('userId', '==', user.uid));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as Omit<Contact, 'id'>),
    createdAt: doc.data().createdAt.toDate(),
    updatedAt: doc.data().updatedAt.toDate()
  }));
};

export const deleteContact = async (contactId: string): Promise<void> => {
  const contactRef = doc(db, 'contacts', contactId);
  await deleteDoc(contactRef);
};


export interface StorageUsage {
  totalBytes: number;
  designsBytes: number;
  boxesBytes: number;
}

export const getUserStorageUsage = async (uid: string): Promise<StorageUsage> => {
  const getStorageUsage = httpsCallable(functions, 'getUserStorageUsage');
  const result = await getStorageUsage({ targetUid: uid });
  return result.data as StorageUsage;
};


// Function to get a specific insurance label
export const getInsuranceLabel = async (labelId: string): Promise<InsuranceLabel> => {
  const labelRef = doc(db, 'boxes', labelId);
  const labelSnap = await getDoc(labelRef);
  
  if (labelSnap.exists()) {
    const data = labelSnap.data() as Omit<InsuranceLabel, 'id'>;
    return {
      id: labelId,
      ...data,
      createdAt: data.createdAt instanceof Date ? data.createdAt : (data.createdAt as any).toDate(),
      updatedAt: data.updatedAt instanceof Date ? data.updatedAt : (data.updatedAt as any).toDate()
    };
  } else {
    throw new Error('Insurance label not found');
  }
};

// Function to update an insurance label's items
export const updateInsuranceItems = async (
  labelId: string, 
  items: InsuranceItem[]
): Promise<void> => {
  const labelRef = doc(db, 'boxes', labelId);
  const totalValue = items.reduce((sum, item) => sum + item.value, 0);
  
  await updateDoc(labelRef, {
    items,
    totalValue,
    updatedAt: new Date()
  });
};

// Function to get all insurance labels for a user
export const getUserInsuranceLabels = async (userId: string): Promise<InsuranceLabel[]> => {
  const boxesRef = collection(db, 'boxes');
  const q = query(
    boxesRef, 
    where('userId', '==', userId),
    where('type', '==', 'insurance')
  );
  
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as Omit<InsuranceLabel, 'id'>),
    createdAt: doc.data().createdAt.toDate(),
    updatedAt: doc.data().updatedAt.toDate()
  }));
};