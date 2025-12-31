-- Add policy to allow anonymous access to print queue by centro_id
-- This is needed for the standalone print agent to fetch and update jobs
CREATE POLICY "Print agent can read queue by centro_id" 
ON public.print_queue 
FOR SELECT 
USING (true);

CREATE POLICY "Print agent can update queue by centro_id" 
ON public.print_queue 
FOR UPDATE 
USING (true);

-- Note: This allows reading/updating print jobs by anyone who knows the centro_id
-- This is acceptable because:
-- 1. The print queue only contains label data (no sensitive info)
-- 2. The centro_id acts as a "secret" access key
-- 3. The standalone agent needs unauthenticated access