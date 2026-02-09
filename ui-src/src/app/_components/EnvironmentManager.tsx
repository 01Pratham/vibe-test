'use client'

import { useState } from 'react'
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalCloseButton,
    ModalBody,
    ModalFooter,
    Button,
    VStack,
    HStack,
    Box,
    Text,
    Input,
    IconButton,
    Divider,
    Badge,
    useColorModeValue,
    Tabs,
    TabList,
    TabPanels,
    Tab,
    TabPanel,
    FormControl,
    FormLabel,
    FormHelperText,
    Tooltip,
    Alert,
    AlertIcon,
    Flex,
    Spacer,
} from '@chakra-ui/react'
import type { UseToastOptions } from '@chakra-ui/react'
import { FiPlus, FiTrash2, FiEdit2, FiCheck, FiX, FiCopy } from 'react-icons/fi'

import { CodeEditor } from '../../components/CodeEditor'

import type { Environment } from '../../types'

interface EnvironmentManagerProps {
    isOpen: boolean
    onClose: () => void
    environments: Environment[]
    selectedEnvId: string
    setSelectedEnvId: (id: string) => void
    onCreateEnvironment: (name: string, variables: string) => Promise<{ success: boolean; error?: string }>
    onUpdateEnvironment: (id: string, name: string, variables: string) => Promise<{ success: boolean; error?: string }>
    onDeleteEnvironment: (id: string) => Promise<{ success: boolean; error?: string }>
    onRefresh: () => void
    toast: (options: UseToastOptions) => string | number | undefined
}

interface EditingEnv {
    id: string
    name: string
    variables: string
}

/**
 * Environment Manager Modal - Comprehensive environment management UI
 */
export const EnvironmentManager = ({
    isOpen,
    onClose,
    environments,
    selectedEnvId,
    setSelectedEnvId,
    onCreateEnvironment,
    onUpdateEnvironment,
    onDeleteEnvironment,
    onRefresh,
    toast,
}: EnvironmentManagerProps): JSX.Element => {
    const cardBg = useColorModeValue('white', 'gray.800')
    const inputBg = useColorModeValue('gray.100', 'gray.700')
    const borderColor = useColorModeValue('gray.200', 'gray.700')
    const mutedText = useColorModeValue('gray.500', 'gray.400')
    const hoverBg = useColorModeValue('gray.50', 'gray.700')
    const selectedBg = useColorModeValue('purple.50', 'purple.900')

    const [activeTabIndex, setActiveTabIndex] = useState(0)
    const [editingEnvs, setEditingEnvs] = useState<Record<string, EditingEnv>>({})
    const [newEnvName, setNewEnvName] = useState('')
    const [newEnvVariables, setNewEnvVariables] = useState('{}')
    const [creating, setCreating] = useState(false)

    /**
     * Start editing an environment
     */
    const startEditing = (env: Environment): void => {
        setEditingEnvs({
            ...editingEnvs,
            [env.id]: {
                id: env.id,
                name: env.name,
                variables: env.variables,
            },
        })
    }

    /**
     * Cancel editing an environment
     */
    const cancelEditing = (envId: string): void => {
        const updated = { ...editingEnvs }
        delete updated[envId]
        setEditingEnvs(updated)
    }

    /**
     * Save edited environment
     */
    const saveEditing = async (envId: string): Promise<void> => {
        const editing = editingEnvs[envId]
        if (!editing) {
            return
        }

        // Validate JSON
        try {
            JSON.parse(editing.variables)
        } catch {
            toast({ title: 'Invalid JSON', description: 'Please check your variables format', status: 'error', duration: 3000 })
            return
        }

        const result = await onUpdateEnvironment(editing.id, editing.name, editing.variables)
        if (result.success) {
            toast({ title: 'Environment updated', status: 'success', duration: 2000 })
            cancelEditing(envId)
            onRefresh()
        } else {
            toast({ title: result.error ?? 'Update failed', status: 'error', duration: 3000 })
        }
    }

    /**
     * Update editing environment field
     */
    const updateEditingField = (envId: string, field: 'name' | 'variables', value: string): void => {
        setEditingEnvs({
            ...editingEnvs,
            [envId]: {
                ...editingEnvs[envId],
                [field]: value,
            },
        })
    }

    /**
     * Delete environment with confirmation
     */
    const handleDelete = async (env: Environment): Promise<void> => {
        // eslint-disable-next-line no-alert
        if (!window.confirm(`Are you sure you want to delete "${env.name}"?`)) {
            return
        }

        const result = await onDeleteEnvironment(env.id)
        if (result.success) {
            toast({ title: 'Environment deleted', status: 'success', duration: 2000 })
            onRefresh()
        } else {
            toast({ title: result.error ?? 'Delete failed', status: 'error', duration: 3000 })
        }
    }

    /**
     * Duplicate environment
     */
    const handleDuplicate = (env: Environment): void => {
        setNewEnvName(`${env.name} (Copy)`)
        setNewEnvVariables(env.variables)
        setActiveTabIndex(1) // Switch to create tab
    }

    /**
     * Create new environment
     */
    const handleCreate = async (): Promise<void> => {
        if (!newEnvName.trim()) {
            toast({ title: 'Name required', description: 'Please enter an environment name', status: 'warning', duration: 2000 })
            return
        }

        // Validate JSON
        try {
            JSON.parse(newEnvVariables)
        } catch {
            toast({ title: 'Invalid JSON', description: 'Please check your variables format', status: 'error', duration: 3000 })
            return
        }

        setCreating(true)
        const result = await onCreateEnvironment(newEnvName, newEnvVariables)
        setCreating(false)

        if (result.success) {
            toast({ title: 'Environment created', status: 'success', duration: 2000 })
            setNewEnvName('')
            setNewEnvVariables('{}')
            onRefresh()
            setActiveTabIndex(0) // Switch back to manage tab
        } else {
            toast({ title: result.error ?? 'Create failed', status: 'error', duration: 3000 })
        }
    }

    /**
     * Select environment
     */
    const handleSelect = (envId: string): void => {
        setSelectedEnvId(envId)
        toast({ title: 'Environment selected', status: 'info', duration: 1500 })
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="6xl">
            <ModalOverlay backdropFilter="blur(4px)" />
            <ModalContent bg={cardBg} borderRadius="xl" borderColor={borderColor} border="1px" maxH="90vh">
                <ModalHeader>Environment Manager</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <Tabs index={activeTabIndex} onChange={setActiveTabIndex} colorScheme="purple">
                        <TabList>
                            <Tab>
                                Manage Environments
                                <Badge ml={2} colorScheme="purple">
                                    {environments.length}
                                </Badge>
                            </Tab>
                            <Tab>Create New Environment</Tab>
                        </TabList>

                        <TabPanels>
                            {/* Manage Environments Tab */}
                            <TabPanel>
                                {environments.length === 0 ? (
                                    <Alert status="info" borderRadius="md">
                                        <AlertIcon />
                                        <Text fontSize="sm">
                                            No environments yet. Create your first environment to get started!
                                        </Text>
                                    </Alert>
                                ) : (
                                    <VStack spacing={3} align="stretch" maxH="60vh" overflowY="auto" pr={2}>
                                        {environments.map((env) => {
                                            const isEditing = Boolean(editingEnvs[env.id])
                                            const isSelected = selectedEnvId === env.id

                                            return (
                                                <Box
                                                    key={env.id}
                                                    p={4}
                                                    borderRadius="lg"
                                                    border="2px solid"
                                                    borderColor={isSelected ? 'purple.400' : borderColor}
                                                    bg={isSelected ? selectedBg : hoverBg}
                                                    transition="all 0.2s"
                                                    _hover={{ borderColor: 'purple.300' }}
                                                >
                                                    {isEditing ? (
                                                        // Edit Mode
                                                        <VStack spacing={3} align="stretch">
                                                            <FormControl>
                                                                <FormLabel fontSize="sm" fontWeight="bold">
                                                                    Name
                                                                </FormLabel>
                                                                <Input
                                                                    value={editingEnvs[env.id].name}
                                                                    onChange={(e): void =>
                                                                        updateEditingField(env.id, 'name', e.target.value)
                                                                    }
                                                                    bg={inputBg}
                                                                    borderColor={borderColor}
                                                                    focusBorderColor="purple.400"
                                                                    size="sm"
                                                                />
                                                            </FormControl>
                                                            <FormControl>
                                                                <FormLabel fontSize="sm" fontWeight="bold">
                                                                    Variables (JSON)
                                                                </FormLabel>
                                                                <Box
                                                                    border="1px solid"
                                                                    borderColor={borderColor}
                                                                    borderRadius="md"
                                                                    overflow="hidden"
                                                                >
                                                                    <CodeEditor
                                                                        value={editingEnvs[env.id].variables}
                                                                        onChange={(v): void =>
                                                                            updateEditingField(env.id, 'variables', v ?? '{}')
                                                                        }
                                                                        language="json"
                                                                        height="150px"
                                                                    />
                                                                </Box>
                                                            </FormControl>
                                                            <HStack justify="flex-end">
                                                                <Button
                                                                    size="sm"
                                                                    leftIcon={<FiX />}
                                                                    onClick={(): void => cancelEditing(env.id)}
                                                                >
                                                                    Cancel
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    colorScheme="purple"
                                                                    leftIcon={<FiCheck />}
                                                                    onClick={(): void => {
                                                                        void saveEditing(env.id)
                                                                    }}
                                                                >
                                                                    Save Changes
                                                                </Button>
                                                            </HStack>
                                                        </VStack>
                                                    ) : (
                                                        // View Mode
                                                        <VStack spacing={2} align="stretch">
                                                            <Flex align="center">
                                                                <Text fontWeight="bold" fontSize="lg">
                                                                    {env.name}
                                                                </Text>
                                                                {isSelected && (
                                                                    <Badge ml={2} colorScheme="purple">
                                                                        Active
                                                                    </Badge>
                                                                )}
                                                                <Spacer />
                                                                <HStack spacing={1}>
                                                                    {!isSelected && (
                                                                        <Button
                                                                            size="sm"
                                                                            colorScheme="purple"
                                                                            variant="outline"
                                                                            onClick={(): void => handleSelect(env.id)}
                                                                        >
                                                                            Select
                                                                        </Button>
                                                                    )}
                                                                    <Tooltip label="Duplicate">
                                                                        <IconButton
                                                                            aria-label="Duplicate environment"
                                                                            icon={<FiCopy />}
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            onClick={(): void => handleDuplicate(env)}
                                                                        />
                                                                    </Tooltip>
                                                                    <Tooltip label="Edit">
                                                                        <IconButton
                                                                            aria-label="Edit environment"
                                                                            icon={<FiEdit2 />}
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            onClick={(): void => startEditing(env)}
                                                                        />
                                                                    </Tooltip>
                                                                    <Tooltip label="Delete">
                                                                        <IconButton
                                                                            aria-label="Delete environment"
                                                                            icon={<FiTrash2 />}
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            colorScheme="red"
                                                                            onClick={(): void => {
                                                                                void handleDelete(env)
                                                                            }}
                                                                        />
                                                                    </Tooltip>
                                                                </HStack>
                                                            </Flex>
                                                            <Divider />
                                                            <Box>
                                                                <Text fontSize="xs" color={mutedText} mb={1}>
                                                                    Variables:
                                                                </Text>
                                                                <Box
                                                                    p={2}
                                                                    bg={inputBg}
                                                                    borderRadius="md"
                                                                    fontSize="xs"
                                                                    fontFamily="mono"
                                                                    maxH="100px"
                                                                    overflowY="auto"
                                                                >
                                                                    <pre>{env.variables}</pre>
                                                                </Box>
                                                            </Box>
                                                        </VStack>
                                                    )}
                                                </Box>
                                            )
                                        })}
                                    </VStack>
                                )}
                            </TabPanel>

                            {/* Create New Environment Tab */}
                            <TabPanel>
                                <VStack spacing={4} align="stretch">
                                    <Alert status="info" borderRadius="md">
                                        <AlertIcon />
                                        <Text fontSize="sm">
                                            Create a new environment to manage different API configurations (e.g., Development,
                                            Staging, Production)
                                        </Text>
                                    </Alert>

                                    <FormControl isRequired>
                                        <FormLabel fontSize="sm" fontWeight="bold">
                                            Environment Name
                                        </FormLabel>
                                        <Input
                                            value={newEnvName}
                                            onChange={(e): void => setNewEnvName(e.target.value)}
                                            placeholder="e.g. Production, Development, Staging"
                                            bg={inputBg}
                                            borderColor={borderColor}
                                            focusBorderColor="purple.400"
                                        />
                                    </FormControl>

                                    <FormControl>
                                        <FormLabel fontSize="sm" fontWeight="bold">
                                            Variables (JSON)
                                        </FormLabel>
                                        <Box border="1px solid" borderColor={borderColor} borderRadius="md" overflow="hidden">
                                            <CodeEditor
                                                value={newEnvVariables}
                                                onChange={(v): void => setNewEnvVariables(v ?? '{}')}
                                                language="json"
                                                height="300px"
                                            />
                                        </Box>
                                        <FormHelperText fontSize="xs">
                                            Define key-value pairs like {`{"BASE_URL": "https://api.example.com", "API_KEY": "your-key"}`}
                                        </FormHelperText>
                                    </FormControl>

                                    <HStack justify="flex-end" pt={4}>
                                        <Button
                                            variant="ghost"
                                            onClick={(): void => {
                                                setNewEnvName('')
                                                setNewEnvVariables('{}')
                                            }}
                                        >
                                            Clear
                                        </Button>
                                        <Button
                                            leftIcon={<FiPlus />}
                                            bgGradient="linear(to-r, purple.500, blue.500)"
                                            color="white"
                                            _hover={{ bgGradient: 'linear(to-r, purple.600, blue.600)' }}
                                            onClick={(): void => {
                                                void handleCreate()
                                            }}
                                            isLoading={creating}
                                            isDisabled={!newEnvName.trim()}
                                        >
                                            Create Environment
                                        </Button>
                                    </HStack>
                                </VStack>
                            </TabPanel>
                        </TabPanels>
                    </Tabs>
                </ModalBody>
                <ModalFooter>
                    <Button variant="ghost" onClick={onClose}>
                        Close
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
}
