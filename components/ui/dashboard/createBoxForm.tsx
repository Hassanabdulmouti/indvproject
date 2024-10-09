import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle } from 'lucide-react';
import QRCode from 'qrcode';
import { createBox } from '@/firebase/dbOp';

interface PackagingSymbol {
  name: string;
  src: string;
}

interface Design {
  name: string;
  render: (ctx: CanvasRenderingContext2D, props: DesignProps) => void;
}

interface DesignProps {
  qrCodeData: string;
  boxName: string;
  boxDescription: string;
  selectedSymbols: PackagingSymbol[];
  canvas: HTMLCanvasElement;
}

const packagingSymbols: PackagingSymbol[] = [
  { name: 'Fire', src: '/images/fire.png' },
  { name: 'Fragile', src: '/images/fragile.png' },
  { name: 'Heavy', src: '/images/heavy.png' },
  { name: 'No Knife', src: '/images/no-knife.png' },
];

const designs: Design[] = [
  {
    name: 'Simple',
    render: (ctx, props) => {
      const { canvas, boxName, boxDescription, qrCodeData, selectedSymbols } = props;
      
      // Background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Text
      ctx.fillStyle = 'black';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(boxName, canvas.width / 2, 30);
      
      ctx.font = '14px Arial';
      ctx.fillText(boxDescription, canvas.width / 2, 50);
      
      // QR Code
      const qrImage = new Image();
      qrImage.onload = () => {
        ctx.drawImage(qrImage, 75, 70, 150, 150);
        
        // Symbols
        selectedSymbols.forEach((symbol, index) => {
          const symbolImage = new Image();
          symbolImage.onload = () => {
            ctx.drawImage(symbolImage, 75 + index * 60, 240, 40, 40);
          };
          symbolImage.src = symbol.src;
        });
      };
      qrImage.src = qrCodeData;
    }
  },
  {
    name: 'Bordered',
    render: (ctx, props) => {
      const { canvas, boxName, boxDescription, qrCodeData, selectedSymbols } = props;
      
      // Background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Border
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
      
      // Text
      ctx.fillStyle = 'black';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(boxName, canvas.width / 2, 40);
      
      ctx.font = '14px Arial';
      ctx.fillText(boxDescription, canvas.width / 2, 60);
      
      // QR Code
      const qrImage = new Image();
      qrImage.onload = () => {
        ctx.drawImage(qrImage, 85, 80, 150, 150);
        
        // Symbols
        selectedSymbols.forEach((symbol, index) => {
          const symbolImage = new Image();
          symbolImage.onload = () => {
            ctx.drawImage(symbolImage, 85 + index * 60, 250, 40, 40);
          };
          symbolImage.src = symbol.src;
        });
      };
      qrImage.src = qrCodeData;
    }
  },
  {
    name: 'Colorful',
    render: (ctx, props) => {
      const { canvas, boxName, boxDescription, qrCodeData, selectedSymbols } = props;
      
      // Background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#ff9a9e');
      gradient.addColorStop(1, '#fad0c4');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Text
      ctx.fillStyle = '#333';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(boxName, canvas.width / 2, 40);
      
      ctx.fillStyle = '#555';
      ctx.font = '14px Arial';
      ctx.fillText(boxDescription, canvas.width / 2, 60);
      
      // QR Code
      const qrImage = new Image();
      qrImage.onload = () => {
        ctx.drawImage(qrImage, 75, 80, 150, 150);
        
        // Symbols
        selectedSymbols.forEach((symbol, index) => {
          const symbolImage = new Image();
          symbolImage.onload = () => {
            ctx.drawImage(symbolImage, 75 + index * 60, 250, 40, 40);
          };
          symbolImage.src = symbol.src;
        });
      };
      qrImage.src = qrCodeData;
    }
  },
];

const CreateBoxForm: React.FC = () => {
  const [newBoxName, setNewBoxName] = useState<string>('');
  const [newBoxDescription, setNewBoxDescription] = useState<string>('');
  const [qrCodeData, setQRCodeData] = useState<string>('');
  const [selectedSymbols, setSelectedSymbols] = useState<PackagingSymbol[]>([]);
  const [selectedDesign, setSelectedDesign] = useState<Design>(designs[0]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    generateQRCode();
  }, [newBoxName, newBoxDescription]);

  useEffect(() => {
    renderDesign();
  }, [qrCodeData, newBoxName, newBoxDescription, selectedSymbols, selectedDesign]);

  const generateQRCode = async () => {
    if (newBoxName) {
      try {
        const url = `${window.location.origin}/box/${encodeURIComponent(newBoxName)}`;
        const qrCodeDataUrl = await QRCode.toDataURL(url);
        setQRCodeData(qrCodeDataUrl);
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

  const renderDesign = () => {
    if (!canvasRef.current || !qrCodeData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Render the selected design
    selectedDesign.render(ctx, {
      qrCodeData,
      boxName: newBoxName,
      boxDescription: newBoxDescription,
      selectedSymbols,
      canvas
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newBoxName.trim() && qrCodeData && canvasRef.current) {
      setIsLoading(true);
      try {
        const pngDataUrl = canvasRef.current.toDataURL('image/png');
        await createBox(newBoxName, newBoxDescription, pngDataUrl);
        
        // Reset form
        setNewBoxName('');
        setNewBoxDescription('');
        setQRCodeData('');
        setSelectedSymbols([]);
        
        // You might want to show a success message or redirect the user here
        console.log('Box created successfully!');
      } catch (error) {
        console.error('Error creating box:', error);
        // You might want to show an error message to the user here
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Create New Box</CardTitle>
        <CardDescription>Add a new box to your collection</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="boxName">Box Name<span className="text-red-500">*</span></Label>
            <Input
              id="boxName"
              value={newBoxName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewBoxName(e.target.value)}
              placeholder="Enter box name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="boxDescription">Description</Label>
            <Input
              id="boxDescription"
              value={newBoxDescription}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewBoxDescription(e.target.value)}
              placeholder="Enter box description"
            />
          </div>
          <div>
            
            <Label>Select Packaging Symbols (up to 3)</Label>
            <div className="flex space-x-2 mt-2">
              {packagingSymbols.map((symbol) => (
                <Button
                  key={symbol.name}
                  onClick={() => toggleSymbol(symbol)}
                  variant={selectedSymbols.includes(symbol) ? "default" : "outline"}
                  type="button"
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
                  type="button"
                >
                  {design.name}
                </Button>
              ))}
            </div>
          </div>
          {qrCodeData && (
            <div className="mt-4">
              <canvas ref={canvasRef} width={300} height={400} style={{ width: '300px', height: '400px' }} />
            </div>
          )}
          <Button type="submit" disabled={!newBoxName.trim() || !qrCodeData || isLoading}>
            <PlusCircle className="mr-2 h-4 w-4" /> 
            {isLoading ? 'Creating...' : 'Create Box'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreateBoxForm;