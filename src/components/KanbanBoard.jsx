import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useKanbanTasks } from '../hooks/useKanbanTasks';

const COLUMNS = [
  { id: 'backlog', title: 'Backlog', accent: 'border-slate-500' },
  { id: 'todo', title: 'To Do', accent: 'border-sky-500' },
  { id: 'in_progress', title: 'In Progress', accent: 'border-amber-500' },
  { id: 'review', title: 'Review', accent: 'border-purple-500' },
  { id: 'done', title: 'Done', accent: 'border-emerald-500' },
];

const PRIORITY_STYLES = {
  urgent: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  high: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  medium: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  low: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

export function KanbanBoard({ workspaceId, projectId, onTaskClick }) {
  const { tasks, moveTask, loading } = useKanbanTasks(workspaceId, projectId);

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) return;

    const targetStatus = destination.droppableId;
    const destColumnTasks = tasks
      .filter((t) => t.status === targetStatus)
      .sort((a, b) => a.position - b.position);

    let newPosition = 1000.0;
    if (destColumnTasks.length > 0) {
      if (destination.index === 0) {
        newPosition = destColumnTasks[0].position / 2;
      } else if (destination.index >= destColumnTasks.length) {
        newPosition = destColumnTasks[destColumnTasks.length - 1].position + 1000.0;
      } else {
        const prevPos = destColumnTasks[destination.index - 1].position;
        const nextPos = destColumnTasks[destination.index].position;
        newPosition = (prevPos + nextPos) / 2;
      }
    }

    moveTask(draggableId, targetStatus, newPosition);
  };

  if (loading) {
    return (
      <div className="p-8 text-slate-500 text-sm flex items-center justify-center h-64">
        <span className="animate-pulse">Syncing tasks...</span>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-5 p-6 overflow-x-auto min-h-[calc(100vh-65px)] bg-slate-950 items-start">
        {COLUMNS.map((column) => {
          const columnTasks = tasks
            .filter((task) => task.status === column.id)
            .sort((a, b) => a.position - b.position);

          return (
            <div
              key={column.id}
              className="w-80 flex-shrink-0 bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 flex flex-col max-h-[calc(100vh-110px)] shadow-xl"
            >
              {/* Column Header */}
              <div className={`flex justify-between items-center pb-3 mb-3 border-b-2 ${column.accent}`}>
                <h3 className="font-bold text-xs text-slate-300 tracking-wider uppercase">
                  {column.title}
                </h3>
                <span className="bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded-md font-mono font-medium border border-slate-700/50">
                  {columnTasks.length}
                </span>
              </div>

              {/* Task Drop Zone */}
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 overflow-y-auto space-y-3 pr-1 min-h-[120px] rounded-xl transition-colors ${
                      snapshot.isDraggingOver ? 'bg-indigo-950/20 ring-1 ring-indigo-500/30' : ''
                    }`}
                  >
                    {columnTasks.length === 0 && !snapshot.isDraggingOver && (
                      <div className="h-24 border border-dashed border-slate-800/80 rounded-xl flex items-center justify-center text-[11px] text-slate-600">
                        Drop tasks here
                      </div>
                    )}

                    {columnTasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => onTaskClick?.(task)}
                            className={`p-4 bg-slate-800/80 border border-slate-700/60 rounded-xl shadow-md hover:border-slate-500 cursor-pointer transition-all duration-150 ${
                              snapshot.isDragging
                                ? 'rotate-2 shadow-2xl border-indigo-500/80 bg-slate-800 z-50'
                                : ''
                            }`}
                          >
                            <p className="font-semibold text-slate-100 text-sm leading-snug">
                              {task.title}
                            </p>

                            {task.description && (
                              <p className="text-xs text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
                                {task.description}
                              </p>
                            )}

                            {task.image_url && (
                              <img
                                src={task.image_url}
                                alt="Attachment"
                                className="mt-3 rounded-lg border border-slate-700/60 max-h-36 object-cover w-full"
                              />
                            )}
                              <div className="mt-3.5 pt-2.5 border-t border-slate-700/40 flex justify-between items-center text-xs">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide uppercase border ${
                                    PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium
                                  }`}
                                >
                                  {task.priority}
                                </span>

                                <div className="flex items-center gap-2">
                                  {task.due_date && (
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {new Date(task.due_date).toLocaleDateString(undefined, {
                                        month: 'short',
                                        day: 'numeric',
                                      })}
                                    </span>
                                  )}

                                  {/* Assignee Avatar */}
                                  {task.assignee ? (
                                    <div
                                      title={task.assignee.full_name || task.assignee.email}
                                      className="w-6 h-6 rounded-full bg-indigo-600 border border-indigo-400/30 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden"
                                    >
                                      {task.assignee.avatar_url ? (
                                        <img src={task.assignee.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                      ) : (
                                        (task.assignee.full_name || task.assignee.email || '?').charAt(0).toUpperCase()
                                      )}
                                    </div>
                                  ) : (
                                    <div className="w-6 h-6 rounded-full border border-dashed border-slate-700 flex items-center justify-center text-[10px] text-slate-600">
                                      ?
                                    </div>
                                  )}
                                </div>
                              </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}