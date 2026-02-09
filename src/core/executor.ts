/**
 * Represents a JSON-serializable value
 */
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface ExecuteRequest {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: string;
    timeout?: number;
    sslVerification?: boolean;
    followRedirects?: boolean;
    maxResponseSize?: number;
}

export interface ExecuteResponse {
    success: boolean;
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
    cookies?: string[];
    body?: string | JsonValue;
    time?: number;
    error?: string;
}

/**
 * Executes an HTTP request using native fetch (Node 18+)
 */
export async function executeRequest(request: ExecuteRequest): Promise<ExecuteResponse> {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = request.timeout ?? 30000;
    const timeoutId = setTimeout(() => {
        controller.abort();
    }, timeout);

    try {
        const fetchOptions = prepareFetchOptions(request, controller.signal);
        const response = await fetch(request.url, fetchOptions);
        const endTime = Date.now();
        clearTimeout(timeoutId);

        return await parseResponse(response, startTime, endTime);
    } catch (error: unknown) {
        clearTimeout(timeoutId);
        const endTime = Date.now();

        if (error instanceof Error && error.name === 'AbortError') {
            return {
                success: false,
                error: `Request timeout after ${timeout}ms`,
                time: endTime - startTime,
            };
        }

        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            time: endTime - startTime,
        };
    }
}

/**
 * Prepares options for the fetch call
 */
function prepareFetchOptions(request: ExecuteRequest, signal: AbortSignal): RequestInit {
    const fetchOptions: RequestInit = {
        method: request.method.toUpperCase(),
        headers: request.headers ?? {},
        signal,
        redirect: request.followRedirects === false ? 'manual' : 'follow',
    };

    const method = fetchOptions.method ?? 'GET';
    const hasBody = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) &&
        request.body !== undefined &&
        request.body !== null &&
        request.body !== '';

    if (hasBody) {
        fetchOptions.body = request.body;
        const headers = fetchOptions.headers as Record<string, string>;
        if (headers['Content-Type'] === undefined && headers['content-type'] === undefined) {
            try {
                JSON.parse(request.body ?? '');
                headers['Content-Type'] = 'application/json';
            } catch {
                // Not JSON, allow fallback
            }
        }
    }

    return fetchOptions;
}

/**
 * Parses the fetch response into ExecuteResponse
 */
async function parseResponse(response: Response, startTime: number, endTime: number): Promise<ExecuteResponse> {
    const responseHeaders: Record<string, string> = {};
    const cookies: string[] = [];

    response.headers.forEach((value: string, key: string) => {
        if (key.toLowerCase() === 'set-cookie') {
            cookies.push(value);
        } else {
            responseHeaders[key] = value;
        }
    });

    const contentType = response.headers.get('content-type');
    let body: string | JsonValue;

    if (contentType?.includes('application/json')) {
        body = (await response.json()) as JsonValue;
    } else {
        body = await response.text();
    }

    return {
        success: true,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        cookies,
        body,
        time: endTime - startTime,
    };
}
