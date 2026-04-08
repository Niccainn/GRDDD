'use client';
import { useState, useEffect, useRef } from 'react';

type ReasoningStep = {
  id: string;
  type: 'thinking' | 'tool_start' | 'tool_done' | 'reasoning' | 'text' | 'done';
  name?: string;
  label?: string;
  summary?: string;
  text?: string;
  tokens?: number;
  cost?: number;
  timestamp: number;
};

/**
 * NovaReasoningLayer — Visual AGI component
 *
 * Shows Nova's internal reasoning process as a real-time visual flow:
 * - Thinking states with pulsing indicator
 * - Tool chain visualization with connection lines
 * - Reasoning transparency (why Nova made decisions)
 * - Token/cost tracking per step
 *
 * This is what makes GRID different from chatbots — you SEE the intelligence working.
 */
export default function NovaReasoningLayer({
  steps,
  isActive,
  compact = false,
}: {
  steps: ReasoningStep[];
  isActive: boolean;
  compact?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [steps]);

  if (steps.length === 0 && !isActive) return null;

  const toolSteps = steps.filter(s => s.type === 'tool_start' || s.type === 'tool_done');
  const completedTools = steps.filter(s => s.type === 'tool_done');
  const totalTokens = steps.find(s => s.type === 'done')?.tokens ?? 0;

  return (
    <div
      ref={containerRef}
      className={`glass-panel overflow-hidden transition-all ${compact ? 'p-3' : 'p-5'}`}
      style={{
        borderColor: isActive ? 'rgba(191, 159, 241, 0.15)' : 'var(--glass-border)',
        maxHeight: compact ? '200px' : '400px',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div
          className={`w-2 h-2 rounded-full ${isActive ? 'agi-thinking' : ''}`}
          style={{ background: isActive ? 'var(--nova)' : 'var(--text-3)' }}
        />
        <span className="text-xs font-light tracking-wide" style={{ color: 'var(--nova)' }}>
          {isActive ? 'Nova is reasoning...' : `Completed · ${completedTools.length} tools · ${totalTokens.toLocaleString()} tokens`}
        </span>
      </div>

      {/* Reasoning flow */}
      <div className="space-y-1.5">
        {steps.map((step, i) => {
          switch (step.type) {
            case 'thinking':
              return (
                <div key={step.id} className="flex items-center gap-3 py-1.5 animate-fade-in">
                  <div className="w-5 flex justify-center">
                    <div className="w-1.5 h-1.5 rounded-full agi-thinking" style={{ background: 'var(--nova)' }} />
                  </div>
                  <span className="text-xs font-light" style={{ color: 'var(--text-3)' }}>Analyzing context...</span>
                </div>
              );

            case 'tool_start':
              return (
                <div key={step.id} className="flex items-center gap-3 py-1.5 animate-fade-in agi-trace">
                  <div className="w-5 flex justify-center">
                    <div className="chrome-circle w-5 h-5" style={{ color: 'var(--nova)' }}>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  </div>
                  <span className="text-xs font-light" style={{ color: 'var(--text-2)' }}>
                    {step.label ?? step.name}
                  </span>
                  <div className="flex-1" />
                  <div className="w-1.5 h-1.5 rounded-full agi-thinking" style={{ background: 'var(--nova)' }} />
                </div>
              );

            case 'tool_done':
              return (
                <div key={step.id} className="flex items-center gap-3 py-1.5 animate-fade-in">
                  <div className="w-5 flex justify-center">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: 'var(--nova-soft)', border: '1px solid rgba(191,159,241,0.2)' }}>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="var(--nova)" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  </div>
                  <span className="text-xs font-light" style={{ color: 'var(--text-2)' }}>
                    {step.label ?? step.name}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                    {step.summary}
                  </span>
                </div>
              );

            case 'done':
              return (
                <div key={step.id} className="flex items-center gap-3 py-2 mt-2 animate-fade-in"
                  style={{ borderTop: '1px solid var(--glass-border)' }}>
                  <div className="w-5 flex justify-center">
                    <div className="w-2 h-2 rounded-full" style={{ background: 'var(--brand)' }} />
                  </div>
                  <span className="text-xs font-light" style={{ color: 'var(--brand)' }}>Complete</span>
                  <div className="flex-1" />
                  <div className="flex items-center gap-3">
                    {step.tokens && (
                      <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                        {step.tokens.toLocaleString()} tokens
                      </span>
                    )}
                    {step.cost !== undefined && step.cost > 0 && (
                      <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                        ${step.cost.toFixed(4)}
                      </span>
                    )}
                  </div>
                </div>
              );

            default:
              return null;
          }
        })}
      </div>

      {/* Visual connection line */}
      {toolSteps.length > 1 && (
        <div className="absolute left-[22px] top-[52px] bottom-[20px] w-px"
          style={{ background: 'linear-gradient(180deg, var(--nova-soft), transparent)', opacity: 0.3 }} />
      )}
    </div>
  );
}
