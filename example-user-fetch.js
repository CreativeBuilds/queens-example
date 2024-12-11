const dotenv = require('dotenv');
dotenv.config();

const appId = process.env.VITE_PRIVY_APP_ID;
const appSecret = process.env.PRIVY_APP_SECRET;


async function fetchUser(userId) {
    try {
      const response = await fetch(`https://auth.privy.io/api/v1/users/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + btoa(`${appId}:${appSecret}`),
          'privy-app-id': appId
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const userData = await response.json();
      return userData;
    } catch (error) {
      console.error('Error fetching user data:', error);
      throw error;
    }
}
  
  // Example usage:
  fetchUser('cm4j83n0y005lkpr9jb3zjsex')
    .then(data => console.log(data))
    .catch(error => console.error('Failed to fetch user data:', error));