-- Add hardware_info column to diagnostic_quizzes table
ALTER TABLE public.diagnostic_quizzes 
ADD COLUMN IF NOT EXISTS hardware_info JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.diagnostic_quizzes.hardware_info IS 'Automatically detected device hardware info (battery, storage, RAM, model, etc.)';

-- Create index for efficient querying of hardware data
CREATE INDEX IF NOT EXISTS idx_diagnostic_quizzes_hardware_info 
ON public.diagnostic_quizzes USING GIN (hardware_info);