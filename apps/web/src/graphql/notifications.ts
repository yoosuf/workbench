import { gql } from '@apollo/client';

export const LIST_NOTIFICATIONS_QUERY = gql`
  query ListNotifications {
    listNotifications {
      id
      title
      message
      type
      isRead
      createdAt
    }
  }
`;

export const UNREAD_NOTIFICATION_COUNT_QUERY = gql`
  query UnreadNotificationCount {
    unreadNotificationCount
  }
`;

export const MARK_NOTIFICATION_READ_MUTATION = gql`
  mutation MarkNotificationRead($id: ID!) {
    markNotificationRead(id: $id)
  }
`;

export const MARK_ALL_NOTIFICATIONS_READ_MUTATION = gql`
  mutation MarkAllNotificationsRead {
    markAllNotificationsRead
  }
`;
