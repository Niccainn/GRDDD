'use client';

import { useState, useEffect, useCallback } from 'react';

const COMPLETE_KEY = 'grid:onboarding-complete';
const PROFILE_KEY = 'grid:onboarding-profile';

export type OnboardingProfile = {
  name?: string;
  role?: string;
  workType?: string;
  environmentName?: string;
  environmentType?: string;
};

export function useOnboarding() {
  const [complete, setComplete] = useState<boolean | null>(null);
  const [profile, setProfileState] = useState<OnboardingProfile>({});

  useEffect(() => {
    const done = localStorage.getItem(COMPLETE_KEY) === 'true';
    setComplete(done);
    try {
      const stored = localStorage.getItem(PROFILE_KEY);
      if (stored) setProfileState(JSON.parse(stored));
    } catch {
      // ignore parse errors
    }
  }, []);

  const markComplete = useCallback(() => {
    localStorage.setItem(COMPLETE_KEY, 'true');
    setComplete(true);
  }, []);

  const setProfile = useCallback((data: OnboardingProfile) => {
    const merged = { ...data };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(merged));
    setProfileState(merged);
  }, []);

  const updateProfile = useCallback((patch: Partial<OnboardingProfile>) => {
    setProfileState(prev => {
      const merged = { ...prev, ...patch };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(merged));
      return merged;
    });
  }, []);

  return {
    complete,
    profile,
    markComplete,
    setProfile,
    updateProfile,
  };
}
