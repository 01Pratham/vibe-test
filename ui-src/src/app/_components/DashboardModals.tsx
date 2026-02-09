'use client'

import { useState } from 'react'

import { FiSettings, FiRefreshCw } from 'react-icons/fi'

import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalCloseButton,
    ModalBody,
    ModalFooter,
    FormControl,
    FormLabel,
    Input,
    Button,
    VStack,
    Alert,
    AlertIcon,
    Text,
    HStack,
    Select,
    Box,
    Divider,
    Switch,
    FormHelperText,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    NumberIncrementStepper,
    NumberDecrementStepper,
    useColorMode
} from '@chakra-ui/react'
import type { UseDisclosureReturn, UseToastOptions } from '@chakra-ui/react'

import { snippetLanguages, generateSnippet } from '@/lib/snippet-generator'

import { CodeEditor } from '../../components/CodeEditor'

import { OpenApiDocsViewer } from './OpenApiDocsViewer'
import { EnvironmentManager } from './EnvironmentManager'

import type { ConflictData, RequestSettings, Collection, RequestTab, OpenApiSpec, Environment } from '../../types'
import type { SnippetLanguage, RequestConfig } from '@/lib/snippet-generator'

interface DashboardModalsProps {
    // Collection Modal
    collectionModal: UseDisclosureReturn
    newCollectionName: string
    setNewCollectionName: (v: string) => void
    createCollection: () => void
    editCollectionModal: UseDisclosureReturn
    editingCollection: Collection | null
    setEditingCollection: (c: Collection | null) => void
    saveCollection: () => void
    deleteCollection: (id: string) => void

    // Request Modal
    requestModal: UseDisclosureReturn
    newRequestName: string
    setNewRequestName: (v: string) => void
    saveRequest: () => void
    selectedCollectionId?: string
    setSelectedCollectionId: (v: string) => void
    collections: Collection[]

    // Environment Modal
    envModal: UseDisclosureReturn
    newEnvName: string
    setNewEnvName: (v: string) => void
    newEnvVariables: string
    setNewEnvVariables: (v: string) => void
    saveEnvironment: () => void
    deleteEnvironment: (id: string) => void
    editingEnvId: string | null

    // Environment Manager Modal
    envManagerModal: UseDisclosureReturn
    environments: Environment[]
    selectedEnvId: string
    setSelectedEnvId: (id: string) => void
    loadEnvironments: () => void

    // Settings Modal
    settingsModal: UseDisclosureReturn
    settings: RequestSettings
    setSettings: (s: RequestSettings) => void
    defaultSettings: RequestSettings

    // Conflict Modal
    conflictModal: UseDisclosureReturn
    conflictData: ConflictData | null
    handleConflictReload: () => void
    handleConflictOverwrite: () => void
    handleConflictSaveAsNew: () => void

    // Snippet Modal
    snippetModal: UseDisclosureReturn
    activeTab: RequestTab | undefined
    toast: (options: UseToastOptions) => string | number | undefined

    // Import Modal
    importModal: UseDisclosureReturn
    importPostman: (data: string) => void
    loadingImport?: boolean
    handleFileImport: (e: React.ChangeEvent<HTMLInputElement>) => void
    fileInputRef: React.RefObject<HTMLInputElement>
    importing: boolean

    // OpenAPI Modal
    openApiModal?: UseDisclosureReturn
    openApiUrl?: string
    setOpenApiUrl?: (v: string) => void
    loadOpenApi?: () => void
    loadingOpenApi: boolean

    // OpenAPI Docs Viewer
    openApiViewerModal: UseDisclosureReturn
    openApiSpec: OpenApiSpec | null
    viewerCollectionId: string
    setViewerCollectionId: (v: string) => void
    loadCollectionDocs: (id: string) => void
    createNewTab: () => RequestTab
    setTabs: React.Dispatch<React.SetStateAction<RequestTab[]>>
    setActiveTabId: (v: string) => void

    // Theme & UI
    cardBg: string
    inputBg: string
    borderColor: string
    mutedText: string
    methodColors: Record<string, string>
}

/**
 * Convert RequestTab to RequestConfig for snippet generator
 */
