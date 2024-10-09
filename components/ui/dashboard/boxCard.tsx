import React, { useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BoxIcon, Trash2, QrCode, Download } from 'lucide-react';
import { Box } from '@/firebase/dbOp';

interface BoxCardProps {
  box: Box;
  onViewDetails: () => void;
  onDeleteBox: () => void;
}

const BoxCard: React.FC<BoxCardProps> = ({ box, onViewDetails, onDeleteBox }) => {
  const qrCodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (qrCodeRef.current && box.qrCodeUrl) {
      qrCodeRef.current.innerHTML = box.qrCodeUrl;
    }
  }, [box.qrCodeUrl]);

  const handleDownloadDesign = () => {
    if (qrCodeRef.current && box.qrCodeUrl) {
      const svg = qrCodeRef.current.querySelector('svg');
      if (svg) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const svgData = new XMLSerializer().serializeToString(svg);
        const img = new Image();
        
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx?.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `${box.name}-design.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }
          }, 'image/png');
        };
        
        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
      }
    }
  };
            console.log(box.qrCodeUrl)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{box.name}</CardTitle>
        <CardDescription>{box.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Created: {box.createdAt.toLocaleDateString()}</p>
        {box.qrCodeUrl && (
          <div className="mt-2">
            <h3 className="text-sm font-semibold mb-1">QR Code Design:</h3>
            <img src={box.qrCodeUrl} alt="QR Code Design" />
            <Button className="mt-2" onClick={() => {
              fetch(box.qrCodeUrl)
                .then(response => response.blob())
                .then(blob => {
                  const url = window.URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `${box.name}-design.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  window.URL.revokeObjectURL(url);
                });
            }}>
              <Download className="mr-2 h-4 w-4" /> Download Design (PNG)
            </Button>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onViewDetails}>
          <BoxIcon className="mr-2 h-4 w-4" /> View Details
        </Button>
        <Button variant="outline" onClick={() => window.open(`${window.location.origin}/box/${box.id}`, '_blank')}>
          <QrCode className="mr-2 h-4 w-4" /> Open QR Link
        </Button>
        <Button variant="destructive" onClick={onDeleteBox}>
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BoxCard;