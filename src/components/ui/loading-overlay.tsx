import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Spinner({ size = "md", className }: SpinnerProps) {
  const sizes = { 
    sm: "w-4 h-4 border-2", 
    md: "w-8 h-8 border-3", 
    lg: "w-12 h-12 border-4" 
  };
  
  return (
    <div 
      className={cn(
        sizes[size], 
        "border-muted border-t-primary rounded-full animate-spin",
        className
      )} 
    />
  );
}

interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = "Loading..." }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-card rounded-lg p-6 flex flex-col items-center gap-4 shadow-lg border border-border">
        <Spinner size="lg" />
        <p className="text-foreground font-medium">{message}</p>
      </div>
    </div>
  );
}
