import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StrategyPost } from '@/hooks/useStrategyGeneration';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, parseISO } from 'date-fns';

interface StrategyCalendarViewProps {
  posts: StrategyPost[];
  startDate: string;
  onPostClick?: (post: StrategyPost) => void;
}

const themeColors: Record<string, string> = {
  educational: 'bg-blue-500',
  promotional: 'bg-green-500',
  engagement: 'bg-purple-500',
  social_proof: 'bg-amber-500',
  behind_scenes: 'bg-pink-500',
};

export function StrategyCalendarView({ posts, startDate, onPostClick }: StrategyCalendarViewProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const start = parseISO(startDate);
    return startOfWeek(start, { weekStartsOn: 1 });
  });

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const daysInWeek = eachDayOfInterval({ start: currentWeekStart, end: weekEnd });

  const getPostsForDay = (day: Date) => {
    return posts.filter(post => {
      try {
        const postDate = parseISO(post.post_date);
        return isSameDay(postDate, day);
      } catch {
        return false;
      }
    });
  };

  const weekNumber = Math.ceil(
    (currentWeekStart.getTime() - parseISO(startDate).getTime()) / (7 * 24 * 60 * 60 * 1000)
  ) + 1;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Week {weekNumber}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button aria-label="Previous month"
              variant="outline"
              size="icon"
              onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              {format(currentWeekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </span>
            <Button aria-label="Next month"
              variant="outline"
              size="icon"
              onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {/* Day headers */}
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
          
          {/* Day cells */}
          {daysInWeek.map(day => {
            const dayPosts = getPostsForDay(day);
            const isToday = isSameDay(day, new Date());
            
            return (
              <div
                key={day.toISOString()}
                className={`min-h-[120px] p-2 rounded-md border ${
                  isToday 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border bg-muted/30'
                }`}
              >
                <div className={`text-sm font-medium mb-2 ${
                  isToday ? 'text-primary' : 'text-foreground'
                }`}>
                  {format(day, 'd')}
                </div>
                
                <div className="space-y-1">
                  {dayPosts.map(post => (
                    <button
                      key={post.id}
                      onClick={() => onPostClick?.(post)}
                      className={`w-full text-left p-1.5 rounded text-xs transition-colors hover:opacity-80 ${
                        themeColors[post.theme || ''] || 'bg-primary'
                      } text-primary-foreground`}
                    >
                      <div className="font-medium truncate">
                        {post.hook || post.post_type}
                      </div>
                      {post.post_time && (
                        <div className="text-primary-foreground/70 text-[10px]">
                          {post.post_time}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-border">
          {Object.entries(themeColors).map(([theme, color]) => (
            <div key={theme} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded ${color}`} />
              <span className="text-xs text-muted-foreground capitalize">
                {theme.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
