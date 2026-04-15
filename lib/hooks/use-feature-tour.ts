'use client';

import { useState, useEffect, useCallback } from 'react';

export type TourStep = {
  id: string;
  target: string;        // CSS selector for the element to highlight
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  page?: string;          // which page this step appears on (pathname)
};

const TOUR_STEPS: TourStep[] = [
  {
    id: 'dashboard-nova',
    target: '[data-tour="nova-bar"]',
    title: 'Meet Nova',
    description: 'Your AI assistant. Ask Nova to create tasks, analyze your workspace, or run workflows. Try: "What needs my attention?"',
    position: 'bottom',
    page: '/dashboard',
  },
  {
    id: 'dashboard-systems',
    target: '[data-tour="systems-panel"]',
    title: 'Systems',
    description: 'Systems organize your workflows and goals. Each system tracks its own health score — Nova monitors these for you.',
    position: 'right',
    page: '/dashboard',
  },
  {
    id: 'dashboard-stats',
    target: '[data-tour="stat-bar"]',
    title: 'Your pulse',
    description: 'Real-time overview of health, active automations, completed work, and items needing attention.',
    position: 'bottom',
    page: '/dashboard',
  },
  {
    id: 'sidebar-tasks',
    target: 'a[href="/tasks"]',
    title: 'Tasks',
    description: 'Create tasks, assign them, set priorities, add subtasks and comments. Switch between list, table, and board views.',
    position: 'right',
  },
  {
    id: 'sidebar-workflows',
    target: 'a[href="/workflows"]',
    title: 'Workflows',
    description: 'Build multi-stage workflows for repeatable processes. Run them manually or ask Nova to trigger them.',
    position: 'right',
  },
  {
    id: 'sidebar-goals',
    target: 'a[href="/goals"]',
    title: 'Goals',
    description: 'Set OKRs with measurable targets. Track progress and Nova can update them based on your work.',
    position: 'right',
  },
  {
    id: 'sidebar-nova',
    target: 'a[href="/nova"]',
    title: 'Nova Console',
    description: 'Full AI console with interaction history. Nova can create tasks, run workflows, and analyze cross-system patterns.',
    position: 'right',
  },
  {
    id: 'sidebar-search',
    target: '[data-tour="search-button"]',
    title: 'Quick search',
    description: 'Press \u2318K anytime to search across everything \u2014 tasks, workflows, systems, goals. Or press ? for keyboard shortcuts.',
    position: 'right',
  },
];

export function useFeatureTour() {
  const [active, setActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const tourDone = localStorage.getItem('grid-tour-complete');
    const tourStarted = localStorage.getItem('grid-tour-started');
    if (tourDone === '1') {
      setCompleted(true);
      return;
    }
    // Auto-start tour after onboarding completes (first dashboard visit)
    if (!tourStarted) {
      const onboarded = localStorage.getItem('grid-onboarding-complete');
      if (onboarded === '1') {
        // Delay to let page render
        setTimeout(() => {
          setActive(true);
          localStorage.setItem('grid-tour-started', '1');
        }, 1500);
      }
    }
  }, []);

  const step = TOUR_STEPS[currentStep] ?? null;

  const next = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(c => c + 1);
    } else {
      setActive(false);
      setCompleted(true);
      localStorage.setItem('grid-tour-complete', '1');
    }
  }, [currentStep]);

  const skip = useCallback(() => {
    setActive(false);
    setCompleted(true);
    localStorage.setItem('grid-tour-complete', '1');
  }, []);

  const restart = useCallback(() => {
    setCurrentStep(0);
    setActive(true);
    setCompleted(false);
    localStorage.removeItem('grid-tour-complete');
  }, []);

  return { active, step, currentStep, totalSteps: TOUR_STEPS.length, next, skip, restart, completed };
}
