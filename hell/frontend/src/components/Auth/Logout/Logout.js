import React from 'react';
import axios from 'axios';
import './Logout.css';

function Logout() {
    const handleLogout = async () => {
        try {
            await axios.post('https://mujbites.onrender.com/api/users/logout'); // API endpoint for logout
            
            // Remove user-related data from local storage
            localStorage.removeItem('userToken');
            localStorage.removeItem('username');
            localStorage.removeItem('userId');
            localStorage.removeItem('userRole');
            
            // Handle successful logout (e.g., redirect to home)
            console.log('Logged out successfully');

            // Redirect to the login page or homepage
            window.location.href = '/login'; // or use a library like React Router
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="logout-page">
            <h2>Logout</h2>
            <p>Are you sure you want to logout?</p>
            <button onClick={handleLogout}>Logout</button>
        </div>
    );
}

export default Logout;
