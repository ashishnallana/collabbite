'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { ArrowLeft, Plus } from 'lucide-react';
import { io } from 'socket.io-client';

const API_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

export default function RestaurantMenu({ params }: { params: Promise<{ id: string; restaurantId: string }> }) {
  const router = useRouter();
  const { id: sessionId, restaurantId } = use(params);
  
  const [menu, setMenu] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [addingItem, setAddingItem] = useState<string | null>(null);

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      const res = await axios.get(`${API_URL}/restaurants/${sessionId}/menu/${restaurantId}`);
      if (res.data.success) {
        setMenu(res.data.data);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (item: any) => {
    const participantId = localStorage.getItem('participantId');
    if (!participantId && false) { // Skip check for MVP host
      alert("Participant ID missing");
      return;
    }
    
    setAddingItem(item.id);
    try {
      await axios.post(`${API_URL}/cart/add`, {
        sessionId,
        participantId: participantId || 'host', // fallback
        restaurantId,
        restaurantName: menu?.restaurantName || 'Restaurant', // Swiggy MCP menu response usually has this
        itemId: item.id,
        itemName: item.name,
        price: item.price,
        quantity: 1,
      });

      // Notify others
      const socket = io(SOCKET_URL);
      socket.on('connect', () => {
        const nickname = localStorage.getItem('nickname') || 'Someone';
        socket.emit('activity', { sessionId, message: `${nickname} added ${item.name} to the cart!` });
        socket.emit('cart-updated', sessionId);
        setTimeout(() => socket.disconnect(), 200);
      });

      alert("Added to shared cart!");
    } catch (err) {
      console.error(err);
      alert("Failed to add to cart");
    } finally {
      setAddingItem(null);
    }
  };

  if (loading) return <div className="container justify-center flex-col text-center"><div className="spinner mx-auto mb-4" />Loading Menu...</div>;

  // Flatten menu items for MVP. Swiggy menu structure might be nested. 
  // Let's assume menu.items array exists, or if Swiggy's response is nested, we'll extract simply.
  // Actually, Swiggy's get_restaurant_menu response has a nested structure of categories.
  // We'll render them if they exist, else just show raw.
  const categories = menu?.categories || [];

  return (
    <div className="flex-col" style={{ flex: 1 }}>
      <div className="header sticky top-0" style={{ background: 'var(--background)', zIndex: 10 }}>
        <div className="flex-row cursor-pointer" onClick={() => router.back()}>
          <ArrowLeft size={24} />
          <h2>Menu</h2>
        </div>
      </div>

      <div className="flex-col pb-20">
        {categories.length > 0 ? categories.map((cat: any, i: number) => (
          <div key={i} className="mb-4">
            <h3 style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>{cat.title}</h3>
            {cat.items?.map((item: any) => (
              <div key={item.id} className="card flex-row justify-between" style={{ padding: '1rem', marginBottom: '0.5rem' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{item.name}</h4>
                  <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-main)' }}>₹{item.price}</p>
                </div>
                <button 
                  className="btn btn-primary" 
                  style={{ width: 'auto', padding: '0.5rem 1rem' }}
                  onClick={() => addToCart(item)}
                  disabled={addingItem === item.id}
                >
                  {addingItem === item.id ? <div className="spinner" style={{width: 16, height: 16}} /> : <Plus size={18} />}
                  Add
                </button>
              </div>
            ))}
          </div>
        )) : (
          <div className="card text-center">Menu parsing not fully implemented for this raw structure.</div>
        )}
      </div>
    </div>
  );
}
