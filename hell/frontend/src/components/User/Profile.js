import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Profile.css"; // Import CSS file for Profile styles

const Profile = () => {
    const [user, setUser] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [updatedUser, setUpdatedUser] = useState({});
    const [successMessage, setSuccessMessage] = useState("");
    const [error, setError] = useState("");
    const token = localStorage.getItem("userToken");
    const authHeader = { headers: { Authorization: `Bearer ${token}` } };

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await axios.get("/api/users/user", authHeader);
                setUser(response.data);
                setUpdatedUser(response.data);
            } catch (err) {
                setError("Failed to fetch user data.");
            }
        };

        fetchUserData();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setUpdatedUser((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.put(
                "/api/users/user",
                updatedUser,
                authHeader
            );
            setUser(response.data);
            setIsEditing(false);
            setSuccessMessage("Profile updated successfully.");
            setError("");
        } catch (error) {
            console.error("Failed to update profile:", error);
            setError("Failed to update profile.");
        }
    };

    const handleEdit = () => {
        setUpdatedUser(user);
        setIsEditing(true);
    };

    if (!user) {
        return <div>Loading...</div>;
    }

    return (
        <div className="profile-container">
            <h2>Profile</h2>
            {successMessage && (
                <div className="success-message">{successMessage}</div>
            )}
            {error && <div className="error-message">{error}</div>}
            <div className="profile-content">
                {isEditing ? (
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="username">Username:</label>
                            <input
                                type="text"
                                id="username"
                                name="username"
                                value={updatedUser.username || ""}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="email">Email:</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={updatedUser.email || ""}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="mobileNumber">Mobile Number:</label>
                            <input
                                type="text"
                                id="mobileNumber"
                                name="mobileNumber"
                                value={updatedUser.mobileNumber || ""}
                                onChange={handleInputChange}
                            />
                        </div>
                        <button type="submit" className="save-button">
                            Save Changes
                        </button>
                        <button
                            type="button"
                            className="cancel-button"
                            onClick={() => setIsEditing(false)}
                        >
                            Cancel
                        </button>
                    </form>
                ) : (
                    <div className="profile-details">
                        <p>
                            <strong>Username:</strong> {user.username}
                        </p>
                        <p>
                            <strong>Email:</strong> {user.email}
                        </p>
                        <p>
                            <strong>Mobile Number:</strong> {user.mobileNumber}
                        </p>
                        <button onClick={handleEdit} className="edit-button">
                            Edit Profile
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;