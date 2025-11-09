import React, { useEffect } from 'react';
import type { Notification } from '../types';

interface NotificationSystemProps {
  notifications: Notification[];
  removeNotification: (id: number) => void;
}

const NotificationItem: React.FC<{ notification: Notification; onRemove: (id: number) => void }> = ({ notification, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(notification.id);
    }, 3000); // Auto-dismiss after 3 seconds

    return () => clearTimeout(timer);
  }, [notification.id, onRemove]);

  return (
    <div className={`notification-item ${notification.type}`}>
      <span>{notification.message}</span>
      <button onClick={() => onRemove(notification.id)} aria-label="Close notification">
        &times;
      </button>
    </div>
  );
};

const NotificationSystem: React.FC<NotificationSystemProps> = ({ notifications, removeNotification }) => {
  return (
    <div className="notification-container">
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={removeNotification}
        />
      ))}
    </div>
  );
};

export default NotificationSystem;
