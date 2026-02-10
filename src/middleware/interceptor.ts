import type { Request as StoreRequest } from '../storage/interfaces';
import type { IStorageProvider } from '../storage/types';
import type { Request, Response, NextFunction } from 'express';

/**
 * Represents a JSON-serializable value
 */
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface InterceptorOptions {
    mountPath: string;
    userId?: string;
    excludePaths?: string[];
    captureResponse?: boolean;
}

/**
 * Middleware to intercept all incoming requests and log them to history
 */
export function requestInterceptor(storage: IStorageProvider, options: InterceptorOptions): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction): void => {
        // Skip ignored paths
        if (req.path.startsWith(options.mountPath)) {
            next();
            return;
        }

        if (options.excludePaths?.some((path: string) => req.path.startsWith(path)) === true) {
            next();
            return;
        }

        // Ignore internal API Tester calls
        if (req.path.includes('/__api__/')) {
            next();
            return;
        }

        const startTime = Date.now();
        const userId = options.userId ?? 'system';

        // 1. Capture request body IMMEDIATELY before it gets modified by routes
        const reqBodyStr = (req.body !== undefined && req.body !== null)
            ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body, null, 2))
            : null;

        // 2. Capture response body if needed
        let responseBody: string | JsonValue | null = null;
        if (options.captureResponse !== false) {
            const originalSend = res.send;
            res.send = function (body: string | JsonValue): Response {
                responseBody = body;
                return originalSend.call(this, body);
            };
        }

        res.on('finish', () => {
            const executePostRequestActions = async (): Promise<void> => {
                const duration = Date.now() - startTime;

                try {
                    // 1. Log to history
                    await logToHistory(storage, userId, req, res, duration, responseBody, reqBodyStr);

                    // 2. Auto-Update "Auto-Captured" request documentation
                    await autoUpdateDocumentation(storage, userId, req, reqBodyStr);
                } catch {
                    // Silently fail
                }
            };
            void executePostRequestActions();
        });

        next();
    };
}

async function logToHistory(
    storage: IStorageProvider,
    userId: string,
    req: Request,
    res: Response,
    duration: number,
    responseBody: string | JsonValue | null,
    reqBodyStr: string | null
): Promise<void> {
    await storage.addToHistory(userId, {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration,
        requestHeaders: JSON.stringify(req.headers, null, 2),
        requestBody: reqBodyStr,
        responseHeaders: JSON.stringify(res.getHeaders(), null, 2),
        responseBody: typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody, null, 2)
    });
}

async function autoUpdateDocumentation(
    storage: IStorageProvider,
    userId: string,
    req: Request,
    reqBodyStr: string | null
): Promise<void> {
    const collections = await storage.getCollections(userId);
    const autoCollection = collections.find(c => c.name === 'Auto-Captured');
    if (autoCollection === undefined) {
        return;
    }

    const requests = await storage.getRequests(autoCollection.id);
    const baseUrl = req.baseUrl ?? '';
    const routePath = (req.route as { path?: string })?.path ?? '';
    const routePattern = baseUrl + routePath;

    const matchingRequest = requests.find(r => {
        if (r.method !== req.method) {
            return false;
        }
        const urlWithoutBase = r.url.replace('{{BASE_URL}}', '');
        return urlWithoutBase === routePattern || urlWithoutBase === req.path || r.url === routePattern;
    });

    if (matchingRequest !== undefined) {
        await applyDocumentationUpdates(storage, matchingRequest, req, reqBodyStr);
    }
}

async function applyDocumentationUpdates(
    storage: IStorageProvider,
    matchingRequest: StoreRequest,
    req: Request,
    reqBodyStr: string | null
): Promise<void> {
    const updates: Partial<{ body: string; headers: string }> = {};

    const hasNoBody = matchingRequest.body === undefined ||
        matchingRequest.body === null ||
        matchingRequest.body === '' ||
        matchingRequest.body === '{}' ||
        matchingRequest.body === 'null';

    if (hasNoBody && reqBodyStr !== null && reqBodyStr !== '{}') {
        updates.body = reqBodyStr;
    }

    if (matchingRequest.headers === undefined || matchingRequest.headers === null || matchingRequest.headers === '' || matchingRequest.headers === '{}') {
        updates.headers = getFilteredHeaders(req.headers as Record<string, string | string[] | undefined>);
    }

    if (Object.keys(updates).length > 0) {
        await storage.updateRequest(matchingRequest.id, updates);
    }
}

function getFilteredHeaders(headers: Record<string, string | string[] | undefined>): string {
    const filteredHeaders: Record<string, string | string[]> = {};
    const excludeHeaders = ['cookie', 'authorization', 'host', 'connection', 'content-length'];
    Object.keys(headers).forEach((h: string) => {
        if (!excludeHeaders.includes(h.toLowerCase())) {
            const headerValue = headers[h];
            if (headerValue !== undefined) {
                filteredHeaders[h] = headerValue;
            }
        }
    });

    return JSON.stringify(filteredHeaders, null, 2);
}
