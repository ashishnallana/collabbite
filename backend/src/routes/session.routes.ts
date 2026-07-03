import { Router } from 'express';
import { createSession, joinSession, getSession } from '../controllers/session.controller';

const router = Router();

// Define routes for session management
router.post('/create', createSession);
router.post('/join', joinSession);
router.get('/:id', getSession);

export default router;
