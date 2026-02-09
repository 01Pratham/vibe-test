'use client'

import {
    FiMenu,
} from 'react-icons/fi'
import { Panel, Group as PanelGroup } from 'react-resizable-panels'

import {
    Box,
    Flex,
    HStack,
    IconButton,
    Drawer,
    DrawerOverlay,
    DrawerContent,
    DrawerBody,
} from '@chakra-ui/react'

// Internal Imports
import { ResizeHandle } from '../components/ResizeHandle'
import { Sidebar } from '../components/Sidebar'

import { DashboardModals } from './_components/DashboardModals'
import { RequestPanel } from './_components/RequestPanel'
import { RequestTabs } from './_components/RequestTabs'
import { ResponsePanel } from './_components/ResponsePanel'
import { useDashboardLogic } from './_hooks/useDashboardLogic'
import {
    parseHeaders,
    formatResponseBody
} from './_scripts/requestHandlers'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, max-lines-per-function
const DashboardPage = (): JSX.Element => {
    const {
        // UI
        toast, // Add toast here
        fileInputRef,

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
        body,
        setBody,
        bodyType,
        setBodyType,
        formData,
        response,
        executing,
        preRequestScript,
        setPreRequestScript,
        postRequestScript,
        setPostRequestScript,
        currentVariables,
        methodColors,
        // Handlers
        loadEnvironments,
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
        addHeaderRow,
        updateHeaderField,
        removeHeaderRow,
        addFormDataRow,
        updateFormData: updateFormDataHandler, // Use aliased version
        updateFormDataFile,
        removeFormDataRow,
        isHtmlResponse,
        isJsonResponse,
        handleImportPostmanString, // Add this
    } = useDashboardLogic()

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-unused-vars
    const parseHeadersWrapper = () => parseHeaders(headers)

    return (
        <Flex h="100vh" bg={bgColor} overflow="hidden">
            {/* Desktop Resizable Layout */}
            <PanelGroup orientation="horizontal">
                {isDesktop && isSidebarOpen && (
                    <>
                        <Panel defaultSize={"25%"} minSize={"10%"} maxSize={"40%"} id="sidebar-panel">
                            <Box h="full" bg={sidebarBg}>
                                <Sidebar
                                    sidebarBg={sidebarBg}
                                    borderColor={borderColor}
                                    hoverBg={hoverBg}
                                    activeTab={activeTab}
                                    collections={collections}
                                    loadingCollections={loadingCollections}
                                    environments={environments}
                                    selectedEnvId={selectedEnvId}
                                    history={history}
                                    showHistory={showHistory}
                                    setShowHistory={setShowHistory}
                                    importModal={importModal}
                                    collectionModal={collectionModal}
                                    envModal={envModal}
                                    envManagerModal={envManagerModal}
                                    openApiViewerModal={openApiViewerModal}
                                    settingsModal={settingsModal}
                                    setEditingEnvId={setEditingEnvId}
                                    setNewEnvName={setNewEnvName}
                                    setNewEnvVariables={setNewEnvVariables}
                                    loadRequest={handleLoadRequest}
                                    deleteRequest={handleDeleteRequest}
                                    setSelectedEnvId={setSelectedEnvId}
                                    exportOpenApi={handleExportOpenApi}
                                    exportPostman={handleExportPostman}
                                    loadHistoryItem={handleLoadHistoryItem}
                                    clearHistory={handleClearHistory}
                                    deleteHistoryItem={handleDeleteHistoryItem}
                                    onCloseSidebar={onCloseSidebar}
                                    editCollectionModal={editCollectionModal}
                                    setEditingCollection={setEditingCollection}
                                />
                            </Box>
                        </Panel>
                        {isDesktop && <ResizeHandle direction="horizontal" />}
                    </>
                )}

                {/* Mobile Sidebar */}
                {!isDesktop && (
                    <Drawer isOpen={isSidebarOpen} placement="left" onClose={toggleSidebar} size="xs">
                        <DrawerOverlay />
                        <DrawerContent bg={sidebarBg}>
                            <DrawerBody p={0}>
                                <Sidebar
                                    sidebarBg={sidebarBg}
                                    borderColor={borderColor}
                                    hoverBg={hoverBg}
                                    activeTab={activeTab}
                                    collections={collections}
                                    loadingCollections={loadingCollections}
                                    environments={environments}
                                    selectedEnvId={selectedEnvId}
                                    history={history}
                                    showHistory={showHistory}
                                    setShowHistory={setShowHistory}
                                    importModal={importModal}
                                    collectionModal={collectionModal}
                                    envModal={envModal}
                                    envManagerModal={envManagerModal}
                                    openApiViewerModal={openApiViewerModal}
                                    settingsModal={settingsModal}
                                    setEditingEnvId={setEditingEnvId}
                                    setNewEnvName={setNewEnvName}
                                    setNewEnvVariables={setNewEnvVariables}
                                    loadRequest={handleLoadRequest}
                                    deleteRequest={handleDeleteRequest}
                                    setSelectedEnvId={setSelectedEnvId}
                                    exportOpenApi={handleExportOpenApi}
                                    exportPostman={handleExportPostman}
                                    loadHistoryItem={handleLoadHistoryItem}
                                    clearHistory={handleClearHistory}
                                    deleteHistoryItem={handleDeleteHistoryItem}
                                    onCloseSidebar={onCloseSidebar}
                                    editCollectionModal={editCollectionModal}
                                    setEditingCollection={setEditingCollection}
                                />
                            </DrawerBody>
                        </DrawerContent>
                    </Drawer>
                )}

                <Panel minSize={30}>
                    <Flex flex="1" direction="column" overflow="hidden" w="full" h="full">
                        {/* Tab Bar */}
                        <HStack
                            px={2} py={2} spacing={2}
                            borderBottom="1px" borderColor={borderColor}
                            bg={typeof window !== 'undefined' ? (window.localStorage.getItem('chakra-ui-color-mode') === 'dark' ? 'rgba(23, 25, 35, 0.6)' : 'rgba(255, 255, 255, 0.6)') : 'transparent'}
                            backdropFilter="blur(8px)"
                            zIndex={9}
                        >
                            <IconButton
                                aria-label="Toggle Sidebar"
                                icon={<FiMenu />}
                                variant="ghost"
                                size="sm"
                                onClick={toggleSidebar}
                            />

                            <RequestTabs
                                tabs={tabs}
                                activeTabId={activeTabId}
                                setActiveTabId={setActiveTabId}
                                setTabs={setTabs}
                                createNewTab={createNewTab}
                                cardBg={cardBg}
                                hoverBg={hoverBg}
                                borderColor={borderColor}
                            />

                        </HStack>

                        {/* Request & Response Panels */}
                        <PanelGroup orientation="vertical">
                            <Panel defaultSize={50} minSize={30}>
                                <RequestPanel
                                    method={method}
                                    setMethod={setMethod}
                                    url={url}
                                    setUrl={setUrl}
                                    executeRequest={handleExecuteRequest}
                                    executing={executing}
                                    snippetModal={snippetModal}
                                    currentRequest={currentRequest}
                                    updateRequest={handleUpdateRequest}
                                    collections={collections}
                                    setSelectedCollectionId={setSelectedCollectionId}
                                    requestModal={requestModal}
                                    headers={headers}
                                    updateHeader={updateHeaderField}
                                    removeHeader={removeHeaderRow}
                                    addHeaderRow={addHeaderRow}
                                    bodyType={bodyType}
                                    setBodyType={setBodyType}
                                    body={body}
                                    setBody={setBody}
                                    formData={formData}
                                    updateFormData={updateFormDataHandler}
                                    updateFormDataFile={updateFormDataFile}
                                    removeFormDataRow={removeFormDataRow}
                                    addFormDataRow={addFormDataRow}
                                    inputBg={inputBg}
                                    borderColor={borderColor}
                                    cardBg={cardBg}
                                    hoverBg={hoverBg}
                                    mutedText={mutedText}
                                    preRequestScript={preRequestScript}
                                    setPreRequestScript={setPreRequestScript}
                                    postRequestScript={postRequestScript}
                                    setPostRequestScript={setPostRequestScript}
                                    variables={currentVariables}
                                />
                            </Panel>

                            <ResizeHandle direction="vertical" />

                            <Panel minSize={20} maxSize={"70%"} defaultSize={"40%"}>
                                <ResponsePanel
                                    executing={executing}
                                    response={response}
                                    saveToHistory={handleSaveToHistory}
                                    formatResponseBody={formatResponseBody}
                                    isHtmlResponse={isHtmlResponse}
                                    isJsonResponse={isJsonResponse}
                                    cardBg={cardBg}
                                    mutedText={mutedText}
                                    headingColor={headingColor}
                                />
                            </Panel>
                        </PanelGroup>
                    </Flex>
                </Panel>
            </PanelGroup>

            {/* Dashboard Modals */}
            <DashboardModals
                importModal={importModal}
                collectionModal={collectionModal}
                requestModal={requestModal}
                envModal={envModal}
                envManagerModal={envManagerModal}
                snippetModal={snippetModal}
                conflictModal={conflictModal}
                openApiViewerModal={openApiViewerModal}
                settingsModal={settingsModal}
                newCollectionName={newCollectionName}
                setNewCollectionName={setNewCollectionName}
                newRequestName={newRequestName}
                setNewRequestName={setNewRequestName}
                createCollection={handleCreateCollection}
                saveRequest={handleSaveRequest}
                newEnvName={newEnvName}
                setNewEnvName={setNewEnvName}
                newEnvVariables={newEnvVariables}
                setNewEnvVariables={setNewEnvVariables}
                editingEnvId={editingEnvId}
                saveEnvironment={handleSaveEnvironment}
                deleteEnvironment={handleDeleteEnvironment}
                environments={environments}
                selectedEnvId={selectedEnvId}
                setSelectedEnvId={setSelectedEnvId}
                loadEnvironments={loadEnvironments}
                fileInputRef={fileInputRef}
                handleFileImport={handleFileImportWrapper}
                importing={importing}
                collections={collections}
                toast={toast}
                activeTab={activeTab}
                conflictData={conflictData}
                handleConflictReload={handleConflictReload}
                handleConflictOverwrite={handleConflictOverwrite}
                handleConflictSaveAsNew={handleConflictSaveAsNew}
                methodColors={methodColors}
                viewerCollectionId={viewerCollectionId}
                setViewerCollectionId={setViewerCollectionId}
                loadCollectionDocs={handleLoadCollectionDocs}
                loadingOpenApi={loadingOpenApi}
                openApiSpec={openApiSpec}
                createNewTab={createNewTab}
                setTabs={setTabs}
                setActiveTabId={setActiveTabId}
                settings={settings}
                setSettings={setSettings}
                defaultSettings={defaultSettings}
                editCollectionModal={editCollectionModal}
                editingCollection={editingCollection}
                setEditingCollection={setEditingCollection}
                saveCollection={handleSaveCollection}
                deleteCollection={handleDeleteCollection}
                setSelectedCollectionId={setSelectedCollectionId} // Added
                importPostman={handleImportPostmanString} // Added
                cardBg={cardBg}
                inputBg={inputBg}
                borderColor={borderColor}
                mutedText={mutedText}
            />
        </Flex>
    )
}

export default DashboardPage
