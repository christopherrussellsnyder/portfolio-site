import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCog, X } from 'lucide-react';
import { useBusinessProfileCompletion } from '@/hooks/useBusinessProfileCompletion';

const DISMISS_KEY = 'korex.profile-nudge.dismissed-session';
// Matches the onboarding checklist's threshold -- below this, most grounded
// AI features are still falling back to "Not specified" placeholders.
const THRESHOLD = 35;

/** Small, reachable-even-after-onboarding-is-dismissed nudge: the Getting
 *  Started checklist only shows for users still working through it and
 *  permanently hides once finished, so it can't reach someone who dismissed
 *  onboarding before this profile-completeness signal existed. This can. */
export function ProfileCompletenessNudge() {
  const { percentage, isLoading } = useBusinessProfileCompletion();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const navigate = useNavigate();

  if (isLoading || dismissed || percentage >= THRESHOLD) return null;

  return (
    <div className="flex items-center gap-0.5 h-8 rounded-full border border-amber-500/40 bg-amber-500/10 pl-1 pr-1">
      <button
        type="button"
        onClick={() => navigate('/settings')}
        title={`Business profile ${percentage}% complete — click to finish it`}
        className="flex items-center gap-1.5 px-2 h-6 rounded-full text-amber-600 dark:text-amber-400 text-xs hover:bg-amber-500/20 transition-colors"
      >
        <UserCog className="w-3.5 h-3.5" />
        Profile {percentage}%
      </button>
      <button
        type="button"
        aria-label="Dismiss profile completeness nudge"
        onClick={() => {
          try {
            sessionStorage.setItem(DISMISS_KEY, 'true');
          } catch {
            /* no-op */
          }
          setDismissed(true);
        }}
        className="rounded-full p-1 text-amber-600/70 dark:text-amber-400/70 hover:bg-amber-500/30"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