const tabToConfig = (tab: RequestTab): RequestConfig => {
    const headers: Record<string, string> = {}
    tab.headers.forEach(h => {
        if (h.key) {
            headers[h.key] = h.value
        }
    })

    return {
        method: tab.method,
        url: tab.url,
        headers,
        body: tab.body,
        bodyType: tab.bodyType as 'json' | 'form-data',
        formData: tab.formData.map(f => ({
            key: fieldKey(f.key),
            value: f.value,
            type: f.type as 'text' | 'file'
        }))
    }
}

const fieldKey = (key: string | undefined): string => key ?? ''

const CreateCollectionModal = ({ collectionModal, newCollectionName, setNewCollectionName, createCollection, cardBg, inputBg, borderColor }: Pick<DashboardModalsProps, 'collectionModal' | 'newCollectionName' | 'setNewCollectionName' | 'createCollection' | 'cardBg' | 'inputBg' | 'borderColor'>): JSX.Element => (
    <Modal isOpen={collectionModal.isOpen} onClose={collectionModal.onClose}>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent bg={cardBg} borderRadius="xl" borderColor={borderColor} border="1px">
            <ModalHeader>New Collection</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
                <FormControl>
                    <FormLabel fontSize="sm" fontWeight="bold">Name</FormLabel>
                    <Input
                        placeholder="e.g. My API"
                        value={newCollectionName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setNewCollectionName(e.target.value)}
                        bg={inputBg}
                        borderColor={borderColor}
                        focusBorderColor="purple.400"
                    />
                </FormControl>
            </ModalBody>
            <ModalFooter>
                <Button variant="ghost" mr={3} onClick={collectionModal.onClose}>Cancel</Button>
                <Button
                    bgGradient="linear(to-r, purple.500, blue.500)"
                    color="white"
                    _hover={{ bgGradient: 'linear(to-r, purple.600, blue.600)' }}
                    onClick={(): void => {
                        createCollection()
                        collectionModal.onClose()
                    }}
                    isDisabled={!newCollectionName.trim()}
                >
                    Create
                </Button>
            </ModalFooter>
        </ModalContent>
    </Modal>
)

const EditCollectionModal = ({ editCollectionModal, editingCollection, setEditingCollection, saveCollection, deleteCollection, cardBg, inputBg, borderColor }: Pick<DashboardModalsProps, 'editCollectionModal' | 'editingCollection' | 'setEditingCollection' | 'saveCollection' | 'deleteCollection' | 'cardBg' | 'inputBg' | 'borderColor'>): JSX.Element => (
    <Modal isOpen={editCollectionModal.isOpen} onClose={editCollectionModal.onClose}>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent bg={cardBg} borderRadius="xl" borderColor={borderColor} border="1px">
            <ModalHeader>Edit Collection</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
                <VStack spacing={4} align="stretch">
                    <FormControl>
                        <FormLabel fontSize="sm" fontWeight="bold">Name</FormLabel>
                        <Input
                            placeholder="e.g. My API"
                            value={editingCollection?.name ?? ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                                if (editingCollection) {
                                    setEditingCollection({ ...editingCollection, name: e.target.value })
                                }
                            }}
                            bg={inputBg}
                            borderColor={borderColor}
                            focusBorderColor="purple.400"
                        />
                    </FormControl>
                    <Button
                        colorScheme="red"
                        variant="outline"
                        size="sm"
                        onClick={(): void => {
                            // eslint-disable-next-line no-alert
                            if (editingCollection && window.confirm('Are you sure you want to delete this collection and all its requests?')) {
                                deleteCollection(editingCollection.id)
                                editCollectionModal.onClose()
                            }
                        }}
                    >
                        Delete Collection
                    </Button>
                </VStack>
            </ModalBody>
            <ModalFooter>
                <Button variant="ghost" mr={3} onClick={editCollectionModal.onClose}>Cancel</Button>
                <Button
                    colorScheme="purple"
                    onClick={(): void => {
                        saveCollection()
                        editCollectionModal.onClose()
                    }}
                    isDisabled={!editingCollection?.name.trim()}
                >
                    Save Changes
                </Button>
            </ModalFooter>
        </ModalContent>
    </Modal>
)

