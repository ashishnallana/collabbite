import { swiggyService } from './mcp.service';

export const searchRestaurants = async (addressId: string, query: string, offset: number = 0) => {
  try {
    const response = await swiggyService.callTool('search_restaurants', {
      addressId,
      query,
      offset
    });
    return JSON.parse(response.content[0].text).data;
  } catch (err: any) {
    throw new Error(`Failed to search restaurants: ${err.message}`);
  }
};

export const getRestaurantMenu = async (addressId: string, restaurantId: string) => {
  try {
    const response = await swiggyService.callTool('get_restaurant_menu', {
      addressId,
      restaurantId
    });
    return JSON.parse(response.content[0].text).data;
  } catch (err: any) {
    throw new Error(`Failed to fetch menu: ${err.message}`);
  }
};
