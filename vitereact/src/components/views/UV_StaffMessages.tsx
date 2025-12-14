import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { Send, Filter, MessageSquare, AlertCircle, ChevronLeft } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface MessageThread {
  id: string;
  quote_id: string | null;
  order_id: string | null;
  customer_name: string;
  order_number: string;
  last_message_preview: string;
  last_message_timestamp: string;
  unread_count: number;
  created_at: string;
}

interface ThreadMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

interface SendMessagePayload {
  body: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchMessageThreads = async (token: string): Promise<MessageThread[]> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/message-threads`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  // Transform response to match expected structure
  return response.data.threads?.map((thread: any) => ({
    id: thread.id,
    quote_id: thread.quote_id || null,
    order_id: thread.order_id || null,
    customer_name: thread.customer_name || 'Unknown Customer',
    order_number: thread.order_number || 'N/A',
    last_message_preview: thread.last_message?.body?.substring(0, 100) || '',
    last_message_timestamp: thread.last_message?.created_at || thread.created_at,
    unread_count: thread.unread_count || 0,
    created_at: thread.created_at,
  })) || [];
};

const fetchThreadMessages = async (
  token: string,
  threadId: string
): Promise<ThreadMessage[]> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/message-threads/${threadId}/messages`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        limit: 100,
        sort_order: 'asc',
      },
    }
  );

  return response.data.messages?.map((message: any) => ({
    id: message.id,
    sender_id: message.sender_id,
    sender_name: message.sender_name || 'Unknown',
    sender_role: message.sender_role || 'USER',
    body: message.body,
    is_read: message.is_read,
    created_at: message.created_at,
  })) || [];
};

