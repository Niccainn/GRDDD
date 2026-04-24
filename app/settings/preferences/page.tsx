'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import SettingsNav from '@/components/SettingsNav';

// 'system' was dropped intentionally — GRID is a dark-brand product
// and a mobile device set to light mode should not flip the app to
// light on first visit. Users can still explicitly choose light.
type ThemeMode = 'dark' | 'light';
type DateFormat = 'relative' | 'short' | 'long';
type NotificationCadence = 'immediate' | 'hourly' | 'daily';

type Prefs = {
  theme: ThemeMode;
  defaultEnv: string;
  emailNotifications: boolean;
  inAppNotifications: boolean;
  executionAlerts: boolean;
  mentionAlerts: boolean;
  dateFormat: DateFormat;
  notificationCadence: NotificationCadence;
};

const STORAGE_PREFIX = 'grid:prefs:';

function loadPrefs(): Prefs {
  if (typeof window === 'undefined') {
    return {
      theme: 'dark',
      defaultEnv: '',
      emailNotifications: true,
      inAppNotifications: true,
      executionAlerts: true,
      mentionAlerts: true,
      dateFormat: 'relative',
      notificationCadence: 'immediate',
    };
  }
  return {
    // Coerce any legacy 'system' value (or any non-light string) back
    // to the dark default so users who previously opted into system
    // theme don't get light-flipped on devices that prefer light.
    theme: localStorage.getItem('grid:theme') === 'light' ? 'light' : 'dark',
    defaultEnv: localStorage.getItem(STORAGE_PREFIX + 'defaultEnv') ?? '',
    emailNotifications: localStorage.getItem(STORAGE_PREFIX + 'emailNotifications') !== 'false',
    inAppNotifications: localStorage.getItem(STORAGE_PREFIX + 'inAppNotifications') !== 'false',
    executionAlerts: localStorage.getItem(STORAGE_PREFIX + 'executionAlerts') !== 'false',
    mentionAlerts: localStorage.getItem(STORAGE_PREFIX + 'mentionAlerts') !== 'false',
    dateFormat: (localStorage.getItem(STORAGE_PREFIX + 'dateFormat') as DateFormat) ?? 'relative',
    notificationCadence:
      (localStorage.getItem(STORAGE_PREFIX + 'notificationCadence') as NotificationCadence) ?? 'immediate',
  };
}

function savePrefs(prefs: Prefs) {
  localStorage.setItem('grid:theme', prefs.theme);
  localStorage.setItem(STORAGE_PREFIX + 'defaultEnv', prefs.defaultEnv);
  localStorage.setItem(STORAGE_PREFIX + 'emailNotifications', String(prefs.emailNotifications));
  localStorage.setItem(STORAGE_PREFIX + 'inAppNotifications', String(prefs.inAppNotifications));
  localStorage.setItem(STORAGE_PREFIX + 'executionAlerts', String(prefs.executionAlerts));
  localStorage.setItem(STORAGE_PREFIX + 'mentionAlerts', String(prefs.mentionAlerts));
  localStorage.setItem(STORAGE_PREFIX + 'dateFormat', prefs.dateFormat);
  localStorage.setItem(STORAGE_PREFIX + 'notificationCadence', prefs.notificationCadence);
}

type Env = { id: string; name: string; slug: string };

