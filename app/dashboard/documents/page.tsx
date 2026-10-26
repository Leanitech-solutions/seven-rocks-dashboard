"use client";

import React from 'react';
import DocumentGeneratorView from '../../../components/DocumentGeneratorView';
import { useDashboardContext } from '../../../DashboardContext';

export default function DocumentGeneratorPage() {
  const ctx = useDashboardContext();
  return (
    <DocumentGeneratorView
      tenants={ctx.tenants}
      invoices={ctx.invoices}
      onCreateInvoice={ctx.onCreateInvoice}
      onAddActivity={ctx.onAddActivity}
    />
  );
}
