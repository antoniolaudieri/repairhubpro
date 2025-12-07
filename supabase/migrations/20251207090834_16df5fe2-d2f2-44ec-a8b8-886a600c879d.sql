-- Drop trigger if exists and recreate properly
DROP TRIGGER IF EXISTS trigger_charge_commission_on_intake ON repairs;

-- Create the trigger on repairs table
CREATE TRIGGER trigger_charge_commission_on_intake
  BEFORE UPDATE ON repairs
  FOR EACH ROW
  EXECUTE FUNCTION charge_commission_on_intake_signature();