import { supabase } from '@/supabase/client';

/**
 * Whether the signed-in user must complete TOTP before continuing.
 * Fail-closed for enrolled MFA: if AAL cannot be read but a verified TOTP exists, require challenge.
 * Users without enrolled factors are not trapped on transient API errors.
 */
export async function requiresMfaChallenge(): Promise<boolean> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (!error && data) {
    return data.currentLevel === 'aal1' && data.nextLevel === 'aal2';
  }

  console.error('[mfa] getAuthenticatorAssuranceLevel failed', error);
  const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
  if (factorsError) {
    console.error('[mfa] listFactors failed', factorsError);
    // Both probes failed — do not silently skip MFA for possibly enrolled accounts.
    return true;
  }
  return factors.totp.some(item => item.status === 'verified');
}

export async function hasVerifiedMfaFactor(): Promise<boolean> {
  const { data: factors, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return factors.totp.some(item => item.status === 'verified');
}

export async function verifyMfaCode(code: string): Promise<void> {
  const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
  if (factorsError) throw factorsError;
  const factor = factors.totp.find(item => item.status === 'verified');
  if (!factor) throw new Error('لا يوجد تطبيق مصادقة مفعّل');
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId: factor.id,
  });
  if (challengeError) throw challengeError;
  const { error } = await supabase.auth.mfa.verify({
    factorId: factor.id,
    challengeId: challenge.id,
    code,
  });
  if (error) throw error;
}
