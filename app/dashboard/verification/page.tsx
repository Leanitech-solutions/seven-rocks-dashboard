"use client";

import React from 'react';
import StaffVerificationView from '../../../components/StaffVerificationView';
import { useDashboardContext } from '../../../DashboardContext';

export default function VerificationPage() {
  const ctx = useDashboardContext();
  return (
    <StaffVerificationView
      tenants={ctx.tenants}
      onUpdateTenant={ctx.onUpdateTenant}
      onAddActivity={ctx.onAddActivity}
      searchTerm={ctx.searchTerm}
      setSearchTerm={ctx.setSearchTerm}
    />
  );
}
