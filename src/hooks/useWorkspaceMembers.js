import { useState, useEffect } from 'react';
import { supabase } from '../supabase-client';

export function useWorkspaceMembers(workspaceId) {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!workspaceId) return;

        async function fetchMembers() {
            setLoading(true);

            const { data, error } = await supabase
                .from('workspace_members')
                .select(`
                    user_id,
                    role,
                    profiles(
                        id,
                        email,
                        full_name,
                        avatar_url
                    )    
                `)
                .eq('workspace_id', workspaceId);
    
            if (!error && data) {
                setMembers(data.map((m) => ({ ...m.profiles, role: m.role })));
            }
            setLoading(false);
        }
        fetchMembers();
    }, [workspaceId]);

    return { members, loading };
}