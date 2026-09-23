import React from 'react';
import { useActivityLogs } from '../hooks/useActivityLogs';

export function ActivityLogPanel({ workspaceId, isOpen, onClose }) {
  const { logs, loading } = useActivityLogs(workspaceId);

  if (!isOpen) return null;

  const formatMessage = (log) => {
    switch (log.action) {
      case 'STATUS_CHANGED':
        return (
          <span>
            Moved status from{' '}
            <span className="font-semibold text-slate-300">{log.metadata?.from}</span> to{' '}
            <span className="font-semibold text-indigo-400">{log.metadata?.to}</span>
          </span>
        );
      case 'ASSIGNEE_CHANGED':
        return <span>Updated task assignment</span>;
      default:
        return <span>Performed action: {log.action}</span>;
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-slate-900 border-l border-slate-800/80 shadow-2xl z-50 flex flex-col backdrop-blur-xl animate-in slide-in-from-right duration-200">
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Workspace Activity
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 text-sm p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Activity Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <p className="text-xs text-slate-500 text-center py-4">Loading trail...</p>
        ) : logs.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">No logged activity yet.</p>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="p-3 bg-slate-950/60 border border-slate-800/60 rounded-xl text-xs space-y-1"
            >
              <div className="text-slate-300">{formatMessage(log)}</div>
              <div className="text-[10px] text-slate-500 font-mono">
                {new Date(log.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}