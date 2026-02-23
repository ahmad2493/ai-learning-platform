/**
 * Chat Routes - API Endpoint Definitions for Chat
 * Author: Momina (BCSF22M021)
 */
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticateToken } = require('../middleware/auth');

// Endpoint for sending a message
router.post('/send', authenticateToken, chatController.sendMessage);

// Endpoint for fetching the list of all chat sessions for the user
router.get('/history', authenticateToken, chatController.getChatHistory);

// Endpoint for fetching a single, complete chat session with all its messages
router.get('/:chatId', authenticateToken, chatController.getChatSession);

// Endpoint to delete a chat session
router.delete('/:chatId', authenticateToken, chatController.deleteChatSession);

module.exports = router;
