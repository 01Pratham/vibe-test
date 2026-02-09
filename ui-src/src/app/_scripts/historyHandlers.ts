import type { HistoryItem, ExecuteResponse } from '../../types'

/**
 * Fetch history items
 */
export const fetchHistory = async (limit = 30): Promise<HistoryItem[]> => {
    try {
        const res = await fetch(`__api__/history?limit=${limit}`)
        if (res.ok) {
            const data = (await res.json()) as { history: HistoryItem[] }
            return data.history ?? []
        }
        return []
    } catch (error) {
        console.error('Failed to fetch history:', error)
        return []
    }
}

/**
 * Save request/response to history
 */
export const saveToHistory = async (
    method: string,
    url: string,
    requestHeaders: Record<string, string>,
    requestBody: string,
    response: ExecuteResponse
): Promise<{ success: boolean; error?: string }> => {
    try {
        const res = await fetch('__api__/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                method,
                url,
                requestHeaders: JSON.stringify(requestHeaders),
                requestBody: requestBody || null,
                status: response.status ?? null,
                statusText: response.statusText ?? null,
                responseHeaders: response.headers ? JSON.stringify(response.headers) : '{}',
                responseBody: response.body
                    ? typeof response.body === 'string'
                        ? response.body
                        : JSON.stringify(response.body)
                    : null,
                duration: response.time ?? null,
                error: response.error ?? null,
            }),
        })

        if (res.ok) {
            return { success: true }
        }
        return { success: false, error: 'Failed to save to history' }
    } catch {
        return { success: false, error: 'Failed to save to history' }
    }
}

/**
 * Clear all history
 */
export const clearHistory = async (): Promise<{ success: boolean; error?: string }> => {
    try {
        const res = await fetch('__api__/history', { method: 'DELETE' })
        if (res.ok) {
            return { success: true }
        }
        return { success: false, error: 'Failed to clear history' }
    } catch {
        return { success: false, error: 'Failed to clear history' }
    }
}

/**
 * Delete a single history item
 */
export const deleteHistoryItem = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const res = await fetch(`__api__/history/${id}`, { method: 'DELETE' })
        if (res.ok) {
            return { success: true }
        }
        return { success: false, error: 'Failed to delete history item' }
    } catch {
        return { success: false, error: 'Failed to delete history item' }
    }
}
