import React from 'react';

export function WorkspaceHeader({
  workspaces,
  activeWorkspace,
  onSelectWorkspace,
  projects,
  activeProject,
  onSelectProject,
  onOpenTaskModal,
  onOpenProjectModal,
  onOpenInviteModal,
  onToggleActivity,
}) {
  return (
    <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-6 py-3.5 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-4">
        {/* Workspace Selector */}
        <div className="relative flex items-center">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute left-3 pointer-events-none" />
          <select
            value={activeWorkspace?.id || ''}
            onChange={(e) => {
              const ws = workspaces.find((w) => w.id === e.target.value);
              onSelectWorkspace(ws);
            }}
            className="pl-8 pr-8 py-1.5 bg-slate-800/90 hover:bg-slate-800 text-slate-100 font-semibold text-sm rounded-lg border border-slate-700/60 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer appearance-none"
          >
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id} className="bg-slate-900 text-slate-200">
                {ws.name}
              </option>
            ))}
          </select>
        </div>

        <span className="text-slate-700 font-light text-lg">/</span>

        {/* Project Selector Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-slate-800/60">
          <button
            onClick={() => onSelectProject(null)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              !activeProject
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Tasks
          </button>
          {projects.map((proj) => (
            <button
              key={proj.id}
              onClick={() => onSelectProject(proj)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeProject?.id === proj.id
                  ? 'bg-indigo-600/90 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {proj.name}
            </button>
          ))}
          <button
            onClick={onOpenProjectModal}
            className="px-2 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-indigo-400 hover:bg-slate-900 transition-all border border-dashed border-slate-700/60 ml-1"
            title="Create Project"
          >
            + Project
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">

        <button
          onClick={onOpenInviteModal}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700/60 transition-all"
        >
          <span>👤+</span> Invite
        </button>
        
        <button
          onClick={onToggleActivity}
          className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium px-3.5 py-2 rounded-lg border border-slate-700/60 transition-all flex items-center gap-2 active:scale-95"
        >
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          Activity Log
        </button>

        <button
          onClick={onOpenTaskModal}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Task
        </button>
      </div>
    </header>
  );
}