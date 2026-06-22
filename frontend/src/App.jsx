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
  const [orderId, setOrderId] = useState("");

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

      setOrderId(orderData.orderId);

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

  // ... rest of your render functions remain the same
  // (renderSuccess, renderFailure, renderIdle)

  return (
    <div className="app">
      {paymentStatus === "idle" && renderIdle()}
      {paymentStatus === "success" && renderSuccess()}
      {paymentStatus === "failed" && renderFailure()}
    </div>
  );
}

export default App;
