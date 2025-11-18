import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Mock response - replace with actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          token: 'mock-jwt-token-' + Date.now(),
          user: {
            id: '1',
            email: credentials.email,
            name: 'Admin User',
          },
        });
      }, 1000);
    });

    // Real API call (uncomment when backend is ready):
    // const response = await axios.post(`${API_BASE_URL}/auth/login`, credentials);
    // return response.data;
  }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('authToken');
  }

  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  saveAuth(auth: AuthResponse): void {
    localStorage.setItem('authToken', auth.token);
    localStorage.setItem('user', JSON.stringify(auth.user));
  }
}

export default new AuthService();
