// utils/currency.ts

export const SUPPORTED_CURRENCIES = {
    SEK: {
      code: 'SEK',
      symbol: 'kr',
      name: 'Swedish Krona',
    },
    EUR: {
      code: 'EUR',
      symbol: '€',
      name: 'Euro',
    },
    USD: {
      code: 'USD',
      symbol: '$',
      name: 'US Dollar',
    },
    GBP: {
      code: 'GBP',
      symbol: '£',
      name: 'British Pound',
    },
  } as const;
  
  export type SupportedCurrency = keyof typeof SUPPORTED_CURRENCIES;
  
  export const formatCurrency = (value: number, currencyCode?: string) => {
    // Default to SEK if no currency code is provided
    const currency = currencyCode?.toUpperCase() || 'SEK';
    
    try {
      return new Intl.NumberFormat('sv-SE', { 
        style: 'currency', 
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(value);
    } catch (error) {
      // Fallback formatting
      return `${value.toLocaleString('sv-SE')} ${SUPPORTED_CURRENCIES[currency as SupportedCurrency]?.symbol || currency}`;
    }
  };
  
  export const validateCurrency = (currency?: string): boolean => {
    if (!currency) return false;
    return currency.toUpperCase() in SUPPORTED_CURRENCIES;
  };
  
  export const getDefaultCurrency = (): SupportedCurrency => 'SEK';
  
  export const getCurrencySymbol = (currencyCode: string): string => {
    const currency = currencyCode.toUpperCase() as SupportedCurrency;
    return SUPPORTED_CURRENCIES[currency]?.symbol || currencyCode;
  };