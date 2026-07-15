/**
 * usePayment Hook
 * 
 * Provides payment functionality to components.
 * Handles the flow: Booking → Checkout → Verification → Confirmation
 */

import { useState, useCallback } from 'react';
import { paymentManager } from '@/lib/payment';
import type { PaymentProviderType, CreateSessionParams, PaymentSessionResult, PaymentVerificationResult } from '@/lib/payment/types';

interface UsePaymentReturn {
  isProcessing: boolean;
  error: string | null;
  lastSession: PaymentSessionResult | null;
  initiatePayment: (provider: PaymentProviderType, params: CreateSessionParams) => Promise<PaymentSessionResult | null>;
  verifyPayment: (provider: PaymentProviderType, sessionId: string) => Promise<PaymentVerificationResult | null>;
  clearError: () => void;
}

export function usePayment(): UsePaymentReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSession, setLastSession] = useState<PaymentSessionResult | null>(null);

  const initiatePayment = useCallback(async (
    provider: PaymentProviderType,
    params: CreateSessionParams
  ): Promise<PaymentSessionResult | null> => {
    setIsProcessing(true);
    setError(null);

    try {
      const result = await paymentManager.createCheckoutSession(provider, params);
      setLastSession(result);

      // For Stripe, redirect to checkout
      if (provider === 'stripe' && result.checkoutUrl) {
        // Redirect to Stripe Checkout page
        window.location.href = result.checkoutUrl;
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'فشل في إنشاء جلسة الدفع';
      setError(message);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const verifyPayment = useCallback(async (
    provider: PaymentProviderType,
    sessionId: string
  ): Promise<PaymentVerificationResult | null> => {
    setIsProcessing(true);
    setError(null);

    try {
      const result = await paymentManager.verifyPayment(provider, sessionId);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'فشل في التحقق من الدفع';
      setError(message);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isProcessing,
    error,
    lastSession,
    initiatePayment,
    verifyPayment,
    clearError,
  };
}