const EnvModal = ({ envModal, editingEnvId, newEnvName, setNewEnvName, newEnvVariables, setNewEnvVariables, saveEnvironment, cardBg, inputBg, borderColor }: Pick<DashboardModalsProps, 'envModal' | 'editingEnvId' | 'newEnvName' | 'setNewEnvName' | 'newEnvVariables' | 'setNewEnvVariables' | 'saveEnvironment' | 'cardBg' | 'inputBg' | 'borderColor'>): JSX.Element => (
    <Modal isOpen={envModal.isOpen} onClose={envModal.onClose} size="lg">
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent bg={cardBg} borderRadius="xl" borderColor={borderColor} border="1px">
            <ModalHeader>{editingEnvId ? 'Edit' : 'New'} Environment</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
                <VStack spacing={4}>
                    <FormControl isRequired>
                        <FormLabel fontSize="sm" fontWeight="bold">Environment Name</FormLabel>
                        <Input
                            value={newEnvName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setNewEnvName(e.target.value)}
                            placeholder="e.g. Production"
                            bg={inputBg}
                            borderColor={borderColor}
                            focusBorderColor="purple.400"
                        />
                    </FormControl>
                    <FormControl>
                        <FormLabel fontSize="sm" fontWeight="bold">Variables (JSON)</FormLabel>
                        <Box border="1px solid" borderColor={borderColor} borderRadius="md" overflow="hidden">
                            <CodeEditor
                                value={newEnvVariables}
                                onChange={(v: string | undefined): void => setNewEnvVariables(v ?? '{}')}
                                language="json"
                                height="200px"
                            />
                        </Box>
                        <FormHelperText fontSize="xs">Define key-value pairs like {"{\"api_url\": \"https://api.example.com\"}"}</FormHelperText>
                    </FormControl>
                </VStack>
            </ModalBody>
            <ModalFooter>
                <Button variant="ghost" mr={3} onClick={envModal.onClose}>Cancel</Button>
                <Button
                    bgGradient="linear(to-r, purple.500, blue.500)"
                    color="white"
                    _hover={{ bgGradient: 'linear(to-r, purple.600, blue.600)' }}
                    onClick={(): void => {
                        saveEnvironment()
                        envModal.onClose()
                    }}
                    isDisabled={!newEnvName.trim()}
                >
                    Save
                </Button>
            </ModalFooter>
        </ModalContent>
    </Modal>
)

const SaveRequestModal = ({ requestModal, newRequestName, setNewRequestName, saveRequest, selectedCollectionId, setSelectedCollectionId, collections, cardBg, inputBg, borderColor }: Pick<DashboardModalsProps, 'requestModal' | 'newRequestName' | 'setNewRequestName' | 'saveRequest' | 'selectedCollectionId' | 'setSelectedCollectionId' | 'collections' | 'cardBg' | 'inputBg' | 'borderColor'>): JSX.Element => (
    <Modal isOpen={requestModal.isOpen} onClose={requestModal.onClose}>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent bg={cardBg} borderRadius="xl" borderColor={borderColor} border="1px">
            <ModalHeader>Save Request</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
                <VStack spacing={4}>
                    <FormControl isRequired>
                        <FormLabel fontSize="sm" fontWeight="bold">Request Name</FormLabel>
                        <Input
                            value={newRequestName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setNewRequestName(e.target.value)}
                            bg={inputBg}
                            borderColor={borderColor}
                            focusBorderColor="purple.400"
                        />
                    </FormControl>
                    <FormControl isRequired>
                        <FormLabel fontSize="sm" fontWeight="bold">Collection</FormLabel>
                        <Select
                            value={selectedCollectionId}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>): void => setSelectedCollectionId(e.target.value)}
                            bg={inputBg}
                            borderColor={borderColor}
                            focusBorderColor="purple.400"
                        >
                            <option value="">Select a collection</option>
                            {collections.map((col) => (
                                <option key={col.id} value={col.id}>{col.name}</option>
                            ))}
                        </Select>
                    </FormControl>
                </VStack>
            </ModalBody>
            <ModalFooter>
                <Button variant="ghost" mr={3} onClick={requestModal.onClose}>Cancel</Button>
                <Button
                    bgGradient="linear(to-r, purple.500, blue.500)"
                    color="white"
                    _hover={{ bgGradient: 'linear(to-r, purple.600, blue.600)' }}
                    onClick={(): void => {
                        saveRequest()
                        requestModal.onClose()
                    }}
                    isDisabled={!newRequestName.trim() || !selectedCollectionId}
                >
                    Save
                </Button>
            </ModalFooter>
        </ModalContent>
    </Modal>
)

