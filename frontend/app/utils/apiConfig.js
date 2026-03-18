/**
 * API Configuration
 */

// 1. Progress, Submission & History Host (amcdeb...)
// This maps to EXPO_PUBLIC_API_BASE_URL in your .env
export const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

// 2. AI & RAG Host (rag-epbjg...)
// This maps to EXPO_PUBLIC_API_AI_BASE_URL in your .env
export const AI_BASE_URL = process.env.EXPO_PUBLIC_API_AI_BASE_URL || 'http://localhost:5000/api';

// 3. Specific Endpoints
// Uses AI_BASE_URL (rag-epbjg)
export const AI_GENERATE_TEST_URL = `${AI_BASE_URL}/generate-test`;

// Uses BASE_URL (amcdeb) for submission, progress, dashboard, and history
export const AI_SUBMIT_TEST_URL = `${BASE_URL}/tests`;
export const AI_DASHBOARD_URL = `${BASE_URL}/tests/dashboard`;
export const AI_PROGRESS_URL = `${BASE_URL}/progress`;
export const AI_TEST_HISTORY_URL = `${BASE_URL}/tests/history`;

console.log('🔧 [API CONFIG] Base Host (amcdeb):', BASE_URL);
console.log('🤖 [API CONFIG] AI RAG Host (rag-epbjg):', AI_BASE_URL);
console.log('📜 [API CONFIG] AI Generate URL:', AI_GENERATE_TEST_URL);
