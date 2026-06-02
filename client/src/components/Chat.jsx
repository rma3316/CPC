// ============================================================
//  Chat.jsx - 채팅 컴포넌트
//  담당: 개발자 C (UI 컴포넌트 담당)
// ============================================================

import { useState, useRef, useEffect } from 'react';
import './Chat.css';

/**
 * @param {object} props
 * @param {Array<{playerId: string, nickname: string, message: string, timestamp: number}>} props.messages
 * @param {Function} props.onSendMessage
 * @param {string} props.myId - 내 소켓 ID
 * @param {Function} props.onClearChat - 채팅 클리어 핸들러
 */
export default function Chat({ messages, onSendMessage, myId, onClearChat }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const text = input.trim();
    if (text) {
      if ((text === '/clear' || text === '/청소') && onClearChat) {
        onClearChat();
        setInput('');
        return;
      }
      onSendMessage(text);
      setInput('');
    }
  };

  return (
    <div className="chat-container glass-card-sm">
      <div className="chat-header">
        <span className="chat-title">💬 채팅</span>
      </div>
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`chat-message ${msg.playerId === myId ? 'mine' : ''}`}
          >
            <span className="chat-nickname">{msg.nickname}</span>
            <span className="chat-text">{msg.message}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          id="chat-input"
          className="input-neon chat-input"
          type="text"
          placeholder="메시지 입력..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={200}
        />
        <button id="chat-send" className="btn-neon chat-send" type="submit">
          전송
        </button>
      </form>
    </div>
  );
}
