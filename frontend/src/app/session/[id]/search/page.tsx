'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { ArrowLeft, Search as SearchIcon } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

const API_URL = 'http://localhost:5000/api';

export default function SearchRestaurants({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: sessionId } = use(params);
  
  const [query, setQuery] = useState('');
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    newSocket.emit('join-session', sessionId);
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [sessionId]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    setLoading(true);
    setSearched(true);
    try {
      const nickname = localStorage.getItem('nickname') || 'Someone';
      socket?.emit('activity', { sessionId, message: `${nickname} is looking for ${query}` });
      
      const res = await axios.get(`${API_URL}/restaurants/search`, {
        params: { sessionId, query }
      });
      if (res.data.success && res.data.data.restaurants) {
        setRestaurants(res.data.data.restaurants);
      } else {
        setRestaurants([]);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to search restaurants');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-col" style={{ flex: 1 }}>
      <div className="header">
        <div className="flex-row cursor-pointer" onClick={() => router.back()}>
          <ArrowLeft size={24} />
          <h2>Search Food</h2>
        </div>
      </div>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          type="text"
          className="input"
          style={{ marginBottom: 0 }}
          placeholder="Search for restaurants, dishes..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" style={{ width: 'auto' }} disabled={loading}>
          {loading ? <div className="spinner" style={{ width: 18, height: 18 }}></div> : <SearchIcon size={20} />}
        </button>
      </form>

      <div className="flex-col">
        {restaurants.map((rest) => (
          <div 
            key={rest.id} 
            className="card" 
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => router.push(`/session/${sessionId}/restaurant/${rest.id}`)}
          >
            <div>
              <h3 style={{ margin: 0 }}>{rest.name}</h3>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>{rest.distanceKm} km away</p>
            </div>
            <span className={`badge ${rest.availabilityStatus === 'OPEN' ? 'open' : 'closed'}`}>
              {rest.availabilityStatus}
            </span>
          </div>
        ))}
        {searched && !loading && restaurants.length === 0 && (
          <div className="text-center card">No restaurants found. Try a different query.</div>
        )}
      </div>
    </div>
  );
}
