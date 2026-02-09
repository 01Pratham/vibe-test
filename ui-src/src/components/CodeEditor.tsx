'use client'

import { useRef, useEffect } from 'react'

import { Editor } from '@monaco-editor/react'

import { Box, useColorMode } from '@chakra-ui/react'

import type { OnMount } from '@monaco-editor/react'

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unnecessary-type-assertion */

/**
 * Types for Monaco Editor components extracted from OnMount
 */
type MonacoEditorInstance = Parameters<OnMount>[0]
type MonacoInstance = Parameters<OnMount>[1]


interface CodeEditorProps {
    value: string
    onChange?: (value: string | undefined) => void
    language?: string
    height?: string
    readOnly?: boolean
    variables?: string[]
}

/**
 * A wrapper around Monaco Editor with variable highlighting support
 */
export const CodeEditor = ({
    value,
    onChange,
    language = 'json',
    height = '300px',
    readOnly = false,
    variables = []
}: CodeEditorProps): JSX.Element => {
    const { colorMode } = useColorMode()
    const editorRef = useRef<MonacoEditorInstance | null>(null)
    const monacoRef = useRef<MonacoInstance | null>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const decorationsRef = useRef<any[]>([])

    // Apply variable highlighting
    const applyDecorations = (): void => {
        const editor = editorRef.current
        const monacoInstance = monacoRef.current

        if (!editor || !monacoInstance) { return }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const model = editor.getModel() as any
        if (!model) { return }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
        const content = model.getValue() as string
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newDecorations: any[] = []

        // Regex to match {{variable}}
        const regex = /\{\{([^}]+)\}\}/g
        let match

        while ((match = regex.exec(content)) !== null) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
            const startPos = model.getPositionAt(match.index) as any
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
            const endPos = model.getPositionAt(match.index + match[0].length) as any

            newDecorations.push({
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                range: new monacoInstance.Range(
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    startPos.lineNumber as number,
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    startPos.column as number,
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    endPos.lineNumber as number,
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    endPos.column as number
                ),
                options: {
                    inlineClassName: 'variable-highlight',
                    hoverMessage: { value: `Variable: ${match[1]}` }
                }
            })
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations)
    }

    useEffect(() => {
        applyDecorations()
    }, [value, variables])

    const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
        editorRef.current = editor
        monacoRef.current = monacoInstance

        // Configure JSON defaults - disable validation to allow {{variables}}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (language === 'json' && (monacoInstance.languages.json as any)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            (monacoInstance.languages.json as any).jsonDefaults.setDiagnosticsOptions({
                validate: false, // Disable validation to allow {{variables}}
                allowComments: false,
                schemas: [],
                enableSchemaRequest: false
            })
        }

        // Add pm API snippets for JavaScript (pre-req/test scripts)
        if (language === 'javascript') {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            monacoInstance.languages.registerCompletionItemProvider('javascript', {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                provideCompletionItems: (): any => {
                    const suggestions = [
                        {
                            label: 'pm.environment.set',
                            kind: monacoInstance.languages.CompletionItemKind.Method,
                            insertText: 'pm.environment.set("${1:key}", "${2:value}")',
                            insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            documentation: 'Set an environment variable'
                        },
                        {
                            label: 'pm.environment.get',
                            kind: monacoInstance.languages.CompletionItemKind.Method,
                            insertText: 'pm.environment.get("${1:key}")',
                            insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            documentation: 'Get an environment variable'
                        },
                        {
                            label: 'pm.response.json',
                            kind: monacoInstance.languages.CompletionItemKind.Method,
                            insertText: 'const res = pm.response.json();\n${0}',
                            insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            documentation: 'Parse response body as JSON'
                        },
                        {
                            label: 'pm.test',
                            kind: monacoInstance.languages.CompletionItemKind.Method,
                            insertText: 'pm.test("${1:test name}", () => {\n\t${0}\n});',
                            insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            documentation: 'Create a test assertion'
                        },
                        {
                            label: 'pm.response.code',
                            kind: monacoInstance.languages.CompletionItemKind.Property,
                            insertText: 'pm.response.code',
                            documentation: 'HTTP response status code'
                        },
                        {
                            label: 'pm.response.status',
                            kind: monacoInstance.languages.CompletionItemKind.Property,
                            insertText: 'pm.response.status',
                            documentation: 'HTTP response status text'
                        },
                        {
                            label: 'pm.response.headers',
                            kind: monacoInstance.languages.CompletionItemKind.Property,
                            insertText: 'pm.response.headers',
                            documentation: 'Response headers object'
                        },
                        {
                            label: 'pm.response.text',
                            kind: monacoInstance.languages.CompletionItemKind.Method,
                            insertText: 'pm.response.text()',
                            documentation: 'Get response body as text'
                        },
                        {
                            label: 'Set variable from response',
                            kind: monacoInstance.languages.CompletionItemKind.Snippet,
                            insertText: 'const res = pm.response.json();\npm.environment.set("${1:variableName}", res.${2:data.field});',
                            insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            documentation: 'Common pattern: extract value from response and save to environment'
                        }
                    ];
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                    return { suggestions };
                }
            });
        }

        // Add variable completion provider
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        monacoInstance.languages.registerCompletionItemProvider(language, {
            triggerCharacters: ['{'],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            provideCompletionItems: (model: any, position: any) => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                const textUntilPosition = model.getValueInRange({
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    startLineNumber: position.lineNumber as number,
                    startColumn: 1,
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    endLineNumber: position.lineNumber as number,
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    endColumn: position.column as number
                }) as string

                if (textUntilPosition.endsWith('{{')) {
                    const suggestions = variables.map(v => ({
                        label: v,
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                        kind: monacoInstance.languages.CompletionItemKind.Variable,
                        insertText: v,
                        detail: 'Environment Variable',
                        range: {
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                            startLineNumber: position.lineNumber as number,
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                            startColumn: position.column as number,
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                            endLineNumber: position.lineNumber as number,
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                            endColumn: position.column as number
                        }
                    }))

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    return { suggestions: suggestions as any }
                }
                return { suggestions: [] }
            }
        })
    }

    return (
        <Box
            height={height}
            border="1px solid"
            borderColor={colorMode === 'dark' ? "whiteAlpha.200" : "gray.200"}
            borderRadius="md"
            overflow="hidden"
            sx={{
                '.variable-highlight': {
                    backgroundColor: 'rgba(159, 122, 234, 0.2)',
                    color: 'purple.300',
                    borderRadius: '2px',
                    borderBottom: '1px dashed'
                }
            }}
        >
            <Editor
                height="100%"
                language={language}
                theme={colorMode === 'dark' ? "vs-dark" : "light"}
                value={value}
                onChange={onChange}
                onMount={handleEditorDidMount}
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    roundedSelection: false,
                    scrollBeyondLastLine: false,
                    readOnly,
                    automaticLayout: true,
                    padding: { top: 10, bottom: 10 }
                }}
            />
        </Box>
    )
}
