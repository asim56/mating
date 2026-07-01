'use client';

import { useState } from 'react';

import { DataState } from '@mating/ui';

import { getSupabaseBrowserClient } from '../../lib/auth/supabase-client';

type Step = 'phone' | 'otp';

type OtpFormProps = {
  labels: {
    phoneLabel: string;
    phonePlaceholder: string;
    codeLabel: string;
    sendCode: string;
    verify: string;
    success: string;
  };
};

export function OtpForm({ labels }: OtpFormProps) {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function requestOtp(event: React.FormEvent) {
    event.preventDefault();
    setStatus('loading');
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/api/v1/auth/otp/request`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) {
        throw new Error('Unable to send code');
      }
      setStep('otp');
      setStatus('idle');
    } catch {
      setStatus('error');
      setError('Unable to send verification code.');
    }
  }

  async function verifyOtp(event: React.FormEvent) {
    event.preventDefault();
    setStatus('loading');
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/api/v1/auth/otp/verify`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      if (!res.ok) {
        throw new Error('Invalid code');
      }
      const payload = (await res.json()) as {
        accessToken: string;
        refreshToken: string;
      };
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.setSession({
        access_token: payload.accessToken,
        refresh_token: payload.refreshToken,
      });
      setStatus('success');
    } catch {
      setStatus('error');
      setError('Invalid or expired verification code.');
    }
  }

  return (
    <DataState
      status={status === 'loading' ? 'loading' : status === 'error' ? 'error' : 'success'}
      error={
        error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : undefined
      }
    >
      {status === 'success' ? (
        <p className="text-green-700">{labels.success}</p>
      ) : step === 'phone' ? (
        <form onSubmit={requestOtp} className="space-y-4">
          <label className="block text-sm font-medium">
            {labels.phoneLabel}
            <input
              type="tel"
              className="mt-1 w-full rounded border px-3 py-2"
              placeholder={labels.phonePlaceholder}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="rounded bg-emerald-700 px-4 py-2 text-white">
            {labels.sendCode}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="space-y-4">
          <label className="block text-sm font-medium">
            {labels.codeLabel}
            <input
              type="text"
              inputMode="numeric"
              className="mt-1 w-full rounded border px-3 py-2"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="rounded bg-emerald-700 px-4 py-2 text-white">
            {labels.verify}
          </button>
        </form>
      )}
    </DataState>
  );
}
