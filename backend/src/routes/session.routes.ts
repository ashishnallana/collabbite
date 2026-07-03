import { Router } from 'express';
import { createSession, joinSession, getSession, getAddresses } from '../controllers/session.controller';

const router = Router();

// Define routes for session management
router.get('/addresses', getAddresses);
router.post('/create', createSession);
router.post('/join', joinSession);
router.get('/:id', getSession);

export default router;
