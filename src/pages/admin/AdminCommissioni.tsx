import { Settings2 } from "lucide-react";
import { motion } from "framer-motion";
import { PlatformAdminLayout } from "@/layouts/PlatformAdminLayout";
import { CommissionSettings } from "@/components/admin/CommissionSettings";

export default function AdminCommissioni() {
  return (
    <PlatformAdminLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="p-2 rounded-xl bg-purple-500/10">
            <Settings2 className="h-6 w-6 text-purple-500" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Impostazioni Commissioni</h1>
            <p className="text-sm text-muted-foreground">Configura le percentuali</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <CommissionSettings />
        </motion.div>
      </div>
    </PlatformAdminLayout>
  );
}
