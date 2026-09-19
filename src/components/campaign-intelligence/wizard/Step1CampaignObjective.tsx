import { Eye, Magnet, ShoppingCart, Rocket, CalendarDays, Users, Check } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CampaignWizardData } from './CampaignWizardModal';

interface Props {
  data: CampaignWizardData;
  onChange: (updates: Partial<CampaignWizardData>) => void;
}

const GOALS = [
  {
    id: 'brand_awareness',
    title: 'Brand Awareness',
    description: 'Increase visibility and reach new audiences',
    icon: Eye
  },
  {
    id: 'lead_generation',
    title: 'Lead Generation',
    description: 'Collect contact information and build email list',
    icon: Magnet
  },
  {
    id: 'direct_sales',
    title: 'Direct Sales',
    description: 'Drive immediate purchases and conversions',
    icon: ShoppingCart
  },
  {
    id: 'product_launch',
    title: 'Product Launch',
    description: 'Introduce and promote a new product or service',
    icon: Rocket
  },
  {
    id: 'event_promotion',
    title: 'Event Promotion',
    description: 'Drive attendance to an event or webinar',
    icon: CalendarDays
  },
  {
    id: 'community_building',
    title: 'Community Building',
    description: 'Grow and engage your community',
    icon: Users
  }
];

export function Step1CampaignObjective({ data, onChange }: Props) {
  const toggleSecondaryGoal = (goalId: string) => {
    if (goalId === data.primaryGoal) return;
    
    const current = data.secondaryGoals;
    if (current.includes(goalId)) {
      onChange({ secondaryGoals: current.filter(g => g !== goalId) });
    } else {
      onChange({ secondaryGoals: [...current, goalId] });
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">
          What's the primary goal for this campaign?
        </h3>
        <p className="text-muted-foreground">
          This helps us create content focused on your specific objective
        </p>
      </div>

      {/* Primary Goal Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {GOALS.map((goal) => {
          const Icon = goal.icon;
          const isSelected = data.primaryGoal === goal.id;
          
          return (
            <button
              key={goal.id}
              onClick={() => onChange({ 
                primaryGoal: goal.id,
                secondaryGoals: data.secondaryGoals.filter(g => g !== goal.id)
              })}
              className={`relative p-5 rounded-xl border-2 text-left transition-all ${
                isSelected 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                isSelected ? 'bg-primary/20' : 'bg-muted'
              }`}>
                <Icon className={`w-6 h-6 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <h4 className="font-semibold mb-1">{goal.title}</h4>
              <p className="text-sm text-muted-foreground">{goal.description}</p>
            </button>
          );
        })}
      </div>

      {/* Secondary Goals */}
      {data.primaryGoal && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Any secondary objectives? (optional)
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {GOALS.filter(g => g.id !== data.primaryGoal).map((goal) => (
              <div 
                key={goal.id} 
                className="flex items-center space-x-2"
              >
                <Checkbox
                  id={`secondary-${goal.id}`}
                  checked={data.secondaryGoals.includes(goal.id)}
                  onCheckedChange={() => toggleSecondaryGoal(goal.id)}
                />
                <Label 
                  htmlFor={`secondary-${goal.id}`} 
                  className="text-sm cursor-pointer"
                >
                  {goal.title}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
