import axios from "axios";

// Create an Axios instance with default configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL || "https://mujbites.onrender.com",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000, // Increased timeout to 15 seconds
});

// Request interceptor to attach the token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("userToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn("No auth token found");
    }
    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors globally and retry failed requests
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Retry logic for rate-limiting (429) and other transient errors
    if (
      error.response &&
      [429, 401, 403, 404, 500].includes(error.response.status) &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      // Exponential backoff: wait longer for each retry
      const retryDelay = Math.pow(2, originalRequest._retryCount || 1) * 1000; // 2^retryCount * 1000ms
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

      console.log(`Retrying request in ${retryDelay}ms...`);

      await new Promise((resolve) => setTimeout(resolve, retryDelay));
      return api(originalRequest); // Retry the original request
    }

    // Handle specific error responses
    if (error.response) {
      const errorMessage = error.response.data?.message || 'An unexpected error occurred';
      
      switch (error.response.status) {
        case 401:
          console.error("Unauthorized: Please log in again.");
          // Optionally, redirect to the login page
          window.location.href = "/login";
          break;
        case 403:
          console.error("Forbidden: You do not have permission to access this resource.");
          break;
        case 404:
          console.error("Not Found: The requested resource does not exist.");
          break;
        case 429:
          console.error("Rate limit exceeded: Please slow down your requests.");
          break;
        case 500:
          if (errorMessage.includes('duplicate key')) {
            return Promise.reject({
              message: 'A user with this mobile number already exists'
            });
          }
          console.error("Server Error: Please try again later.");
          break;
        case 400:
          return Promise.reject({
            message: errorMessage || 'Invalid input data'
          });
        case 409:
          return Promise.reject({
            message: 'User already exists with this mobile number'
          });
        default:
          console.error("An error occurred:", errorMessage);
          return Promise.reject({
            message: errorMessage
          });
      }
    }

    // Handle network errors
    if (error.request) {
      console.error("No response received from the server. Please check your internet connection.");
      return Promise.reject({
        message: 'Unable to connect to the server. Please check your internet connection.'
      });
    }

    return Promise.reject(error);
  }
);

// Helper function to register an FCM token
export const registerFCMToken = async (token, userId, device = null) => {
  try {
    // Validate inputs
    if (!token || !userId) {
      throw new Error('Token and userId are required for FCM registration');
    }

    // Get the authentication token
    const authToken = localStorage.getItem('userToken');
    if (!authToken) {
      throw new Error('No authentication token found');
    }

    const response = await api.post("/api/tokens/register-token", 
      {
        token,
        userId,
        device
      },
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('FCM token registration response:', response.data);
    return response.data;

  } catch (error) {
    console.error('FCM token registration error:', error);
    
    // Handle specific error cases
    if (error.response?.status === 401) {
      // Handle authentication error
      localStorage.removeItem('userToken'); // Clear invalid token
      throw new Error('Authentication failed. Please log in again.');
    }
    
    throw error;
  }
};

// Helper function to deactivate an FCM token
export const deactivateFCMToken = async (token) => {
  try {
    const response = await api.post("/api/tokens/deactivate-token", {
      token,
    });
    return response.data;
  } catch (error) {
    console.error("Error deactivating FCM token:", error);
    throw error;
  }
};

// Helper function to send notifications
export const sendNotification = async (userId, type, data) => {
  try {
    const response = await api.post("/api/notifications", {
      userId,
      type,
      data,
    });
    return response.data;
  } catch (error) {
    console.error("Error sending notification:", error);
    throw error;
  }
};

// Helper function to fetch notifications
export const fetchNotifications = async (userId) => {
  try {
    const response = await api.get(`/api/notifications?userId=${userId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching notifications:", error);
    throw error;
  }
};

// Helper function to mark a notification as read
export const markNotificationAsRead = async (notificationId) => {
  try {
    const response = await api.patch(`/api/notifications/${notificationId}/read`);
    return response.data;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
};

// Helper function to delete a notification
export const deleteNotification = async (notificationId) => {
  try {
    const response = await api.delete(`/api/notifications/${notificationId}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting notification:", error);
    throw error;
  }
};

// Helper function to send a notification to a restaurant
export const sendRestaurantNotification = async (restaurantId, message, type, metadata = {}) => {
  try {
    const response = await api.post("/api/notifications/restaurant", {
      restaurantId,
      message,
      type,
      metadata,
    });
    return response.data;
  } catch (error) {
    console.error("Error sending restaurant notification:", error);
    throw error;
  }
};

// Helper function to fetch restaurant notifications
export const fetchRestaurantNotifications = async (restaurantId) => {
  try {
    const response = await api.get(`/api/notifications/restaurant/${restaurantId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching restaurant notifications:", error);
    throw error;
  }
};

export default api;