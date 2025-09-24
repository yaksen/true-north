
'use client';

import { useState } from 'react';
import { Project, Task, Finance, Lead, Channel, Vendor, Partner } from '@/lib/types';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Send, Loader2, Bot } from 'lucide-react';
import { projectChat, ProjectChatInput } from '@/ai/flows/project-chat-flow';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { User as UserIcon } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface ProjectChatbotProps {
  project: Project;
  tasks: Task[];
  finances: Finance[];
  leads: Lead[];
  channels: Channel[];
  vendors: Vendor[];
  partners: Partner[];
}

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

export function ProjectChatbot({
  project,
  tasks,
  finances,
  leads,
  channels,
  vendors,
  partners,
}: ProjectChatbotProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { sender: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const chatInput: ProjectChatInput = {
        userMessage: input,
        project,
        tasks,
        finances,
        leads,
        channels,
        vendors,
        partners,
      };

      const result = await projectChat(chatInput);

      const aiMessage: Message = { sender: 'ai', text: result.response };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chatbot error:', error);
      const errorMessage: Message = {
        sender: 'ai',
        text: "Sorry, I encountered an error. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (nameOrEmail: string | null | undefined) => {
    if (!nameOrEmail) return 'U';
    const nameParts = nameOrEmail.split(' ');
    if (nameParts.length > 1 && nameParts[0] && nameParts[1]) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
    }
    return nameOrEmail[0].toUpperCase();
  }

  return (
    <Card className="h-[calc(100vh-20rem)] flex flex-col">
      <CardContent className="flex-1 flex flex-col p-4">
        <ScrollArea className="flex-1 mb-4 pr-4">
          <div className="space-y-6">
            {messages.map((message, index) => (
              <div key={index} className={`flex items-start gap-3 ${message.sender === 'user' ? 'justify-end' : ''}`}>
                {message.sender === 'ai' && (
                  <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                    <AvatarFallback><Bot className="h-5 w-5" /></AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-md rounded-xl px-4 py-3 text-sm ${
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.text}</p>
                </div>
                 {message.sender === 'user' && (
                  <Avatar className="h-8 w-8">
                     <AvatarFallback>{getInitials(user?.profile?.name ?? user?.email)}</AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-3">
                 <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                    <AvatarFallback><Bot className="h-5 w-5" /></AvatarFallback>
                  </Avatar>
                <div className="max-w-md rounded-xl bg-muted px-4 py-3 text-sm">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about this project..."
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
