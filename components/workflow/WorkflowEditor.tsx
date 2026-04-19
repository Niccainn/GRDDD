'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function WorkflowEditor({ workflow, updateWorkflow }: any) {
  const [isSaving, setIsSaving] = useState(false);

  const saveWorkflow = async () => {
    setIsSaving(true);
    const formData = new FormData();
    formData.append('id', workflow.id);
    formData.append('nodes', workflow.nodes || '[]');
    formData.append('edges', workflow.edges || '[]');
    await updateWorkflow(formData);
    setIsSaving(false);
  };

  const activateWorkflow = async () => {
    const formData = new FormData();
    formData.append('id', workflow.id);
    formData.append('nodes', workflow.nodes || '[]');
    formData.append('edges', workflow.edges || '[]');
    formData.append('status', 'ACTIVE');
    await updateWorkflow(formData);
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#121213] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/workflows" className="text-white/60 hover:text-white text-sm font-light">
              ← Back to Workflows
            </Link>
            <div>
              <h1 className="text-xl font-light">{workflow.name}</h1>
              <p className="text-xs text-white/40">
                {workflow.system.name} · {workflow.environment.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs px-3 py-1 rounded-full ${
              workflow.status === 'ACTIVE' ? 'bg-[#C8F26B]/20 text-[#C8F26B]' :
              workflow.status === 'DRAFT' ? 'bg-white/10 text-white/60' :
              'bg-white/10 text-white/40'
            }`}>
              {workflow.status}
            </span>
            <button
              onClick={saveWorkflow}
              disabled={isSaving}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-light transition-all disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            {workflow.status !== 'ACTIVE' && (
              <button
                onClick={activateWorkflow}
                className="bg-gradient-to-r from-[#C8F26B] to-[#68D0CA] text-white px-4 py-2 rounded-lg text-sm font-light hover:opacity-90 transition-opacity"
              >
                Activate Workflow
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center max-w-2xl px-6">
          <div className="text-6xl mb-6">⚡</div>
          <h2 className="text-3xl font-extralight mb-4">Visual Workflow Builder</h2>
          <p className="text-white/50 font-light mb-8">
            The drag-and-drop workflow editor will be added here. For now, your workflow is created and ready!
          </p>
          
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-8">
            <h3 className="text-lg font-light mb-4">Workflow Details</h3>
            <div className="space-y-3 text-left">
              <div className="flex justify-between">
                <span className="text-white/40 text-sm">Name</span>
                <span className="text-sm">{workflow.name}</span>
              </div>
              {workflow.description && (
                <div className="flex justify-between">
                  <span className="text-white/40 text-sm">Description</span>
                  <span className="text-sm">{workflow.description}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-white/40 text-sm">Status</span>
                <span className="text-sm">{workflow.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40 text-sm">System</span>
                <span className="text-sm">{workflow.system.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40 text-sm">Environment</span>
                <span className="text-sm">{workflow.environment.name}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button className="px-6 py-3 bg-[#7193ED]/20 hover:bg-[#7193ED]/30 border border-[#7193ED]/40 rounded-lg text-sm font-light transition-all">
              ⚙️ Add Task Node
            </button>
            <button className="px-6 py-3 bg-[#FFC700]/20 hover:bg-[#FFC700]/30 border border-[#FFC700]/40 rounded-lg text-sm font-light transition-all">
              🔀 Add Decision
            </button>
            <button className="px-6 py-3 bg-[#BF9FF1]/20 hover:bg-[#BF9FF1]/30 border border-[#BF9FF1]/40 rounded-lg text-sm font-light transition-all">
              🤖 Add Automation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
