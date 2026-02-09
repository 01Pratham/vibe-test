import type { Environment } from '../../types'

/**
 * Fetch all environments
 */
export const fetchEnvironments = async (): Promise<Environment[]> => {
    try {
        const res = await fetch('__api__/environments')
        if (res.ok) {
            const data = (await res.json()) as { environments: Environment[] }
            return data.environments ?? []
        }
        return []
    } catch (error) {
        console.error('Failed to fetch environments:', error)
        return []
    }
}

/**
 * Create a new environment
 */
export const createEnvironment = async (
    name: string,
    variables: string
): Promise<{ success: boolean; error?: string }> => {
    if (!name.trim()) {
        return { success: false, error: 'Environment name is required' }
    }

    // Validate JSON
    try {
        JSON.parse(variables)
    } catch {
        return { success: false, error: 'Invalid JSON for variables' }
    }

    try {
        const res = await fetch('__api__/environments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, variables }),
        })

        if (res.ok) {
            return { success: true }
        }
        return { success: false, error: 'Failed to create environment' }
    } catch {
        return { success: false, error: 'Failed to create environment' }
    }
}

/**
 * Update an existing environment
 */
export const updateEnvironment = async (
    id: string,
    name: string,
    variables: string
): Promise<{ success: boolean; error?: string }> => {
    if (!name.trim()) {
        return { success: false, error: 'Environment name is required' }
    }

    // Validate JSON
    try {
        JSON.parse(variables)
    } catch {
        return { success: false, error: 'Invalid JSON for variables' }
    }

    try {
        const res = await fetch(`__api__/environments/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, variables }),
        })

        if (res.ok) {
            return { success: true }
        }
        const data = (await res.json()) as { error?: string }
        return { success: false, error: data.error ?? 'Update failed' }
    } catch {
        return { success: false, error: 'Failed to update environment' }
    }
}

/**
 * Delete an environment
 */
export const deleteEnvironment = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const res = await fetch(`__api__/environments/${id}`, { method: 'DELETE' })
        if (res.ok) {
            return { success: true }
        }
        return { success: false, error: 'Failed to delete environment' }
    } catch {
        return { success: false, error: 'Failed to delete environment' }
    }
}
