import { Auth } from "./auth";
import TaskManager from "./task-manager";
import { useState, useEffect } from "react";
import { supabase } from "./supabase-client";

export default function App() {

  const [ session, setSession ] = useState(null); 
  const [ loading, setLoading ] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>
        Loading session...
      </div>
    )
  }

  return (
    <>
      {session ? (
        <TaskManager session={session} />
      ): (
        <Auth onLogin={(session) => setSession(session)} />
      )}
    </>
  );
}