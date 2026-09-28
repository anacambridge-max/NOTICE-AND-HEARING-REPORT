import './globals.css';
import type {Metadata} from 'next';
export const metadata:Metadata={title:'AC-34 Notice & Hearing Report',description:'SIR-2026 reporting dashboard'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}