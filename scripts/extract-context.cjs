const fs = require('fs');
const path = require('path');

const appTsxPath = path.join(__dirname, '../src/App.tsx');
let appCode = fs.readFileSync(appTsxPath, 'utf8');

// Extract the state variables block
const stateStart = appCode.indexOf('// Primary Business States');
const stateEnd = appCode.indexOf('const handleAddCatalogItem');
const stateBlock = appCode.slice(stateStart, stateEnd);

const contextContent = `"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { INITIAL_TENANTS, INITIAL_NOTIFICATIONS, INITIAL_ADDON_REQUESTS, INITIAL_HOUSEKEEPING_REQUESTS, INITIAL_SUPPORT_TICKETS, INITIAL_INVOICES, INITIAL_ACTIVITY_LOGS, INITIAL_POLICIES, INITIAL_SETTINGS, BUILDINGS_LIST, INITIAL_CATALOG_ITEMS } from './mockData';
import { Tenant, SupportTicket, AddOnRequest, HousekeepingRequest, Invoice, Notification, ActivityLog, PolicyFAQ, AppSettings, AddOnService, ContractExtensionRequest } from './types';

const DashboardContext = createContext<any>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
${stateBlock}

  const value = {
    tenants, setTenants,
    notifications, setNotifications,
    addOnRequests, setAddOnRequests,
    housekeepings, setHousekeepings,
    tickets, setTickets,
    invoices, setInvoices,
    activityLogs, setActivityLogs,
    policies, setPolicies,
    settings, setSettings,
    catalogItems, setCatalogItems,
    extensionRequests, setExtensionRequests
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboardContext() {
  return useContext(DashboardContext);
}
`;

fs.writeFileSync(path.join(__dirname, '../src/DashboardContext.tsx'), contextContent);
console.log('Context generated.');