export default function PreferencesPage() {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [environments, setEnvironments] = useState<Env[]>([]);

  useEffect(() => {
    setPrefs(loadPrefs());
    fetch('/api/environments')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setEnvironments(data);
        else if (data.environments) setEnvironments(data.environments);
      })
      .catch(() => {});
  }, []);

  function update(partial: Partial<Prefs>) {
    const next = { ...prefs, ...partial };
    setPrefs(next);
    savePrefs(next);

    // Apply theme immediately.
    if (partial.theme) {
      document.documentElement.setAttribute('data-theme', partial.theme);
    }

    toast('Preference saved');
  }

  const themeOptions: { value: ThemeMode; label: string }[] = [
    { value: 'dark', label: 'Dark' },
    { value: 'light', label: 'Light' },
  ];

  const dateOptions: { value: DateFormat; label: string; example: string }[] = [
    { value: 'relative', label: 'Relative', example: '2 hours ago' },
    { value: 'short', label: 'Short', example: '04/13/2026' },
    { value: 'long', label: 'Long', example: 'April 13, 2026' },
  ];

  const toggleStyle = (active: boolean): React.CSSProperties => ({
    width: 40,
    height: 22,
    borderRadius: 11,
    background: active ? 'rgba(99,149,255,0.35)' : 'rgba(255,255,255,0.08)',
    border: `1px solid ${active ? 'rgba(99,149,255,0.4)' : 'var(--glass-border)'}`,
    position: 'relative',
    cursor: 'pointer',
    transition: 'all 0.2s',
    flexShrink: 0,
  });

  const toggleDotStyle = (active: boolean): React.CSSProperties => ({
    width: 16,
    height: 16,
    borderRadius: '50%',
    background: active ? '#6395ff' : 'rgba(255,255,255,0.25)',
    position: 'absolute',
    top: 2,
    left: active ? 20 : 2,
    transition: 'all 0.2s',
  });

  return (
    <div className="px-4 md:px-10 py-6 md:py-10 max-w-3xl mx-auto w-full">
      <SettingsNav />
      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 300,
            color: 'var(--text-1)',
            letterSpacing: '-0.02em',
            marginBottom: 6,
          }}
        >
          Preferences
        </h1>
        <p style={{ color: 'var(--text-3)', fontWeight: 300, fontSize: 14 }}>
          Customize your workspace appearance and notifications.
        </p>
      </div>

      {/* Theme */}
      <div
        style={{
          background: 'var(--glass)',
          border: '1px solid var(--glass-border)',
          borderRadius: 20,
          padding: '1.75rem 2rem',
          marginBottom: '1.5rem',
          backdropFilter: 'blur(20px)',
        }}
      >
        <h3 style={{ color: 'var(--text-1)', fontWeight: 300, fontSize: 16, marginBottom: 16 }}>
          Theme
        </h3>
        <div style={{ display: 'flex', gap: 10 }}>
          {themeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => update({ theme: opt.value })}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: 12,
                border: `1px solid ${prefs.theme === opt.value ? 'rgba(99,149,255,0.4)' : 'var(--glass-border)'}`,
                background: prefs.theme === opt.value ? 'rgba(99,149,255,0.1)' : 'var(--glass-deep)',
                color: prefs.theme === opt.value ? '#6395ff' : 'var(--text-3)',
                fontWeight: 300,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Default environment */}
      <div
        style={{
          background: 'var(--glass)',
          border: '1px solid var(--glass-border)',
          borderRadius: 20,
          padding: '1.75rem 2rem',
          marginBottom: '1.5rem',
          backdropFilter: 'blur(20px)',
        }}
      >
        <h3 style={{ color: 'var(--text-1)', fontWeight: 300, fontSize: 16, marginBottom: 8 }}>
          Default environment
        </h3>
        <p style={{ color: 'var(--text-3)', fontWeight: 300, fontSize: 13, marginBottom: 16 }}>
          The environment loaded by default when you open GRID.
        </p>
        <select
          value={prefs.defaultEnv}
          onChange={(e) => update({ defaultEnv: e.target.value })}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: 12,
            border: '1px solid var(--glass-border)',
            background: 'var(--glass-deep)',
            color: 'var(--text-1)',
            fontWeight: 300,
            fontSize: 14,
            outline: 'none',
            appearance: 'none',
          }}
        >
          <option value="">None (show all)</option>
          {environments.map((env) => (
            <option key={env.id} value={env.id}>
              {env.name}
            </option>
          ))}
        </select>
      </div>

      {/* Notifications */}
      <div
        style={{
          background: 'var(--glass)',
          border: '1px solid var(--glass-border)',
          borderRadius: 20,
          padding: '1.75rem 2rem',
          marginBottom: '1.5rem',
          backdropFilter: 'blur(20px)',
        }}
      >
        <h3 style={{ color: 'var(--text-1)', fontWeight: 300, fontSize: 16, marginBottom: 20 }}>
          Notifications
        </h3>
        {[
          { key: 'emailNotifications' as const, label: 'Email notifications', desc: 'Receive notifications via email' },
          { key: 'inAppNotifications' as const, label: 'In-app notifications', desc: 'Show notifications inside GRID' },
          { key: 'executionAlerts' as const, label: 'Execution alerts', desc: 'Alert when workflow executions complete or fail' },
          { key: 'mentionAlerts' as const, label: 'Mention alerts', desc: 'Alert when someone mentions you' },
        ].map((item) => (
          <div
            key={item.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: '1px solid rgba(255,255,255,0.03)',
            }}
          >
            <div>
              <p style={{ color: 'var(--text-2)', fontWeight: 300, fontSize: 14 }}>
                {item.label}
              </p>
              <p style={{ color: 'var(--text-3)', fontWeight: 300, fontSize: 12 }}>
                {item.desc}
              </p>
            </div>
            <button
              onClick={() => update({ [item.key]: !prefs[item.key] })}
              style={toggleStyle(prefs[item.key])}
            >
              <div style={toggleDotStyle(prefs[item.key])} />
            </button>
          </div>
        ))}

        {/* Delivery cadence — Slack/Linear pattern */}
        <div style={{ padding: '16px 0 4px 0' }}>
          <p style={{ color: 'var(--text-2)', fontWeight: 300, fontSize: 14, marginBottom: 4 }}>
            Delivery cadence
          </p>
          <p style={{ color: 'var(--text-3)', fontWeight: 300, fontSize: 12, marginBottom: 12 }}>
            Immediate pings, hourly roll-up, or a single daily digest.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['immediate', 'hourly', 'daily'] as const).map(opt => {
              const active = prefs.notificationCadence === opt;
              const labelMap = { immediate: 'Immediate', hourly: 'Hourly digest', daily: 'Daily digest' };
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => update({ notificationCadence: opt })}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 300,
                    textAlign: 'center',
                    background: active ? 'rgba(200,242,107,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${active ? 'rgba(200,242,107,0.25)' : 'rgba(255,255,255,0.06)'}`,
                    color: active ? '#C8F26B' : 'var(--text-2)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {labelMap[opt]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Date format */}
      <div
        style={{
          background: 'var(--glass)',
          border: '1px solid var(--glass-border)',
          borderRadius: 20,
          padding: '1.75rem 2rem',
          backdropFilter: 'blur(20px)',
        }}
      >
        <h3 style={{ color: 'var(--text-1)', fontWeight: 300, fontSize: 16, marginBottom: 16 }}>
          Date format
        </h3>
        <div style={{ display: 'flex', gap: 10 }}>
          {dateOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => update({ dateFormat: opt.value })}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: 12,
                border: `1px solid ${prefs.dateFormat === opt.value ? 'rgba(99,149,255,0.4)' : 'var(--glass-border)'}`,
                background: prefs.dateFormat === opt.value ? 'rgba(99,149,255,0.1)' : 'var(--glass-deep)',
                color: prefs.dateFormat === opt.value ? '#6395ff' : 'var(--text-3)',
                fontWeight: 300,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'center',
              }}
            >
              <div style={{ marginBottom: 4 }}>{opt.label}</div>
              <div style={{ fontSize: 11, opacity: 0.6 }}>{opt.example}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