const sendMessage = async (
  token: string,
  threadId: string,
  payload: SendMessagePayload
): Promise<ThreadMessage> => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/message-threads/${threadId}/messages`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
};

const markMessagesAsRead = async (
  token: string,
  messageIds: string[]
): Promise<void> => {
  await Promise.all(
    messageIds.map((id) =>
      axios.put(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/messages/${id}`,
        { is_read: true },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )
    )
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_StaffMessages: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Individual Zustand selectors (CRITICAL: no object destructuring)
  const currentUser = useAppStore((state) => state.authentication_state.current_user);
  const authToken = useAppStore((state) => state.authentication_state.auth_token);

  // Local state
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(
    searchParams.get('thread_id')
  );
  const [newMessageText, setNewMessageText] = useState<string>('');
  const [unreadFilterActive, setUnreadFilterActive] = useState<boolean>(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [showMobileConversation, setShowMobileConversation] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Query: Fetch message threads
  const {
    data: messageThreads = [],
    isLoading: isLoadingThreads,
    error: threadsError,
  } = useQuery({
    queryKey: ['message-threads'],
    queryFn: () => fetchMessageThreads(authToken || ''),
    enabled: !!authToken,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 30000, // Refetch every 30 seconds for new messages
  });

  // Query: Fetch messages for selected thread
  const {
    data: threadMessages = [],
    isLoading: isLoadingMessages,
    error: messagesError,
  } = useQuery({
    queryKey: ['messages', selectedThreadId],
    queryFn: () => fetchThreadMessages(authToken || '', selectedThreadId || ''),
    enabled: !!authToken && !!selectedThreadId,
    staleTime: 60 * 1000,
  });

  // Mutation: Send message
  const sendMessageMutation = useMutation({
    mutationFn: (payload: SendMessagePayload) =>
      sendMessage(authToken || '', selectedThreadId || '', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedThreadId] });
      queryClient.invalidateQueries({ queryKey: ['message-threads'] });
      setNewMessageText('');
      setNotification({
        type: 'success',
        message: 'Message sent successfully',
      });
      setTimeout(() => setNotification(null), 3000);
    },
    onError: (error: any) => {
      setNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to send message',
      });
      setTimeout(() => setNotification(null), 5000);
    },
  });

  // Filter threads by unread status
  const filteredThreads = unreadFilterActive
    ? messageThreads.filter((thread) => thread.unread_count > 0)
    : messageThreads;

  // Get selected thread data
  const selectedThread = messageThreads.find((t) => t.id === selectedThreadId);

  // Auto-scroll to bottom when new messages appear
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [threadMessages]);

  // Mark messages as read when viewing thread
  useEffect(() => {
    if (selectedThreadId && threadMessages.length > 0) {
      const unreadMessageIds = threadMessages
        .filter((msg) => !msg.is_read && msg.sender_id !== currentUser?.id)
        .map((msg) => msg.id);

      if (unreadMessageIds.length > 0 && authToken) {
        markMessagesAsRead(authToken, unreadMessageIds)
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ['message-threads'] });
          })
          .catch((error) => {
            console.error('Failed to mark messages as read:', error);
          });
      }
    }
  }, [selectedThreadId, threadMessages, authToken, currentUser?.id, queryClient]);

  // Handle thread selection
  const handleSelectThread = (threadId: string) => {
    setSelectedThreadId(threadId);
    setShowMobileConversation(true);
  };

  // Handle send message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessageText.trim() && selectedThreadId) {
      sendMessageMutation.mutate({ body: newMessageText.trim() });
    }
  };

  // Handle navigate to job
  const handleNavigateToJob = () => {
    if (selectedThread?.order_id) {
      navigate(`/staff/jobs/${selectedThread.order_id}`);
    }
  };

  // Handle back to threads (mobile)
  const handleBackToThreads = () => {
    setShowMobileConversation(false);
    setSelectedThreadId(null);
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMins = Math.floor(diffInMs / (1000 * 60));
      return `${diffInMins}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Format message timestamp
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg transition-all duration-300 ${
            notification.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Main Container */}
      <div className="flex flex-col h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-black" />
              <h1 className="text-2xl font-bold text-black">Messages</h1>
            </div>
            <button
              onClick={() => setUnreadFilterActive(!unreadFilterActive)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                unreadFilterActive
                  ? 'bg-yellow-400 text-black'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">
                {unreadFilterActive ? 'Show All' : 'Unread Only'}
              </span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Threads List - Desktop always visible, Mobile conditional */}
          <div
            className={`w-full lg:w-96 bg-white border-r border-gray-200 flex flex-col ${
              showMobileConversation ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* Threads Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-black">
                Conversations ({filteredThreads.length})
              </h2>
            </div>

            {/* Threads List */}
            <div className="flex-1 overflow-y-auto">
              {isLoadingThreads ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-yellow-400"></div>
                </div>
              ) : threadsError ? (
                <div className="flex flex-col items-center justify-center h-64 px-6">
                  <AlertCircle className="w-12 h-12 text-red-600 mb-4" />
                  <p className="text-red-600 text-center">Failed to load conversations</p>
                </div>
              ) : filteredThreads.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 px-6">
                  <MessageSquare className="w-12 h-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 text-center">
                    {unreadFilterActive
                      ? 'No unread conversations'
                      : 'No conversations yet'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredThreads.map((thread) => (
                    <button
                      key={thread.id}
                      onClick={() => handleSelectThread(thread.id)}
                      className={`w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors ${
                        selectedThreadId === thread.id ? 'bg-gray-100' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-black truncate">
                            {thread.customer_name}
                          </p>
                          <p className="text-sm text-gray-600">
                            Order: {thread.order_number}
                          </p>
                        </div>
                        {thread.unread_count > 0 && (
                          <span className="ml-2 flex-shrink-0 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-full">
                            {thread.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate mb-1">
                        {thread.last_message_preview || 'No messages yet'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTimestamp(thread.last_message_timestamp)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Conversation Panel - Desktop always visible, Mobile conditional */}
          <div
            className={`flex-1 flex flex-col bg-white ${
              !showMobileConversation ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {!selectedThreadId ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">
                    Select a conversation to view messages
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Conversation Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleBackToThreads}
                      className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-700" />
                    </button>
                    <div>
                      <h2 className="text-lg font-semibold text-black">
                        {selectedThread?.customer_name || 'Unknown Customer'}
                      </h2>
                      <p className="text-sm text-gray-600">
                        Order: {selectedThread?.order_number || 'N/A'}
                      </p>
                    </div>
                  </div>
                  {selectedThread?.order_id && (
                    <button
                      onClick={handleNavigateToJob}
                      className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm"
                    >
                      View Job
                    </button>
                  )}
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  {isLoadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-yellow-400"></div>
                    </div>
                  ) : messagesError ? (
                    <div className="flex flex-col items-center justify-center h-full">
                      <AlertCircle className="w-12 h-12 text-red-600 mb-4" />
                      <p className="text-red-600 text-center">Failed to load messages</p>
                    </div>
                  ) : threadMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-600">No messages in this conversation</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {threadMessages.map((message) => {
                        const isOwnMessage = message.sender_id === currentUser?.id;
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg px-4 py-3 ${
                                isOwnMessage
                                  ? 'bg-black text-white'
                                  : 'bg-gray-100 text-gray-900'
                              }`}
                            >
                              <div className="flex items-baseline gap-2 mb-1">
                                <p
                                  className={`text-sm font-semibold ${
                                    isOwnMessage ? 'text-yellow-400' : 'text-black'
                                  }`}
                                >
                                  {message.sender_name}
                                </p>
                                <p
                                  className={`text-xs ${
                                    isOwnMessage ? 'text-gray-400' : 'text-gray-600'
                                  }`}
                                >
                                  {formatMessageTime(message.created_at)}
                                </p>
                              </div>
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {message.body}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Message Compose */}
                <div className="px-6 py-4 border-t border-gray-200">
                  <form onSubmit={handleSendMessage} className="flex gap-3">
                    <input
                      type="text"
                      value={newMessageText}
                      onChange={(e) => setNewMessageText(e.target.value)}
                      placeholder="Type your message..."
                      disabled={sendMessageMutation.isPending}
                      className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-black focus:ring-4 focus:ring-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                      type="submit"
                      disabled={
                        !newMessageText.trim() || sendMessageMutation.isPending
                      }
                      className="px-6 py-3 bg-yellow-400 text-black rounded-lg font-semibold hover:bg-yellow-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {sendMessageMutation.isPending ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black"></div>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          <span className="hidden sm:inline">Send</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_StaffMessages;