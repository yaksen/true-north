
'use client';

import { useState } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Send } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';

interface MessageInputProps {
  chatId: string;
}

export function MessageInput({ chatId }: MessageInputProps) {
  const { user } = useAuth();
  const [text, setText] = useState('');

  const handleSend = async () => {
    if (!user || !text.trim()) return;

    const messagePayload = {
      chatId,
      senderId: user.uid,
      text: text.trim(),
      createdAt: serverTimestamp(),
      readBy: { [user.uid]: new Date() },
    };

    setText('');
    
    // Add message to subcollection
    await addDoc(collection(db, 'chats', chatId, 'messages'), messagePayload);

    // Update parent chat document
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      lastMessage: {
        text: messagePayload.text,
        senderId: messagePayload.senderId,
        timestamp: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    });
  };

  return (
    <div className="p-4 border-t flex items-center gap-2">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        placeholder="Type a message..."
      />
      <Button onClick={handleSend} size="icon">
        <Send />
      </Button>
    </div>
  );
}
