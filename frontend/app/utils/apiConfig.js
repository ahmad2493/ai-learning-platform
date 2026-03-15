/**
 * API Configuration
 * Author: Momina (BCSF22M021)
 * 
 * Instructions:
 * - Local Node.js Backend usually runs on port 5000
 * - AI Service (RAG) usually runs on a separate Azure URL or port 8000
 */

// Expo uses EXPO_PUBLIC_ prefix for env variables to be bundled into the app
export const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

// AI Service Base URL (RAG)
export const AI_BASE_URL = process.env.EXPO_PUBLIC_AI_BASE_URL || 'https://darsgah-rag-epbjg9dka5hmexaj.uaenorth-01.azurewebsites.net/api';

console.log('🔧 [API CONFIG] Node Backend BASE_URL:', BASE_URL);
console.log('🤖 [API CONFIG] AI Service BASE_URL:', AI_BASE_URL);
