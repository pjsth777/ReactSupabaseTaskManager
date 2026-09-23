import React, { useState } from 'react';
import { supabase } from '../supabase-client';

export function CreateTaskModal({ 
    workspaceId, 
    projectId, 
    projects=[],
    isOpen, 
    onClose, 
    onCreated 
}) {

    const [selectedProjectId, setSelectedProjectId] = useState(projectId || (projects[0]?.id || ''));

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('medium');
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUploading(true);

        try {
        const { data: { session } } = await supabase.auth.getSession();
        let imageUrl = null;

        if (file && session) {
            const fileExt = file.name.split('.').pop();
            const filePath = `${session.user.id}/${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
            .from('tasks-images')
            .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage
            .from('tasks-images')
            .getPublicUrl(filePath);

            imageUrl = publicUrlData.publicUrl;
        }

        const targetProjectId = projectId || selectedProjectId || (projects[0]?.id || null);

        const { error: insertError } = await supabase.from('tasks').insert([
            {
                workspace_id: workspaceId,
                project_id: targetProjectId,
                title,
                description,
                priority,
                image_url: imageUrl,
                created_by: session.user.id,
                position: Date.now(),
            },
        ]);

        if (insertError) throw insertError;

        setTitle('');
        setDescription('');
        setFile(null);
        onCreated();
        onClose();
        } catch (err) {
        alert('Error creating task: ' + err.message);
        } finally {
        setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-5">
            <h2 className="text-base font-bold text-slate-100">Create Task</h2>
            <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-200 transition-colors"
            >
                ✕
            </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Title
                </label>
                <input
                type="text"
                placeholder="e.g. Implement user authorization middleware"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all"
                />
            </div>

            <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Description
                </label>
                <textarea
                placeholder="Provide task scope or steps to replicate..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm h-24 transition-all resize-none"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Priority
                </label>
                <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all"
                >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                </select>
                </div>

                <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Attachment
                </label>
                <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                />
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/80">
                <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-all"
                >
                Cancel
                </button>
                <button
                type="submit"
                disabled={uploading}
                className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all"
                >
                {uploading ? 'Creating...' : 'Create Task'}
                </button>
            </div>
            </form>
        </div>
        </div>
    );
}