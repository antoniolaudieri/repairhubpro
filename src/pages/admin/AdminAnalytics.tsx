import { BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { PlatformAdminLayout } from "@/layouts/PlatformAdminLayout";
import { CommissionAnalytics } from "@/components/admin/CommissionAnalytics";

export default function AdminAnalytics() {
  return (
    <PlatformAdminLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="p-2 rounded-xl bg-cyan-500/10">
            <BarChart3 className="h-6 w-6 text-cyan-500" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Analytics</h1>
            <p className="text-sm text-muted-foreground">Statistiche e grafici</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <CommissionAnalytics />
        </motion.div>
      </div>
    </PlatformAdminLayout>
  );
}