const SettingsModal = ({ settingsModal, settings, setSettings, cardBg, inputBg, borderColor, mutedText }: Pick<DashboardModalsProps, 'settingsModal' | 'settings' | 'setSettings' | 'cardBg' | 'inputBg' | 'borderColor' | 'mutedText'>): JSX.Element => {
    const { colorMode, toggleColorMode } = useColorMode()

    return (
        <Modal isOpen={settingsModal.isOpen} onClose={settingsModal.onClose}>
            <ModalOverlay backdropFilter="blur(4px)" />
            <ModalContent bg={cardBg} borderRadius="xl" borderColor={borderColor} border="1px">
                <ModalHeader>Request Settings</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <VStack spacing={6} align="stretch">
                        <FormControl display="flex" alignItems="center" justifyContent="space-between">
                            <Box>
                                <FormLabel mb="0" fontSize="sm" fontWeight="bold">Dark Mode</FormLabel>
                                <Text fontSize="xs" color={mutedText}>Toggle application theme</Text>
                            </Box>
                            <Switch
                                colorScheme="purple"
                                isChecked={colorMode === 'dark'}
                                onChange={toggleColorMode}
                            />
                        </FormControl>
                        <FormControl display="flex" alignItems="center" justifyContent="space-between">
                            <Box>
                                <FormLabel mb="0" fontSize="sm" fontWeight="bold">SSL Verification</FormLabel>
                                <Text fontSize="xs" color={mutedText}>Verify SSL certificates for HTTPS requests</Text>
                            </Box>
                            <Switch
                                colorScheme="purple"
                                isChecked={settings.sslVerification}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setSettings({ ...settings, sslVerification: e.target.checked })}
                            />
                        </FormControl>

                        <FormControl display="flex" alignItems="center" justifyContent="space-between">
                            <Box>
                                <FormLabel mb="0" fontSize="sm" fontWeight="bold">Follow Redirects</FormLabel>
                                <Text fontSize="xs" color={mutedText}>Automatically follow HTTP redirects</Text>
                            </Box>
                            <Switch
                                colorScheme="purple"
                                isChecked={settings.followRedirects}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setSettings({ ...settings, followRedirects: e.target.checked })}
                            />
                        </FormControl>

                        <FormControl>
                            <FormLabel fontSize="sm" fontWeight="bold">Request Timeout (seconds)</FormLabel>
                            <NumberInput
                                value={settings.timeout ?? 30}
                                min={1}
                                max={300}
                                onChange={(_: string, val: number): void => setSettings({ ...settings, timeout: val })}
                            >
                                <NumberInputField borderColor={borderColor} bg={inputBg} />
                                <NumberInputStepper>
                                    <NumberIncrementStepper />
                                    <NumberDecrementStepper />
                                </NumberInputStepper>
                            </NumberInput>
                        </FormControl>
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Button colorScheme="purple" onClick={settingsModal.onClose}>Close</Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
}

