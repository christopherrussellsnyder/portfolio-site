-- Fix 1: Add RLS policies to audiences table
CREATE POLICY "Users can view their own audiences" 
ON public.audiences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audiences" 
ON public.audiences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own audiences" 
ON public.audiences 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own audiences" 
ON public.audiences 
FOR DELETE 
USING (auth.uid() = user_id);

-- Fix 2: Add RLS policies to automation_rules table (also missing)
CREATE POLICY "Users can view their own automation rules" 
ON public.automation_rules 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own automation rules" 
ON public.automation_rules 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own automation rules" 
ON public.automation_rules 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own automation rules" 
ON public.automation_rules 
FOR DELETE 
USING (auth.uid() = user_id);

-- Fix 3: Add RLS policies to scheduled_posts table (also missing)
CREATE POLICY "Users can view their own scheduled posts" 
ON public.scheduled_posts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scheduled posts" 
ON public.scheduled_posts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled posts" 
ON public.scheduled_posts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled posts" 
ON public.scheduled_posts 
FOR DELETE 
USING (auth.uid() = user_id);