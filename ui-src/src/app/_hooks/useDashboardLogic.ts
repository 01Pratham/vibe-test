import { useState, useEffect, useCallback, useMemo, useRef } from 'react'

import {
    useToast,
    useDisclosure,
    useColorMode,
    useColorModeValue,
    useBreakpointValue,
} from '@chakra-ui/react'

import {
    fetchCollections,
    createCollection,
    deleteCollection,
    updateCollection,
} from '../_scripts/collectionHandlers'
import {
    fetchEnvironments,
    createEnvironment,
    updateEnvironment,
    deleteEnvironment,
} from '../_scripts/environmentHandlers'
import {
    fetchHistory,
    saveToHistory as saveToHistoryScript,
    clearHistory as clearHistoryScript,
    deleteHistoryItem as deleteHistoryItemScript,
} from '../_scripts/historyHandlers'
import {
    importPostmanCollection,
    exportOpenApiSpec,
    loadOpenApiDocs,
    exportPostmanCollection,
} from '../_scripts/importExportHandlers'
import {
    saveRequest as saveRequestScript,
    updateRequest as updateRequestScript,
    deleteRequest as deleteRequestScript,
    parseHeadersToArray,
} from '../_scripts/requestCrudHandlers'
import {
    parseHeaders,
    executeHttpRequest,
    isHtmlResponse as isHtmlResponseScript,
    isJsonResponse as isJsonResponseScript,
} from '../_scripts/requestHandlers'
import { runPreRequestScript, runPostRequestScript } from '../_scripts/scriptExecutor'
import {
    createNewTab as createNewTabScript,
    loadTabsFromStorage,
    saveTabsToStorage,
    loadSettingsFromStorage,
    saveSettingsToStorage,
} from '../_scripts/storageUtils'

import type {
    RequestItem,
    Collection,
    Environment,
    HistoryItem,
    RequestTab,
    ConflictData,
    RequestSettings,
    ExecuteResponse,
    OpenApiSpec,
} from '../../types'

const defaultSettings: RequestSettings = {
    sslVerification: true,
    followRedirects: true,
    timeout: 30,
    maxResponseSize: 10,
}

