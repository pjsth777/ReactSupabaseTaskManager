import React, { useState } from 'react';
import { supabase } from '../supabase-client';

const ROLES = [
  { id: 'member', label: 'Member', desc: 'Can create, edit, and move tasks' },
  { id: 'admin', label: 'Admin', desc: 'Can manage workspace settings & members' },
  { id: 'viewer', label: 'Viewer', desc: 'Read-only access to board and activity' },
];

export function InviteMemberModal({ workspaceId, isOpen, onClose, onInvited }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleInvite = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. Look up user by email in profiles table
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (profileError) throw profileError;

      if (!userProfile) {
        setErrorMsg('No registered user found with this email address.');
        setLoading(false);
        return;
      }

      // 2. Check if user is already in workspace_members
      const { data: existingMember } = await supabase
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userProfile.id)
        .maybeSingle();

      if (existingMember) {
        setErrorMsg('This user is already a member of this workspace.');
        setLoading(false);
        return;
      }

      // 3. Add user to workspace_members
      const { error: insertError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspaceId,
          user_id: userProfile.id,
          role: role,
        });

      if (insertError) throw insertError;

      setSuccessMsg(`Added ${userProfile.full_name || email} as ${role}!`);
      setEmail('');
      onInvited?.();

      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1500);
    } catch (err) {
      setErrorMsg('Failed to invite member: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-800">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <span>👥</span> Invite Team Member
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-medium">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              User Email Address
            </label>
            <input
              type="email"
              required
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Role & Permissions
            </label>
            <div className="space-y-2">
              {ROLES.map((r) => (
                <label
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    role === r.id
                      ? 'bg-indigo-950/40 border-indigo-500/60 text-slate-100'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.id}
                    checked={role === r.id}
                    onChange={() => setRole(r.id)}
                    className="mt-0.5 accent-indigo-500"
                  />
                  <div>
                    <div className="text-xs font-bold capitalize text-slate-200">{r.label}</div>
                    <div className="text-[11px] text-slate-400">{r.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all"
            >
              {loading ? 'Adding...' : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}