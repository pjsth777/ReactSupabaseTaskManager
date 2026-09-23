import { useState, useEffect } from 'react';
import { supabase } from '../supabase-client';

export function useActivityLogs(workspaceId) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!workspaceId) return;

        fetchLogs();

        const channel = supabase
            .channel(`activity-workspace-${workspaceId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'activity_logs',
                    filter: `workspace_id=eq.${workspaceId}`
                },
                (payload) => {
                    setLogs((prev) => [payload.new, ...prev]);
                }
            )
            .subscribe();
            
        return () => {
            supabase.removeChannel(channel);
        };
    }, [workspaceId])


    const fetchLogs = async() => {
        setLoading(true);
        const { data, error } = await supabase
            .from('activity_logs')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false })
            .limit(30);

        if (!error) {
            setLogs(data || []);
        }
        setLoading(false);
    };

    return { logs, loading };
}