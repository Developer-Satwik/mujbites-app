import React from 'react';
import { Navigate } from 'react-router-dom';

const decodeToken = (token) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload;
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
};

const checkTokenExpiry = (token) => {
  const payload = decodeToken(token);
  return payload && payload.exp * 1000 < Date.now(); // Check if token is expired
};

function PrivateRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('userToken'); // Use 'userToken' consistently
  const userRole = localStorage.getItem('userRole');

  if (!token || checkTokenExpiry(token)) {
    localStorage.removeItem("userToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userId");
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />; // Redirect to home if role is not allowed
  }

  return children;
}

export default PrivateRoute;