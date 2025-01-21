import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ReCAPTCHA from "react-google-recaptcha";
import "./Login.css";
import Loader from "../../Loader/Loader";

function Login({ onLogin }) {
  const [formErrors, setFormErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [popup, setPopup] = useState({ message: "", type: "", show: false });
  const [showPassword, setShowPassword] = useState(false); // State to toggle password visibility
  const [recaptchaToken, setRecaptchaToken] = useState(null); // State for reCAPTCHA token
  const mobileNumberRef = useRef(null);
  const passwordRef = useRef(null);
  const recaptchaRef = useRef(null); // Ref for reCAPTCHA
  const navigate = useNavigate();

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev); // Toggle the state
  };

  // Handle reCAPTCHA token change
  const handleRecaptchaChange = (token) => {
    setRecaptchaToken(token);
    setFormErrors((prev) => ({ ...prev, recaptcha: undefined })); // Clear reCAPTCHA error
  };

  // Validate form inputs
  const validateForm = () => {
    const errors = {};
    const mobileNumber = mobileNumberRef.current.value;
    const password = passwordRef.current.value;

    if (!mobileNumber || !/^\d{10}$/.test(mobileNumber)) {
      errors.mobileNumber = "Enter a valid 10-digit mobile number";
    }

    if (!password || password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (!recaptchaToken) {
      errors.recaptcha = "Please complete the reCAPTCHA.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      setPopup({ message: "Please complete all fields", type: "error", show: true });
      setTimeout(() => setPopup((prev) => ({ ...prev, show: false })), 3000); // Hide popup after 3 seconds
      return;
    }

    setIsLoading(true);

    try {
      // Log the reCAPTCHA token for debugging
      console.log('reCAPTCHA Token:', recaptchaToken);

      // Proceed with login API call using fetch
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobileNumber: mobileNumberRef.current.value,
          password: passwordRef.current.value,
          recaptchaToken, // Include the token in the login request
        }),
      });

      // Check if the response is successful
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Login failed");
      }

      // Parse the response data
      const data = await response.json();

      if (data.token && data.user) {
        // Store user data in localStorage
        localStorage.setItem("userToken", data.token);
        localStorage.setItem("userRole", data.user.role);
        localStorage.setItem("userId", data.user._id);

        // Trigger onLogin callback with user data and token
        onLogin(data.user, data.token);

        // Redirect to home page
        navigate("/");
      }
    } catch (error) {
      console.error("Login error:", error);
      let errorMessage = "Login failed! Please try again.";

      if (error.message) {
        errorMessage = error.message;
      }

      setPopup({ message: errorMessage, type: "error", show: true });
      setTimeout(() => setPopup((prev) => ({ ...prev, show: false })), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <div className="title">
          Welcome Back
          <br />
          <span>Sign in to continue</span>
        </div>

        <div className="input__container">
          <input
            type="tel"
            name="mobileNumber"
            className={`input__field ${formErrors.mobileNumber ? "error" : ""}`}
            placeholder="Phone Number"
            ref={mobileNumberRef}
            required
            pattern="[0-9]{10}"
            maxLength="10"
            disabled={isLoading}
          />
          {formErrors.mobileNumber && (
            <div className="error-text">{formErrors.mobileNumber}</div>
          )}
        </div>

        <div className="input__container password-container">
          <input
            type={showPassword ? "text" : "password"} // Toggle input type
            name="password"
            className={`input__field ${formErrors.password ? "error" : ""}`}
            placeholder="Password"
            ref={passwordRef}
            required
            disabled={isLoading}
          />
          <i
            className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"} password-toggle-icon`}
            onClick={togglePasswordVisibility}
          />
          {formErrors.password && (
            <div className="error-text">{formErrors.password}</div>
          )}
        </div>

        {/* Add reCAPTCHA component */}
        <ReCAPTCHA
          ref={recaptchaRef}
          sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY} // Load site key from .env
          onChange={handleRecaptchaChange}
          onExpired={() => {
            setRecaptchaToken(null);
            setFormErrors((prev) => ({
              ...prev,
              recaptcha: "reCAPTCHA expired, please verify again",
            }));
          }}
          onError={() => {
            setRecaptchaToken(null);
            setFormErrors((prev) => ({
              ...prev,
              recaptcha: "reCAPTCHA error, please try again",
            }));
          }}
        />

        {formErrors.recaptcha && (
          <div className="error-text">{formErrors.recaptcha}</div>
        )}

        <button
          type="submit"
          className="submit-button"
          disabled={isLoading}
        >
          {isLoading ? <Loader /> : "Login"}
        </button>

        <div className="alternate-action">
          Don't have an account? <a href="/signup">Sign up</a>
        </div>

        {popup.show && (
          <div className={`popup ${popup.type} show`}>{popup.message}</div>
        )}
      </form>
    </div>
  );
}

export default Login;