const ConflictModal = ({ conflictModal, handleConflictReload, handleConflictOverwrite, handleConflictSaveAsNew, cardBg, borderColor }: Pick<DashboardModalsProps, 'conflictModal' | 'handleConflictReload' | 'handleConflictOverwrite' | 'handleConflictSaveAsNew' | 'cardBg' | 'borderColor'>): JSX.Element => (
    <Modal isOpen={conflictModal.isOpen} onClose={conflictModal.onClose} closeOnOverlayClick={false}>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent bg={cardBg} borderRadius="xl" borderColor={borderColor} border="1px">
            <ModalHeader color="orange.500">Version Conflict</ModalHeader>
            <ModalBody>
                <Alert status="warning" borderRadius="md" mb={4}>
                    <AlertIcon />
                    <Text fontSize="sm">
                        This request has been modified on the server since you last loaded it.
                        Please choose how to proceed.
                    </Text>
                </Alert>
                <VStack align="stretch" spacing={3}>
                    <Button variant="outline" leftIcon={<FiRefreshCw />} onClick={handleConflictReload}>
                        Reload Server Version
                    </Button>
                    <Button
                        bgGradient="linear(to-r, orange.400, red.500)"
                        color="white"
                        _hover={{ bgGradient: 'linear(to-r, orange.500, red.600)' }}
                        onClick={handleConflictOverwrite}
                    >
                        Overwrite Server Version
                    </Button>
                    <Divider borderColor={borderColor} />
                    <Button variant="ghost" onClick={handleConflictSaveAsNew}>
                        Save My Changes as New Request
                    </Button>
                </VStack>
            </ModalBody>
            <ModalFooter>
                <Button variant="ghost" onClick={conflictModal.onClose}>Cancel</Button>
            </ModalFooter>
        </ModalContent>
    </Modal>
)

const SnippetModal = ({ snippetModal, activeTab, toast, cardBg, inputBg, borderColor }: Pick<DashboardModalsProps, 'snippetModal' | 'activeTab' | 'toast' | 'cardBg' | 'inputBg' | 'borderColor'>): JSX.Element => {
    const [selectedLang, setSelectedLang] = useState<SnippetLanguage>('javascript-fetch')

    return (
        <Modal isOpen={snippetModal.isOpen} onClose={snippetModal.onClose} size="4xl">
            <ModalOverlay backdropFilter="blur(4px)" />
            <ModalContent bg={cardBg} borderRadius="xl" borderColor={borderColor} border="1px" maxH="80vh">
                <ModalHeader>Code Snippet</ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                    <VStack align="stretch" spacing={4}>
                        <HStack>
                            <Text fontSize="sm" fontWeight="bold" minW="120px">Language:</Text>
                            <Select
                                size="sm"
                                value={selectedLang}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>): void => setSelectedLang(e.target.value as SnippetLanguage)}
                                bg={inputBg}
                                borderColor={borderColor}
                                focusBorderColor="purple.400"
                                w="200px"
                            >
                                {snippetLanguages.map(lang => (
                                    <option key={lang.id} value={lang.id}>{lang.name}</option>
                                ))}
                            </Select>
                        </HStack>
                        <Box border="1px solid" borderColor={borderColor} borderRadius="md" overflow="hidden">
                            <CodeEditor
                                value={activeTab ? generateSnippet(selectedLang, tabToConfig(activeTab)) : ''}
                                language={selectedLang === 'curl' ? 'shell' : 'javascript'}
                                height="400px"
                                readOnly
                            />
                        </Box>
                        <Button
                            leftIcon={<FiSettings />}
                            size="sm"
                            onClick={(): void => {
                                if (activeTab) {
                                    const snippet = generateSnippet(selectedLang, tabToConfig(activeTab))
                                    void navigator.clipboard.writeText(snippet)
                                    toast({ title: 'Snippet copied!', status: 'success', duration: 1500 })
                                }
                            }}
                        >
                            Copy to Clipboard
                        </Button>
                    </VStack>
                </ModalBody>
            </ModalContent>
        </Modal>
    )
}

const ImportModal = ({ importModal, fileInputRef, handleFileImport, importing, cardBg, borderColor, mutedText }: Pick<DashboardModalsProps, 'importModal' | 'fileInputRef' | 'handleFileImport' | 'importing' | 'cardBg' | 'borderColor' | 'mutedText'>): JSX.Element => (
    <Modal isOpen={importModal.isOpen} onClose={importModal.onClose}>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent bg={cardBg} borderRadius="xl" borderColor={borderColor} border="1px">
            <ModalHeader>Import Collection</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
                <VStack spacing={4} align="stretch">
                    <Text fontSize="sm" color={mutedText}>Choose a Postman collection file to import.</Text>
                    <Input type="file" ref={fileInputRef} onChange={handleFileImport} display="none" />
                    <Button leftIcon={<FiRefreshCw />} onClick={(): void => { fileInputRef.current?.click() }} isLoading={importing}>Select File</Button>
                </VStack>
            </ModalBody>
            <ModalFooter>
                <Button variant="ghost" mr={3} onClick={importModal.onClose}>Close</Button>
            </ModalFooter>
        </ModalContent>
    </Modal>
)

