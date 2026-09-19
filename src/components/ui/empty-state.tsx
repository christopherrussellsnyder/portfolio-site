import { LucideIcon } from "lucide-react";
import { Button } from "./button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: () => void;
  actionLabel?: string;
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action, 
  actionLabel 
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in">
      <div className="text-muted-foreground mb-4">
        <Icon className="w-16 h-16" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md">{description}</p>
      {action && actionLabel && (
        <Button onClick={action}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
