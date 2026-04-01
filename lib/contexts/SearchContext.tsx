'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface SearchContextType {
  query: string;
  setQuery: (q: string) => void;
}

const SearchContext = createContext<SearchContextType>({
  query: '',
  setQuery: () => {},
});

export const useSearch = () => useContext(SearchContext);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState('');

  const handleSetQuery = useCallback((q: string) => {
    setQuery(q);
  }, []);

  return (
    <SearchContext.Provider value={{ query, setQuery: handleSetQuery }}>
      {children}
    </SearchContext.Provider>
  );
}
