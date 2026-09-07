import React, { useState, useEffect } from "react";
import "./App.css";
import { supabase } from "./supabase-client";


// Sample Data
const FEATURED_POST = {
  id: "gottodo-1",
  badge: "GottoDo It",
  title: "Like life depends on it",
  subtitle:
    "Explore every way you can that this life is going to be one hell of experience.",
  author: "Especially you",
  date: "Sep 6, 2026",
  readTime: "4 min read",
};

// Reusable Components
function Navbar({ brandName, links, userEmail }) {

    const handleSignOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error("Error signing out:", error.message);
        }
    }

    return (
        <nav className="navbar">
            <a href="#" className="logo">
                {brandName}
            </a>
            <div className="nav-links">
                {links.map((link, idx) => (
                <a key={idx} href={link.href}>
                    {link.label}
                </a>
                ))}
                {userEmail && (
                    <div 
                        className="user-menu" 
                        style={{ 
                            display: "inline-flex", 
                            gap: "1rem", 
                            alignItems: "center", 
                            marginLeft: "1.5rem" 
                        }}
                    >
                        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                            {userEmail}
                        </span>
                        <button className="btn-edit" onClick={handleSignOut}>
                            Sign Out
                        </button>
                    </div>
                )}
            </div>
        </nav>
    );
}

function HeroArticle({ post }) {

  const { badge, title, subtitle, author, date, readTime } = post;
  return (
    <header className="hero">
      <span className="badge">{badge}</span>
      <h1>{title}</h1>
      <p className="subtitle">{subtitle}</p>
      <div className="meta">
        <span>{author}</span> • <span>{date}</span> • <span>{readTime}</span>
      </div>
    </header>
  );
}

function Footer({ copyrightText }) {
  return (
    <footer>
      <p>{copyrightText}</p>
    </footer>
  );
}

function SimpleForm({ onAddTask, editingTask, onUpdateTask, onCancelEdit, userId }) {
  
    const [ title, setTitle ] = useState("");
    const [ description, setDescription ] = useState("");
    const [ file, setFile ] = useState(null);
    const [ uploading, setUplaoding ] = useState(false);

    useEffect(() => {
        if (editingTask) {
        setTitle(editingTask.title || "");
        setDescription(editingTask.description || "");
        } else {
        setTitle("");
        setDescription("");
        setFile(null);
        }
    }, [editingTask])

    const uploadImage = async (selectedFile) => {
        const fileExt = selectedFile.name.split(".").pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from("tasks-images")
            .upload(fileName, selectedFile);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from("tasks-images")
            .getPublicUrl(fileName);

        return data.publicUrl;
    }

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!title.trim()) return;

        let newUploadedUrl = null;
        const oldImageUrl = editingTask?.image_url || null;

        try {
            setUplaoding(true);

            if (file) {
                newUploadedUrl = await uploadImage(file);
            }

            const finalImageUrl = newUploadedUrl || oldImageUrl;

            if (editingTask) {
                const { data, error } = await supabase
                    .from("tasks")
                    .update({ title, description, image_url: finalImageUrl })
                    .eq("id", editingTask.id)
                    .select()
                    .single();
        
                if (error) {
                    console.error("Error updating task:", error.message);
                    return;
                }    

                if (file && oldImageUrl) {
                    console.log("Deleting old file at URL:", oldImageUrl);
                    await deleteStorageFile(oldImageUrl);
                }

                onUpdateTask(data);
            } else {
                const newTask = {
                    title,
                    description,
                    user_id: userId,
                    image_url: finalImageUrl
                };
                
                const { data, error } = await supabase
                    .from("tasks")
                    .insert([newTask])
                    .select()
                    .single();
            
                if (error) {
                    console.error("Error adding task: ", error.message);
                    return;
                }
            
                if (data && onAddTask) {
                    onAddTask(data);
                }
            }
            setTitle("");
            setDescription("");
            setFile(null);
        } catch (error) {
            console.error("Error saving task or image:", error.message);
            if (newUploadedUrl) await deleteStorageFile(newUploadedUrl);
        } finally {
            setUplaoding(false);
        }   
    };

    return (
        <form onSubmit={handleSubmit}>

            <label htmlFor="titleInput">Title: </label>
            <input 
                id="titleInput"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter Title"
            />

            <label htmlFor="descriptionInput">Description: </label>
            <input 
                id="descriptionInput"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter Description"
            />

            <div className="file-input-group">
                <label htmlFor="imageInput">Image: </label>
                <input
                    id="imageInput"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files[0] || null)}
                />

                {file && (
                    <div style={{ marginTop: "0.5rem" }}>
                        <img
                            src={URL.createObjectURL(file)}
                            alt="Preview"
                            style={{
                                width: "60px",
                                height: "60px",
                                objectFit: "cover",
                                borderRadius: "6px",
                                border: "1px solid var(--border)"
                            }}
                        />
                    </div>
                )}
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="submit">{editingTask ? "Update" : "Add"}</button>
                {editingTask && (
                    <button
                    type="button"
                    className="btn-cancel"
                    onClick={onCancelEdit}
                    >
                    Cancel
                    </button>
                )}
            </div>
        </form>
    )
}

