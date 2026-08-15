import { api } from '../api';

export const studentService = {
  getDashboard: async (): Promise<any> => {
    return api.get('/api/student/dashboard');
  },

  getClassDetails: async (classId: string): Promise<any> => {
    return api.get(`/api/student/classes/${classId}/details`);
  },

  getAlerts: async (): Promise<any> => {
    return api.get('/api/student/alerts');
  },

  markAllAlertsRead: async (): Promise<any> => {
    return api.post('/api/student/alerts/mark-all-read');
  },

  markAlertRead: async (alertId: string): Promise<any> => {
    return api.patch(`/api/student/alerts/${alertId}/read`);
  },

  getMeritClaims: async (): Promise<any> => {
    return api.get('/api/student/merit-claims');
  },

  createMeritClaim: async (data: any): Promise<any> => {
    return api.post('/api/student/merit-claims', data);
  },

  getInterventions: async (): Promise<any> => {
    return api.get('/api/student/interventions');
  },

  createIntervention: async (data: any): Promise<any> => {
    return api.post('/api/interventions', data);
  },

  getSettings: async (): Promise<any> => {
    return api.get('/api/student/settings');
  },

  updateSettings: async (settings: any): Promise<any> => {
    return api.patch('/api/student/settings', settings);
  },
};
