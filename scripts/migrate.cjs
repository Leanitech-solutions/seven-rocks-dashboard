const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');
const appDir = path.join(srcDir, 'app');

if (!fs.existsSync(appDir)) {
  fs.mkdirSync(appDir, { recursive: true });
}

// Map of tabs to page folders
const pages = [
  'dashboard',
  'tenants',
  'notifications',
  'addons',
  'housekeeping',
  'billing',
  'settings'
];

pages.forEach(page => {
  const pageDir = path.join(appDir, page);
  if (!fs.existsSync(pageDir)) fs.mkdirSync(pageDir, { recursive: true });
  
  const componentName = page === 'dashboard' ? 'DashboardView' : 
                        page === 'tenants' ? 'TenantsView' :
                        page === 'notifications' ? 'NotificationsView' :
                        page === 'addons' ? 'AddOnsView' :
                        page === 'housekeeping' ? 'HousekeepingView' :
                        page === 'billing' ? 'BillingView' :
                        'SettingsView';
                        
  const content = `"use client";
import ${componentName} from '../../components/${componentName}';
import { useDashboardContext } from '../../DashboardContext';

export default function ${page.charAt(0).toUpperCase() + page.slice(1)}Page() {
  const ctx = useDashboardContext();
  return <${componentName} {...ctx} />;
}
`;
  fs.writeFileSync(path.join(pageDir, 'page.tsx'), content);
});

// Write context template
const contextContent = `"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
// import all types...
import { Tenant, SupportTicket, AddOnRequest, HousekeepingRequest, Invoice, Notification, ActivityLog, PolicyFAQ, AppSettings, AddOnService, ContractExtensionRequest } from './types';

const DashboardContext = createContext<any>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  // We'll move state here manually
  return <DashboardContext.Provider value={{}}>{children}</DashboardContext.Provider>;
}

export function useDashboardContext() {
  return useContext(DashboardContext);
}
`;
fs.writeFileSync(path.join(srcDir, 'DashboardContext.tsx'), contextContent);

console.log('Scaffolding completed.');
