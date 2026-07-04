import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import cron from 'node-cron';
import { prisma } from './utils/prisma';
import redisClient from './utils/redis';

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

  socket.on('join-session', async (sessionId) => {
    socket.join(sessionId);
    console.log(`User ${socket.id} joined session ${sessionId}`);

    // Send chat history when joining
    try {
      const messages = await redisClient.lrange(`chat:${sessionId}`, 0, -1);
      const parsedMessages = messages.map(m => JSON.parse(m));
      socket.emit('chat-history', parsedMessages);
    } catch (err) {
      console.error("Error loading chat history from redis", err);
    }
  });

  socket.on('cart-updated', (sessionId) => {
    socket.to(sessionId).emit('cart-updated');
  });

  socket.on('participant-joined', (sessionId) => {
    socket.to(sessionId).emit('participant-joined');
  });

  socket.on('activity', ({ sessionId, message }) => {
    socket.to(sessionId).emit('activity', message);
  });

  socket.on('send-chat', async ({ sessionId, sender, message }) => {
    const chatMsg = { sender, message, timestamp: new Date().toISOString() };
    try {
      // Store in redis
      await redisClient.rpush(`chat:${sessionId}`, JSON.stringify(chatMsg));
      // Set expiry to 3 hours
      await redisClient.expire(`chat:${sessionId}`, 3 * 60 * 60);
      
      // Broadcast to room
      io.to(sessionId).emit('chat-message', chatMsg);
    } catch (err) {
      console.error("Error saving chat", err);
    }
  });

  socket.on('reaction', ({ sessionId, emoji }) => {
    // Generate a unique ID for the animation
    const id = Date.now().toString() + Math.random().toString();
    // Broadcast to everyone including sender
    io.to(sessionId).emit('reaction', { emoji, id });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Run cleanup job every 10 minutes to delete expired sessions from DB
cron.schedule('*/10 * * * *', async () => {
  console.log('Running cron job to sweep expired sessions...');
  try {
    const deleted = await prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });
    if (deleted.count > 0) {
      console.log(`Successfully swept ${deleted.count} expired sessions from database.`);
    }
  } catch (error) {
    console.error('Error sweeping expired sessions:', error);
  }
});
