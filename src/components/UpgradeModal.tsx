import { Link } from 'react-router-dom';
import { Check, X, Zap, BarChart3, MessageSquare, Users, FileText, Headphones } from 'lucide-react';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
}

const starterFeatures = [
  '2 strategy generations',
  'Basic analytics upload',
  'Limited AI insights',
];

const proFeatures = [
  'Unlimited strategy generation',
  'Full analytics suite',
  'Unlimited AI Strategist chat',
  'Audience intelligence',
  'Content AI',
  'Priority support',
];

export function UpgradeModal({ open, onClose }: UpgradeModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-[hsl(var(--primary)/0.1)] flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-black mb-2" style={{ fontFamily: 'Arial Black, sans-serif' }}>
            You've Used Your Free Strategies
          </h2>
          <p className="text-muted-foreground">
            Upgrade to Korex Pro for unlimited strategy generation and full platform access.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Starter */}
          <div className="bg-muted border border-border rounded-xl p-6">
            <h3 className="font-bold text-[hsl(var(--text-tertiary))] mb-4">Starter (Free)</h3>
            <ul className="space-y-3">
              {starterFeatures.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[hsl(var(--text-tertiary))]">
                  <Check className="w-4 h-4 shrink-0 mt-0.5" />{f}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro */}
          <div className="bg-muted border border-[hsl(var(--primary)/0.3)] rounded-xl p-6">
            <h3 className="font-bold text-primary mb-4">Pro ($49/mo)</h3>
            <ul className="space-y-3">
              {proFeatures.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />{f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Link to="/pricing"
          className="block w-full text-center py-4 bg-gradient-to-r from-primary to-[hsl(var(--primary-dark))] text-white font-bold rounded-lg hover:shadow-[0_0_20px_hsl(var(--primary) / 0.3)] transition-all text-lg">
          Upgrade to Pro →
        </Link>

        <button onClick={onClose} className="block w-full text-center mt-4 text-[hsl(var(--text-tertiary))] hover:text-muted-foreground transition-colors text-sm py-2">
          Maybe later
        </button>
      </div>
    </div>
  );
}
