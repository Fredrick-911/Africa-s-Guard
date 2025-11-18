import axios from 'axios';
import { Feedback } from '@/types/Feedback';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Mock data
const mockFeedback: Feedback[] = [
  {
    id: 'fb-001',
    caseId: 'case-001',
    rating: 'positive',
    comment: 'Very accurate detection, helped prevent sharing fake content.',
    submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'fb-002',
    caseId: 'case-002',
    rating: 'positive',
    comment: 'Fast and reliable.',
    submittedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'fb-003',
    caseId: 'case-004',
    rating: 'negative',
    comment: 'False positive - this was an authentic video.',
    submittedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'fb-004',
    caseId: 'case-001',
    rating: 'positive',
    comment: 'Excellent explanation of the analysis.',
    submittedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
];

class FeedbackService {
  async getFeedback(): Promise<Feedback[]> {
    // Mock response
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockFeedback), 400);
    });

    // Real API call:
    // const response = await axios.get(`${API_BASE_URL}/feedback`);
    // return response.data;
  }

  async submitFeedback(caseId: string, rating: 'positive' | 'negative', comment?: string): Promise<Feedback> {
    // Mock response
    return new Promise((resolve) => {
      setTimeout(() => {
        const newFeedback: Feedback = {
          id: 'fb-' + Date.now(),
          caseId,
          rating,
          comment,
          submittedAt: new Date().toISOString(),
        };
        resolve(newFeedback);
      }, 400);
    });

    // Real API call:
    // const response = await axios.post(`${API_BASE_URL}/feedback`, { caseId, rating, comment });
    // return response.data;
  }
}

export default new FeedbackService();
