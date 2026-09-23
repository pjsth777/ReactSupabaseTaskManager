import React, { useState } from 'react';
import { useWorkspace } from './hooks/useWorkspace';
import { WorkspaceHeader } from './components/WorkspaceHeader';
import { KanbanBoard } from './components/KanbanBoard';
import { CreateTaskModal } from './components/CreateTaskModal';
import { CreateProjectModal } from './components/CreateProjectModal';
import { ActivityLogPanel } from './components/ActivityLogPanel';
import { TaskDetailModal } from './components/TaskDetailModal';
import { InviteMemberModal } from './components/InviteMemberModal'; // <--- Import

export default function App() {
  const {
    workspaces,
    activeWorkspace,
    setActiveWorkspace,
    projects,
    activeProject,
    setActiveProject,
    refetchProjects,
    loading,
  } = useWorkspace();

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false); // <--- State
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Loading workspace session...
      </div>
    );
  }

  if (!activeWorkspace) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased relative overflow-x-hidden">
      <WorkspaceHeader
        workspaces={workspaces}
        activeWorkspace={activeWorkspace}
        onSelectWorkspace={setActiveWorkspace}
        projects={projects}
        activeProject={activeProject}
        onSelectProject={setActiveProject}
        onOpenTaskModal={() => setIsTaskModalOpen(true)}
        onOpenProjectModal={() => setIsProjectModalOpen(true)}
        onOpenInviteModal={() => setIsInviteModalOpen(true)} // <--- Handler
        onToggleActivity={() => setIsActivityOpen((prev) => !prev)}
      />

      <main className="flex-1 overflow-hidden">
        <KanbanBoard
          workspaceId={activeWorkspace.id}
          projectId={activeProject?.id}
          onTaskClick={(task) => setSelectedTask(task)}
        />
      </main>

      <CreateTaskModal
        workspaceId={activeWorkspace.id}
        projectId={activeProject?.id}
        projects={projects}
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onCreated={() => {}}
      />

      <CreateProjectModal
        workspaceId={activeWorkspace.id}
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onCreated={refetchProjects}
      />

      <TaskDetailModal
        task={selectedTask}
        projects={projects}
        workspaceId={activeWorkspace.id}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdated={() => {}}
      />

      <InviteMemberModal
        workspaceId={activeWorkspace.id}
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInvited={() => {}}
      />

      <ActivityLogPanel
        workspaceId={activeWorkspace.id}
        isOpen={isActivityOpen}
        onClose={() => setIsActivityOpen(false)}
      />
    </div>
  );
}