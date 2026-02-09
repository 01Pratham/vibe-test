import type { Collection } from '../../types'

/**
 * Fetch all collections
 */
export const fetchCollections = async (): Promise<Collection[]> => {
    try {
        const res = await fetch('__api__/collections')
        if (res.ok) {
            const data = (await res.json()) as { collections: Collection[] }
            return data.collections ?? []
        }
        return []
    } catch (error) {
        console.error('Failed to fetch collections:', error)
        return []
    }
}

/**
 * Create a new collection
 */
export const createCollection = async (name: string): Promise<{ success: boolean; error?: string }> => {
    if (!name.trim()) {
        return { success: false, error: 'Collection name is required' }
    }

    try {
        const res = await fetch('__api__/collections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        })

        if (res.ok) {
            return { success: true }
        }
        return { success: false, error: 'Failed to create collection' }
    } catch {
        return { success: false, error: 'Failed to create collection' }
    }
}

/**
 * Delete a collection
 */
export const deleteCollection = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const res = await fetch(`__api__/collections/${id}`, { method: 'DELETE' })
        if (res.ok) {
            return { success: true }
        }
        return { success: false, error: 'Failed to delete collection' }
    } catch {
        return { success: false, error: 'Failed to delete collection' }
    }
}
/**
 * Update a collection
 */
export const updateCollection = async (id: string, data: Partial<Collection>): Promise<{ success: boolean; error?: string }> => {
    try {
        const res = await fetch(`__api__/collections/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })

        if (res.ok) {
            return { success: true }
        }
        return { success: false, error: 'Failed to update collection' }
    } catch {
        return { success: false, error: 'Failed to update collection' }
    }
}
