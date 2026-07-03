'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { MapPin, Pizza, Users } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [joinId, setJoinId] = useState('');
  const [nickname, setNickname] = useState('');

  // Host state
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [fetchingAddresses, setFetchingAddresses] = useState(false);

  const fetchAddresses = async () => {
    setFetchingAddresses(true);
    try {
      const res = await axios.get(`${API_URL}/sessions/addresses`);
      if (res.data.success && res.data.data.length > 0) {
        setAddresses(res.data.data);
        setSelectedAddressId(res.data.data[0].id);
      }
    } catch (err: any) {
      console.error(err);
      if (err.response?.data?.message) {
        alert(err.response.data.message);
      } else {
        alert('Failed to fetch addresses. Make sure the backend is running and you are logged into Swiggy CLI.');
      }
    } finally {
      setFetchingAddresses(false);
    }
  };

  const createSession = async () => {
    if (!selectedAddressId) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/sessions/create`, { 
        hostId: 'host-123',
        address: selectedAddressId
      });
      if (res.data.success) {
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
        <p>Start a new group order and invite friends.</p>
        
        {addresses.length === 0 ? (
          <button className="btn btn-primary" onClick={fetchAddresses} disabled={fetchingAddresses}>
            {fetchingAddresses ? <div className="spinner"></div> : <><MapPin size={20} /> Fetch My Swiggy Addresses</>}
          </button>
        ) : (
          <div className="flex-col">
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
