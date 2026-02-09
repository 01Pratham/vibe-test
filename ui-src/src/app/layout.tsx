import { Providers } from './providers'

import type { Metadata } from 'next'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/api-tester'

export const metadata: Metadata = {
    title: 'Vibe Test',
    description: 'Internal API Testing & Traffic Capture Tool',
    icons: {
        icon: `${basePath}/logo.svg`,
        apple: `${basePath}/logo.svg`,
    },
}

const RootLayout = ({
    children,
}: {
    children: React.ReactNode
}): JSX.Element => {
    return (
        <html lang="en">
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    )
}

export default RootLayout
