'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { Copy, Search, ShoppingBag, Users } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

export default function SessionLobby({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: sessionId } = use(params);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    // We will determine isHost inside fetchSession
    fetchSession();

    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.emit('join-session', sessionId);
    newSocket.on('participant-joined', () => {
      fetchSession();
    });
    newSocket.on('cart-updated', () => {
      fetchSession();
    });

    return () => {
      newSocket.disconnect();
    };
  }, [sessionId]);

  useEffect(() => {
    if (!session?.expiresAt || !isHost) return;
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expiry = new Date(session.expiresAt).getTime();
      const diff = expiry - now;
      
      if (diff <= 0) {
        setTimeLeft('Expired');
        clearInterval(interval);
        return;
      }
      
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft(`${h}h ${m}m ${s}s`);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [session, isHost]);

  const fetchSession = async () => {
    try {
      const res = await axios.get(`${API_URL}/sessions/${sessionId}`);
      const sessionData = res.data.data;
      setSession(sessionData);

      const pId = localStorage.getItem(`participantId_${sessionId}`);
      const myP = sessionData.participants?.find((p: any) => p.id === pId);
      if (myP && myP.role === 'HOST') {
        setIsHost(true);
      }
    } catch (err) {
      console.error("Failed to fetch session", err);
    } finally {
      setLoading(false);
    }
  };

  const copyInvite = () => {
    navigator.clipboard.writeText(sessionId);
    alert('Session ID copied to clipboard!');
  };

  if (loading) return <div className="container justify-center flex-col text-center"><div className="spinner mx-auto mb-4" />Loading Lobby...</div>;

  return (
    <div className="flex-col" style={{ flex: 1 }}>
      <div className="header">
        <h2>Session Lobby</h2>
        <span className={`badge ${session?.status === 'ORDERING' ? 'open' : ''}`}>{session?.status || 'Waiting'}</span>
      </div>

      {session?.address && (
        <div className="card text-center mb-4" style={{ background: 'var(--surface-light)' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>📍 Delivery Address:</p>
          <p style={{ margin: '0.25rem 0 0 0', fontWeight: 500 }}>
            {(() => {
              try {
                const addr = JSON.parse(session.address);
                return addr.addressTag ? `[${addr.addressTag}] ${addr.addressLine}` : addr.addressLine;
              } catch (e) {
                return "Address not available";
              }
            })()}
          </p>
        </div>
      )}

      {isHost && timeLeft && (
        <div style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--danger)', fontWeight: 'bold' }}>
          Session expires in: {timeLeft}
        </div>
      )}

      <div className="card mb-4 text-center">
        <p>Invite friends with this code:</p>
        <h1 style={{ letterSpacing: '2px', background: 'var(--surface-light)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
          {sessionId}
        </h1>
        <button className="btn btn-secondary" onClick={copyInvite} style={{ marginTop: '1rem' }}>
          <Copy size={18} /> Copy Code
        </button>
      </div>

      <h3>Participants</h3>
      <div className="card" style={{ padding: 0 }}>
        {session?.participants?.map((p: any) => (
          <div key={p.id} className="list-item">
            <div className="flex-row">
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {p.nickname.charAt(0).toUpperCase()}
              </div>
              <span>{p.nickname}</span>
            </div>
            {p.role === 'HOST' && <span className="badge">Host</span>}
          </div>
        ))}
        {(!session?.participants || session.participants.length === 0) && (
          <div className="list-item text-center"><p style={{margin: 0, width: '100%'}}>You are alone right now.</p></div>
        )}
      </div>

      <div className="glass-nav">
        <button className="btn btn-primary" onClick={() => router.push(`/session/${sessionId}/search`)}>
          <Search size={20} /> Add Food
        </button>
        <button className="btn btn-secondary" onClick={() => router.push(`/session/${sessionId}/cart`)}>
          <ShoppingBag size={20} /> View Cart
        </button>
      </div>
    </div>
  );
}
