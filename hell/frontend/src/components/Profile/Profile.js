import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Profile.css";

const Profile = () => {
  const [profile, setProfile] = useState({
    username: "",
    mobileNumber: "",
    address: "",
    oldPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    // Fetch the user profile on component mount
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("userToken"); // Ensure this key matches
        const response = await axios.get("https://mujbites.onrender.com/api/users/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setProfile({
          username: response.data.username || "",
          mobileNumber: response.data.mobileNumber || "",
          address: response.data.address || "",
          oldPassword: "",
          newPassword: "",
          confirmNewPassword: "",
        });
        setLoading(false);
      } catch (error) {
        console.error("Error fetching profile:", error.response ? error.response.data.message : error.message);
        setErrorMessage("Failed to load profile. Please try again.");
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prevProfile) => ({ ...prevProfile, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    // Check if any password field is filled
    const isPasswordUpdate =
      profile.oldPassword || profile.newPassword || profile.confirmNewPassword;

    // If any password field is filled, validate all password fields
    if (isPasswordUpdate) {
      if (!profile.oldPassword) {
        setErrorMessage("Old password is required.");
        return;
      }
      if (!profile.newPassword) {
        setErrorMessage("New password is required.");
        return;
      }
      if (!profile.confirmNewPassword) {
        setErrorMessage("Confirm new password is required.");
        return;
      }
      if (profile.newPassword !== profile.confirmNewPassword) {
        setErrorMessage("New password and confirm new password do not match.");
        return;
      }
      if (!/(?=.*[A-Z])(?=.*\d)/.test(profile.newPassword)) {
        setErrorMessage(
          "New password must contain at least one capital letter and one number."
        );
        return;
      }
    }

    try {
      const token = localStorage.getItem("userToken"); // Ensure this key matches
      const response = await axios.put(
        "https://mujbites.onrender.com/api/users/profile",
        {
          username: profile.username,
          mobileNumber: profile.mobileNumber,
          address: profile.address,
          oldPassword: profile.oldPassword,
          newPassword: profile.newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Check for password error from the backend
      if (response.data.error) {
        setErrorMessage(response.data.message);
        return;
      }

      setSuccessMessage("Profile updated successfully.");
      setProfile({
        ...profile,
        oldPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
    } catch (error) {
      console.error("Error updating profile:", error.response ? error.response.data.message : error.message);
      setErrorMessage("Failed to update profile. Please try again.");
    }
  };

  if (loading) {
    return <div className="profile-container">Loading...</div>;
  }

  return (
    <div className="profile-container">
      <h2>Profile</h2>
      {successMessage && <p className="success-message">{successMessage}</p>}
      {errorMessage && <p className="error-message">{errorMessage}</p>}
      <form onSubmit={handleSubmit}>
        {/* Personal Information Section */}
        <div className="section-heading">Personal Information</div>
        <div className="form-group">
          <label htmlFor="username">User Name:</label>
          <input
            type="text"
            id="username"
            name="username"
            value={profile.username}
            onChange={handleChange}
            disabled
            className="input"
            placeholder="Enter User Name"
          />
        </div>
        <div className="form-group">
          <label htmlFor="mobileNumber">Phone Number:</label>
          <input
            type="text"
            id="mobileNumber"
            name="mobileNumber"
            value={profile.mobileNumber}
            onChange={handleChange}
            disabled
            className="input"
            placeholder="Enter Phone Number"
          />
        </div>
        <div className="form-group">
          <label htmlFor="address">Address:</label>
          <input
            type="text"
            id="address"
            name="address"
            value={profile.address}
            onChange={handleChange}
            required
            className="input"
            placeholder="Enter Address"
          />
        </div>

        {/* Security Section */}
        <div className="section-heading">Security</div>
        <div className="form-group">
          <label htmlFor="oldPassword">Old Password:</label>
          <input
            type="password"
            id="oldPassword"
            name="oldPassword"
            value={profile.oldPassword}
            onChange={handleChange}
            className="input"
            placeholder="Enter Old Password"
          />
        </div>
        <div className="form-group">
          <label htmlFor="newPassword">New Password:</label>
          <input
            type="password"
            id="newPassword"
            name="newPassword"
            value={profile.newPassword}
            onChange={handleChange}
            className="input"
            placeholder="Enter New Password"
          />
        </div>
        <div className="form-group">
          <label htmlFor="confirmNewPassword">Confirm New Password:</label>
          <input
            type="password"
            id="confirmNewPassword"
            name="confirmNewPassword"
            value={profile.confirmNewPassword}
            onChange={handleChange}
            className="input"
            placeholder="Confirm New Password"
          />
        </div>

        {/* Save Changes Button */}
        <button type="submit" className="btn-save">
          Save Changes
        </button>
      </form>
    </div>
  );
};

export default Profile;