import { Router } from 'express';
import { startLogin, checkAuthStatus, oauthCallback } from '../controllers/auth.controller';

const router = Router();

router.post('/login', startLogin);
router.get('/status', checkAuthStatus);
router.get('/callback', oauthCallback);

export default router;
