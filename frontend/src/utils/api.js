// src/utils/api.js

const BASE_URL = "http://localhost:8000/api";

export const fetchWithAuth = async (endpoint, options = {}) => {
  // 1. THE FIX: Look for "omnistream_token" instead of "token"
  const token = localStorage.getItem("omnistream_token"); 
  
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // 2. Attach it to the request
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // 3. Handle Expired Tokens (Also updated to clear the correct keys)
  if (response.status === 401) {
    localStorage.removeItem("omnistream_token");
    localStorage.removeItem("omnistream_user");
    window.location.href = "/"; // Send them back to the Auth screen
    throw new Error("Session expired. Please log in again.");
  }

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "API request failed");
  }

  return response.json();
};