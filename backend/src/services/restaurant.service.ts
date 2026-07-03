import { swiggyService } from './mcp.service';

export const searchRestaurants = async (hostId: string, addressId: string, query: string, offset: number = 0) => {
  try {
    const response = await swiggyService.callTool('search_restaurants', {
      addressId,
      query,
      offset
    }, hostId);
    const parsed = JSON.parse(response.content[0].text as string);
    return parsed.data || parsed;
  } catch (err: any) {
    throw new Error(`Failed to search restaurants: ${err.message}`);
  }
};

export const getRestaurantMenu = async (hostId: string, addressId: string, restaurantId: string) => {
  try {
    const response = await swiggyService.callTool('get_restaurant_menu', {
      addressId,
      restaurantId
    }, hostId);
    const parsed = JSON.parse(response.content[0].text as string);
    return parsed.data || parsed;
  } catch (err: any) {
    throw new Error(`Failed to fetch menu: ${err.message}`);
  }
};
