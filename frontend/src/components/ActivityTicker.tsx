'use client';

import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

export default function ActivityTicker({ sessionId }: { sessionId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [key, setKey] = useState<number>(0);

  useEffect(() => {
    const socket = io(SOCKET_URL);
    socket.emit('join-session', sessionId);

    socket.on('activity', (msg: string) => {
      setMessage(msg);
      setKey(prev => prev + 1); // trigger re-render for animation
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId]);

  // Auto-hide the message after 4 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [message, key]);

  if (!message) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.5rem 1rem',
      background: 'rgba(20, 20, 25, 0.8)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)',
      color: 'var(--primary)',
      fontSize: '0.85rem',
      fontWeight: '500',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 50,
      width: '100%',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      animation: 'slideDown 0.3s ease-out'
    }}>
      <Activity size={16} className="animate-pulse" />
      <span key={key} style={{ 
        animation: 'fadeIn 0.3s ease-in-out',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
        {message}
      </span>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          0% { opacity: 0; transform: translateY(2px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(0); }
        }
      `}} />
    </div>
  );
}

