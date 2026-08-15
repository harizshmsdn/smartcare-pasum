import { api } from '../api';

export interface UserProfile {
  id: string;
  role: 'student' | 'lecturer' | 'admin';
  full_name: string;
  institutional_id: string;
  email: string;
  phone_number?: string;
  emergency_contact?: string | null;
  office_location?: string;
  affiliation?: string;
}

export interface CreateUserData {
  full_name: string;
  email: string;
  role: 'student' | 'lecturer' | 'admin';
  institutional_id: string;
  phone_number?: string | null;
  emergency_contact?: string | null;
  office_location?: string | null;
  affiliation: string;
}

export interface UpdateUserData {
  full_name?: string;
  email?: string;
  role?: 'student' | 'lecturer' | 'admin';
  institutional_id?: string | null;
  phone_number?: string | null;
  emergency_contact?: string | null;
  office_location?: string | null;
  affiliation?: string | null;
}

export interface SystemSettings {
  attendance_threshold: number;
  default_geofence_radius: number;
  grade_drop_threshold: number;
  mandatory_face_id: boolean;
  mandatory_location: boolean;
  max_merit_points_per_claim: number;
  default_merit_points_recommended: number;
  auto_email_absence_alert: boolean;
  auto_escalate_intervention_days: number;
  maintenance_mode: boolean;
  default_user_password: string;
  session_timeout_hours: number;
  enable_audit_logs: boolean;
}

/**
 * Service module providing high-level typed functions for administrative backend API operations.
 */
export const adminService = {
  /**
   * Fetches all registered users directory.
   */
  getUsers: async (): Promise<{ users: UserProfile[] }> => {
    return api.get<{ users: UserProfile[] }>('/api/admin/users');
  },

  /**
   * Creates a new user account in the directory.
   */
  createUser: async (data: CreateUserData): Promise<any> => {
    return api.post('/api/admin/users', data);
  },

  /**
   * Updates existing user details.
   */
  updateUser: async (userId: string, data: UpdateUserData): Promise<any> => {
    return api.patch(`/api/admin/users/${userId}`, data);
  },

  /**
   * Deletes a user account.
   */
  deleteUser: async (userId: string): Promise<any> => {
    return api.delete(`/api/admin/users/${userId}`);
  },

  /**
   * Fetches global system settings.
   */
  getSettings: async (): Promise<{ settings: SystemSettings }> => {
    return api.get<{ settings: SystemSettings }>('/api/admin/settings');
  },

  /**
   * Updates global system settings parameters.
   */
  updateSettings: async (settings: SystemSettings): Promise<any> => {
    return api.post('/api/admin/settings', settings);
  },

  /**
   * Fetches administrative dashboard analytical summary data.
   */
  getDashboard: async (): Promise<any> => {
    return api.get('/api/admin/dashboard');
  },

  /**
   * Fetches admin intervention cases and merit claims.
   */
  getInterventions: async (): Promise<any> => {
    return api.get('/api/admin/interventions');
  },

  getMeritClaims: async (): Promise<any> => {
    return api.get('/api/admin/merit-claims');
  },

  updateIntervention: async (interventionId: string, data: any): Promise<any> => {
    return api.patch(`/api/admin/interventions/${interventionId}`, data);
  },

  updateMeritClaim: async (claimId: string, data: any): Promise<any> => {
    return api.patch(`/api/admin/merit-claims/${claimId}`, data);
  },

  /**
   * Fetches admin classes, subjects, enrollments, and schedules.
   */
  getEnrollments: async (): Promise<any> => {
    return api.get('/api/admin/enrollments');
  },

  getClasses: async (): Promise<any> => {
    return api.get('/api/admin/classes');
  },

  getSubjects: async (): Promise<any> => {
    return api.get('/api/admin/subjects');
  },

  createSubject: async (data: any): Promise<any> => {
    return api.post('/api/admin/subjects', data);
  },

  createClass: async (data: any): Promise<any> => {
    return api.post('/api/admin/classes', data);
  },

  deleteClass: async (classId: string): Promise<any> => {
    return api.delete(`/api/admin/classes/${classId}`);
  },

  createEnrollment: async (data: any): Promise<any> => {
    return api.post('/api/admin/enrollments', data);
  },

  deleteEnrollment: async (enrollmentId: string): Promise<any> => {
    return api.delete(`/api/admin/enrollments/${enrollmentId}`);
  },
};
