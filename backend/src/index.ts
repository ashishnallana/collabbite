import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

import sessionRoutes from './routes/session.routes';
import restaurantRoutes from './routes/restaurant.routes';
import cartRoutes from './routes/cart.routes';
import authRoutes from './routes/auth.routes';

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/sessions', sessionRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/auth', authRoutes);


// Basic health check
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'CollabBite API is running' });
});

// Socket.io for Real-time collaboration
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join-session', (sessionId) => {
    socket.join(sessionId);
    console.log(`User ${socket.id} joined session ${sessionId}`);
  });

  socket.on('cart-updated', (sessionId) => {
    socket.to(sessionId).emit('cart-updated');
  });

  socket.on('participant-joined', (sessionId) => {
    socket.to(sessionId).emit('participant-joined');
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
