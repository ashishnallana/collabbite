import { swiggyService } from './src/services/mcp.service';

async function test() {
  try {
    console.log("Calling get_addresses...");
    const addressesResponse = await swiggyService.callTool('get_addresses', {});
    const addressData = JSON.parse(addressesResponse.content[0].text);
    console.log("Addresses found:", addressData.addresses.length);
    
    if (addressData.addresses.length > 0) {
      const addressId = addressData.addresses[0].id;
      console.log(`Using address ID: ${addressId}`);

      console.log("Calling search_restaurants for 'biryani'...");
      const restaurantsResponse = await swiggyService.callTool('search_restaurants', {
        addressId: addressId,
        query: "biryani"
      });
      
      const restData = JSON.parse(restaurantsResponse.content[0].text);
      console.log("Restaurants found:", restData.restaurants ? restData.restaurants.length : 0);
      if (restData.restaurants && restData.restaurants.length > 0) {
        console.log("Top restaurant:", restData.restaurants[0].name);
      }
    }
  } catch (error) {
    console.error("Test failed:", error);
  }
}

test();
