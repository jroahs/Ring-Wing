// Standalone Payment Verification page for Cashiers
import { useState, useEffect } from 'react';
import PaymentVerificationDashboard from './components/PaymentVerificationDashboard';
import { colors, theme } from './theme';

const PaymentVerification = () => {
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 ml-0 md:ml-20 pt-16 md:pt-4 transition-all duration-300" style={{ backgroundColor: colors.background }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: theme.colors.primary }}>
            Payment Verification
          </h1>
          <p className="text-sm mt-2" style={{ color: theme.colors.muted }}>
            Verify GCash and PayMaya payment proofs for takeout and delivery orders
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow">
          <PaymentVerificationDashboard />
        </div>
      </div>
    </div>
  );
};

export default PaymentVerification;
