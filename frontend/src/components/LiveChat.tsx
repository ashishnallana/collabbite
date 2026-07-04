'use client';

import { useEffect, useState, useRef } from 'react';
import { Send, MessageCircle, X } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

interface ChatMessage {
  sender: string;
  message: string;
  timestamp: string;
}

interface Reaction {
  id: string;
  emoji: string;
  leftOffset: number;
}

const EMOJIS = ['👍', '🍔', '🤤', '🔥'];

export default function LiveChat({ sessionId }: { sessionId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [input, setInput] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const nickname = typeof window !== 'undefined' ? localStorage.getItem('nickname') || 'Guest' : 'Guest';

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join-session', sessionId);
    });

    newSocket.on('chat-history', (history: ChatMessage[]) => {
      // In a video game HUD, we only want the last few messages. Keep ~20 max.
      setMessages(history.slice(-20));
    });

    newSocket.on('chat-message', (msg: ChatMessage) => {
      setMessages(prev => {
        const next = [...prev, msg];
        return next.slice(-20); // Keep last 20 messages visible
      });
    });

    newSocket.on('reaction', ({ emoji, id }) => {
      const leftOffset = Math.random() * 60 + 20; // 20% to 80% left positioning
      setReactions(prev => [...prev, { emoji, id, leftOffset }]);
      
      // Remove it from state after animation completes
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r.id !== id));
      }, 3000);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [sessionId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (text: string) => {
    if (!text.trim() || !socket) return;
    socket.emit('send-chat', {
      sessionId,
      sender: nickname,
      message: text.trim()
    });
  };

  const sendReaction = (emoji: string) => {
    if (!socket) return;
    socket.emit('reaction', { sessionId, emoji });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
    setInput('');
    setMobileOpen(false); // Close mobile popup after sending
  };

  return (
    <>
    <div className="chat-container">
      {/* Messages Area (HUD style) */}
      <div style={{
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
        marginBottom: '0.75rem',
        maskImage: 'linear-gradient(to bottom, transparent, black 15%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15%)',
        maxHeight: '300px',
        pointerEvents: 'auto',
        paddingRight: '1rem', // Space for scrollbar if any
        scrollbarWidth: 'none', // Hide scrollbar for HUD feel
      }}>
        {messages.map((msg, idx) => {
          const isMe = msg.sender === nickname;
          return (
            <div key={idx} style={{
              background: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(4px)',
              padding: '0.35rem 0.6rem',
              borderRadius: '6px',
              color: '#f8fafc',
              fontSize: '0.85rem',
              wordBreak: 'break-word',
              display: 'inline-block',
              alignSelf: 'flex-start',
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <strong style={{ 
                color: isMe ? '#fbbf24' : '#38bdf8', 
                marginRight: '0.4rem',
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
              }}>
                {msg.sender}:
              </strong>
              {msg.message}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Interactive Input Area */}
      <div className={`chat-input-area ${mobileOpen ? 'open' : ''}`}>
        <button className="mobile-close-btn" type="button" onClick={() => setMobileOpen(false)}>
          <X size={18} />
        </button>
        <form onSubmit={handleFormSubmit} style={{ display: 'flex', gap: '0.5rem', margin: 0 }}>
          <input 
            type="text" 
            style={{
              flex: 1,
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '0.5rem 0.75rem',
              color: 'white',
              fontSize: '0.85rem',
              outline: 'none',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)'
            }}
            placeholder="Type here to chat..." 
            value={input}
            onChange={e => setInput(e.target.value)}
          />
          <button type="submit" style={{
            background: 'var(--primary)',
            border: 'none',
            borderRadius: '8px',
            color: '#111',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 0.75rem',
            cursor: 'pointer',
            opacity: input.trim() ? 1 : 0.5,
            transition: 'opacity 0.2s'
          }} disabled={!input.trim()}>
            <Send size={16} />
          </button>
        </form>
        
        {/* Quick Reaction Emojis */}
        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'space-between' }}>
          {EMOJIS.map(emoji => (
            <button
              key={emoji}
              onClick={() => sendReaction(emoji)}
              type="button"
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '6px',
                padding: '0.35rem',
                fontSize: '1.25rem',
                cursor: 'pointer',
                transition: 'all 0.1s ease',
              }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
    
    {!mobileOpen && (
      <button className="mobile-chat-toggle" onClick={() => setMobileOpen(true)}>
        <MessageCircle size={24} />
      </button>
    )}
      
      {/* Floating Reactions Container */}
      <div style={{
        position: 'fixed',
        bottom: '100px',
        left: '20px',
        width: '300px',
        height: '400px',
        pointerEvents: 'none',
        zIndex: 90
      }}>
        {reactions.map(r => (
          <div key={r.id} style={{
            position: 'absolute',
            left: `${r.leftOffset}%`,
            bottom: '0',
            fontSize: '2rem',
            animation: 'floatUpAndFade 2.5s ease-out forwards',
            filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))'
          }}>
            {r.emoji}
          </div>
        ))}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes floatUpAndFade {
          0% {
            transform: translateY(0) scale(0.5);
            opacity: 0;
          }
          10% {
            opacity: 1;
            transform: translateY(-20px) scale(1.2);
          }
          100% {
            transform: translateY(-200px) scale(1);
            opacity: 0;
          }
        }
        
        .chat-container {
          position: fixed;
          bottom: 1.5rem;
          left: 1.5rem;
          width: 320px;
          max-height: 400px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          z-index: 100;
          pointer-events: none;
        }

        .chat-input-area {
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 0.6rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          pointer-events: auto;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5);
          position: relative;
        }

        .mobile-chat-toggle {
          display: none;
          position: fixed;
          bottom: 1.5rem;
          left: 1.5rem;
          background: var(--primary);
          color: #111;
          border: none;
          border-radius: 50%;
          width: 55px;
          height: 55px;
          align-items: center;
          justify-content: center;
          z-index: 101;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        
        .mobile-close-btn {
          display: none;
        }

        @media (max-width: 768px) {
          .chat-container {
            width: 80%;
            bottom: 5rem;
            left: 1rem;
          }
          .chat-input-area {
            display: none;
          }
          .chat-input-area.open {
            display: flex;
            position: fixed;
            bottom: 1rem;
            left: 1rem;
            right: 1rem;
            width: auto;
            z-index: 105;
          }
          .mobile-chat-toggle {
            display: flex;
          }
          .mobile-close-btn {
            display: flex;
            position: absolute;
            top: -35px;
            right: 0;
            background: rgba(15, 23, 42, 0.9);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: white;
            border-radius: 50%;
            padding: 6px;
            cursor: pointer;
          }
        }
      `}} />
    </>
  );
}