const methodColors: Record<string, string> = {
    GET: 'green',
    POST: 'blue',
    PUT: 'orange',
    PATCH: 'purple',
    DELETE: 'red',
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, max-lines-per-function
export const useDashboardLogic = () => {
    const toast = useToast()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { colorMode, toggleColorMode } = useColorMode()
    const { isOpen: isSidebarOpen, onToggle: toggleSidebar, onClose: onCloseSidebar } = useDisclosure({ defaultIsOpen: true })
    const isDesktop = useBreakpointValue({ base: false, md: true })

    // Color mode values
    const bgColor = useColorModeValue('gray.50', 'gray.900')
    const sidebarBg = useColorModeValue('white', 'gray.800')
    const borderColor = useColorModeValue('gray.200', 'gray.700')
    const inputBg = useColorModeValue('gray.100', 'gray.700')
    const hoverBg = useColorModeValue('gray.100', 'gray.700')
    const cardBg = useColorModeValue('white', 'gray.800')

    const mutedText = useColorModeValue('gray.500', 'gray.400')
    const headingColor = useColorModeValue('gray.600', 'gray.400')

    // Collections/Env/History State
    const [collections, setCollections] = useState<Collection[]>([])
    const [environments, setEnvironments] = useState<Environment[]>([])
    const [history, setHistory] = useState<HistoryItem[]>([])
    const [loadingCollections, setLoadingCollections] = useState(true)
    const [selectedEnvId, setSelectedEnvId] = useState('')
    const [selectedCollectionId, setSelectedCollectionId] = useState('')
    const [showHistory, setShowHistory] = useState(false)

    // Modals
    const importModal = useDisclosure()
    const collectionModal = useDisclosure()
    const requestModal = useDisclosure()
    const envModal = useDisclosure()
    const envManagerModal = useDisclosure()
    const snippetModal = useDisclosure()
    const conflictModal = useDisclosure()
    const openApiViewerModal = useDisclosure()
    const settingsModal = useDisclosure()
    const editCollectionModal = useDisclosure()

    // Other state variables
    const [newCollectionName, setNewCollectionName] = useState('')
    const [newRequestName, setNewRequestName] = useState('')
    const [newEnvName, setNewEnvName] = useState('')
    const [newEnvVariables, setNewEnvVariables] = useState('{}')
    const [editingEnvId, setEditingEnvId] = useState<string | null>(null)
    const [snippetLanguage, setSnippetLanguage] = useState('curl')
    const [conflictData, setConflictData] = useState<ConflictData | null>(null)
    const [importing, setImporting] = useState(false)
    const [openApiSpec, setOpenApiSpec] = useState<OpenApiSpec | null>(null)
    const [loadingOpenApi, setLoadingOpenApi] = useState(false)
    const [viewerCollectionId, setViewerCollectionId] = useState<string>('')
    const [editingCollection, setEditingCollection] = useState<Collection | null>(null)

    // Settings State
    const [settings, setSettings] = useState<RequestSettings>(() => {
        return loadSettingsFromStorage('api-tester-settings', defaultSettings)
    })

    // Save settings to localStorage
    useEffect(() => {
        saveSettingsToStorage('api-tester-settings', settings)
    }, [settings])

    // Create a new empty tab
    const createNewTab = useCallback(() => createNewTabScript(), [])

    // Tabs state
    const [tabs, setTabs] = useState<RequestTab[]>([])
    const [activeTabId, setActiveTabId] = useState<string>('')
    const [isHydrated, setIsHydrated] = useState(false)

    // Load tabs from localStorage after component mounts
    useEffect(() => {
        const loaded = loadTabsFromStorage()
        if (loaded) {
            setTabs(loaded.tabs)
            setActiveTabId(loaded.activeTabId)
        } else {
            const defaultTab = createNewTab()
            setTabs([defaultTab])
            setActiveTabId(defaultTab.id)
        }
        setIsHydrated(true)
    }, [createNewTab])

    // Save tabs to localStorage
    useEffect(() => {
        if (!isHydrated || tabs.length === 0) { return }
        saveTabsToStorage(tabs, activeTabId)
    }, [tabs, activeTabId, isHydrated])

    // Get current active tab
    const activeTab = tabs.find(t => t.id === activeTabId) ?? tabs[0]

    // Update active tab helper
    const updateActiveTab = useCallback((updates: Partial<RequestTab>) => {
        setTabs(prev => prev.map(tab =>
            tab.id === activeTabId ? { ...tab, ...updates } : tab
        ))
    }, [activeTabId])

    // Legacy compatibility - expose state
    const currentRequest = activeTab?.savedRequestId ? { id: activeTab.savedRequestId } as RequestItem : null
    const method = activeTab?.method ?? 'GET'
    const url = activeTab?.url ?? ''
    const headers = activeTab?.headers ?? [{ key: '', value: '' }]
    const body = activeTab?.body ?? ''
    const bodyType = activeTab?.bodyType ?? 'json'
    const formData = activeTab?.formData ?? [{ key: '', value: '', type: 'text', file: null }]
    const response = activeTab?.response ?? null
    const executing = activeTab?.executing ?? false
    const preRequestScript = activeTab?.preRequestScript ?? ''
    const postRequestScript = activeTab?.postRequestScript ?? ''

    // Setters that update the active tab
    const setMethod = (value: string): void => updateActiveTab({ method: value })
    const setUrl = (value: string): void => updateActiveTab({ url: value })
    const setHeaders = (value: Array<{ key: string; value: string }>): void => updateActiveTab({ headers: value })
    const setBody = (value: string): void => updateActiveTab({ body: value })
    const setBodyType = (value: 'json' | 'form-data'): void => updateActiveTab({ bodyType: value })
    const setFormData = (value: Array<{ key: string; value: string; type: 'text' | 'file'; file: File | null }>): void => updateActiveTab({ formData: value })
    const setResponse = (value: ExecuteResponse | null): void => updateActiveTab({ response: value })
    const setExecuting = (value: boolean): void => updateActiveTab({ executing: value })
    const setPreRequestScript = (value: string): void => updateActiveTab({ preRequestScript: value })
    const setPostRequestScript = (value: string): void => updateActiveTab({ postRequestScript: value })

    // Computed Variables for autocomplete
    const currentVariables = useMemo(() => {
        const env = environments.find(e => e.id === selectedEnvId)
        if (!env) { return [] }
        try {
            const vars = JSON.parse(env.variables) as Record<string, string>
            return Object.keys(vars)
        } catch {
            return []
        }
    }, [environments, selectedEnvId])

    const loadInitialData = useCallback(async (): Promise<void> => {
        setLoadingCollections(true)
        const [collectionsData, historyData] = await Promise.all([
            fetchCollections(),
            fetchHistory()
        ])
        setCollections(collectionsData)
        setHistory(historyData)
        setLoadingCollections(false)
    }, [])

    useEffect(() => {
        void loadInitialData()
    }, [loadInitialData])

    const loadCollections = loadInitialData // Alias for compatibility with other parts of the code

    const loadEnvironments = useCallback(async (): Promise<void> => {
        const data = await fetchEnvironments()
        setEnvironments(data)

        // Auto-select environment if none selected
        if (data.length > 0 && !selectedEnvId) {
            const localEnv = data.find(e => e.name === 'Local Environment')
            const toSelect = localEnv ? localEnv.id : data[0].id
            setSelectedEnvId(toSelect)
        }
    }, [selectedEnvId])

    const loadHistory = useCallback(async (): Promise<void> => {
        const data = await fetchHistory()
        setHistory(data)
    }, [])

    useEffect(() => {
        void loadCollections()
        void loadEnvironments()
    }, [loadCollections, loadEnvironments])

    useEffect(() => {
        if (showHistory) {
            void loadHistory()
        }
    }, [showHistory, loadHistory])


    const handleExecuteRequest = async (): Promise<void> => {
        if (!url.trim()) {
            toast({ title: 'URL is required', status: 'warning', duration: 2000 })
            return
        }

        setExecuting(true)
        setResponse(null)

        // 1. Prepare Environment
        let currentVars: Record<string, string> = {}
        const envInstance = environments.find(e => e.id === selectedEnvId)
        if (envInstance) {
            try { currentVars = JSON.parse(envInstance.variables) as Record<string, string> } catch { /* ignore */ }
        } else {
            // Try Local Env
            const localEnv = environments.find(e => e.name === 'Local Environment')
            if (localEnv) { try { currentVars = JSON.parse(localEnv.variables) as Record<string, string> } catch { /* ignore */ } }
        }

        // 2. Run Pre-Request Script
        let variables = { ...currentVars }
        let finalMethod = method
        let finalUrl = url
        let finalHeaders = parseHeaders(headers)
        let finalBody = body

        if (preRequestScript.trim()) {
            const context = {
                environment: variables,
                request: {
                    url,
                    method,
                    headers: finalHeaders,
                    body
                }
            }
            const scriptResult = runPreRequestScript(preRequestScript, context)

            if (!scriptResult.success) {
                toast({ title: 'Pre-request script failed', description: scriptResult.error, status: 'error', duration: 5000 })
                setExecuting(false)
                return
            }

            variables = scriptResult.context.environment
            finalUrl = scriptResult.context.request.url
            finalMethod = scriptResult.context.request.method
            finalHeaders = scriptResult.context.request.headers
            finalBody = scriptResult.context.request.body
        }

        // 3. Execute Request
        const result = await executeHttpRequest(
            finalMethod,
            finalUrl,
            parseHeadersToArray(JSON.stringify(finalHeaders)),
            finalBody,
            bodyType,
            formData,
            settings,
            selectedEnvId,
            variables
        )

        // 4. Run Post-Request Script
        if (postRequestScript.trim()) {
            const testResult = runPostRequestScript(postRequestScript, variables, result)
            if (!testResult.success) {
                toast({ title: 'Test script failed', description: testResult.error, status: 'error', duration: 5000 })
            } else {
                const passed = Object.values(testResult.tests).filter(v => v).length;
                const total = Object.keys(testResult.tests).length;
                if (total > 0) {
                    toast({
                        title: `Tests: ${passed}/${total} Passed`,
                        status: passed === total ? 'success' : 'warning',
                        duration: 3000
                    })
                }
            }
            variables = testResult.environment
        }

        // 5. Persist environment changes if script modified them
        if (JSON.stringify(variables) !== JSON.stringify(currentVars)) {
            const envIdToUpdate = selectedEnvId || environments.find(e => e.name === 'Local Environment')?.id;
            if (envIdToUpdate) {
                const env = environments.find(e => e.id === envIdToUpdate);
                if (env) {
                    await updateEnvironment(envIdToUpdate, env.name, JSON.stringify(variables));
                    await loadEnvironments();
                }
            }
        }

        setResponse(result)
        setExecuting(false)
    }

    const handleFileImportWrapper = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
        const file = event.target.files?.[0]
        if (!file) { return }

        setImporting(true)
        const result = await importPostmanCollection(file)

        if (result.success && result.collection) {
            toast({
                title: 'Import successful',
                description: `Imported ${result.requestsImported} requests into "${result.collection.name}"`,
                status: 'success',
                duration: 4000,
            })
            importModal.onClose()
            void loadCollections()
        } else {
            toast({ title: result.error ?? 'Import failed', status: 'error', duration: 4000 })
        }
        setImporting(false)
        if (fileInputRef.current) { fileInputRef.current.value = '' }
    }

    const handleCreateCollection = async (): Promise<void> => {
        const result = await createCollection(newCollectionName)
        if (result.success) {
            toast({ title: 'Collection created', status: 'success', duration: 2000 })
            setNewCollectionName('')
            collectionModal.onClose()
            void loadCollections()
        } else {
            toast({ title: result.error ?? 'Failed', status: 'error', duration: 3000 })
        }
    }

    const handleSaveRequest = async (): Promise<void> => {
        const result = await saveRequestScript(
            newRequestName,
            method,
            url,
            parseHeaders(headers),
            body,
            selectedCollectionId,
            preRequestScript,
            postRequestScript
        )

        if (result.success) {
            toast({ title: 'Request saved', status: 'success', duration: 2000 })
            setNewRequestName('')
            requestModal.onClose()
            void loadCollections()
        } else {
            toast({ title: result.error ?? 'Failed', status: 'error', duration: 3000 })
        }
    }

    const handleSaveCollection = async (): Promise<void> => {
        if (!editingCollection) { return }
        const result = await updateCollection(editingCollection.id, {
            name: editingCollection.name,
            headers: editingCollection.headers
        })
        if (result.success) {
            toast({ title: 'Collection updated', status: 'success', duration: 2000 })
            editCollectionModal.onClose()
            void loadCollections()
        } else {
            toast({ title: result.error ?? 'Failed', status: 'error', duration: 3000 })
        }
    }

    const handleDeleteCollection = async (id: string): Promise<void> => {
        // eslint-disable-next-line no-alert
        if (!confirm('Are you sure you want to delete this collection?')) { return }
        const result = await deleteCollection(id)
        if (result.success) {
            toast({ title: 'Collection deleted', status: 'success', duration: 2000 })
            editCollectionModal.onClose()
            void loadCollections()
        } else {
            toast({ title: result.error ?? 'Failed', status: 'error', duration: 3000 })
        }
    }

    const handleUpdateRequest = async (forceOverwrite = false): Promise<void> => {
        if (!activeTab?.savedRequestId) { return }

        const result = await updateRequestScript(
            activeTab.savedRequestId,
            activeTab.name,
            method,
            url,
            parseHeaders(headers),
            body,
            activeTab.serverUpdatedAt,
            forceOverwrite,
            activeTab.preRequestScript,
            activeTab.postRequestScript
        )

        if (result.conflict && result.serverVersion) {
            setConflictData({
                requestId: activeTab.savedRequestId,
                serverVersion: result.serverVersion,
            })
            conflictModal.onOpen()
            return
        }

        if (result.success) {
            toast({ title: 'Request updated', status: 'success', duration: 2000 })
            void loadCollections()
        } else {
            toast({ title: result.error ?? 'Update failed', status: 'error', duration: 3000 })
        }
    }

    const handleConflictReload = (): void => {
        if (!conflictData) { return }
        const sv = conflictData.serverVersion

        updateActiveTab({
            name: sv.name,
            method: sv.method,
            url: sv.url,
            headers: parseHeadersToArray(sv.headers), // Use helper
            body: sv.body ?? '',
            serverUpdatedAt: sv.updatedAt,
        })
        conflictModal.onClose()
        setConflictData(null)
        toast({ title: 'Loaded server version', status: 'info', duration: 2000 })
    }

    const handleConflictOverwrite = (): void => {
        conflictModal.onClose()
        setConflictData(null)
        void handleUpdateRequest(true)
    }

    const handleConflictSaveAsNew = (): void => {
        conflictModal.onClose()
        setConflictData(null)
        setNewRequestName(`${activeTab?.name ?? 'Request'} (Copy)`)
        requestModal.onOpen()
    }

    const handleLoadRequest = (request: RequestItem): void => {
        const existingTab = tabs.find(t => t.savedRequestId === request.id)
        if (existingTab) {
            setActiveTabId(existingTab.id)
            return
        }

        const newTab: RequestTab = {
            ...createNewTabScript(),
            name: request.name,
            method: request.method,
            url: request.url,
            headers: parseHeadersToArray(request.headers),
            body: request.body ?? '',
            savedRequestId: request.id,
            serverUpdatedAt: null, // Initial load doesn't have it unless we fetch specific details, assuming null is safe
            preRequestScript: request.preRequestScript ?? '',
            postRequestScript: request.postRequestScript ?? '',
        }

        setTabs(prev => [...prev, newTab])
        setActiveTabId(newTab.id)
    }

    const handleDeleteRequest = async (id: string): Promise<void> => {
        const result = await deleteRequestScript(id)
        if (result.success) {
            toast({ title: 'Request deleted', status: 'success', duration: 2000 })
            if (activeTab?.savedRequestId === id) {
                const otherTabs = tabs.filter(t => t.id !== activeTabId)
                if (otherTabs.length > 0) {
                    setActiveTabId(otherTabs[0].id)
                } else {
                    const newTab = createNewTabScript()
                    setTabs([newTab])
                    setActiveTabId(newTab.id)
                }
            }
            setTabs(prev => prev.filter(t => t.savedRequestId !== id))
            await loadCollections()
        } else {
            toast({ title: 'Failed to delete request', status: 'error', duration: 3000 })
        }
    }

    const handleSaveEnvironment = async (): Promise<void> => {
        let result
        if (editingEnvId) {
            result = await updateEnvironment(editingEnvId, newEnvName, newEnvVariables)
        } else {
            result = await createEnvironment(newEnvName, newEnvVariables)
        }

        if (result.success) {
            toast({
                title: `Environment ${editingEnvId ? 'updated' : 'created'}`,
                status: 'success',
                duration: 2000
            })
            setNewEnvName('')
            setNewEnvVariables('{}')
            setEditingEnvId(null)
            envModal.onClose()
            await loadEnvironments()
        } else {
            toast({ title: result.error ?? 'Failed', status: 'error', duration: 3000 })
        }
    }

    const handleDeleteEnvironment = async (id: string): Promise<void> => {
        const result = await deleteEnvironment(id)
        if (result.success) {
            toast({ title: 'Environment deleted', status: 'success', duration: 2000 })
            if (selectedEnvId === id) { setSelectedEnvId('') }
            await loadEnvironments()
        } else {
            toast({ title: 'Failed to delete environment', status: 'error', duration: 3000 })
        }
    }

    const handleSaveToHistory = async (): Promise<void> => {
        if (!response || !url) { return }
        if (!response || !url) { return }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        const result = await saveToHistoryScript(String(method), String(url), parseHeaders(headers) as any, String(body), response)
        if (result.success) {
            toast({ title: 'Saved to history', status: 'success', duration: 2000 })
            if (showHistory) { void loadHistory() }
        } else {
            toast({ title: 'Failed to save', status: 'error', duration: 3000 })
        }
    }

    const handleLoadHistoryItem = (item: HistoryItem): void => {
        updateActiveTab({
            method: item.method,
            url: item.url,
            headers: parseHeadersToArray(item.requestHeaders ?? ""), // Use helper directly
            body: item.requestBody ?? '',
            bodyType: 'json',
            formData: [{ key: '', value: '', type: 'text', file: null }],
            response: null,
            executing: false,
            savedRequestId: null,
            serverUpdatedAt: null,
        })
        toast({ title: 'History item loaded', status: 'info', duration: 2000 })
    }

    const handleClearHistory = async (): Promise<void> => {
        const result = await clearHistoryScript()
        if (result.success) {
            toast({ title: 'History cleared', status: 'success', duration: 2000 })
            setHistory([])
        } else {
            toast({ title: 'Failed', status: 'error', duration: 3000 })
        }
    }

    const handleDeleteHistoryItem = async (id: string): Promise<void> => {
        const result = await deleteHistoryItemScript(id)
        if (result.success) {
            toast({ title: 'History item deleted', status: 'success', duration: 2000 })
            setHistory(prev => prev.filter(item => item.id !== id))
        } else {
            toast({ title: 'Failed', status: 'error', duration: 3000 })
        }
    }

    const handleExportOpenApi = async (collectionId: string, collectionName: string): Promise<void> => {
        setLoadingOpenApi(true)
        const result = await exportOpenApiSpec(collectionId, collectionName)
        if (result.success) {
            toast({ title: 'OpenAPI spec exported', status: 'success', duration: 2000 })
        } else {
            toast({ title: result.error ?? 'Failed', status: 'error' })
        }
        setLoadingOpenApi(false)
    }

    const handleExportPostman = async (collectionId: string, collectionName: string): Promise<void> => {
        const result = await exportPostmanCollection(collectionId, collectionName)
        if (result.success) {
            toast({ title: 'Postman collection exported', status: 'success', duration: 2000 })
        } else {
            toast({ title: result.error ?? 'Failed', status: 'error' })
        }
    }

    const handleLoadCollectionDocs = async (collectionId: string): Promise<void> => {
        if (!collectionId) {
            toast({ title: 'Please select a collection', status: 'warning', duration: 2000 })
            return
        }
        setLoadingOpenApi(true)
        setOpenApiSpec(null)
        const result = await loadOpenApiDocs(collectionId)
        if (result.success && result.spec) {
            setOpenApiSpec(result.spec as unknown as OpenApiSpec)
        } else {
            toast({ title: result.error ?? 'Failed', status: 'error' })
        }
        setLoadingOpenApi(false)
    }

    const handleImportPostmanString = (_data: string): void => {
        // TODO: Implement parsing of pasted Postman JSON
        // console.log('Importing Postman JSON string:', _data)
        toast({ title: 'Not implemented', description: 'Pasting Postman JSON is not yet supported. Please import file.', status: 'warning' })
    }

    // Header management
    const addHeaderRow = (): void => { setHeaders([...headers, { key: '', value: '' }]) }
    const updateHeaderField = (index: number, field: 'key' | 'value', value: string): void => {
        const newHeaders = [...headers]
        newHeaders[index][field] = value
        setHeaders(newHeaders)
    }
    const removeHeaderRow = (index: number): void => {
        if (headers.length > 1) { setHeaders(headers.filter((_, i) => i !== index)) }
    }

    // Form-data management
    const addFormDataRow = (): void => { setFormData([...formData, { key: '', value: '', type: 'text', file: null }]) }
    const updateFormData = (index: number, field: 'key' | 'value' | 'type', value: string): void => {
        const newFormData = [...formData]
        if (field === 'type') {
            newFormData[index].type = value as 'text' | 'file'
            if (value === 'text') {
                newFormData[index].file = null
            }
        } else {
            newFormData[index][field] = value
        }
        setFormData(newFormData)
    }
    const updateFormDataFile = (index: number, file: File | null): void => {
        const newFormData = [...formData]
        newFormData[index].file = file
        setFormData(newFormData)
    }
    const removeFormDataRow = (index: number): void => {
        if (formData.length > 1) { setFormData(formData.filter((_, i) => i !== index)) }
    }

    // Wrappers for view logic
    const isHtmlResponse = (): boolean => isHtmlResponseScript(response?.headers)
    const isJsonResponse = (): boolean => isJsonResponseScript(response?.body ?? null)

    return {
        // UI
        toast,
        fileInputRef,
        colorMode,
        toggleColorMode,
        isSidebarOpen,
        toggleSidebar,
        onCloseSidebar,
        isDesktop,
        bgColor,
        sidebarBg,
        borderColor,
        inputBg,
        hoverBg,
        cardBg,
        mutedText,
        headingColor,
        // Data
        collections,
        environments,
        history,
        loadingCollections,
        selectedEnvId,
        setSelectedEnvId,
        selectedCollectionId,
        setSelectedCollectionId,
        showHistory,
        setShowHistory,
        // Modals
        importModal,
        collectionModal,
        requestModal,
        envModal,
        envManagerModal,
        snippetModal,
        conflictModal,
        openApiViewerModal,
        settingsModal,
        editCollectionModal,
        // State
        newCollectionName,
        setNewCollectionName,
        newRequestName,
        setNewRequestName,
        newEnvName,
        setNewEnvName,
        newEnvVariables,
        setNewEnvVariables,
        editingEnvId,
        setEditingEnvId,
        snippetLanguage,
        setSnippetLanguage,
        conflictData,
        importing,
        openApiSpec,
        loadingOpenApi,
        viewerCollectionId,
        setViewerCollectionId,
        editingCollection,
        setEditingCollection,
        settings,
        setSettings,
        defaultSettings,
        // Tabs
        tabs,
        setTabs,
        activeTabId,
        setActiveTabId,
        createNewTab,
        activeTab,
        // Computed
        currentRequest,
        method,
        setMethod,
        url,
        setUrl,
        headers,
        setHeaders,
        body,
        setBody,
        bodyType,
        setBodyType,
        formData,
        setFormData,
        response,
        executing,
        preRequestScript,
        setPreRequestScript,
        postRequestScript,
        setPostRequestScript,
        currentVariables,
        methodColors,
        // Handlers
        loadCollections,
        loadEnvironments,
        loadHistory,
        handleExecuteRequest,
        handleFileImportWrapper,
        handleCreateCollection,
        handleSaveRequest,
        handleSaveCollection,
        handleDeleteCollection,
        handleUpdateRequest,
        handleConflictReload,
        handleConflictOverwrite,
        handleConflictSaveAsNew,
        handleLoadRequest,
        handleDeleteRequest,
        handleSaveEnvironment,
        handleDeleteEnvironment,
        handleSaveToHistory,
        handleLoadHistoryItem,
        handleClearHistory,
        handleDeleteHistoryItem,
        handleExportOpenApi,
        handleExportPostman,
        handleLoadCollectionDocs,
        handleImportPostmanString,
        addHeaderRow,
        updateHeaderField,
        removeHeaderRow,
        addFormDataRow,
        updateFormData,
        updateFormDataFile,
        removeFormDataRow,
        isHtmlResponse,
        isJsonResponse,
    }
}
