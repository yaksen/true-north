
'use client';

import { useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Download, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Lead, Vendor, Partner } from '@/lib/types';

type Contact = (Lead | Vendor | Partner) & { type: 'lead' | 'vendor' | 'partner' };

interface QrCodeModalProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    contact: Contact;
    organization?: string;
}

function generateVCard(contact: Contact, organization?: string): string {
    const { id, name, phone, email, socials } = contact;
    const role = 'roleInProject' in contact ? contact.roleInProject : ('serviceType' in contact ? contact.serviceType : contact.type);

    let vCard = `BEGIN:VCARD
VERSION:3.0
N:${name};${id};;;
FN:${name}`;

    if (phone) vCard += `\nTEL;TYPE=CELL:${phone}`;
    if (email) vCard += `\nEMAIL:${email}`;
    if (role) vCard += `\nTITLE:${role}`;
    if (organization) vCard += `\nORG:${organization}`;
    if (socials) {
        socials.forEach(social => {
            vCard += `\nURL:${social.url}`;
        });
    }
    
    vCard += `\nEND:VCARD`;
    return vCard;
}

export function QrCodeModal({ isOpen, setIsOpen, contact, organization }: QrCodeModalProps) {
    const { toast } = useToast();
    const qrRef = useRef<HTMLDivElement>(null);
    const vCardString = generateVCard(contact, organization);

    const downloadQrCode = () => {
        if (!qrRef.current) return;
        const canvas = qrRef.current.querySelector('canvas');
        if (canvas) {
            const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
            let downloadLink = document.createElement("a");
            downloadLink.href = pngUrl;
            downloadLink.download = `${contact.name.replace(/\s+/g, '_')}_qr.png`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            toast({ title: 'Success', description: 'QR code downloaded.' });
        }
    };

    const copyQrCode = () => {
        if (!qrRef.current) return;
        const canvas = qrRef.current.querySelector('canvas');
        if (canvas) {
            canvas.toBlob((blob) => {
                if(blob) {
                    navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
                        .then(() => toast({ title: 'Success', description: 'QR code copied to clipboard.' }))
                        .catch(() => toast({ variant: 'destructive', title: 'Error', description: 'Could not copy QR code.' }));
                }
            });
        }
    };


    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Contact QR Code for {contact.name}</DialogTitle>
                    <DialogDescription>
                        Scan this code to add {contact.name} to your contacts.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex items-center justify-center p-4" ref={qrRef}>
                    <QRCodeCanvas value={vCardString} size={256} />
                </div>
                <DialogFooter className="sm:justify-center gap-2">
                    <Button onClick={downloadQrCode}>
                        <Download className="mr-2 h-4 w-4" /> Download
                    </Button>
                    <Button variant="outline" onClick={copyQrCode}>
                        <Copy className="mr-2 h-4 w-4" /> Copy Image
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
