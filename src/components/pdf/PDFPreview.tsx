// src/components/pdf/PDFPreview.tsx
"use client";

import React from 'react';
import { PDFViewer } from '@react-pdf/renderer';
import { Loader2 } from 'lucide-react';

interface PDFPreviewProps {
    document: React.ReactElement<any>;
}

const PDFPreview: React.FC<PDFPreviewProps> = ({ document }) => {
    // This check ensures that PDFViewer is only rendered on the client.
    // The dynamic import in the parent component already handles this, but this is an extra safeguard.
    if (typeof window === 'undefined') {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }}>
            {document as any}
        </PDFViewer>
    );
};

export default PDFPreview;