function Tasks({ tasks, currentUserId, onDeleteTask, onStartEdit }) {

  if (!tasks.length) return <p style={{ color: "var(--text-muted)" }}>No tasks yet.</p>;

  return (
    <section className="posts-grid">
      {tasks.map((task) => {

        const isOwner = task.user_id == currentUserId;

        return (
            <article key={task.id} className="post-card">
                {task.image_url && (
                    <img
                        src={task.image_url}
                        alt={task.title}
                        style={{
                            width: "100%",
                            height: "180px",
                            objectFit: "cover",
                            borderRadius: "8px",
                            marginBottom: "0.75rem"
                        }}
                    />
                )}
                <h2>{task.title}</h2>
                <p>{task.description}</p>
                { isOwner ? (
                    <div className="card-actions">
                        <button className="btn-edit" onClick={() => onStartEdit(task)}>
                            Edit
                        </button>
                        <button className="btn-delete" onClick={() => onDeleteTask(task)}>
                            Delete
                        </button>
                    </div>
                ) : (
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        Read-only
                    </span>    
                )
                }
            </article>
        );
      })}
    </section>
  )
}

const deleteStorageFile = async (imageUrl) => {
  if (!imageUrl) return;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.error("Storage delete failed: No active authenticated session.");
    return;
  }

  try {
    const bucketPrefix = "/tasks-images/";
    const pathIndex = imageUrl.indexOf(bucketPrefix);
    if (pathIndex === -1) return;

    const filePath = imageUrl.substring(pathIndex + bucketPrefix.length);

    const { data, error } = await supabase
      .storage
      .from("tasks-images")
      .remove([filePath]);

    if (error) {
      console.error("Storage delete error:", error.message);
    } else if (data && data.length > 0) {
      console.log("Successfully deleted file from storage:", data);
    } else {
      console.warn("No file deleted. Verify RLS policy or exact file path.");
    }
  } catch (err) {
    console.error("Error during storage file deletion:", err);
  }
};

export default function TaskManager({ session }) {
      
    const [ tasks, setTasks ] = useState([]);
    const [ loading, setLoading ] = useState(true);
    const [ editingTask, setEditingTask ] = useState(null);

    const userId = session?.user?.id;
    const userEmail = session?.user?.email;

    useEffect(() => {
        async function fetchTasks() {
            if (!userId) return;

            setLoading(true);
            
            const { data, error } = await supabase
                .from("tasks")
                .select("*")
                .order("id", { ascending: false });

            if (error) {
                console.error("Error fetching tasks:", error.message);
            } else {
                setTasks(data || []);
            }
            
            setLoading(false);
        }

        fetchTasks();
    }, [userId]);


    useEffect(() => {
        const channel = supabase
            .channel("tasks-channel")
            .on(
                "postgres_changes", 
                { event: "*", schema: "public", table: "tasks" },
                (payload) => {
                    if (payload.eventType == "INSERT") {
                        setTasks((prev) => {
                            if (prev.some((t) => t.id == payload.new.id)) return prev;
                            return [payload.new, ...prev];
                        });
                    } else if (payload.eventType == "UPDATE") {
                        setTasks((prev) => 
                            prev.map((t) => (t.id === payload.new.id ? payload.new : t))
                        );
                    } else if (payload.eventType === "DELETE") {
                        setTasks((prev) => prev.filter((t) => t.id !== payload.old.id));
                    }
                }
            ).subscribe((status) => {
                console.log("Realtime status: ", status);
            });

        return () => {
            supabase.removeChannel(channel);
        }
    }, [])

    const handleAddTask = (newTask) => {
        setTasks((prevTasks) => [newTask, ...prevTasks]);
    };

    const handleUpdateTask = (updatedTask) => {
        setTasks((prev) => 
        prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
        );
        setEditingTask(null);
    };

    const handleDeleteTask = async (taskToDelete) => {

        const taskId = typeof taskToDelete === "object" ? taskToDelete.id : taskToDelete;
        const imageUrl = 
            typeof taskToDelete === "object" 
                ? taskToDelete.image_url 
                : tasks.find(t => t.id === taskId)?.image_url;

        const { error } = await supabase.from("tasks").delete().eq("id", taskId);

        if (error) {
            console.error("Error deleting task:", error.message);
            return;
        }

        if (imageUrl) {
            await deleteStorageFile(imageUrl);
        }

        setTasks((prev) => prev.filter((t) => t.id !== taskId));
    }

    const navLinks = [
        { label: "Home Work", href: "#homeWork" },
        { label: "Office Work", href: "#officeWork" },
        { label: "Hobby Work", href: "#hobbyWork" },
    ];

    return (
        <div className="app">
            <Navbar brandName="Gotto Do" links={navLinks} userEmail={userEmail} />

            <main className="container">
                <HeroArticle post={FEATURED_POST} />

                <SimpleForm 
                    onAddTask={handleAddTask} 
                    editingTask={editingTask}
                    onUpdateTask={handleUpdateTask}
                    onCancelEdit={() => setEditingTask(null)}
                    userId={userId}
                />

                {loading ? (
                <p style={{ color: "var(--text-muted)" }}>Loading tasks...</p>
                ) : (
                <Tasks 
                    tasks={tasks} 
                    currentUserId={userId}
                    onDeleteTask={handleDeleteTask}
                    onStartEdit={(task) => setEditingTask(task)}
                />
                )}
            </main>

            <Footer copyrightText="© 2026 Todos with myself. Built with React." />
        </div>
    )
}