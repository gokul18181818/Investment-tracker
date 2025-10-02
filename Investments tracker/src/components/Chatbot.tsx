import React, { useState } from 'react';
import './Chatbot.css';
import { getAiResponse } from '../utils/ai';
import { Contribution } from '../utils/parsePaystub';
import { PaystubRecord } from '../types';

interface Message {
  text: string;
  sender: 'user' | 'bot';
}

interface ChatbotProps {
  onClose: () => void;
  entries: Contribution[];
  paystubs: PaystubRecord[];
}

export default function Chatbot({ onClose, entries, paystubs }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'bot', text: "Hello! Ask me anything about your financial data." }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isThinking) return;

    const userMessage: Message = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsThinking(true);

    try {
      const botResponseText = await getAiResponse(entries, paystubs, input);
      const botMessage: Message = { sender: 'bot', text: botResponseText };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: Message = { sender: 'bot', text: "Sorry, something went wrong." };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="chatbot-container">
      <div className="chatbot-header">
        <h2>AI Financial Assistant</h2>
        <button onClick={onClose} className="close-btn">&times;</button>
      </div>
      <div className="chatbot-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.sender}`}>
            <p>{msg.text}</p>
          </div>
        ))}
        {isThinking && <div className="message bot"><p>Thinking...</p></div>}
      </div>
      <div className="chatbot-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about your total compensation..."
          disabled={isThinking}
        />
        <button onClick={handleSend} disabled={isThinking}>Send</button>
      </div>
    </div>
  );
} 