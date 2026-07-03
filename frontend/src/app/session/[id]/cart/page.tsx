'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { ArrowLeft, Trash2, CreditCard, CheckCircle } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

const API_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

export default function CartPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: sessionId } = use(params);
  
  const [session, setSession] = useState<any>(null);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  
  const [isHost, setIsHost] = useState(false);
  const [myParticipantId, setMyParticipantId] = useState<string | null>(null);

  useEffect(() => {
    const pId = localStorage.getItem('participantId');
    setMyParticipantId(pId);
    
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
        // Correctly detect host by checking participant role
        const pId = localStorage.getItem('participantId');
        const myP = sessionData.participants?.find((p: any) => p.id === pId);
        if (myP && myP.role === 'HOST') {
          setIsHost(true);
        }
      }
    } catch (err) {
      console.error("Failed to fetch data", err);
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (itemId: string, itemName: string) => {
    try {
      const qs = myParticipantId ? `?participantId=${myParticipantId}` : '';
      await axios.delete(`${API_URL}/cart/${itemId}${qs}`);
      
      const nickname = localStorage.getItem('nickname') || 'Someone';
      socket?.emit('activity', { sessionId, message: `${nickname} removed ${itemName} from the cart` });
      socket?.emit('cart-updated', sessionId);
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to remove item');
    }
  };

  const toggleReady = async () => {
    if (!myParticipantId) return; // Host is always ready or doesn't need to click
    try {
      await axios.post(`${API_URL}/sessions/ready`, { participantId: myParticipantId });
      
      const nickname = localStorage.getItem('nickname') || 'Someone';
      const myP = session?.participants?.find((p:any) => p.id === myParticipantId);
      const wasReady = myP?.isReady;
      
      socket?.emit('activity', { 
        sessionId, 
        message: `${nickname} is ${wasReady ? 'not ready anymore' : 'ready to order'}!` 
      });
      socket?.emit('cart-updated', sessionId);
      fetchData();
    } catch (err: any) {
      alert('Failed to update status');
    }
  };

  const handleCheckout = async () => {
    if (!isHost) return;
    router.push(`/session/${sessionId}/checkout`);
  };

  if (loading) return <div className="container justify-center flex-col text-center"><div className="spinner mx-auto mb-4" />Loading Cart...</div>;

  // Group items by participant
  const groupedCart = cartItems.reduce((acc: any, item: any) => {
    const pId = item.participantId;
    const name = item.participant?.nickname || 'Host';
    if (!acc[pId]) acc[pId] = { name, participantId: pId, items: [], total: 0 };
    acc[pId].items.push(item);
    acc[pId].total += item.price * item.quantity;
    return acc;
  }, {});

  const grandTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Check if all guests are ready
  const participants = session?.participants || [];
  const guests = participants.filter((p: any) => p.role !== 'HOST');
  const allGuestsReady = guests.length > 0 && guests.every((p: any) => p.isReady);
  const myParticipant = participants.find((p: any) => p.id === myParticipantId);

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
          Object.values(groupedCart).map((group: any, idx: number) => {
            const participantData = participants.find((p: any) => p.id === group.participantId);
            const isReady = participantData?.isReady;
            const canEdit = isHost || group.participantId === myParticipantId;

            return (
              <div key={idx} className="card mb-4" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ background: 'var(--surface-light)', padding: '1rem', borderBottom: '1px solid var(--border)' }} className="flex-row justify-between">
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: '#fff' }}>
                      {group.name.charAt(0).toUpperCase()}
                    </div>
                    {group.name}&apos;s Order
                    {isReady && <CheckCircle size={16} color="var(--primary)" />}
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
                        {canEdit && (
                          <button className="btn-icon" onClick={() => removeItem(item.id, item.itemName)}>
                            <Trash2 size={16} color="var(--danger)" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}

        {cartItems.length > 0 && (
          <div className="card flex-row justify-between" style={{ background: 'linear-gradient(145deg, var(--surface), var(--surface-light))', border: '1px solid var(--primary)' }}>
            <h3>Grand Total</h3>
            <h3 style={{ color: 'var(--primary)' }}>₹{grandTotal}</h3>
          </div>
        )}
      </div>

      <div className="glass-nav flex-col">
        {!isHost && (
          <button 
            className={`btn ${myParticipant?.isReady ? 'btn-secondary' : 'btn-primary'}`} 
            onClick={toggleReady}
            style={{ width: '100%', marginBottom: '0.5rem' }}
          >
            {myParticipant?.isReady ? <><CheckCircle size={20} /> Ready!</> : 'I am Ready'}
          </button>
        )}

        {isHost ? (
          <button 
            className="btn btn-primary" 
            onClick={handleCheckout}
            disabled={!allGuestsReady || cartItems.length === 0}
            style={{ width: '100%' }}
          >
            <CreditCard size={20} /> 
            {!allGuestsReady ? 'Waiting for guests to be ready...' : 'Proceed to Checkout'}
          </button>
        ) : (
          <div className="text-center text-muted" style={{ fontSize: '0.9rem' }}>
            {allGuestsReady ? 'Host is reviewing the order...' : 'Waiting for others to be ready...'}
          </div>
        )}
      </div>
    </div>
  );
}
