'use client';

import { QRCodeSVG } from 'qrcode.react';

interface InviteQRCodeProps {
  code: string;
  size?: number;
}

export default function InviteQRCode({ code, size = 200 }: InviteQRCodeProps) {
  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/invite/${code}`
    : `/invite/${code}`;

  return (
    <div className="bg-white p-4 rounded-2xl inline-block">
      <QRCodeSVG
        value={url}
        size={size}
        level="M"
        includeMargin={false}
        bgColor="#ffffff"
        fgColor="#000000"
      />
    </div>
  );
}
