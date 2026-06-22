import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

const API_BASE_URL = "https://upigpay.onrender.com";

function App() {
  const [paymentStatus, setPaymentStatus] = useState("idle");
  const [transactionId, setTransactionId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isGpayAvailable, setIsGpayAvailable] = useState(true);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/razorpay.js";
    script.async = true;

    script.onload = () => {
      console.log("Razorpay script loaded");
      if (window.Razorpay) {
        const tempRazorpay = new window.Razorpay({
          key: "rzp_test_T4lGicSBURlT2o",
        });
        tempRazorpay
          .checkPaymentAdapter("gpay")
          .then(() => {
            console.log("GPay is available");
            setIsGpayAvailable(true);
          })
          .catch(() => {
            console.log("GPay not available");
            setIsGpayAvailable(false);
          });
      }
    };

    script.onerror = () => {
      setError("Failed to load Razorpay");
    };

    document.body.appendChild(script);

    return () => {
      const scriptTag = document.querySelector(
        'script[src="https://checkout.razorpay.com/v1/razorpay.js"]'
      );
      if (scriptTag) {
        document.body.removeChild(scriptTag);
      }
    };
  }, []);

  const handleGpayPayment = async () => {
    setLoading(true);
    setError("");

    try {
      const { data: orderData } = await axios.post(
        `${API_BASE_URL}/api/create-order`,
        {
          amount: 1000,
          currency: "INR",
        }
      );

      if (!orderData.success) {
        throw new Error(orderData.message || "Order creation failed");
      }

      const options = {
        key: "rzp_test_T4lGicSBURlT2o",
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.orderId,
        name: "Your Store",
        description: "Test Transaction",
        prefill: {
          contact: "9123456780",
          email: "test@example.com",
        },
        notes: {
          method: "upi",
          upi_provider: "google_pay",
        },
        theme: {
          color: "#F37254",
        },
        handler: async (response) => {
          console.log("Payment success:", response);

          try {
            const verifyResponse = await axios.post(
              `${API_BASE_URL}/api/verify-payment`,
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }
            );

            if (verifyResponse.data.success) {
              setTransactionId(response.razorpay_payment_id);
              setPaymentStatus("success");
            } else {
              throw new Error(verifyResponse.data.message || "Verification failed");
            }
          } catch (err) {
            console.error("Verification error:", err);
            setError(err.message || "Payment verification failed");
            setPaymentStatus("failed");
          }
          setLoading(false);
        },
        modal: {
          ondismiss: () => {
            setError("Payment cancelled");
            setPaymentStatus("failed");
            setLoading(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (err) {
      console.error("Payment initiation error:", err);
      setError(err.message || "Payment initiation failed");
      setPaymentStatus("failed");
      setLoading(false);
    }
  };

  // ✅ Define the render functions inside the component
  const renderSuccess = () => (
    <div className="success-container">
      <div className="success-image">
        <svg viewBox="0 0 100 100" className="checkmark">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#4CAF50" strokeWidth="5" />
          <path d="M35 50 L45 60 L65 40" fill="none" stroke="#4CAF50" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2>Payment Successful!</h2>
      <div className="receipt">
        <h3>Transaction Receipt</h3>
        <div className="receipt-row">
          <span>Payment ID:</span>
          <span className="receipt-value">{transactionId}</span>
        </div>
        <div className="receipt-row">
          <span>Amount:</span>
          <span className="receipt-value">₹10.00</span>
        </div>
        <div className="receipt-row">
          <span>Status:</span>
          <span className="receipt-value success-text">Completed</span>
        </div>
        <div className="receipt-row">
          <span>Date:</span>
          <span className="receipt-value">{new Date().toLocaleString()}</span>
        </div>
        <div className="receipt-row">
          <span>Payment Method:</span>
          <span className="receipt-value">Google Pay (UPI)</span>
        </div>
      </div>
      <button className="reset-button" onClick={() => setPaymentStatus("idle")}>
        Make Another Payment
      </button>
    </div>
  );

  const renderFailure = () => (
    <div className="failure-container">
      <div className="failure-icon">✗</div>
      <h2>Payment Failed</h2>
      <p className="error-message">{error || "An error occurred during payment"}</p>
      <button className="reset-button" onClick={() => setPaymentStatus("idle")}>
        Try Again
      </button>
    </div>
  );

  const renderIdle = () => (
    <div className="payment-container">
      <h1>Google Pay Integration</h1>
      <p>Sandbox Mode - TEST Environment</p>
      <div className="payment-details">
        <div className="detail-row">
          <span>Amount:</span>
          <span className="amount">₹10.00</span>
        </div>
        <div className="detail-row">
          <span>Method:</span>
          <span>Google Pay (UPI)</span>
        </div>
      </div>

      {isGpayAvailable ? (
        <button className="gpay-button" onClick={handleGpayPayment} disabled={loading}>
          {loading ? (
            "Processing..."
          ) : (
            <>
              <img src="https://pay.google.com/gp/p/gp_g.svg" alt="GPay" className="gpay-logo" />
              Pay with Google Pay
            </>
          )}
        </button>
      ) : (
        <p className="error-message">Google Pay is not available on this device</p>
      )}

      {error && <p className="error-message">{error}</p>}
      <p className="test-info">
        💡 Test UPI IDs: success@razorpay (success) | failure@razorpay (failure)
      </p>
      <p className="test-info">
        📱 Make sure you're testing on Chrome with Google Pay installed
      </p>
    </div>
  );

  // ✅ Return the JSX with conditionally rendered screens
  return (
    <div className="app">
      {paymentStatus === "idle" && renderIdle()}
      {paymentStatus === "success" && renderSuccess()}
      {paymentStatus === "failed" && renderFailure()}
    </div>
  );
}

export default App;