export const DashboardModals = (props: DashboardModalsProps): JSX.Element => {
    const {
        collectionModal, newCollectionName, setNewCollectionName, createCollection,
        editCollectionModal, editingCollection, setEditingCollection, saveCollection, deleteCollection,
        requestModal, newRequestName, setNewRequestName, saveRequest, selectedCollectionId, setSelectedCollectionId, collections,
        envModal, newEnvName, setNewEnvName, newEnvVariables, setNewEnvVariables, saveEnvironment, editingEnvId,
        envManagerModal, environments, selectedEnvId, setSelectedEnvId, loadEnvironments,
        settingsModal, settings, setSettings, conflictModal, handleConflictReload, handleConflictOverwrite, handleConflictSaveAsNew,
        snippetModal, activeTab, toast, importModal, handleFileImport, fileInputRef, importing,
        openApiViewerModal, openApiSpec, viewerCollectionId, setViewerCollectionId, loadCollectionDocs,
        createNewTab, setTabs, setActiveTabId, cardBg, inputBg, borderColor, mutedText, methodColors,
    } = props

    return (
        <>
            <CreateCollectionModal {...{ collectionModal, newCollectionName, setNewCollectionName, createCollection, cardBg, inputBg, borderColor }} />
            <EditCollectionModal {...{ editCollectionModal, editingCollection, setEditingCollection, saveCollection, deleteCollection, cardBg, inputBg, borderColor }} />
            <SaveRequestModal {...{ requestModal, newRequestName, setNewRequestName, saveRequest, selectedCollectionId, setSelectedCollectionId, collections, cardBg, inputBg, borderColor }} />
            <EnvModal {...{ envModal, editingEnvId, newEnvName, setNewEnvName, newEnvVariables, setNewEnvVariables, saveEnvironment, cardBg, inputBg, borderColor }} />
            <SettingsModal {...{ settingsModal, settings, setSettings, cardBg, inputBg, borderColor, mutedText }} />
            <ConflictModal {...{ conflictModal, handleConflictReload, handleConflictOverwrite, handleConflictSaveAsNew, cardBg, borderColor }} />
            <SnippetModal {...{ snippetModal, activeTab, toast, cardBg, inputBg, borderColor }} />
            <ImportModal {...{ importModal, fileInputRef, handleFileImport, importing, cardBg, borderColor, mutedText }} />

            <EnvironmentManager
                isOpen={envManagerModal.isOpen}
                onClose={envManagerModal.onClose}
                environments={environments}
                selectedEnvId={selectedEnvId}
                setSelectedEnvId={setSelectedEnvId}
                onCreateEnvironment={async (name, variables) => {
                    // Temporarily set the values for the existing handler
                    setNewEnvName(name)
                    setNewEnvVariables(variables)
                    // Use the existing save handler
                    await saveEnvironment()
                    return { success: true }
                }}
                onUpdateEnvironment={async (id, name, variables) => {
                    // Import the updateEnvironment function
                    const { updateEnvironment } = await import('../_scripts/environmentHandlers')
                    const result = await updateEnvironment(id, name, variables)
                    return result
                }}
                onDeleteEnvironment={async (id) => {
                    const { deleteEnvironment: deleteEnvAPI } = await import('../_scripts/environmentHandlers')
                    const result = await deleteEnvAPI(id)
                    return result
                }}
                onRefresh={loadEnvironments}
                toast={toast}
            />

            <OpenApiDocsViewer
                isOpen={openApiViewerModal.isOpen}
                onClose={openApiViewerModal.onClose}
                openApiSpec={openApiSpec}
                viewerCollectionId={viewerCollectionId}
                setViewerCollectionId={setViewerCollectionId}
                loadCollectionDocs={loadCollectionDocs}
                loadingOpenApi={importing}
                createNewTab={createNewTab}
                setTabs={setTabs}
                setActiveTabId={setActiveTabId}
                cardBg={cardBg}
                inputBg={inputBg}
                borderColor={borderColor}
                mutedText={mutedText}
                methodColors={methodColors}
                toast={toast}
                collections={collections}
            />
        </>
    )
}
