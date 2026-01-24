/**
 * API Request Utility
 * Author: Momna Butt (BCSF22M021)
 * 
 * Functionality:
 * - Centralized API request handler for frontend
 * - Manages HTTP requests to backend API
 * - Handles request headers and configuration
 * - Returns response and parsed JSON data
 */

import { BASE_URL } from './apiConfig';

export const apiRequest = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      ...options.headers,
    },
  });

  const data = await response.json();
  return { response, data };
};
