import React, { useState, useEffect } from "react";
import "./App.css";

const API_BASE_URL = "https://upigpay.onrender.com";

function App() {
  const [amount, setAmount] = useState("100");
  const [orderId, setOrderId] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("idle");
  const [transactionId, setTransactionId] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isGpayReady, setIsGpayReady] = useState(false);
  const [paymentsClient, setPaymentsClient] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    setOrderId(
      `ORD_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    );
  }, []);

  // ✅ Auto-redirect timer
  useEffect(() => {
    if (paymentStatus === "success" && showReceipt) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            resetPayment();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [paymentStatus, showReceipt]);

  useEffect(() => {
    if (window.google && window.google.payments) {
      console.log("Google Pay already loaded");
      initGooglePay();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://pay.google.com/gp/p/js/pay.js";
    script.async = true;
    script.onload = () => {
      console.log("Google Pay script loaded");
      setTimeout(initGooglePay, 500);
    };
    script.onerror = () => {
      setError("Failed to load Google Pay script");
    };
    document.body.appendChild(script);

    return () => {
      const scriptTag = document.querySelector(
        'script[src="https://pay.google.com/gp/p/js/pay.js"]',
      );
      if (scriptTag) document.body.removeChild(scriptTag);
    };
  }, []);

  const initGooglePay = () => {
    try {
      if (!window.google?.payments?.api) {
        setError("Google Pay API not available");
        return;
      }

      console.log("Initializing Google Pay client...");

      const client = new window.google.payments.api.PaymentsClient({
        environment: "TEST",
      });

      setPaymentsClient(client);

      const isReadyToPayRequest = {
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: [
          {
            type: "CARD",
            parameters: {
              allowedAuthMethods: ["PAN_ONLY", "CRYPTOGRAM_3DS"],
              allowedCardNetworks: ["MASTERCARD", "VISA"],
            },
          },
        ],
      };

      client
        .isReadyToPay(isReadyToPayRequest)
        .then((response) => {
          console.log("isReadyToPay response:", response);
          if (response.result) {
            setIsGpayReady(true);
            console.log("✅ Google Pay is ready");
          } else {
            setError("Google Pay is not available on this device");
          }
        })
        .catch((err) => {
          console.error("isReadyToPay error:", err);
          setError("Google Pay check failed");
        });
    } catch (err) {
      console.error("Init error:", err);
      setError("Failed to initialize Google Pay");
    }
  };

  const handlePayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (!paymentsClient) {
      setError("Google Pay not initialized");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/create-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          orderId: orderId,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Payment creation failed");
      }

      setTransactionId(data.transactionId);

      const paymentRequest = {
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: [
          {
            type: "CARD",
            parameters: {
              allowedAuthMethods: ["PAN_ONLY", "CRYPTOGRAM_3DS"],
              allowedCardNetworks: ["MASTERCARD", "VISA"],
            },
            tokenizationSpecification: {
              type: "PAYMENT_GATEWAY",
              parameters: {
                gateway: "example",
                "gateway:merchantId": "exampleMerchantId",
              },
            },
          },
        ],
        merchantInfo: {
          merchantId: data.merchantId || "01234567890123456789",
          merchantName: "Test Store",
        },
        transactionInfo: {
          totalPriceStatus: "FINAL",
          totalPrice: data.amount.toString(),
          currencyCode: "INR",
          countryCode: "IN",
        },
      };

      console.log("📤 Payment Request:", paymentRequest);

      paymentsClient
        .loadPaymentData(paymentRequest)
        .then((paymentData) => {
          console.log("✅ Payment Data:", paymentData);

          return fetch(`${API_BASE_URL}/api/verify-payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              transactionId: data.transactionId,
              paymentData: paymentData,
            }),
          });
        })
        .then((response) => response.json())
        .then((result) => {
          if (result.success) {
            setReceipt(result.receipt);
            setPaymentStatus("success");
            setShowReceipt(true);
            setCountdown(5);
          } else {
            throw new Error(result.message || "Verification failed");
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error("Payment error:", err);
          if (err.statusCode === "CANCELED") {
            setError("Payment was cancelled");
          } else {
            setError(err.message || "Payment failed");
          }
          setPaymentStatus("failed");
          setLoading(false);
        });
    } catch (err) {
      console.error("Error:", err);
      setError(err.message || "Payment initiation failed");
      setPaymentStatus("failed");
      setLoading(false);
    }
  };

  const resetPayment = () => {
    setPaymentStatus("idle");
    setTransactionId("");
    setReceipt(null);
    setError("");
    setShowReceipt(false);
    setCountdown(5);
    setOrderId(
      `ORD_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    );
  };

  // ✅ Home Page / Idle Screen
  const renderHome = () => (
    <div className="payment-container">
      <div className="header">
        <div className="logo">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="2"
              y="6"
              width="20"
              height="12"
              rx="2"
              stroke="#667eea"
              strokeWidth="2"
            />
            <path
              d="M8 10H16"
              stroke="#667eea"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M10 14H14"
              stroke="#667eea"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <h1>Pay with GPay</h1>
        </div>
        <span className="badge">Sandbox</span>
      </div>

      <p className="subtitle">Test your Google Pay integration</p>

      <div className="amount-display">
        <span className="currency">₹</span>
        <span className="amount-value">{amount || "0"}</span>
      </div>

      <div className="form-group">
        <label className="form-label">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          Amount (₹)
        </label>
        <input
          type="number"
          placeholder="Enter amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="input-field"
        />
      </div>

      <div className="form-group">
        <label className="form-label">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Order ID
        </label>
        <input
          type="text"
          value={orderId}
          disabled
          className="input-field disabled"
        />
      </div>

      {isGpayReady ? (
        <button
          className="gpay-button"
          onClick={handlePayment}
          disabled={loading}
        >
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
              Processing...
            </div>
          ) : (
            <>
              <img
                src="https://pay.google.com/gp/p/gp_g.svg"
                alt="GPay"
                className="gpay-logo"
              />
              Pay with Google Pay
            </>
          )}
        </button>
      ) : (
        <div className="loading-state">
          <div className="spinner"></div>
          <span>Loading Google Pay...</span>
        </div>
      )}

      {error && (
        <div className="error-message">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      <div className="test-info">
        <div className="test-info-header">
          <span className="test-icon">🔬</span>
          <span>Sandbox Testing</span>
        </div>
        <ul className="test-info-list">
          <li>No real money will be deducted</li>
          <li>Test cards appear in GPay sheet</li>
          <li>
            Use: <span className="code">4111 1111 1111 1111</span>
          </li>
          <li>Works on desktop & mobile</li>
        </ul>
      </div>
    </div>
  );

  // ✅ Success Screen with Auto-Redirect
  const renderSuccess = () => (
    <div className="success-container">
      <div className="success-icon-wrapper">
        <div className="success-icon">✓</div>
      </div>
      <h2>Payment Successful!</h2>
      <p className="success-subtitle">Your transaction has been completed</p>

      <div className="receipt">
        <h3>Transaction Receipt</h3>
        <div className="receipt-item">
          <span className="receipt-label">Transaction ID</span>
          <span className="receipt-value">{receipt?.transactionId}</span>
        </div>
        <div className="receipt-item">
          <span className="receipt-label">Order ID</span>
          <span className="receipt-value">{receipt?.orderId}</span>
        </div>
        <div className="receipt-item">
          <span className="receipt-label">Amount</span>
          <span className="receipt-value amount-highlight">
            ₹{receipt?.amount}
          </span>
        </div>
        <div className="receipt-item">
          <span className="receipt-label">Status</span>
          <span className="receipt-value status-success">
            {receipt?.status}
          </span>
        </div>
        <div className="receipt-item">
          <span className="receipt-label">Reference ID</span>
          <span className="receipt-value">{receipt?.referenceId}</span>
        </div>
        <div className="receipt-item">
          <span className="receipt-label">Date</span>
          <span className="receipt-value">
            {new Date(receipt?.date).toLocaleString()}
          </span>
        </div>
        <div className="receipt-item">
          <span className="receipt-label">Payment Method</span>
          <span className="receipt-value">{receipt?.paymentMethod}</span>
        </div>
      </div>

      <div className="auto-redirect">
        <p>
          Redirecting to home in <strong>{countdown}</strong> seconds...
        </p>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${(countdown / 5) * 100}%` }}
          ></div>
        </div>
      </div>

      <button className="reset-button" onClick={resetPayment}>
        Return to Home Now
      </button>
    </div>
  );

  const renderFailure = () => (
    <div className="failure-container">
      <div className="failure-icon-wrapper">
        <div className="failure-icon">✕</div>
      </div>
      <h2>Payment Failed</h2>
      <p className="failure-subtitle">
        {error || "An error occurred during payment"}
      </p>
      <button className="reset-button" onClick={resetPayment}>
        Try Again
      </button>
    </div>
  );

  return (
    <div className="app">
      {paymentStatus === "idle" && renderHome()}
      {paymentStatus === "success" && renderSuccess()}
      {paymentStatus === "failed" && renderFailure()}
    </div>
  );
}

export default App;
