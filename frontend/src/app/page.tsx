'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { MapPin, Pizza, Users, LogIn } from 'lucide-react';
import { io } from 'socket.io-client';

const API_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [joinId, setJoinId] = useState('');
  const [nickname, setNickname] = useState('');

  // Host state
  const [hostName, setHostName] = useState('');
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [authComplete, setAuthComplete] = useState(false);

  useEffect(() => {
    // Check URL for auth success and token
    const params = new URLSearchParams(window.location.search);
    const authSuccess = params.get('authSuccess');
    const token = params.get('token');
    const returnedHostId = params.get('hostId');

    if (authSuccess === 'true' && token && returnedHostId) {
      localStorage.setItem('swiggyToken', token);
      localStorage.setItem('hostId', returnedHostId);
      
      // Clean up URL without triggering reload
      router.replace('/');
      
      setHostName(returnedHostId);
      setAuthComplete(true);
      fetchAddresses(token);
    } else {
      // Check if already authenticated in this browser
      const savedToken = localStorage.getItem('swiggyToken');
      const savedHost = localStorage.getItem('hostId');
      if (savedToken && savedHost) {
        setHostName(savedHost);
        setAuthComplete(true);
      }
    }
  }, []);

  const startSwiggyLogin = async () => {
    if (!hostName) {
      alert("Please enter your name first!");
      return;
    }
    
    // Open immediately before async call to avoid popup blocker
    const newWindow = window.open('', '_self'); // Open in same window is better for OAuth redirects!
    
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { hostId: hostName });
      if (res.data.success && res.data.url) {
        if (newWindow) {
          newWindow.location.href = res.data.url;
        } else {
          window.location.href = res.data.url;
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to start login');
      setLoading(false);
    }
  };

  const fetchAddresses = async (token?: string) => {
    const swiggyToken = token || localStorage.getItem('swiggyToken');
    if (!swiggyToken) return;

    try {
      const res = await axios.get(`${API_URL}/sessions/addresses?swiggyToken=${encodeURIComponent(swiggyToken)}`);
      if (res.data.success && res.data.data.length > 0) {
        setAddresses(res.data.data);
        setSelectedAddressId(res.data.data[0].id);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to fetch addresses.');
      // If token is invalid, log them out
      localStorage.removeItem('swiggyToken');
      setAuthComplete(false);
    }
  };

  const createSession = async () => {
    const swiggyToken = localStorage.getItem('swiggyToken');
    if (!selectedAddressId || !hostName || !swiggyToken) return;
    
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/sessions/create`, { 
        hostId: hostName,
        address: selectedAddressId,
        swiggyToken
      });
      if (res.data.success) {
        localStorage.setItem('participantId', res.data.data.participants[0].id);
        localStorage.setItem('nickname', hostName);
        router.push(`/session/${res.data.data.id}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to create session.');
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
        localStorage.setItem('participantId', res.data.data.id);
        localStorage.setItem('nickname', res.data.data.nickname);
        
        // Notify others that a new user joined
        const socket = io(SOCKET_URL);
        socket.on('connect', () => {
          socket.emit('participant-joined', joinId);
          socket.emit('activity', { sessionId: joinId, message: `${res.data.data.nickname} just joined the session!` });
          setTimeout(() => socket.disconnect(), 200);
        });
        
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
    <div className="flex-col justify-center" style={{ flex: 1, padding: '2rem 0' }}>
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
        <p>Login to Swiggy to start a new group order.</p>
        
        {!authComplete ? (
          <div className="flex-col">
            <input 
              type="text" 
              className="input" 
              placeholder="Your Name (e.g. John)" 
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
            />
            <button className="btn btn-primary" onClick={startSwiggyLogin} disabled={loading || !hostName}>
              {loading ? <div className="spinner"></div> : <><LogIn size={20} /> Login with Swiggy</>}
            </button>
          </div>
        ) : (
          <div className="flex-col">
            <div style={{ padding: '1rem', background: 'var(--surface-light)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ margin: 0, color: 'var(--success)' }}>✔ Authenticated as {hostName}</p>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                onClick={() => {
                  localStorage.removeItem('swiggyToken');
                  setAuthComplete(false);
                }}
              >
                Logout
              </button>
            </div>
            {addresses.length === 0 ? (
              <button className="btn btn-secondary" onClick={() => fetchAddresses()}>
                <MapPin size={20} /> Fetch Addresses
              </button>
            ) : (
              <>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Select delivery address:</label>
                <select 
                  className="input" 
                  value={selectedAddressId} 
                  onChange={(e) => setSelectedAddressId(e.target.value)}
                  style={{ padding: '0.75rem' }}
                >
                  {addresses.map(addr => (
                    <option key={addr.id} value={addr.id}>
                      {addr.addressTag ? `[${addr.addressTag}] ` : ''} 
                      {addr.addressLine.substring(0, 40)}...
                    </option>
                  ))}
                </select>
                <button className="btn btn-primary" onClick={createSession} disabled={loading}>
                  {loading ? <div className="spinner"></div> : <><Pizza size={20} /> Start Session</>}
                </button>
              </>
            )}
          </div>
        )}
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
