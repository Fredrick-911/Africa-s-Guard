import axios from 'axios';
import { Case, CaseDetails } from '@/types/Case';
import { DashboardStats, ChartData } from '@/types/Stats';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Mock data
const mockCases: Case[] = [
  {
    id: 'case-001',
    mediaType: 'video',
    status: 'completed',
    confidence: 94,
    submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    verdict: '94% Likely Manipulated',
    faceScore: 92,
    voiceScore: 89,
    lipsyncScore: 97,
  },
  {
    id: 'case-002',
    mediaType: 'image',
    status: 'completed',
    confidence: 12,
    submittedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
    verdict: '12% Likely Authentic',
    faceScore: 15,
  },
  {
    id: 'case-003',
    mediaType: 'audio',
    status: 'analyzing',
    confidence: 0,
    submittedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    verdict: 'Processing...',
  },
  {
    id: 'case-004',
    mediaType: 'video',
    status: 'completed',
    confidence: 78,
    submittedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    verdict: '78% Likely Manipulated',
    faceScore: 81,
    voiceScore: 72,
    lipsyncScore: 82,
  },
  {
    id: 'case-005',
    mediaType: 'image',
    status: 'failed',
    confidence: 0,
    submittedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    verdict: 'Analysis Failed',
  },
];

const mockStats: DashboardStats = {
  totalVerificationsToday: 127,
  deepfakePercentage: 68,
  averageConfidence: 82.5,
  totalCases: 1543,
};

const mockChartData: ChartData[] = [
  { date: '2024-01-15', verifications: 45, deepfakes: 32 },
  { date: '2024-01-16', verifications: 52, deepfakes: 38 },
  { date: '2024-01-17', verifications: 61, deepfakes: 41 },
  { date: '2024-01-18', verifications: 48, deepfakes: 29 },
  { date: '2024-01-19', verifications: 73, deepfakes: 51 },
  { date: '2024-01-20', verifications: 89, deepfakes: 62 },
  { date: '2024-01-21', verifications: 127, deepfakes: 86 },
];

class CaseService {
  async getCases(): Promise<Case[]> {
    // Mock response
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockCases), 500);
    });

    // Real API call:
    // const response = await axios.get(`${API_BASE_URL}/cases`);
    // return response.data;
  }

  async getCaseById(id: string): Promise<CaseDetails> {
    // Mock response
    return new Promise((resolve) => {
      setTimeout(() => {
        const baseCase = mockCases.find(c => c.id === id) || mockCases[0];
        resolve({
          ...baseCase,
          workerId: 'worker-' + Math.floor(Math.random() * 5),
          processingTimeMs: 2340,
          explanation: 'Analysis detected multiple inconsistencies in facial movements and audio patterns. The lipsync alignment shows significant deviation from natural speech patterns, suggesting post-processing manipulation. Voice spectral analysis reveals artifacts consistent with voice cloning technology.',
          heatmapUrl: '/placeholder-heatmap.png',
          mediaUrl: '/placeholder-media.mp4',
        } as CaseDetails);
      }, 500);
    });

    // Real API call:
    // const response = await axios.get(`${API_BASE_URL}/cases/${id}`);
    // return response.data;
  }

  async getStats(): Promise<DashboardStats> {
    // Mock response
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockStats), 300);
    });

    // Real API call:
    // const response = await axios.get(`${API_BASE_URL}/stats`);
    // return response.data;
  }

  async getChartData(): Promise<ChartData[]> {
    // Mock response
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockChartData), 300);
    });

    // Real API call:
    // const response = await axios.get(`${API_BASE_URL}/stats/chart`);
    // return response.data;
  }

  async getRecentCases(limit: number = 5): Promise<Case[]> {
    const cases = await this.getCases();
    return cases.slice(0, limit);
  }
}

export default new CaseService();
