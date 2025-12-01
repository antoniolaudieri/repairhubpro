import { Smartphone, Tablet, Laptop, Monitor, Watch, HelpCircle } from "lucide-react";

export const DeviceIcon = ({ type, className = "h-20 w-20" }: { type: string; className?: string }) => {
  const iconClass = `${className} text-primary`;
  
  switch (type.toLowerCase()) {
    case "smartphone":
      return <Smartphone className={iconClass} strokeWidth={1.5} />;
    case "tablet":
      return <Tablet className={iconClass} strokeWidth={1.5} />;
    case "laptop":
      return <Laptop className={iconClass} strokeWidth={1.5} />;
    case "pc":
      return <Monitor className={iconClass} strokeWidth={1.5} />;
    case "smartwatch":
      return <Watch className={iconClass} strokeWidth={1.5} />;
    default:
      return <HelpCircle className={iconClass} strokeWidth={1.5} />;
  }
};
