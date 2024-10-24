import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  PlusCircle, 
  Upload, 
  Trash2, 
  Eye, 
  EyeOff,
  Camera,
  Package
} from 'lucide-react';
import QRCode from 'qrcode';
import { createBox, uploadFile, InsuranceLabel, createInsuranceLabel } from '@/firebase/dbOp';

interface InsuranceItem {
  id: string;
  name: string;
  value: number;
  currency: string;
  imageUrl?: string;
  description?: string;
}

interface InsuranceCompany {
  id: string;
  name: string;
  logoUrl: string;
  primaryColor: string;
}

const insuranceCompanies: InsuranceCompany[] = [
  { 
    id: 'if', 
    name: 'IF Försäkring', 
    logoUrl: '/images/insurance/if-logo.png',
    primaryColor: '#00B7EF'
  },
  { 
    id: 'folksam', 
    name: 'Folksam', 
    logoUrl: '/images/insurance/folksam-logo.png',
    primaryColor: '#3C9CD0'
  },
  { 
    id: 'trygg', 
    name: 'Trygg-Hansa', 
    logoUrl: '/images/insurance/trygg-logo.png',
    primaryColor: '#DA291C'
  },
  { 
    id: 'lansforsakringar', 
    name: 'Länsförsäkringar', 
    logoUrl: '/images/insurance/lf-logo.png',
    primaryColor: '#005AA0'
  }
];

const currencies = [
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GBP', symbol: '£', name: 'British Pound' }
];

interface InsuranceCreateBoxFormProps {
  onLabelCreated: (newLabel: InsuranceLabel) => void;
}

