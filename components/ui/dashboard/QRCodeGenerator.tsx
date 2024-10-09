import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import QRCode from 'qrcode';

interface PackagingSymbol {
  name: string;
  src: string;
}

interface Design {
  name: string;
  component: React.FC<DesignProps>;
}

interface DesignProps {
  qrCodeData: string;
  boxName: string;
  boxDescription: string;
  selectedSymbols: PackagingSymbol[];
}

interface QRCodeGeneratorProps {
  boxName: string;
  boxDescription: string;
  onQRCodeGenerated: (qrCodeData: string) => void;
}

const packagingSymbols: PackagingSymbol[] = [
  { name: 'Fire', src: '/images/fire.png' },
  { name: 'Fragile', src: '/images/fragile.png' },
  { name: 'Heavy', src: '/images/heavy.png' },
  { name: 'No Knife', src: '/images/no-knife.png' },
];

const SimpleDesign: React.FC<DesignProps> = ({ qrCodeData, boxName, boxDescription, selectedSymbols }) => (
  <svg id="qr-code-design" width="300" height="400" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="white" />
    <text x="150" y="30" fontSize="24" fontWeight="bold" textAnchor="middle">{boxName}</text>
    <text x="150" y="50" fontSize="14" textAnchor="middle">{boxDescription}</text>
    <image href={qrCodeData} x="75" y="70" width="150" height="150" />
    {selectedSymbols.map((symbol, index) => (
      <image key={symbol.name} href={symbol.src} x={75 + index * 60} y="240" width="40" height="40" />
    ))}
  </svg>
);

const BorderedDesign: React.FC<DesignProps> = ({ qrCodeData, boxName, boxDescription, selectedSymbols }) => (
  <svg id="qr-code-design" width="320" height="420" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="white" stroke="black" strokeWidth="2" />
    <text x="160" y="40" fontSize="24" fontWeight="bold" textAnchor="middle">{boxName}</text>
    <text x="160" y="60" fontSize="14" textAnchor="middle">{boxDescription}</text>
    <image href={qrCodeData} x="85" y="80" width="150" height="150" />
    {selectedSymbols.map((symbol, index) => (
      <image key={symbol.name} href={symbol.src} x={85 + index * 60} y="250" width="40" height="40" />
    ))}
  </svg>
);

const ColorfulDesign: React.FC<DesignProps> = ({ qrCodeData, boxName, boxDescription, selectedSymbols }) => (
  <svg id="qr-code-design" width="300" height="400" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ff9a9e" />
        <stop offset="100%" stopColor="#fad0c4" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg-gradient)" />
    <text x="150" y="40" fontSize="24" fontWeight="bold" textAnchor="middle" fill="#333">{boxName}</text>
    <text x="150" y="60" fontSize="14" textAnchor="middle" fill="#555">{boxDescription}</text>
    <image href={qrCodeData} x="75" y="80" width="150" height="150" />
    {selectedSymbols.map((symbol, index) => (
      <image key={symbol.name} href={symbol.src} x={75 + index * 60} y="250" width="40" height="40" />
    ))}
  </svg>
);

const designs: Design[] = [
  { name: 'Simple', component: SimpleDesign },
  { name: 'Bordered', component: BorderedDesign },
  { name: 'Colorful', component: ColorfulDesign },
];

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ boxName, boxDescription, onQRCodeGenerated }) => {
  const [selectedSymbols, setSelectedSymbols] = useState<PackagingSymbol[]>([]);
  const [selectedDesign, setSelectedDesign] = useState<Design>(designs[0]);
  const [qrCodeData, setQRCodeData] = useState<string>('');

  useEffect(() => {
    generateQRCode();
  }, [boxName, boxDescription]);

  const generateQRCode = async () => {
    if (boxName) {
      try {
        const url = `${window.location.origin}/box/${encodeURIComponent(boxName)}`;
        const qrCodeDataUrl = await QRCode.toDataURL(url);
        setQRCodeData(qrCodeDataUrl);
        onQRCodeGenerated(qrCodeDataUrl);
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    }
  };

  const toggleSymbol = (symbol: PackagingSymbol) => {
    setSelectedSymbols(prev => 
      prev.includes(symbol)
        ? prev.filter(s => s !== symbol)
        : prev.length < 3 ? [...prev, symbol] : prev
    );
  };

  const downloadImage = () => {
    const svg = document.getElementById('qr-code-design');
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `${boxName}-qr-code.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    }
  };

  const SelectedDesign = selectedDesign.component;

  return (
    <div className="space-y-4">
      <div>
        <Label>Select Packaging Symbols (up to 3)</Label>
        <div className="flex space-x-2 mt-2">
          {packagingSymbols.map((symbol) => (
            <Button
              key={symbol.name}
              onClick={() => toggleSymbol(symbol)}
              variant={selectedSymbols.includes(symbol) ? "default" : "outline"}
            >
              {symbol.name}
            </Button>
          ))}
        </div>
      </div>
      <div>
        <Label>Select Design</Label>
        <div className="flex space-x-2 mt-2">
          {designs.map((design) => (
            <Button
              key={design.name}
              onClick={() => setSelectedDesign(design)}
              variant={selectedDesign.name === design.name ? "default" : "outline"}
            >
              {design.name}
            </Button>
          ))}
        </div>
      </div>
      {qrCodeData && (
        <div className="mt-4">
          <SelectedDesign
            qrCodeData={qrCodeData}
            boxName={boxName}
            boxDescription={boxDescription}
            selectedSymbols={selectedSymbols}
          />
          <Button onClick={downloadImage} className="mt-4">Download QR Code</Button>
        </div>
      )}
    </div>
  );
};

export default QRCodeGenerator;