import { Receipt } from "lucide-react";
import { motion } from "framer-motion";
import { PlatformAdminLayout } from "@/layouts/PlatformAdminLayout";
import { BillingReport } from "@/components/admin/BillingReport";

export default function AdminFatturazione() {
  return (
    <PlatformAdminLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="p-2 rounded-xl bg-emerald-500/10">
            <Receipt className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Fatturazione</h1>
            <p className="text-sm text-muted-foreground">Report mensile commissioni</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <BillingReport />
        </motion.div>
      </div>
    </PlatformAdminLayout>
  );
}
