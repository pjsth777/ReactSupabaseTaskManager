import { useState, useEffect } from 'react';
import { supabase } from '../supabase-client';

export function useWorkspace() {
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    if (activeWorkspace) {
      fetchProjects(activeWorkspace.id);
    }
  }, [activeWorkspace]);

  const fetchWorkspaces = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && data.length > 0) {
      setWorkspaces(data);
      setActiveWorkspace(data[0]);
    }
    setLoading(false);
  };

  const fetchProjects = async (workspaceId) => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true });

    if (!error) {
      setProjects(data || []);
    }
  };

  return {
    workspaces,
    activeWorkspace,
    setActiveWorkspace,
    projects,
    activeProject,
    setActiveProject,
    loading,
    refetchProjects: () => activeWorkspace && fetchProjects(activeWorkspace.id),
  };
}