export const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

// AI Service Base URL (RAG)
// Replace with ngrok URL if testing locally with teammate
export const AI_BASE_URL = 'https://darsgah-rag-epbjg9dka5hmexaj.uaenorth-01.azurewebsites.net/api';

console.log('🔧 [API CONFIG] BASE_URL loaded:', BASE_URL);
console.log('🤖 [API CONFIG] AI_BASE_URL loaded:', AI_BASE_URL);
