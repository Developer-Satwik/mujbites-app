import React, { useState, useEffect } from 'react';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { initializeApp } from 'firebase/app';

// Firebase configuration component
const firebaseConfig = {
  // Add your Firebase config here
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
initializeApp(firebaseConfig);

const PhoneAuth = ({ onSuccessfulAuth }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    // Initialize reCAPTCHA verifier
    const auth = getAuth();
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'normal',
      'callback': (response) => {
        // reCAPTCHA solved
        console.log('reCAPTCHA solved');
      },
      'expired-callback': () => {
        // Reset reCAPTCHA
        setError('reCAPTCHA expired. Please solve it again.');
        window.recaptchaVerifier.render().then(widgetId => {
          grecaptcha.reset(widgetId);
        });
      }
    });
  }, []);

  const handleSendCode = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const auth = getAuth();
      const formattedNumber = `+91${phoneNumber}`; // Adjust country code as needed
      const appVerifier = window.recaptchaVerifier;
      
      const confirmationResult = await signInWithPhoneNumber(auth, formattedNumber, appVerifier);
      setVerificationId(confirmationResult.verificationId);
      window.confirmationResult = confirmationResult;
      
    } catch (error) {
      console.error('Error sending code:', error);
      setError(error.message);
      // Reset reCAPTCHA
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.render().then(widgetId => {
          grecaptcha.reset(widgetId);
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await window.confirmationResult.confirm(verificationCode);
      const user = result.user;
      
      // Call the parent component's callback with the authenticated user
      onSuccessfulAuth(user);
      
    } catch (error) {
      console.error('Error verifying code:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={verificationId ? handleVerifyCode : handleSendCode}>
        {!verificationId ? (
          <>
            <div className="input__container input__container--phone">
              <input
                type="tel"
                className="input__search"
                placeholder="Enter your phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                disabled={isLoading}
                pattern="[0-9]{10}"
                maxLength="10"
              />
              <div className="shadow__input"></div>
            </div>
            
            <div id="recaptcha-container"></div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="login-button"
            >
              {isLoading ? "Sending code..." : "Send Verification Code"}
            </button>
          </>
        ) : (
          <>
            <div className="input__container input__container--code">
              <input
                type="text"
                className="input__search"
                placeholder="Enter verification code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                required
                disabled={isLoading}
              />
              <div className="shadow__input"></div>
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="login-button"
            >
              {isLoading ? "Verifying..." : "Verify Code"}
            </button>
          </>
        )}
        
        {error && <div className="error-message">{error}</div>}
      </form>
    </div>
  );
};

export default PhoneAuth;