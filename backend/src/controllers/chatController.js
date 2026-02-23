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
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'https://darsgah-rag-epbjg9dka5hmexaj.uaenorth-01.azurewebsites.net/api/ask';
    let aiAnswer;

    try {
      const aiResponse = await axios.post(aiServiceUrl, { question: message });
      aiAnswer = aiResponse.data.answer;
      if (!aiAnswer) {
        throw new Error('AI service did not return a valid answer.');
      }
    } catch (aiError) {
      return res.status(502).json({ success: false, message: 'The AI service is currently unavailable. Please try again later.' });
    }

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
    }

    chatSession.messages.push({ sender: 'user', text: message });
    chatSession.messages.push({ sender: 'ai', text: aiAnswer });
    
    await chatSession.save();

    res.status(200).json({
      success: true,
      answer: aiAnswer,
      chatId: chatSession._id,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Your request could not be saved.' });
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