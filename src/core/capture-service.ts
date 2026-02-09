
import { expressScanner } from '../scanner/express-scanner';

import type { IStorageProvider } from '../storage/types';
import type { Express } from 'express';


/**
 * Service to manage auto-capturing of collections from the Express app
 */
export class CaptureService {
    constructor(private storage: IStorageProvider) { }

    public async capture(app: Express, userId: string = 'system', collectionName: string = 'Auto-Captured'): Promise<void> {
        // 1. Scan Routes
        let scannedRoutes = expressScanner.scan(app);

        // Exclude internal API Tester routes
        scannedRoutes = scannedRoutes.filter(r => !r.path.includes('/__api__/') && !r.path.includes('/api-tester'));

        // Synchronize Collection
        const collections = await this.storage.getCollections(userId);
        let autoCollection = collections.find(c => c.name === collectionName);

        autoCollection ??= await this.storage.createCollection(userId, { name: collectionName });

        const existingRequests = await this.storage.getRequests(autoCollection.id);

        for (const route of scannedRoutes) {
            const cleanPath = route.path.startsWith('/') ? route.path : `/${route.path}`;
            const targetUrl = `{{BASE_URL}}${cleanPath}`;

            const exists = existingRequests.find(r => r.method === route.method && (r.url === targetUrl || r.url === route.path));

            if (exists === undefined) {
                // Infer body schema or params
                let defaultBody: string | null = null;
                if (['POST', 'PUT', 'PATCH'].includes(route.method)) {
                    defaultBody = (route.schema !== null && route.schema !== undefined) ? JSON.stringify(route.schema, null, 2) : '{}';
                }

                await this.storage.createRequest({
                    collectionId: autoCollection.id,
                    name: route.name,
                    method: route.method,
                    url: targetUrl,
                    headers: JSON.stringify({ ['Content-Type']: 'application/json' }, null, 2),
                    body: defaultBody
                });
            }
        }

        // 2. Synchronize Environment
        const envs = await this.storage.getEnvironments();
        const autoEnv = envs.find(e => e.name === 'Local Environment');

        if (autoEnv === undefined) {
            // Find base URL from app settings or defaults
            const port = process.env.PORT ?? '3000';
            const variables = {
                BASE_URL: `http://localhost:${port}`,
                NODE_ENV: process.env.NODE_ENV ?? 'development'
            };
            await this.storage.createEnvironment({
                name: 'Local Environment',
                variables: JSON.stringify(variables, null, 2)
            });
        }
    }
}
