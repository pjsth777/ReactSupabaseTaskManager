import { useState, useEffect } from 'react';
import { supabase } from '../supabase-client';

export function useKanbanTasks(workspaceId, projectId) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;

    fetchTasks();

    // Subscribe to realtime postgres updates for tasks
    const channel = supabase
      .channel(`tasks-workspace-${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTasks((prev) => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setTasks((prev) =>
              prev.map((t) => (t.id === payload.new.id ? payload.new : t))
            );
          } else if (payload.eventType === 'DELETE') {
            setTasks((prev) => prev.filter((t) => t.id === payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, projectId]);

  const fetchTasks = async () => {
    setLoading(true);
    let query = supabase
      .from('tasks')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('position', { ascending: true });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;
    if (!error) setTasks(data || []);
    setLoading(false);
  };

  const moveTask = async (taskId, newStatus, newPosition) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId
          ? { ...task, status: newStatus, position: newPosition }
          : task
      )
    );

    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus, position: newPosition })
      .eq('id', taskId);

    if (error) {
      console.error('Task move failed:', error.message);
      fetchTasks();
    }
  };

  return { tasks, setTasks, loading, moveTask, refetchTasks: fetchTasks };
}