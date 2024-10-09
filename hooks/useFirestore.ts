import { useState, useEffect } from 'react';
import { db } from '../firebase/clientApp';
import { collection, query, where, onSnapshot, QueryConstraint } from 'firebase/firestore';

export const useFirestoreQuery = (collectionName: string, queryConstraints: QueryConstraint[]) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const q = query(collection(db, collectionName), ...queryConstraints);
    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        setData(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName, queryConstraints]);

  return { data, loading, error };
};