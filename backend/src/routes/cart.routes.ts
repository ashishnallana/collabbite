import { Router } from 'express';
import { addItem, removeItem, getCart, checkout } from '../controllers/cart.controller';

const router = Router();

router.post('/add', addItem);
router.delete('/:cartItemId', removeItem);
router.get('/:sessionId', getCart);
router.post('/checkout', checkout);

export default router;
