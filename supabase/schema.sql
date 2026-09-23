-- ==============================================
-- 1. ENUMS & EXTENSIONS
-- ==============================================
CREATE TYPE workspace_role AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE task_status AS ENUM ('backlog', 'todo', 'in_progress', 'review', 'done');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- ==============================================
-- 2. TABLE DEFINITIONS
-- ==============================================

-- Workspaces (Organizations / Teams)
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspace Membership & RBAC
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role workspace_role NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- Projects
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Refactored Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status task_status DEFAULT 'todo',
    priority task_priority DEFAULT 'medium',
    assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
    image_url TEXT,
    position DOUBLE PRECISION DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Comments
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Audit Trail
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
    action TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- 3. SECURITY FUNCTIONS (Avoids Policy Recursion)
-- ==============================================

-- Check if current user belongs to a workspace
CREATE OR REPLACE FUNCTION public.is_workspace_member(target_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.workspace_members
        WHERE workspace_id = target_workspace_id
            AND user_id = auth.uid()
    );
$$;

-- Get user role in a workspace
CREATE OR REPLACE FUNCTION public.get_workspace_role(target_workspace_id UUID)
RETURNS workspace_role
LANGUAGE sql
SECURITY DEFINER
STABLE 
AS $$
    SELECT role
    FROM public.workspace_members
    WHERE workspace_id = target_workspace_id
        AND user_id = auth.uid()
    LIMIT 1;
$$;

-- ==============================================
-- 4. ROW_LEVEL SECURITY (RLS) POLICIES
-- ==============================================

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Workspaces Policies
CREATE POLICY "Users can view workspaces they belong to"
ON public.workspaces FOR SELECT
USING (public.is_workspace_member(id) OR owner_id = auth.uid());

CREATE POLICY "Authenticated users can create workspace"
ON public.workspaces FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- Automatically add owner as workspace_member on insert
CREATE OR REPLACE FUNCTION public.handle_new_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'owner');
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_workspace_created
    AFTER INSERT ON public.workspaces
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_workspace();

-- Workspace Members Policies
CREATE POLICY "Members can view co-members"
ON public.workspace_members FOR SELECT
USING (public.is_workspace_member(workspace_id));

-- Projects Policies
CREATE POLICY "Members can view projects in their workspace"
ON public.projects FOR SELECT
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Admins/Owners can create projects"
ON public.projects FOR INSERT
TO authenticated
WITH CHECK (
    public.get_workspace_role(workspace_id) IN ('owner', 'admin')
);

-- Tasks Policies
CREATE POLICY "Members can view workspace tasks"
ON public.tasks FOR SELECT
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can create tasks in their workspace"
ON public.tasks FOR INSERT
TO authenticated
WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can update tasks in their workspace"
ON public.tasks FOR UPDATE
TO authenticated
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Admins, owners, or creators can delete tasks"
ON public.tasks FOR DELETE
TO authenticated
USING (
    created_by = auth.uid()
    OR public.get_workspace_role(workspace_id) IN ('owner', 'admin')
);

-- Comments Policies
CREATE POLICY "Members can view task comments"
ON public.comments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = task_id AND public.is_workspace_member(t.workspace_id)
    )
);

CREATE POLICY "Members can create comments"
ON public.comments FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = task_id AND public.is_workspace_member(t.workspace_id)
    )
);

-- Activity Logs Policies
CREATE POLICY "Members can view workspace activity"
ON public.activity_logs FOR SELECT
USING (public.is_workspace_member(workspace_id));

-- ==============================================
-- 5. AUTOMATIC AUDIT TRAIL TRIGGER
-- ==============================================
CREATE OR REPLACE FUNCTION public.log_task_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        IF (OLD.status IS DISTINCT FROM NEW.status) THEN
            INSERT INTO public.activity_logs (workspace_id, task_id, actor_id, action, metadata)
            VALUES (
                NEW.workspace_id,
                NEW.id,
                auth.uid(),
                'STATUS_CHANGED',
                jsonb_build_object('from', OLD.status, 'to', NEW.status)
            );
        END IF;

        IF (OLD.assignee_id IS DISTINCT FROM NEW.assignee_id) THEN
            INSERT INTO public.activity_logs (workspace_id, task_id, actor_id, action, metadata)
            VALUES (
                NEW.workspace_id,
                NEW.id,
                auth.uid(),
                'ASSIGNEE_CHANGED',
                jsonb_build_object('from', OLD.assignee_id, 'to', NEW.assignee_id)
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_task_updated
    AFTER UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.log_task_activity();

-- ==============================================
-- 6. STORAGE BUCKET & RLS POLICIES
-- ==============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('tasks-images', 'tasks-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Read Task Images"
ON storage.objects FOR SELECT
USING (bucket_id = 'tasks-images');

CREATE POLICY "Auth Insert Task Images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'tasks-images'
    AND name LIKE (auth.uid()::text || '/%')
);

CREATE POLICY "Allow users to delete own task images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'tasks-images'
    AND name LIKE (auth.uid()::text || '/%')
);

-- ==============================================
-- 7. ENABLE REALTIME BROADCASTING
-- ==============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;

-- ==============================================
-- 8. AUTO-CREATE WORKSPACE ON SIGNUP
-- ==============================================
CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.workspaces (name, slug, owner_id)
    VALUES (
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Personal') || '''s Workspace',
        'ws-' || LOWER(SUBSTRING(NEW.id::text FROM 1 FOR 8)),
        NEW.id
    );
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_setup();


CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, NOW()) NOT NULL
);


ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Authenticated users can read profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);



CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);



CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY definer;



DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR each ROW EXECUTE PROCEDURE public.handle_new_user();



INSERT INTO public.profiles (id, email, full_name, avatar_url)
SELECT
  id, 
  email, 
  raw_user_meta_data->>'full_name', 
  raw_user_meta_data->>'avatar_url'
FROM auth.users
ON conflict (id) do nothing;


CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id uuid, _workspace_id uuid)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id AND workspace_id = _workspace_id
  );
$$ LANGUAGE SQL SECURITY definer;



CREATE OR REPLACE FUNCTION public.is_workspace_admin(_user_id uuid, _workspace_id uuid)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id AND workspace_id = _workspace_id AND ROLE IN ('admin', 'owner')
  );
$$ LANGUAGE SQL SECURITY definer;


ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;



DROP POLICY IF EXISTS "Users can view workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Members can invite new workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can update workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins or self can remove workspace members" ON public.workspace_members;



CREATE POLICY "Users can view workspace members"
  ON public.workspace_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR public.is_workspace_member(auth.uid(), workspace_id)
  );



CREATE POLICY "Members can invite new workspace members"
  ON public.workspace_members FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR public.is_workspace_member(auth.uid(), workspace_id)
  );



CREATE POLICY "Admins can update workspace members"
  ON public.workspace_members FOR UPDATE
  TO authenticated
  USING (
    public.is_workspace_admin(auth.uid(), workspace_id)
  );


CREATE POLICY "Admins or self can remove workspace members"
  ON public.workspace_members FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR public.is_workspace_admin(auth.uid(), workspace_id)
  );