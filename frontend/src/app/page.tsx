'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Pizza, Users } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [joinId, setJoinId] = useState('');
  const [nickname, setNickname] = useState('');

  const createSession = async () => {
    setLoading(true);
    try {
      // In a real app, you'd get the hostId from auth. Hardcoding for MVP
      const res = await axios.post(`${API_URL}/sessions/create`, { hostId: 'host-123' });
      if (res.data.success) {
        router.push(`/session/${res.data.data.id}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to create session. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const joinSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinId || !nickname) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/sessions/join`, {
        sessionId: joinId,
        nickname
      });
      if (res.data.success) {
        // Save participant info in localStorage to know who we are
        localStorage.setItem('participantId', res.data.data.id);
        localStorage.setItem('nickname', res.data.data.nickname);
        router.push(`/session/${joinId}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to join session. Check ID.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-col justify-center" style={{ flex: 1 }}>
      <div className="text-center" style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'inline-flex', padding: '1rem', background: 'var(--surface-light)', borderRadius: 'var(--radius-full)', marginBottom: '1rem' }}>
          <Pizza size={48} color="var(--primary)" />
        </div>
        <h1 style={{ fontSize: '2.5rem', background: 'linear-gradient(to right, var(--primary), #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          CollabBite
        </h1>
        <p>Order food together, without the chaos.</p>
      </div>

      <div className="card">
        <h2>Host a Session</h2>
        <p>Start a new group order and invite friends.</p>
        <button className="btn btn-primary" onClick={createSession} disabled={loading}>
          {loading ? <div className="spinner"></div> : <><Pizza size={20} /> Create New Session</>}
        </button>
      </div>

      <div className="text-center" style={{ margin: '1rem 0' }}>
        <p>OR</p>
      </div>

      <div className="card">
        <h2>Join a Session</h2>
        <p>Got an invite code? Enter it below.</p>
        <form onSubmit={joinSession} className="flex-col">
          <input 
            type="text" 
            className="input" 
            placeholder="Session ID" 
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
            required
          />
          <input 
            type="text" 
            className="input" 
            placeholder="Your Name (e.g. John)" 
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-secondary" disabled={loading}>
            {loading ? <div className="spinner"></div> : <><Users size={20} /> Join Session</>}
          </button>
        </form>
      </div>
    </div>
  );
}
