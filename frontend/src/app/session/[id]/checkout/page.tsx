'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { ArrowLeft, CreditCard, Store } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

const API_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: sessionId } = use(params);
  
  const [session, setSession] = useState<any>(null);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    fetchData();

    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.emit('join-session', sessionId);
    newSocket.on('cart-updated', () => {
      fetchData();
    });

    return () => {
      newSocket.disconnect();
    };
  }, [sessionId]);

  const fetchData = async () => {
    try {
      const [cartRes, sessionRes] = await Promise.all([
        axios.get(`${API_URL}/cart/${sessionId}`),
        axios.get(`${API_URL}/sessions/${sessionId}`)
      ]);
      
      if (cartRes.data.success) {
        setCartItems(cartRes.data.data);
      }
      if (sessionRes.data.success) {
        const sessionData = sessionRes.data.data;
        setSession(sessionData);
        
        const pId = localStorage.getItem(`participantId_${sessionId}`);
        const myP = sessionData.participants?.find((p: any) => p.id === pId);
        if (myP && myP.role === 'HOST') {
          setIsHost(true);
        } else {
          // If not host, redirect away or show error
          alert('Only the host can access the checkout flow.');
          router.push(`/session/${sessionId}/cart`);
        }
      }
    } catch (err) {
      console.error("Failed to fetch data", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = (restaurantId: string) => {
    alert('Checkout functionality is currently disabled for MVP testing. Multi-restaurant API execution will go here.');
  };

  if (loading) return <div className="container justify-center flex-col text-center"><div className="spinner mx-auto mb-4" />Loading Checkout...</div>;
  if (!isHost && !loading) return <div className="container justify-center flex-col text-center">Unauthorized</div>;

  // Group items by restaurant
  const groupedByRestaurant = cartItems.reduce((acc: any, item: any) => {
    const rId = item.restaurantId;
    if (!acc[rId]) {
      acc[rId] = { 
        restaurantId: rId, 
        restaurantName: item.restaurantName, 
        items: [], 
        total: 0 
      };
    }
    acc[rId].items.push(item);
    acc[rId].total += (item.price * item.quantity);
    return acc;
  }, {});

  const restaurants = Object.values(groupedByRestaurant);
  const grandTotal = restaurants.reduce((sum: number, r: any) => sum + r.total, 0);

  return (
    <div className="flex-col" style={{ flex: 1 }}>
      <div className="header sticky top-0" style={{ background: 'var(--background)', zIndex: 10 }}>
        <div className="flex-row cursor-pointer" onClick={() => router.back()}>
          <ArrowLeft size={24} />
          <h2>Checkout Review</h2>
        </div>
      </div>

      <div className="flex-col pb-24">
        <p style={{ color: 'var(--text-muted)' }}>
          Because items were added from multiple restaurants, orders must be placed one at a time on Swiggy.
        </p>

        {restaurants.length === 0 ? (
          <div className="card text-center text-muted">
            Cart is empty.
          </div>
        ) : (
          restaurants.map((restaurant: any, idx: number) => (
            <div key={restaurant.restaurantId} className="card mb-4" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ background: 'var(--surface-light)', padding: '1rem', borderBottom: '1px solid var(--border)' }} className="flex-row justify-between">
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Store size={20} color="var(--primary)" />
                  {restaurant.restaurantName}
                </h3>
                <span style={{ fontWeight: 'bold' }}>₹{restaurant.total}</span>
              </div>
              <div style={{ padding: '1rem' }}>
                {restaurant.items.map((item: any) => (
                  <div key={item.id} className="list-item" style={{ padding: '0.5rem 0' }}>
                    <div className="flex-col" style={{ gap: 0 }}>
                      <span>{item.quantity}x {item.itemName}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Added by {item.participant?.nickname || 'Unknown'}</span>
                    </div>
                    <span>₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
              
              <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', background: 'var(--background)' }}>
                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%' }}
                  disabled // Specifically requested to be disabled
                  onClick={() => handlePlaceOrder(restaurant.restaurantId)}
                >
                  <CreditCard size={18} /> Place Order (Disabled)
                </button>
              </div>
            </div>
          ))
        )}

        {restaurants.length > 0 && (
          <div className="card flex-row justify-between" style={{ background: 'linear-gradient(145deg, var(--surface), var(--surface-light))', border: '1px solid var(--primary)' }}>
            <h3>Grand Total</h3>
            <h3 style={{ color: 'var(--primary)' }}>₹{grandTotal}</h3>
          </div>
        )}
      </div>
    </div>
  );
}
