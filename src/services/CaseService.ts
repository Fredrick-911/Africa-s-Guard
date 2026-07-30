import axios from 'axios';
import { Case, CaseDetails } from '@/types/Case';
import { DashboardStats, ChartData } from '@/types/Stats';

// Point this at the FastAPI backend (port 8000), NOT 3000.
// Override in a frontend .env file with:  VITE_API_BASE_URL=http://localhost:8000
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class CaseService {
  async getCases(): Promise<Case[]> {
    const response = await axios.get(`${API_BASE_URL}/cases`);
    return response.data;
  }

  async getCaseById(id: string): Promise<CaseDetails> {
    const response = await axios.get(`${API_BASE_URL}/cases/${id}`);
    return response.data;
  }

  async getStats(): Promise<DashboardStats> {
    const response = await axios.get(`${API_BASE_URL}/stats`);
    return response.data;
  }

  async getChartData(): Promise<ChartData[]> {
    const response = await axios.get(`${API_BASE_URL}/stats/chart`);
    return response.data;
  }

  async getRecentCases(limit: number = 5): Promise<Case[]> {
    const cases = await this.getCases();
    return cases.slice(0, limit);
  }
}

export default new CaseService();