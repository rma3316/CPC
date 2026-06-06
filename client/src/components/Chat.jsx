import { useState, useRef, useEffect } from 'react';

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
    <div className="flex flex-col h-full bg-white/20 backdrop-blur-md border border-white/40 rounded-2xl p-4 shadow-lg">
      <div className="mb-3 border-b border-sky-100/50 pb-2">
        <span className="font-headline font-bold text-sky-900 flex items-center gap-2">
          <span className="material-symbols-outlined text-sky-500" style={{ fontVariationSettings: "'FILL' 1" }}>forum</span>
          채팅
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto mb-3 pr-2 flex flex-col gap-2 custom-scrollbar">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col max-w-[85%] ${msg.playerId === myId ? 'self-end items-end' : 'self-start items-start'}`}
          >
            <span className="text-[10px] font-bold text-sky-700/70 mb-0.5 px-1">{msg.nickname}</span>
            <div className={`px-3 py-2 rounded-2xl text-sm shadow-sm ${msg.playerId === myId ? 'bg-sky-500 text-white rounded-tr-sm' : 'bg-white/60 text-sky-900 border border-sky-100/50 rounded-tl-sm'}`}>
              {msg.message}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <form className="flex gap-2 shrink-0 mt-auto" onSubmit={handleSubmit}>
        <input
          id="chat-input"
          className="flex-1 glass-input h-10 px-3 rounded-xl text-sm placeholder:text-sky-700/50"
          type="text"
          placeholder="메시지 입력..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={200}
        />
        <button id="chat-send" className="glass-button !w-12 h-10 rounded-xl flex items-center justify-center p-0" type="submit" aria-label="전송">
          <span className="material-symbols-outlined text-lg">send</span>
        </button>
      </form>
    </div>
  );
}
