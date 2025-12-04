import { Euro } from "lucide-react";
import { motion } from "framer-motion";
import { PlatformAdminLayout } from "@/layouts/PlatformAdminLayout";
import { CreditManagement } from "@/components/admin/CreditManagement";

export default function AdminCrediti() {
  return (
    <PlatformAdminLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="p-2 rounded-xl bg-amber-500/10">
            <Euro className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Gestione Crediti</h1>
            <p className="text-sm text-muted-foreground">Saldi e ricariche provider</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <CreditManagement />
        </motion.div>
      </div>
    </PlatformAdminLayout>
  );
}
