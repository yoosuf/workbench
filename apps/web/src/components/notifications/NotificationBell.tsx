import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  Bell,
  CheckCheck,
  Info,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  X
} from 'lucide-react';
import {
  LIST_NOTIFICATIONS_QUERY,
  UNREAD_NOTIFICATION_COUNT_QUERY,
  MARK_NOTIFICATION_READ_MUTATION,
  MARK_ALL_NOTIFICATIONS_READ_MUTATION,
} from '../../graphql/notifications';

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Poll unread count every 8 seconds
  const { data: countData, refetch: refetchCount } = useQuery(UNREAD_NOTIFICATION_COUNT_QUERY, {
    pollInterval: 8000,
  });

  const { data: listData, loading, refetch: refetchList } = useQuery(LIST_NOTIFICATIONS_QUERY, {
    skip: !isOpen,
    fetchPolicy: 'network-only',
  });

  const [markRead] = useMutation(MARK_NOTIFICATION_READ_MUTATION);
  const [markAllRead] = useMutation(MARK_ALL_NOTIFICATIONS_READ_MUTATION);

  const unreadCount = countData?.unreadNotificationCount || 0;
  const notifications = listData?.listNotifications || [];

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      void refetchList();
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markRead({ variables: { id } });
      void refetchCount();
      void refetchList();
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      void refetchCount();
      void refetchList();
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return <CheckCircle2 className="w-3.5 h-3.5 text-[#3fb950]" />;
      case 'WARNING':
        return <AlertTriangle className="w-3.5 h-3.5 text-[#d29922]" />;
      case 'ALERT':
        return <ShieldAlert className="w-3.5 h-3.5 text-[#f85149]" />;
      default:
        return <Info className="w-3.5 h-3.5 text-[#58a6ff]" />;
    }
  };

  return (
    <div className="relative font-sans" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={handleToggle}
        className="relative p-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#c9d1d9] hover:text-white transition-colors"
        title="Notifications"
      >
        <Bell className="w-3.5 h-3.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#f85149] text-[9px] font-bold text-white shadow-sm ring-1 ring-[#161b22] animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-[#161b22] border border-[#30363d] shadow-2xl z-50 overflow-hidden text-xs text-[#c9d1d9] animate-fadeIn">
          {/* Header */}
          <div className="px-4 py-2.5 bg-[#0d1117] border-b border-[#30363d] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#58a6ff]/20 text-[#58a6ff] text-[10px] font-semibold">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] text-[#58a6ff] hover:underline flex items-center space-x-1 font-medium"
              >
                <CheckCheck className="w-3 h-3" />
                <span>Mark all as read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[#21262d]">
            {loading ? (
              <div className="p-6 flex items-center justify-center text-[#8b949e] space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#58a6ff]" />
                <span>Loading notifications...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-[#8b949e]">
                No notifications right now. You're all caught up!
              </div>
            ) : (
              notifications.map((n: any) => (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && handleMarkRead(n.id)}
                  className={`p-3.5 flex items-start space-x-2.5 transition-colors cursor-pointer ${
                    n.isRead ? 'bg-[#161b22] opacity-75 hover:bg-[#21262d]/40' : 'bg-[#1f6feb]/10 hover:bg-[#1f6feb]/15'
                  }`}
                >
                  <div className="mt-0.5 flex-shrink-0">{getIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-xs font-semibold ${n.isRead ? 'text-[#c9d1d9]' : 'text-white'}`}>
                        {n.title}
                      </span>
                      <span className="text-[10px] text-[#8b949e]">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8b949e] leading-snug line-clamp-2">{n.message}</p>
                  </div>
                  {!n.isRead && (
                    <span className="w-2 h-2 rounded-full bg-[#58a6ff] mt-1.5 flex-shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
