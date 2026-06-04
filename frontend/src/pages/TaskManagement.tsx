import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MdDeleteOutline, MdEdit, MdCalendarToday, MdOutlinePerson, 
  MdOutlineMail, MdClose, MdSave, MdFilterList, MdCheck
} from 'react-icons/md';
import { useTaskStore, Task } from '../store/taskStore';
import { useAnalyticsStore } from '../store/analyticsStore';

const COLUMNS: { id: Task['status']; title: string; color: string; border: string }[] = [
  { id: 'Pending', title: 'To Do (Pending)', color: 'bg-slate-900/40 text-amber-400', border: 'border-amber-500/20' },
  { id: 'In Progress', title: 'In Progress', color: 'bg-slate-900/40 text-blue-400', border: 'border-blue-500/20' },
  { id: 'Completed', title: 'Completed', color: 'bg-slate-900/40 text-emerald-400', border: 'border-emerald-500/20' },
];

const TaskManagement: React.FC = () => {
  const navigate = useNavigate();
  const { tasks, fetchTasks, updateTask, deleteTask } = useTaskStore();
  const { fetchAnalytics } = useAnalyticsStore();

  // Filter State
  const [selectedOwner, setSelectedOwner] = useState('All');
  
  // Edit Modal State
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editOwner, setEditOwner] = useState('');
  const [editDue, setEditDue] = useState('');
  const [editStatus, setEditStatus] = useState<Task['status']>('Pending');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  // Get unique list of task owners for filtering dropdown
  const ownersList = useMemo(() => {
    const owners = new Set<string>();
    tasks.forEach(t => {
      if (t.owner) owners.add(t.owner);
    });
    return ['All', ...Array.from(owners)];
  }, [tasks]);

  // Filter tasks by selected owner
  const filteredTasks = useMemo(() => {
    if (selectedOwner === 'All') return tasks;
    return tasks.filter(t => t.owner === selectedOwner);
  }, [tasks, selectedOwner]);

  const handleOpenEditModal = (task: Task) => {
    setEditingTask(task);
    setEditDesc(task.task);
    setEditOwner(task.owner);
    setEditDue(task.due_date);
    setEditStatus(task.status);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    setSavingEdit(true);
    try {
      await updateTask(editingTask.task_id, {
        task: editDesc,
        owner: editOwner,
        due_date: editDue,
        status: editStatus
      });
      setEditingTask(null);
      fetchAnalytics();
    } catch (err) {
      console.error('Failed to update task:', err);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleQuickStatusChange = async (taskId: string, newStatus: Task['status']) => {
    try {
      await updateTask(taskId, { status: newStatus });
      fetchAnalytics();
    } catch (err) {
      console.error('Failed to move task:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(taskId);
        fetchAnalytics();
      } catch (err) {
        console.error('Failed to delete task:', err);
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      
      {/* Filtering Header Panel */}
      <div className="glass-panel p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <MdFilterList size={18} className="text-slate-400" />
          <span className="text-xs font-semibold text-slate-400">Filter Board By Owner:</span>
          <select
            className="glass-input py-1 px-3 text-xs bg-slate-900 border-slate-800 text-slate-200 cursor-pointer"
            value={selectedOwner}
            onChange={(e) => setSelectedOwner(e.target.value)}
          >
            {ownersList.map(owner => (
              <option key={owner} value={owner}>{owner}</option>
            ))}
          </select>
        </div>

        <span className="text-[11px] text-slate-500 font-semibold uppercase">
          Total Mapped Tasks: {filteredTasks.length}
        </span>
      </div>

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1 min-h-[500px]">
        {COLUMNS.map((col) => {
          const colTasks = filteredTasks.filter(t => t.status === col.id);
          return (
            <div 
              key={col.id}
              className={`glass-panel p-4 flex flex-col gap-4 border ${col.border}`}
            >
              
              {/* Column Title banner */}
              <div className={`p-2.5 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-between ${col.color}`}>
                <span>{col.title}</span>
                <span className="bg-slate-950/40 px-2 py-0.5 rounded text-[10px]">{colTasks.length}</span>
              </div>

              {/* Column Task Cards */}
              <div className="flex-1 flex flex-col gap-3 overflow-y-auto max-h-[65vh] pr-1">
                {colTasks.length === 0 ? (
                  <div className="flex-1 border border-dashed border-slate-800 rounded-xl flex items-center justify-center text-xs text-slate-600 py-16">
                    No items in this status.
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <motion.div
                      layoutId={task.task_id}
                      key={task.task_id}
                      className="p-4 bg-slate-900/40 hover:bg-slate-900/60 border border-slate-800/80 hover:border-brand-500/25 rounded-xl shadow flex flex-col gap-3 transition duration-200"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-slate-200 light:text-slate-800 leading-normal">
                          {task.task}
                        </h4>
                      </div>

                      {/* Details row */}
                      <div className="flex flex-wrap gap-2.5 text-[10px] text-slate-400 font-semibold border-t border-slate-800/60 pt-2.5 light:border-slate-200">
                        <span className="flex items-center gap-1">
                          <MdOutlinePerson size={12} />
                          <span>{task.owner}</span>
                        </span>
                        <span className="flex items-center gap-1 text-amber-500">
                          <MdCalendarToday size={11} />
                          <span>{task.due_date}</span>
                        </span>
                      </div>

                      {/* Interactive controller footer */}
                      <div className="flex items-center justify-between border-t border-slate-800/40 pt-2 mt-1 light:border-slate-200">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/emails/${task.email_id}`)}
                            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition"
                            title="View Originating Email"
                          >
                            <MdOutlineMail size={15} />
                          </button>
                          
                          <button
                            onClick={() => handleOpenEditModal(task)}
                            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition"
                            title="Edit task parameters"
                          >
                            <MdEdit size={15} />
                          </button>
                        </div>

                        {/* Status rapid-shifter controls */}
                        <div className="flex items-center gap-1">
                          <select
                            className="bg-slate-950/60 text-[10px] text-slate-400 font-semibold px-2 py-0.5 border border-slate-800 focus:border-brand-500 rounded cursor-pointer outline-none"
                            value={task.status}
                            onChange={(e) => handleQuickStatusChange(task.task_id, e.target.value as Task['status'])}
                          >
                            <option value="Pending">To Do</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                          </select>

                          <button
                            onClick={() => handleDeleteTask(task.task_id)}
                            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400 transition"
                            title="Delete task card"
                          >
                            <MdDeleteOutline size={15} />
                          </button>
                        </div>
                      </div>

                    </motion.div>
                  ))
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* Task Parameters Editing Modal */}
      <AnimatePresence>
        {editingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingTask(null)}
              className="fixed inset-0 bg-black"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel w-full max-w-md p-5 relative z-50"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-850 light:border-slate-200 mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Edit Task Parameters</h3>
                <button 
                  onClick={() => setEditingTask(null)}
                  className="p-1 hover:bg-slate-850 rounded-lg text-slate-400"
                >
                  <MdClose size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Description</label>
                  <input
                    type="text"
                    required
                    className="glass-input text-xs"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-400">Owner/Assignee</label>
                    <input
                      type="text"
                      className="glass-input text-xs"
                      value={editOwner}
                      onChange={(e) => setEditOwner(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-400">Due Date</label>
                    <input
                      type="text"
                      className="glass-input text-xs"
                      value={editDue}
                      onChange={(e) => setEditDue(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Board Column (Status)</label>
                  <select
                    className="glass-input text-xs bg-slate-900 border-slate-800 text-slate-200"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as Task['status'])}
                  >
                    <option value="Pending">To Do (Pending)</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-850 light:border-slate-200 pt-4 mt-2">
                  <button
                    type="button"
                    onClick={() => setEditingTask(null)}
                    className="glass-btn-secondary py-1.5 px-3 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="glass-btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5"
                  >
                    <MdSave size={15} />
                    <span>{savingEdit ? 'Saving...' : 'Save Parameters'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default TaskManagement;
