'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { ArrowLeft, Trash2, CreditCard } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

const API_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

export default function CartPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: sessionId } = use(params);
  
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  
  const isHost = !localStorage.getItem('participantId'); // Rough check for MVP

  useEffect(() => {
    fetchCart();

    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.emit('join-session', sessionId);
    newSocket.on('cart-updated', () => {
      fetchCart();
    });

    return () => {
      newSocket.disconnect();
    };
  }, [sessionId]);

  const fetchCart = async () => {
    try {
      const res = await axios.get(`${API_URL}/cart/${sessionId}`);
      if (res.data.success) {
        setCartItems(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch cart", err);
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      await axios.delete(`${API_URL}/cart/${itemId}`);
      socket?.emit('cart-updated', sessionId);
      fetchCart();
    } catch (err) {
      console.error(err);
      alert('Failed to remove item');
    }
  };

  const handleCheckout = async () => {
    if (!isHost) return;
    setCheckingOut(true);
    try {
      const res = await axios.post(`${API_URL}/cart/checkout`, { sessionId });
      if (res.data.success) {
        alert('Cart successfully pushed to Swiggy! Open Swiggy app to pay.');
        router.push(`/session/${sessionId}`);
      }
    } catch (err) {
      console.error(err);
      alert('Checkout failed. Make sure all items are from the same restaurant.');
    } finally {
      setCheckingOut(false);
    }
  };

  if (loading) return <div className="container justify-center flex-col text-center"><div className="spinner mx-auto mb-4" />Loading Cart...</div>;

  // Group items by participant
  const groupedCart = cartItems.reduce((acc: any, item: any) => {
    const pId = item.participantId;
    const name = item.participant?.nickname || 'Host';
    if (!acc[pId]) acc[pId] = { name, items: [], total: 0 };
    acc[pId].items.push(item);
    acc[pId].total += item.price * item.quantity;
    return acc;
  }, {});

  const grandTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="flex-col" style={{ flex: 1 }}>
      <div className="header sticky top-0" style={{ background: 'var(--background)', zIndex: 10 }}>
        <div className="flex-row cursor-pointer" onClick={() => router.back()}>
          <ArrowLeft size={24} />
          <h2>Shared Cart</h2>
        </div>
      </div>

      <div className="flex-col pb-24">
        {Object.keys(groupedCart).length === 0 ? (
          <div className="card text-center text-muted">
            Cart is empty. Invite friends or add some food!
          </div>
        ) : (
          Object.values(groupedCart).map((group: any, idx: number) => (
            <div key={idx} className="card mb-4" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ background: 'var(--surface-light)', padding: '1rem', borderBottom: '1px solid var(--border)' }} className="flex-row justify-between">
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: '#fff' }}>
                    {group.name.charAt(0).toUpperCase()}
                  </div>
                  {group.name}&apos;s Order
                </h3>
                <span style={{ fontWeight: 'bold' }}>₹{group.total}</span>
              </div>
              <div style={{ padding: '1rem' }}>
                {group.items.map((item: any) => (
                  <div key={item.id} className="list-item" style={{ padding: '0.5rem 0' }}>
                    <div className="flex-col" style={{ gap: 0 }}>
                      <span>{item.quantity}x {item.itemName}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.restaurantName}</span>
                    </div>
                    <div className="flex-row">
                      <span>₹{item.price * item.quantity}</span>
                      <button className="btn-icon" onClick={() => removeItem(item.id)}>
                        <Trash2 size={16} color="var(--danger)" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {cartItems.length > 0 && (
          <div className="card flex-row justify-between" style={{ background: 'linear-gradient(145deg, var(--surface), var(--surface-light))', border: '1px solid var(--primary)' }}>
            <h3>Grand Total</h3>
            <h3 style={{ color: 'var(--primary)' }}>₹{grandTotal}</h3>
          </div>
        )}
      </div>

      <div className="glass-nav">
        {isHost ? (
          <button 
            className="btn btn-primary" 
            onClick={handleCheckout}
            disabled={checkingOut || cartItems.length === 0}
          >
            {checkingOut ? <div className="spinner" /> : <><CreditCard size={20} /> Place Order on Swiggy</>}
          </button>
        ) : (
          <button className="btn btn-secondary" disabled>
            Waiting for Host to checkout...
          </button>
        )}
      </div>
    </div>
  );
}
