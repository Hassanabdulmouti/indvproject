// lib/config/insurance.ts

export interface InsuranceCompany {
    id: string;
    name: string;
    logoUrl: string;
    primaryColor: string;
  }
  
  export const insuranceCompanies: InsuranceCompany[] = [
    {
      id: 'folksam',
      name: 'Folksam',
      logoUrl: '/images/insurance/folk.png',
      primaryColor: '#005AA0'
    },
    {
      id: 'if',
      name: 'IF Försäkring',
      logoUrl: '/images/insurance/if.svg',
      primaryColor: '#00B7EF'
    },
    {
      id: 'lansforsakringar',
      name: 'Länsförsäkringar',
      logoUrl: '/images/insurance/lans.png',
      primaryColor: '#005AA0'
    },
    {
      id: 'trygg',
      name: 'Trygg-Hansa',
      logoUrl: '/images/insurance/trygg.png',
      primaryColor: '#DA291C'
    }
  ];
  
  export const getInsuranceCompanyById = (id: string): InsuranceCompany | undefined => {
    return insuranceCompanies.find(company => company.id === id);
  };
  
  export const currencies = [
    { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'GBP', symbol: '£', name: 'British Pound' }
  ] as const;
  
  export const formatCurrency = (value: number, currencyCode: string = 'SEK'): string => {
    try {
      return new Intl.NumberFormat('sv-SE', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(value);
    } catch (error) {
      return `${value.toLocaleString('sv-SE')} ${currencyCode}`;
    }
  };