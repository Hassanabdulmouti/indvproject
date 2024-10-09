'use client'

import { useEffect, useState } from 'react';
import { db, auth } from '../firebase/clientApp';
import { collection, doc, setDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function FirebaseTest() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [user, loading, authError] = useAuthState(auth);
  const [testData, setTestData] = useState<any[]>([]);
  const [queryError, setQueryError] = useState<string | null>(null);

  useEffect(() => {
    const checkFirebaseConnection = async () => {
      try {
        const testDoc = doc(collection(db, 'test'), 'test');
        await setDoc(testDoc, { test: true });
        await deleteDoc(testDoc);
        setIsConnected(true);
        setErrorMessage(null);
      } catch (error) {
        console.error('Firebase connection error:', error);
        setIsConnected(false);
        setErrorMessage(error instanceof Error ? error.message : String(error));
      }
    };

    checkFirebaseConnection();
  }, []);

  useEffect(() => {
    const fetchTestData = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, 'test'), where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        setTestData(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setQueryError(null);
      } catch (error) {
        console.error('Error fetching test data:', error);
        setQueryError(error instanceof Error ? error.message : String(error));
      }
    };

    fetchTestData();
  }, [user]);

  

  if (loading) {
    return <p>Checking Firebase connection...</p>;
  }

  if (authError) {
    return <Alert variant="destructive"><AlertDescription>Authentication error: {authError.message}</AlertDescription></Alert>;
  }

  return (
    <div className="space-y-4">
      {isConnected ? (
        <Alert variant="success"><AlertDescription>Firebase is connected successfully!</AlertDescription></Alert>
      ) : (
        <div>
          <Alert variant="destructive"><AlertDescription>Failed to connect to Firebase. Check your configuration.</AlertDescription></Alert>
          {errorMessage && <p className="text-sm text-red-300">{errorMessage}</p>}
        </div>
      )}

      {user ? (
        <div className="space-y-4">
          <p>Logged in as: {user.email}</p>
          
          
        </div>
      ) : (
        <p>Not logged in. Please log in to test document creation and querying.</p>
      )}
    </div>
  );
}