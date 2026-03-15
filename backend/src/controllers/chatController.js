/**
 * chat controller - Chat Operations
 * Author: Momina (BCSF22M021)
 */
const axios = require('axios');
const mongoose = require('mongoose');
const Chat = require('../models/ChatModel');

exports.sendMessage = async (req, res) => {
  const { message, chatId } = req.body;
  const userId = req.user.id;

  if (!message) {
    return res.status(400).json({ success: false, message: 'Message is required.' });
  }

  try {
    // 1. Get or Create Chat Session
    let chatSession;
    if (chatId && mongoose.Types.ObjectId.isValid(chatId)) {
      chatSession = await Chat.findById(chatId);
    }
    
    if (!chatSession) {
      chatSession = new Chat({
        userId: userId,
        title: message.length > 40 ? message.substring(0, 37) + '...' : message,
        messages: [],
      });
      await chatSession.save();
    }

    // 2. Define AI Service URL 
    // If you are running locally, use 'http://127.0.0.1:8000/api/ask'
    // If testing the deployed version, use the Azure URL
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000/api/ask';
    
    let aiTextAnswer = "";
    let aiFigures = [];

    console.log(`[AI-DEBUG] Sending request to: ${aiServiceUrl}`);

    try {
      const aiResponse = await axios.post(aiServiceUrl, { 
        question: message,
        session_id: chatSession._id.toString() 
      }, {
        timeout: 60000 
      });

      // Response format: { "question": "...", "answer": { "answer": "...", "figures": [...] } }
      const data = aiResponse.data;
      
      if (data.answer && data.answer.answer) {
        aiTextAnswer = data.answer.answer;
        aiFigures = data.answer.figures || [];
      } else if (data.error) {
        console.error("[AI-DEBUG] Service returned error:", data.error);
        throw new Error(data.error);
      } else {
        console.error("[AI-DEBUG] Unexpected structure:", JSON.stringify(data));
        throw new Error("Invalid response format from AI service.");
      }
    } catch (aiError) {
      console.error("--- AI CONNECTION ERROR ---");
      if (aiError.code === 'ECONNREFUSED') {
        console.error(`Error: Backend could not connect to Python AI at ${aiServiceUrl}. Ensure uvicorn is running.`);
      } else {
        console.error("Message:", aiError.message);
      }
      
      return res.status(502).json({ 
        success: false, 
        message: 'The AI service is currently unavailable. Please check your AI backend server.' 
      });
    }

    // 3. Save and Respond
    chatSession.messages.push({ sender: 'user', text: message });
    chatSession.messages.push({ 
      sender: 'ai', 
      text: aiTextAnswer,
      figures: aiFigures
    });
    
    await chatSession.save();

    res.status(200).json({
      success: true,
      answer: aiTextAnswer,
      figures: aiFigures,
      chatId: chatSession._id,
    });

  } catch (error) {
    console.error("ChatController Error:", error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

exports.getChatHistory = async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.user.id })
      .sort({ updatedAt: -1 })
      .select('_id title updatedAt');

    res.status(200).json({ success: true, data: chats });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch chat history." });
  }
};

exports.getChatSession = async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      userId: req.user.id,
    });

    if (!chat) {
      return res.status(404).json({ success: false, message: "Chat not found." });
    }

    res.status(200).json({ success: true, data: chat });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch chat session." });
  }
};

exports.deleteChatSession = async (req, res) => {
  try {
    const chat = await Chat.findOneAndDelete({
      _id: req.params.chatId,
      userId: req.user.id,
    });

    if (!chat) {
      return res.status(404).json({ success: false, message: "Chat not found or you don't have permission to delete it." });
    }

    res.status(200).json({ success: true, message: "Chat successfully deleted." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete chat session." });
  }
};