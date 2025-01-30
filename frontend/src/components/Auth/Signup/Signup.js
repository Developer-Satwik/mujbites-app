import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import ReCAPTCHA from "react-google-recaptcha";
import "./Signup.css";
import Loader from "../../Loader/Loader";
import WhatsappAuth from "../../Whatsapp/WhatsappAuth";

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
  const [isOTPSent, setIsOTPSent] = useState(false);
  const [isOTPVerified, setIsOTPVerified] = useState(false);
  const recaptchaRef = useRef(null);
  const navigate = useNavigate();

  // Get the backend URL from environment variables
  const backendUrl = process.env.REACT_APP_BACKEND_URL;

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

  const handleSendOTP = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Send OTP to the user's WhatsApp
      const response = await fetch(`${backendUrl}/api/users/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mobileNumber }),
      });

      if (!response.ok) {
        throw new Error("Failed to send OTP. Please try again.");
      }

      setIsOTPSent(true); // Set OTP sent state to true
      showPopup("OTP sent to your WhatsApp. Please verify.", "success");
    } catch (error) {
      console.error("Failed to send OTP:", error);
      showPopup(error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPVerification = async (otp) => {
    setIsLoading(true);

    try {
      // Verify the OTP
      const response = await fetch(`${backendUrl}/api/users/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mobileNumber, otp }),
      });

      if (!response.ok) {
        throw new Error("Invalid OTP. Please try again.");
      }

      setIsOTPVerified(true); // Set OTP verified state to true
      showPopup("OTP verified successfully!", "success");

      // Proceed with signup
      const signupResponse = await fetch(`${backendUrl}/api/users/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: name,
          mobileNumber,
          password,
          recaptchaToken,
        }),
      });

      if (!signupResponse.ok) {
        throw new Error("Signup failed. Please try again.");
      }

      const data = await signupResponse.json();
      if (data.token && data.user) {
        // Store user data in localStorage
        localStorage.setItem("userToken", data.token);
        localStorage.setItem("userRole", data.user.role);
        localStorage.setItem("userId", data.user._id);

        // Trigger onSignup callback with user data and token
        onSignup(data.user, data.token);

        // Redirect to home page
        navigate("/");
      }
    } catch (error) {
      console.error("Failed to verify OTP:", error);
      showPopup(error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="signup-container">
      {!isOTPSent ? (
        <form className="signup-form" onSubmit={(e) => e.preventDefault()}>
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
              <a
                href="https://archive.org/details/termsandconditions_202501"
                target="_blank"
                rel="noopener noreferrer"
              >
                terms and conditions
              </a>
            </label>
          </div>

          <button
            type="button"
            onClick={handleSendOTP}
            disabled={isLoading}
            className={`signup-button ${isLoading ? "loading" : ""}`}
          >
            {isLoading ? <Loader /> : "Send OTP"}
          </button>

          <div className="signin-link">
            Already a member? <Link to="/login">Sign in</Link>
          </div>

          {popup.show && <div className={`popup ${popup.type}`}>{popup.message}</div>}
        </form>
      ) : (
        <WhatsappAuth
          mobileNumber={mobileNumber}
          onOTPVerified={handleOTPVerification}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}

export default Signup;