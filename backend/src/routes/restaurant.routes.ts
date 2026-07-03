import { Router } from 'express';
import { searchRestaurants, getRestaurantMenu } from '../controllers/restaurant.controller';

const router = Router();

router.get('/search', searchRestaurants);
router.get('/:sessionId/menu/:restaurantId', getRestaurantMenu);

export default router;
