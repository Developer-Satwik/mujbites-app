import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import ReCAPTCHA from "react-google-recaptcha";
import "./Signup.css";
import Loader from "../../Loader/Loader";

function Signup({ onSignup }) {
  const [name, setName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [popup, setPopup] = useState({ message: "", type: "", show: false });
  const [recaptchaToken, setRecaptchaToken] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const recaptchaRef = useRef(null);
  const navigate = useNavigate();

  const showPopup = (message, type) => {
    setPopup({ message, type, show: true });
    setTimeout(() => setPopup({ message: "", type: "", show: false }), 3000);
  };

  const handleRecaptchaChange = (token) => {
    setRecaptchaToken(token);
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword((prev) => !prev);
  };

  const validateForm = () => {
    if (!name || !mobileNumber || !password || !confirmPassword) {
      showPopup("All fields are required.", "error");
      return false;
    }

    if (mobileNumber.length !== 10 || !/^\d{10}$/.test(mobileNumber)) {
      showPopup("Mobile number must be 10 digits long.", "error");
      return false;
    }

    if (password.length < 6) {
      showPopup("Password must be at least 6 characters long.", "error");
      return false;
    }

    if (password !== confirmPassword) {
      showPopup("Passwords do not match.", "error");
      return false;
    }

    if (!recaptchaToken) {
      showPopup("Please complete the reCAPTCHA.", "error");
      return false;
    }

    if (!agreeToTerms) {
      showPopup("You must agree to the terms and conditions.", "error");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: name,
          mobileNumber,
          password,
          recaptchaToken, // Include the reCAPTCHA token in the request
        }),
      });

      if (!response.ok) {
        let errorMessage = "Signup failed! Please try again.";
        if (response.status === 400) {
          errorMessage = "Invalid input data.";
        } else if (response.status === 409) {
          errorMessage = "User already exists with this mobile number.";
        } else if (response.status === 500) {
          errorMessage = "Server error. Please try again later.";
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (data.token && data.user) {
        // Store user data in localStorage
        localStorage.setItem('userToken', data.token);
        localStorage.setItem('userRole', data.user.role);
        localStorage.setItem('userId', data.user._id);

        // Trigger onSignup callback with user data and token
        onSignup(data.user, data.token);

        // Redirect to home page
        navigate('/');
      } else {
        showPopup("Invalid response from server", "error");
      }
    } catch (error) {
      console.error("Signup error:", error);
      showPopup(error.message, "error");
    } finally {
      setIsLoading(false);
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
      }
      setRecaptchaToken(null);
    }
  };

  return (
    <div className="signup-container">
      <form className="signup-form" onSubmit={handleSubmit}>
        <div className="signup-header">
          Sign up
          <span>Create your account</span>
        </div>

        <div className="input__container input__container--name">
          <input
            type="text"
            className="input__search"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isLoading}
          />
          <div className="shadow__input"></div>
        </div>

        <div className="input__container input__container--phone">
          <input
            type="tel"
            className="input__search"
            placeholder="Enter your phone number"
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
            required
            disabled={isLoading}
            pattern="[0-9]{10}"
            maxLength="10"
          />
          <div className="shadow__input"></div>
        </div>

        <div className="input__container input__container--password">
          <input
            type={showPassword ? "text" : "password"}
            className="input__search"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            minLength="6"
          />
          <i
            className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"} password-toggle-icon`}
            onClick={togglePasswordVisibility}
          />
          <div className="shadow__input"></div>
        </div>

        <div className="input__container input__container--confirm-password">
          <input
            type={showConfirmPassword ? "text" : "password"}
            className="input__search"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isLoading}
            minLength="6"
          />
          <i
            className={`fas ${showConfirmPassword ? "fa-eye-slash" : "fa-eye"} password-toggle-icon`}
            onClick={toggleConfirmPasswordVisibility}
          />
          <div className="shadow__input"></div>
        </div>

        <ReCAPTCHA
          ref={recaptchaRef}
          sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY}
          onChange={handleRecaptchaChange}
        />

        <div className="terms-checkbox">
          <input
            type="checkbox"
            id="agreeToTerms"
            checked={agreeToTerms}
            onChange={(e) => setAgreeToTerms(e.target.checked)}
            required
          />
          <label htmlFor="agreeToTerms">
            I agree to the{" "}
            <a href="https://archive.org/details/termsandconditions_202501" target="_blank" rel="noopener noreferrer">
              terms and conditions
            </a>
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`signup-button ${isLoading ? "loading" : ""}`}
        >
          {isLoading ? <Loader /> : "Sign Up"}
        </button>

        <div className="signin-link">
          Already a member? <Link to="/login">Sign in</Link>
        </div>

        {popup.show && (
          <div className={`popup ${popup.type}`}>
            {popup.message}
          </div>
        )}
      </form>
    </div>
  );
}

export default Signup;
