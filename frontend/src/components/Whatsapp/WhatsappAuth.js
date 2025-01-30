import React, { useState } from "react";
import "./WhatsappAuth.css"; // Optional: Add styling

function WhatsappAuth({ mobileNumber, onOTPVerified, isLoading }) {
  const [otp, setOtp] = useState("");

  const handleVerifyOTP = () => {
    if (otp.length === 6) {
      onOTPVerified(otp);
    }
  };

  return (
    <div className="whatsapp-auth-container">
      <h2>Verify OTP</h2>
      <p>Enter the 6-digit OTP sent to your WhatsApp.</p>
      <div className="input-container">
        <input
          type="text"
          placeholder="Enter OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          maxLength="6"
        />
        <button onClick={handleVerifyOTP} disabled={isLoading}>
          {isLoading ? "Verifying..." : "Verify OTP"}
        </button>
      </div>
    </div>
  );
}

export default WhatsappAuth;