const InsuranceCreateBoxForm: React.FC<InsuranceCreateBoxFormProps> = ({ onLabelCreated }) => {
  // Basic box info
  const [boxName, setBoxName] = useState('');
  const [boxDescription, setBoxDescription] = useState('');
  const [qrCodeData, setQRCodeData] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Insurance-specific state
  const [selectedCompany, setSelectedCompany] = useState<InsuranceCompany | null>(null);
  const [currency, setCurrency] = useState(currencies[0]);
  const [items, setItems] = useState<InsuranceItem[]>([]);
  const [activeTab, setActiveTab] = useState('details');

  // New item form state
  const [newItem, setNewItem] = useState({
    name: '',
    value: '',
    description: '',
    imageUrl: ''
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    generateQRCode();
  }, [boxName]);

  useEffect(() => {
    renderDesign();
  }, [qrCodeData, selectedCompany, items]);

  const generateQRCode = async () => {
    if (boxName) {
      try {
        const url = `${window.location.origin}/box/${encodeURIComponent(boxName)}`;
        const qrCodeDataUrl = await QRCode.toDataURL(url);
        setQRCodeData(qrCodeDataUrl);
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      const imageUrl = await uploadFile(file, `insurance-items/${file.name}`);
      setNewItem({ ...newItem, imageUrl });
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  };

  const addItem = () => {
    if (newItem.name && newItem.value) {
      setItems([
        ...items,
        {
          id: crypto.randomUUID(),
          name: newItem.name,
          value: parseFloat(newItem.value),
          currency: currency.code,
          imageUrl: newItem.imageUrl,
          description: newItem.description
        }
      ]);
      setNewItem({ name: '', value: '', description: '', imageUrl: '' });
    }
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const getTotalValue = () => {
    return items.reduce((sum, item) => sum + item.value, 0);
  };

  const renderDesign = () => {
    if (!canvasRef.current || !qrCodeData || !selectedCompany) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add insurance company color bar
    ctx.fillStyle = selectedCompany.primaryColor;
    ctx.fillRect(0, 0, canvas.width, 40);

    // Add company logo
    const logo = new Image();
    logo.onload = () => {
      ctx.drawImage(logo, canvas.width - 100, 50, 80, 40);
    };
    logo.src = selectedCompany.logoUrl;

    // Add QR code
    const qrImage = new Image();
    qrImage.onload = () => {
      ctx.drawImage(qrImage, 20, 50, 100, 100);
    };
    qrImage.src = qrCodeData;

    // Add text
    ctx.fillStyle = 'black';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(boxName, 140, 80);
    
    ctx.font = '14px Arial';
    ctx.fillText(`Total Value: ${getTotalValue()} ${currency.code}`, 140, 100);

    // Add items preview
    let yOffset = 160;
    items.slice(0, 3).forEach((item, index) => {
      ctx.font = '12px Arial';
      ctx.fillText(`${item.name} - ${item.value} ${currency.code}`, 20, yOffset);
      yOffset += 20;
    });

    if (items.length > 3) {
      ctx.fillText(`+ ${items.length - 3} more items...`, 20, yOffset);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!boxName.trim() || !selectedCompany || items.length === 0 || !canvasRef.current) return;

    setIsLoading(true);
    try {
      const designUrl = canvasRef.current.toDataURL('image/png');
      const labelId = await createInsuranceLabel(
        boxName,
        boxDescription,
        designUrl,
        selectedCompany,
        items,
        currency.code,
        isPrivate,
        isPrivate ? accessCode : undefined
      );
      
      // Create a new label object to pass to the callback
      const newLabel: InsuranceLabel = {
        id: labelId,
        type: 'insurance',
        name: boxName,
        description: boxDescription,
        createdAt: new Date(),
        updatedAt: new Date(),
        qrCodeUrl: designUrl,
        isPrivate,
        insuranceCompany: selectedCompany,
        items,
        totalValue: items.reduce((sum, item) => sum + item.value, 0),
        currency: currency.code,
        ...(isPrivate && { accessCode })
      };
      
      onLabelCreated(newLabel);
      
      // Reset form
      setBoxName('');
      setBoxDescription('');
      setSelectedCompany(null);
      setItems([]);
      setCurrency(currencies[0]);
      setIsPrivate(false);
      setAccessCode('');
      
    } catch (error) {
      console.error('Error creating insurance label:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Insurance Label</CardTitle>
        <CardDescription>
          Create a specialized label for insurance documentation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="details">Basic Details</TabsTrigger>
              <TabsTrigger value="items">Items</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              {/* Basic Details Tab */}
              <div className="space-y-2">
                <Label htmlFor="boxName">Label Name<span className="text-red-500">*</span></Label>
                <Input
                  id="boxName"
                  value={boxName}
                  onChange={(e) => setBoxName(e.target.value)}
                  placeholder="Enter label name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="boxDescription">Description</Label>
                <Input
                  id="boxDescription"
                  value={boxDescription}
                  onChange={(e) => setBoxDescription(e.target.value)}
                  placeholder="Enter label description"
                />
              </div>

              <div className="space-y-2">
                <Label>Insurance Company<span className="text-red-500">*</span></Label>
                <Select 
                  value={selectedCompany?.id} 
                  onValueChange={(value) => {
                    setSelectedCompany(insuranceCompanies.find(c => c.id === value) || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select insurance company" />
                  </SelectTrigger>
                  <SelectContent>
                    {insuranceCompanies.map(company => (
                      <SelectItem key={company.id} value={company.id}>
                        <div className="flex items-center gap-2">
                          <img 
                            src={company.logoUrl} 
                            alt={company.name} 
                            className="w-6 h-6 object-contain"
                          />
                          {company.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Currency</Label>
                <Select 
                  value={currency.code}
                  onValueChange={(value) => {
                    setCurrency(currencies.find(c => c.code === value) || currencies[0]);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map(curr => (
                      <SelectItem key={curr.code} value={curr.code}>
                        {curr.name} ({curr.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={isPrivate}
                  onCheckedChange={setIsPrivate}
                />
                <Label>Private Label</Label>
              </div>

              {isPrivate && (
                <div className="space-y-2">
                  <Label htmlFor="accessCode">Access Code (6 digits)</Label>
                  <div className="relative">
                    <Input
                      id="accessCode"
                      type={showAccessCode ? "text" : "password"}
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit access code"
                      pattern="\d{6}"
                      required={isPrivate}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowAccessCode(!showAccessCode)}
                    >
                      {showAccessCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="items" className="space-y-6">
              {/* Items Tab */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Added Items</Label>
                  <ScrollArea className="h-[200px] border rounded-md p-4">
                    {items.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 p-2 border-b"
                      >
                        {item.imageUrl && (
                          <img 
                            src={item.imageUrl} 
                            alt={item.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.value} {item.currency}
                          </div>
                          {item.description && (
                            <div className="text-sm text-muted-foreground">
                              {item.description}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </ScrollArea>
                </div>

                <div className="p-4 border rounded-md space-y-4">
                  <h3 className="font-medium">Add New Item</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Item Name</Label>
                        <Input
                          value={newItem.name}
                          onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                          placeholder="Enter item name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Value ({currency.code})</Label>
                        <Input
                          type="number"
                          value={newItem.value}
                          onChange={(e) => setNewItem({ ...newItem, value: e.target.value })}
                          placeholder={`Value in ${currency.code}`}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        value={newItem.description}
                        onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                        placeholder="Enter item description (optional)"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Item Image</Label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                            className="cursor-pointer"
                          />
                        </div>
                        {newItem.imageUrl && (
                          <img
                            src={newItem.imageUrl}
                            alt="Item preview"
                            className="w-12 h-12 object-cover rounded border"
                          />
                        )}
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={addItem}
                      disabled={!newItem.name || !newItem.value}
                      className="w-full"
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Item
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <span className="font-medium">Total Items:</span>
                  <span>{items.length}</span>
                  <span className="font-medium">Total Value:</span>
                  <span>{getTotalValue()} {currency.code}</span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="space-y-6">
              {/* Preview Tab */}
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <div className="aspect-[3/4] relative">
                    <canvas
                      ref={canvasRef}
                      width={600}
                      height={800}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-medium mb-2">Preview Details</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex justify-between">
                      <span>Label Name:</span>
                      <span className="font-medium">{boxName}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Insurance Company:</span>
                      <span className="font-medium">{selectedCompany?.name || 'Not selected'}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Number of Items:</span>
                      <span className="font-medium">{items.length}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Total Value:</span>
                      <span className="font-medium">{getTotalValue()} {currency.code}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Privacy:</span>
                      <span className="font-medium">{isPrivate ? 'Private' : 'Public'}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setBoxName('');
                setBoxDescription('');
                setSelectedCompany(null);
                setItems([]);
                setCurrency(currencies[0]);
                setIsPrivate(false);
                setAccessCode('');
              }}
            >
              Reset
            </Button>
            <Button
              type="submit"
              disabled={
                !boxName.trim() ||
                !selectedCompany ||
                items.length === 0 ||
                isLoading ||
                (isPrivate && accessCode.length !== 6)
              }
            >
              {isLoading ? (
                <>
                  <Package className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Package className="mr-2 h-4 w-4" />
                  Create Insurance Label
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default InsuranceCreateBoxForm;