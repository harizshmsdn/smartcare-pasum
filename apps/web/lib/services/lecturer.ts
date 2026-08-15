import { api } from '../api';

export const lecturerService = {
  getDashboard: async (): Promise<any> => {
    return api.get('/api/lecturer/dashboard');
  },

  getClasses: async (): Promise<any> => {
    return api.get('/api/lecturer/classes');
  },

  getClassRoster: async (classId: string): Promise<any> => {
    return api.get(`/api/lecturer/classes/${classId}/roster`);
  },

  getInterventions: async (): Promise<any> => {
    return api.get('/api/lecturer/interventions');
  },

  updateInterventionStatus: async (interventionId: string, status: string): Promise<any> => {
    return api.patch(`/api/lecturer/interventions/${interventionId}`, { status });
  },
};
