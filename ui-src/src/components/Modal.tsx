'use client'

import type { ReactNode } from 'react'
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalCloseButton,
    ModalBody,
    ModalFooter,
    Button,
} from '@chakra-ui/react'
import type { UseDisclosureReturn } from '@chakra-ui/react'

export interface BaseModalProps {
    /** Modal disclosure state from useDisclosure hook */
    disclosure: UseDisclosureReturn
    /** Modal title */
    title: string
    /** Modal body content */
    children: ReactNode
    /** Optional footer content - if not provided, default footer with Close button is shown */
    footer?: ReactNode
    /** Modal size */
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | 'full'
    /** Whether to show close button */
    showCloseButton?: boolean
    /** Whether clicking overlay closes modal */
    closeOnOverlayClick?: boolean
    /** Custom z-index */
    zIndex?: number
}

/**
 * Reusable modal component that handles common modal patterns.
 * 
 * @example
 * ```tsx
 * <BaseModal
 *   disclosure={myModal}
 *   title="Create Collection"
 *   size="md"
 * >
 *   <FormControl>
 *     <FormLabel>Name</FormLabel>
 *     <Input value={name} onChange={(e) => setName(e.target.value)} />
 *   </FormControl>
 * </BaseModal>
 * ```
 */
export const BaseModal = ({
    disclosure,
    title,
    children,
    footer,
    size = 'md',
    showCloseButton = true,
    closeOnOverlayClick = true,
    zIndex = 1400,
}: BaseModalProps): JSX.Element => {
    const defaultFooter = (
        <Button variant="ghost" onClick={disclosure.onClose}>
            Close
        </Button>
    )

    return (
        <Modal
            isOpen={disclosure.isOpen}
            onClose={disclosure.onClose}
            size={size}
            closeOnOverlayClick={closeOnOverlayClick}
        >
            <ModalOverlay zIndex={zIndex} />
            <ModalContent zIndex={zIndex + 1}>
                <ModalHeader>{title}</ModalHeader>
                {showCloseButton && <ModalCloseButton />}
                <ModalBody>{children}</ModalBody>
                {footer !== undefined ? (
                    <ModalFooter>{footer}</ModalFooter>
                ) : (
                    <ModalFooter>{defaultFooter}</ModalFooter>
                )}
            </ModalContent>
        </Modal>
    )
}

/**
 * Form modal variant with Save and Cancel buttons.
 */
export interface FormModalProps extends Omit<BaseModalProps, 'footer'> {
    /** Save button text */
    saveText?: string
    /** Cancel button text */
    cancelText?: string
    /** Save button handler */
    onSave: () => void
    /** Whether save button is disabled */
    isSaveDisabled?: boolean
    /** Whether save button is loading */
    isSaveLoading?: boolean
    /** Save button color scheme */
    saveColorScheme?: string
}

/**
 * Form modal with Save and Cancel buttons.
 * 
 * @example
 * ```tsx
 * <FormModal
 *   disclosure={createModal}
 *   title="Create Item"
 *   onSave={handleSave}
 *   saveText="Create"
 * >
 *   <Input placeholder="Item name" />
 * </FormModal>
 * ```
 */
export const FormModal = ({
    saveText = 'Save',
    cancelText = 'Cancel',
    onSave,
    isSaveDisabled = false,
    isSaveLoading = false,
    saveColorScheme = 'purple',
    ...baseProps
}: FormModalProps): JSX.Element => {
    const footer = (
        <>
            <Button variant="ghost" onClick={baseProps.disclosure.onClose} mr={3}>
                {cancelText}
            </Button>
            <Button
                colorScheme={saveColorScheme}
                onClick={onSave}
                isDisabled={isSaveDisabled}
                isLoading={isSaveLoading}
            >
                {saveText}
            </Button>
        </>
    )

    return <BaseModal {...baseProps} footer={footer} />
}

/**
 * Confirmation modal variant with Confirm and Cancel buttons.
 */
export interface ConfirmModalProps extends Omit<BaseModalProps, 'footer' | 'children'> {
    /** Confirmation message */
    message: string | ReactNode
    /** Confirm button text */
    confirmText?: string
    /** Cancel button text */
    cancelText?: string
    /** Confirm button handler */
    onConfirm: () => void
    /** Confirm button color scheme (e.g., 'red' for destructive actions) */
    confirmColorScheme?: string
    /** Whether confirm button is loading */
    isConfirmLoading?: boolean
}

/**
 * Confirmation modal for destructive or important actions.
 * 
 * @example
 * ```tsx
 * <ConfirmModal
 *   disclosure={deleteModal}
 *   title="Delete Item"
 *   message="Are you sure you want to delete this item? This action cannot be undone."
 *   confirmText="Delete"
 *   confirmColorScheme="red"
 *   onConfirm={handleDelete}
 * />
 * ```
 */
export const ConfirmModal = ({
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    confirmColorScheme = 'red',
    isConfirmLoading = false,
    ...baseProps
}: ConfirmModalProps): JSX.Element => {
    const footer = (
        <>
            <Button variant="ghost" onClick={baseProps.disclosure.onClose} mr={3}>
                {cancelText}
            </Button>
            <Button
                colorScheme={confirmColorScheme}
                onClick={onConfirm}
                isLoading={isConfirmLoading}
            >
                {confirmText}
            </Button>
        </>
    )

    return (
        <BaseModal {...baseProps} footer={footer}>
            {typeof message === 'string' ? <p>{message}</p> : message}
        </BaseModal>
    )
}
