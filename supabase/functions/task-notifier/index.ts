import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req: Request) => {
  try {
    const { record, type } = await req.json();

    // Workflow: Detect Urgent Priority Tasks
    if (type === 'INSERT' && record?.priority === 'urgent') {
      console.log(`[ALERT] Urgent Task Created: ${record.title}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), { 
      headers: { "Content-Type": "application/json" },
      status: 400 
    });
  }
});
