import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-6">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Something went wrong
        </h1>
        
        <p className="text-muted-foreground mb-6">
          We've been notified about this error and will fix it soon.
        </p>
        
        {import.meta.env.DEV && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm font-mono text-destructive break-all">
              {error.message}
            </p>
          </div>
        )}
        
        <div className="flex gap-3 justify-center">
          <Button onClick={resetError} variant="default">
            <RotateCcw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => navigate('/')}
          >
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}
