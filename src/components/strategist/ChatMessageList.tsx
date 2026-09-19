import React from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Message } from '@/pages/AIStrategist';
import ReactMarkdown from 'react-markdown';
import { formatDistanceToNow } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { ActionButtons } from './ActionButtons';
import { QuickSuggestionChips } from './ConversationStarters';
import { useState } from 'react';

interface ChatMessageListProps {
  messages: Message[];
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onAction?: (action: string, data?: any) => void;
  onQuickSuggestion?: (prompt: string) => void;
  hasPendingStrategy?: boolean;
}

export const ChatMessageList = React.memo(function ChatMessageList({ 
  messages, 
  isLoading, 
  messagesEndRef,
  onAction,
  onQuickSuggestion,
  hasPendingStrategy,
}: ChatMessageListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const lastMessage = messages[messages.length - 1];
  const showQuickSuggestions = lastMessage?.role === 'assistant' && !isLoading;

  const handleCopy = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      {messages.map((message, index) => (
        <div
          key={message.id}
          className={cn(
            'flex gap-3 animate-fade-in group',
            message.role === 'user' ? 'justify-end' : 'justify-start'
          )}
        >

          {/* Message bubble */}
          <div className={cn(
            'relative group/msg',
            message.role === 'user' ? 'order-first max-w-[80%]' : 'w-full'
          )}>
            <div className={cn(
              'relative',
              message.role === 'user'
                ? 'px-4 py-2.5 bg-secondary/70 border border-subtle text-foreground rounded-2xl rounded-br-md'
                : ''
            )}>

              {/* Attachments */}
              {message.attachments?.map((att, i) => (
                <div key={i} className="mb-3">
                  {att.type === 'image' && (
                    <img 
                      src={att.url} 
                      alt={att.name || 'Attachment'} 
                      className="max-w-full rounded-xl max-h-64 object-contain"
                    />
                  )}
                </div>
              ))}
              
              {/* Message content with markdown */}
              <div className={cn(
                'prose prose-sm max-w-none dark:prose-invert',
                '[&_p]:text-foreground',

                '[&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5',
                '[&_p]:my-1.5 first:[&_p]:mt-0 last:[&_p]:mb-0',
                '[&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm',
                '[&_code]:bg-background/50 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:text-xs',
                '[&_pre]:bg-background/50 [&_pre]:p-3 [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-subtle',
                '[&_strong]:font-semibold',
                '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2'
              )}>
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>

              {/* Action buttons for assistant messages */}
              {message.role === 'assistant' && message.content && index === messages.length - 1 && !isLoading && (
                <ActionButtons 
                  content={message.content} 
                  onAction={onAction}
                  hasPendingStrategy={hasPendingStrategy}
                />
              )}
            </div>

            {/* Message toolbar (copy, etc) - appears on hover */}
            {message.role === 'assistant' && message.content && (
              <div className={cn(
                'flex items-center gap-1 mt-1.5 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-200'
              )}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      onClick={() => handleCopy(message.id, message.content)}
                    >
                      {copiedId === message.id ? (
                        <Check className="w-3.5 h-3.5 text-success" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">Copy</TooltipContent>
                </Tooltip>
                <span className="text-[10px] text-muted-foreground/50 ml-1">
                  {formatDistanceToNow(message.createdAt, { addSuffix: true })}
                </span>
              </div>
            )}

            {/* Timestamp for user messages */}
            {message.role === 'user' && (
              <div className="flex justify-end mt-1">
                <span className="text-[10px] text-muted-foreground/50">
                  {formatDistanceToNow(message.createdAt, { addSuffix: true })}
                </span>
              </div>
            )}
          </div>

        </div>
      ))}
      
      {/* Loading indicator */}
      {isLoading && messages[messages.length - 1]?.role === 'user' && (
        <div className="animate-fade-in">
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <span className="korex-thinking-bar" />
            <span className="tracking-wide">Analyzing</span>
          </div>
        </div>
      )}

      {/* Quick suggestion chips after assistant response */}
      {showQuickSuggestions && onQuickSuggestion && (
        <div>

          <QuickSuggestionChips onChipClick={onQuickSuggestion} />
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
});