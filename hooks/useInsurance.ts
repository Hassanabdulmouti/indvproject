// hooks/useInsurance.ts

import { useState, useCallback } from 'react';
import { InsuranceItem, InsuranceLabel } from '@/firebase/dbOp';
import { insuranceCompanies } from '@/lib/config/insurance';

export const useInsurance = () => {
  const [items, setItems] = useState<InsuranceItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addItem = useCallback((newItem: Omit<InsuranceItem, 'id'>) => {
    setItems(prev => [...prev, {
      ...newItem,
      id: crypto.randomUUID()
    }]);
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  }, []);

  const calculateTotal = useCallback((currencyCode: string) => {
    return items.reduce((sum, item) => {
      if (item.currency === currencyCode) {
        return sum + item.value;
      }
      // Add currency conversion logic here if needed
      return sum + item.value;
    }, 0);
  }, [items]);

  return {
    items,
    setItems,
    addItem,
    removeItem,
    calculateTotal,
    error,
    setError,
    insuranceCompanies
  };
};