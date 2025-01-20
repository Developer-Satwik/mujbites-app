import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../firebase/firebaseConfig';

/**
 * Sets up Firestore listeners for notifications based on the user or restaurant ID.
 * @param {Function} setNotifications - State setter function to update notifications.
 * @param {string} userId - The ID of the user (optional).
 * @param {string} restaurantId - The ID of the restaurant (optional).
 * @returns {Function} - A cleanup function to unsubscribe from Firestore listeners.
 */
export const setupFirestoreListeners = (setNotifications, userId, restaurantId) => {
  // Validate that either userId or restaurantId is provided
  if ((!userId && !restaurantId) || !auth.currentUser) {
    console.warn('No user ID or restaurant ID provided, or user not authenticated for Firestore listeners');
    return () => {};
  }

  const cleanupFunctions = [];

  try {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        // Determine the query based on whether it's a user or restaurant
        const notificationsQuery = query(
          collection(db, "notifications"),
          // If userId is provided, filter by userId; otherwise, filter by restaurantId
          userId ? where("userId", "==", userId) : where("restaurantId", "==", restaurantId),
          where("deleted", "==", false), // Only fetch non-deleted notifications
          orderBy("timestamp", "desc"), // Order by timestamp in descending order
          limit(100) // Limit to 100 notifications
        );

        // Set up the Firestore listener for notifications
        const unsubscribeNotifications = onSnapshot(
          notificationsQuery,
          (snapshot) => {
            // Map the Firestore documents to a notifications array
            const fetchedNotifications = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
              timestamp: doc.data().timestamp?.toDate?.() || new Date(), // Convert Firestore timestamp to JS Date
            }));
            // Update the notifications state
            setNotifications(fetchedNotifications);
          },
          (error) => {
            console.error("Firestore listener error:", {
              error: error.message,
              stack: error.stack,
            });
          }
        );

        // Add the unsubscribe function to the cleanup array
        cleanupFunctions.push(unsubscribeNotifications);
      }
    });

    // Add the auth state change unsubscribe function to the cleanup array
    cleanupFunctions.push(unsubscribeAuth);

    // Return a cleanup function to unsubscribe from all listeners
    return () => {
      cleanupFunctions.forEach((cleanup) => {
        if (typeof cleanup === 'function') {
          cleanup();
        }
      });
    };
  } catch (error) {
    console.error("Error setting up Firestore listeners:", {
      error: error.message,
      stack: error.stack,
    });
    return () => {};
  }
};