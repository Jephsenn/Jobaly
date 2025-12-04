import * as http from 'http';
import logger from '../utils/logger';

const PORT = 45782;

export interface ExtensionJob {
  id: string;
  url: string;
  platform: string;
  title: string;
  company: string | null;
  location: string | null;
  description: string | null;
  salary: string | null;
  employmentType?: string | null;
  seniorityLevel?: string | null;
  detectedAt: string;
}

export class NativeMessagingServer {
  private server: http.Server | null = null;
  private onJobCallback: ((job: ExtensionJob) => void) | null = null;

  start(onJob: (job: ExtensionJob) => void): void {
    this.onJobCallback = onJob;

    this.server = http.createServer((req, res) => {
      // Enable CORS for browser extension
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      if (req.method === 'GET') {
        // Health check endpoint
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: 'Job Search Assistant' }));
        return;
      }

      if (req.method === 'POST') {
        let body = '';

        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            const message = JSON.parse(body);
            logger.info('Received from extension', { type: message.type });

            if (message.type === 'JOB_DETECTED' && message.job) {
              if (this.onJobCallback) {
                this.onJobCallback(message.job);
              }

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            } else {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: 'Unknown message type' }));
            }
          } catch (error) {
            logger.error('Error processing extension message', { error: (error as Error).message });
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: (error as Error).message }));
          }
        });

        return;
      }

      res.writeHead(405);
      res.end();
    });

    this.server.listen(PORT, '127.0.0.1', () => {
      logger.info('Extension API server started', { port: PORT });
    });

    this.server.on('error', (err) => {
      logger.error('Extension API server error', { error: err.message });
    });
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      logger.info('Extension API server stopped');
    }
  }
}

let serverInstance: NativeMessagingServer | null = null;

export function getNativeMessagingServer(): NativeMessagingServer {
  if (!serverInstance) {
    serverInstance = new NativeMessagingServer();
  }
  return serverInstance;
}
