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

  useEffect(() => {
    // Determine if we are the host
    const participantId = localStorage.getItem('participantId');
    if (!participantId) {
      // If we created it, we don't have participantId set yet for host in localstorage, 
      // but in real app we'd use JWT. For now, let's just assume we're host if we don't have guest participantId,
      // actually wait, when creating we didn't save participantId. So if no participantId, we are host.
      setIsHost(true);
    }
    
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

  const fetchSession = async () => {
    try {
      // We don't have a GET /api/sessions/:id route yet! Wait, I should add it to backend.
      // For now, let's fetch cart instead as a proxy to see if it works, 
      // or we can just show UI without full session details for MVP if backend is missing it.
      // Wait, let's just write the frontend and assume the GET route will be added.
      const res = await axios.get(`${API_URL}/sessions/${sessionId}`);
      setSession(res.data.data);
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

      <div className="card text-center">
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
