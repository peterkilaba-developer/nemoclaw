/**
 * Agent Chat UI Context — NemoC LAW AI
 *
 * React context that manages agent chat state,
 * message history, and sub-agent visibility.
 */

import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { sendAgentMessage, getConversationHistory } from './agentAPI';

const AgentChatContext = createContext(null);

export function AgentChatProvider({ children, firmId, agentId, agentConfig }) {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const [showSubAgents, setShowSubAgents] = useState(false);
  const _abortRef = useRef(null);

  // Load conversation history from Firestore
  const loadHistory = useCallback(async () => {
    if (!firmId || !agentId) return;
    try {
      const history = await getConversationHistory(firmId, agentId, 50);
      setMessages(history.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        subAgentsUsed: m.subAgentsUsed || [],
        timestamp: m.timestamp?.toDate?.() || new Date(),
      })));
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  }, [firmId, agentId]);

  // Send a message to the agent
  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || !firmId || !agentId) return;

    // Add user message to UI immediately
    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);
    setError(null);

    try {
      // Build conversation history for context
      const history = messages.slice(-20).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const result = await sendAgentMessage(firmId, agentId, text, history);

      // Add assistant response
      const assistantMsg = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: result.response,
        subAgentsUsed: result.subAgentsUsed || [],
        auditId: result.auditId,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Agent message failed:', err);
      setError(err.message);
      // Add error message to chat
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'system',
        content: `⚠️ Error: ${err.message}. Please try again.`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsTyping(false);
    }
  }, [firmId, agentId, messages]);

  // Clear conversation
  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const value = {
    messages,
    isTyping,
    error,
    showSubAgents,
    setShowSubAgents,
    sendMessage,
    clearChat,
    loadHistory,
    agentConfig,
  };

  return (
    <AgentChatContext.Provider value={value}>
      {children}
    </AgentChatContext.Provider>
  );
}

export function useAgentChat() {
  const context = useContext(AgentChatContext);
  if (!context) {
    throw new Error('useAgentChat must be used within an AgentChatProvider');
  }
  return context;
}

export default AgentChatContext;
