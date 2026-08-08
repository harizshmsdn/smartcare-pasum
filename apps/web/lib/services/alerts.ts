import { api } from '../api';

export interface AlertItem {
  id: string;
  title: string;
  message: string;
  type: 'critical' | 'warning' | 'info';
  is_read: boolean;
  created_at: string;
  student_id?: string;
  lecturer_id?: string;
}

/**
 * Service module providing high-level functions for alert system interaction.
 */
export const alertService = {
  /**
   * Fetches alerts list for the logged-in user.
   */
  getAlerts: async (): Promise<{ alerts: AlertItem[] }> => {
    return api.get<{ alerts: AlertItem[] }>('/api/alerts');
  },

  /**
   * Marks a specific alert as read by ID.
   */
  markRead: async (id: string): Promise<any> => {
    return api.patch(`/api/alerts/${id}/read`);
  },

  /**
   * Marks all active unread alerts as read.
   */
  markAllRead: async (): Promise<any> => {
    return api.post('/api/alerts/mark-all-read');
  },
};
