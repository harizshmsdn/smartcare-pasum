import { api } from '../api';

export interface InterventionItem {
  id: string;
  student_id: string;
  student_name: string;
  student_id_num: string;
  subject_name: string;
  subject_code: string;
  trigger_reason: string;
  status: 'Open' | 'Pending Review' | 'Resolved' | 'Closed';
  created_at: string;
  notes?: string;
}

/**
 * Service module providing high-level API calls for student intervention cases.
 */
export const interventionService = {
  /**
   * Fetches all interventions assigned to or managed by the user.
   */
  getInterventions: async (): Promise<{ interventions: InterventionItem[] }> => {
    return api.get<{ interventions: InterventionItem[] }>('/api/interventions');
  },
};
