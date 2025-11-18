import { QueueItem } from '@/types/Queue';

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:3000';

// Mock queue items
const mockQueueItems: QueueItem[] = [
  {
    id: 'queue-001',
    mediaType: 'video',
    submittedAt: new Date().toISOString(),
    progress: 45,
    status: 'analyzing',
    workerId: 'worker-2',
  },
  {
    id: 'queue-002',
    mediaType: 'image',
    submittedAt: new Date(Date.now() - 1000).toISOString(),
    progress: 78,
    status: 'llm_explaining',
    workerId: 'worker-1',
  },
  {
    id: 'queue-003',
    mediaType: 'audio',
    submittedAt: new Date(Date.now() - 2000).toISOString(),
    progress: 12,
    status: 'preprocessing',
    workerId: 'worker-3',
  },
];

class QueueService {
  private ws: WebSocket | null = null;
  private listeners: ((items: QueueItem[]) => void)[] = [];
  private mockInterval: NodeJS.Timeout | null = null;

  connect(callback: (items: QueueItem[]) => void): void {
    this.listeners.push(callback);

    // Mock WebSocket updates
    this.startMockUpdates();

    // Real WebSocket connection (uncomment when backend is ready):
    /*
    this.ws = new WebSocket(`${WS_BASE_URL}/queue`);
    
    this.ws.onopen = () => {
      console.log('Queue WebSocket connected');
    };

    this.ws.onmessage = (event) => {
      const items: QueueItem[] = JSON.parse(event.data);
      this.notifyListeners(items);
    };

    this.ws.onerror = (error) => {
      console.error('Queue WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('Queue WebSocket disconnected');
      // Attempt reconnection after 5 seconds
      setTimeout(() => this.connect(callback), 5000);
    };
    */
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }
    this.listeners = [];
  }

  private startMockUpdates(): void {
    // Send initial data
    this.notifyListeners(mockQueueItems);

    // Update progress every 2 seconds
    this.mockInterval = setInterval(() => {
      const updatedItems = mockQueueItems.map(item => ({
        ...item,
        progress: Math.min(100, item.progress + Math.random() * 15),
      }));
      this.notifyListeners(updatedItems);
    }, 2000);
  }

  private notifyListeners(items: QueueItem[]): void {
    this.listeners.forEach(listener => listener(items));
  }
}

export default new QueueService();
