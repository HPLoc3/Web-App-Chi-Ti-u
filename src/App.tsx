import React from 'react';
import { AppProviders } from './app/providers';
import { LedgerApp } from './app/App';

export default function App() {
  return (
    <AppProviders>
      <LedgerApp />
    </AppProviders>
  );
}
