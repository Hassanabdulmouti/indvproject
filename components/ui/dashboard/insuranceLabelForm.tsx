import React, { useState, useRef, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  PlusCircle,
  Upload,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  Receipt,
  AlertCircle,
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  createInsuranceLabel,
  uploadFile,
  InsuranceLabel,
  InsuranceItem,
} from '@/firebase/dbOp';
import { insuranceCompanies, currencies, formatCurrency } from '@/lib/config/insurance';

interface InsuranceLabelFormProps {
  onLabelCreated: (label: InsuranceLabel) => void;
}

const InsuranceLabelForm: React.FC<InsuranceLabelFormProps> = ({ onLabelCreated }) => {
  // Form state
  const [formError, setFormError] = useState<string | null>(null);
  const [labelName, setLabelName] = useState('');
  const [labelDescription, setLabelDescription] = useState('');
  const [qrCodeData, setQRCodeData] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currency, setCurrency] = useState<(typeof currencies)[number]>(currencies[0]);
  const [activeTab, setActiveTab] = useState('details');
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Insurance-specific state
  const [selectedCompany, setSelectedCompany] = useState<typeof insuranceCompanies[0] | null>(null);
  const [items, setItems] = useState<InsuranceItem[]>([]);
  
  // New item form state
  const [newItem, setNewItem] = useState({
    name: '',
    value: '',
    description: '',
    imageUrl: ''
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

// Add this useEffect at the top of your component
useEffect(() => {
  if (canvasRef.current) {
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }
}, []);

  // Effect for QR code generation
  useEffect(() => {
    generateQRCode();
  }, [labelName]);

  useEffect(() => {
    if (activeTab === 'preview' && labelName && selectedCompany) {
      renderDesign();
    }
  }, [activeTab, labelName, selectedCompany, items, currency, qrCodeData]);

  // Effect for preview rendering
  useEffect(() => {
    if (activeTab === 'preview' && canvasRef.current) {
      renderDesign();
    }
  }, [activeTab, qrCodeData, selectedCompany, items, labelName, currency]);

  const generateQRCode = async () => {
    if (labelName) {
      try {
        const url = `${window.location.origin}/label/${encodeURIComponent(labelName)}`;
        const qrCodeDataUrl = await QRCode.toDataURL(url);
        setQRCodeData(qrCodeDataUrl);
      } catch (error) {
        console.error('Error generating QR code:', error);
        setFormError('Failed to generate QR code');
      }
    }
  };

  // QR Code generation effect
useEffect(() => {
  if (labelName) {
    generateQRCode();
  }
}, [labelName]);

// Design rendering effect
useEffect(() => {
  if (labelName && selectedCompany) {
    renderDesign();
  }
}, [qrCodeData, labelName, selectedCompany, items, currency]);

// Initial canvas setup
useEffect(() => {
  if (canvasRef.current) {
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }
}, []);

  useEffect(() => {
    console.log('Preview dependencies changed:', {
      activeTab,
      labelName,
      selectedCompany,
      itemsCount: items.length,
      hasQRCode: !!qrCodeData,
      hasCanvas: !!canvasRef.current
    });
  
    if (activeTab === 'preview') {
      setPreviewLoaded(false);
      setPreviewError(null);
      
      // Small delay to ensure canvas is mounted
      const timer = setTimeout(() => {
        renderDesign();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [activeTab, labelName, selectedCompany, items, qrCodeData]);

  const renderDesign = () => {
    if (!canvasRef.current || !labelName || !selectedCompany) return;
  
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
  
    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  
    // Company brand color bar
    ctx.fillStyle = selectedCompany.primaryColor;
    ctx.fillRect(0, 0, canvas.width, 40);
  
    // Draw the logo and QR code
    const drawImages = async () => {

  
      // QR Code
      if (qrCodeData) {
        const qrImage = new Image();
        qrImage.src = qrCodeData;
        await new Promise((resolve) => {
          qrImage.onload = resolve;
          qrImage.onerror = resolve;
        });
        ctx.drawImage(qrImage, 20, 50, 100, 100);
      }
  
      // Draw label content
      ctx.fillStyle = 'black';
      ctx.font = 'bold 24px Arial';
      ctx.fillText(labelName, 140, 80);
      
      ctx.font = '14px Arial';
      const totalValue = items.reduce((sum, item) => sum + parseFloat(item.value.toString()), 0);
      ctx.fillText(`Total Value: ${formatCurrency(totalValue, currency.code)}`, 140, 100);
  
      // Items list
      let yOffset = 160;
      items.slice(0, 3).forEach((item) => {
        ctx.font = '12px Arial';
        ctx.fillText(
          `${item.name} - ${formatCurrency(parseFloat(item.value.toString()), currency.code)}`,
          20,
          yOffset
        );
        yOffset += 20;
      });
  
      if (items.length > 3) {
        ctx.fillText(`+ ${items.length - 3} more items...`, 20, yOffset);
      }
  
      setPreviewLoaded(true);
    };
  
    drawImages();
  };

  const drawLabelContent = (ctx: CanvasRenderingContext2D) => {
    // Title and description
    ctx.fillStyle = 'black';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(labelName, 140, 80);
    
    ctx.font = '14px Arial';
    const totalValue = items.reduce((sum, item) => sum + parseFloat(item.value.toString()), 0);
    ctx.fillText(
      `Total Value: ${formatCurrency(totalValue, currency.code)}`,
      140,
      100
    );

    // Items list
    let yOffset = 160;
    items.slice(0, 3).forEach((item) => {
      ctx.font = '12px Arial';
      ctx.fillText(
        `${item.name} - ${formatCurrency(item.value, currency.code)}`,
        20,
        yOffset
      );
      yOffset += 20;
    });

    if (items.length > 3) {
      ctx.fillText(`+ ${items.length - 3} more items...`, 20, yOffset);
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      const imageUrl = await uploadFile(file, `insurance-items/${file.name}`);
      setNewItem({ ...newItem, imageUrl });
    } catch (error) {
      console.error('Error uploading image:', error);
      setFormError('Failed to upload image');
    }
  };

  const addItem = () => {
    if (newItem.name && newItem.value) {
      const value = parseFloat(newItem.value);
      if (isNaN(value) || value <= 0) {
        setFormError('Please enter a valid item value');
        return;
      }
  
      setItems([
        ...items,
        {
          id: crypto.randomUUID(),
          name: newItem.name,
          value,
          currency: currency.code,
          imageUrl: newItem.imageUrl,
          description: newItem.description
        }
      ]);
      setNewItem({ name: '', value: '', description: '', imageUrl: '' });
      setFormError(null);
    }
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const resetForm = () => {
    setLabelName('');
    setLabelDescription('');
    setSelectedCompany(null);
    setItems([]);
    setCurrency(currencies[0]);
    setIsPrivate(false);
    setAccessCode('');
    setActiveTab('details');
    setQRCodeData('');
    setPreviewLoaded(false);
    setNewItem({ name: '', value: '', description: '', imageUrl: '' });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
  
    // Debug logs
    console.log({
      labelName: labelName.trim(),
      selectedCompany,
      itemsLength: items.length,
      canvasRef: canvasRef.current,
      isPrivate,
      accessCode
    });
  
    // Separate validation checks for better error messages
    if (!labelName.trim()) {
      setFormError('Please enter a label name');
      return;
    }
  
    if (!selectedCompany) {
      setFormError('Please select an insurance company');
      return;
    }
  
    if (items.length === 0) {
      setFormError('Please add at least one item');
      return;
    }
  
    if (isPrivate && (!accessCode || accessCode.length !== 6)) {
      setFormError('Please enter a 6-digit access code for private labels');
      return;
    }
  

    setIsLoading(true);

    try {
      if (!canvasRef.current) {
        setFormError('Failed to generate design URL');
        setIsLoading(false);
        return;
      }
      const designUrl = canvasRef.current.toDataURL('image/png');
      const labelId = await createInsuranceLabel(
        labelName,
        labelDescription,
        designUrl,
        selectedCompany,
        items,
        currency.code,
        isPrivate,
        isPrivate ? accessCode : undefined
      );
      
      const newLabel: InsuranceLabel = {
        id: labelId,
        type: 'insurance',
        name: labelName,
        description: labelDescription,
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
      resetForm();
    } catch (error) {
      console.error('Error creating label:', error);
      setFormError('Failed to create insurance label');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + parseFloat(item.value.toString()), 0);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="labelName">
                Label Name<span className="text-red-500">*</span>
              </Label>
              <Input
                id="labelName"
                value={labelName}
                onChange={(e) => setLabelName(e.target.value)}
                placeholder="Enter label name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={labelDescription}
                onChange={(e) => setLabelDescription(e.target.value)}
                placeholder="Enter description"
              />
            </div>

            <div className="space-y-2">
              <Label>
                Insurance Company<span className="text-red-500">*</span>
              </Label>
              <Select
                value={selectedCompany?.id}
                onValueChange={(id) => {
                  const company = insuranceCompanies.find(c => c.id === id);
                  setSelectedCompany(company || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue>{selectedCompany?.name || 'Select a company'}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {insuranceCompanies.map((company) => (
                    <SelectItem 
                      key={company.id} 
                      value={company.id}
                      className="flex items-center gap-2"
                    >
                      <img 
                        src={company.logoUrl} 
                        alt={company.name} 
                        className="h-4 w-4 object-contain"
                      />
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={currency.code}
                onValueChange={(code) => {
                  const newCurrency = currencies.find(c => c.code === code);
                  if (newCurrency) setCurrency(newCurrency);
                }}
              >
                <SelectTrigger>
                  <SelectValue>{currency.name}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((cur) => (
                    <SelectItem key={cur.code} value={cur.code}>
                      {cur.name} ({cur.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="private-mode"
                checked={isPrivate}
                onCheckedChange={setIsPrivate}
              />
              <Label htmlFor="private-mode">Private Label</Label>
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
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowAccessCode(!showAccessCode)}
                  >
                    {showAccessCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="items" className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Items<span className="text-red-500">*</span></Label>
              <ScrollArea className="h-[200px] border rounded-md p-2">
                {items.length > 0 ? (
                  items.map((item) => (
                    <Card key={item.id} className="mb-2">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatCurrency(item.value, currency.code)}
                            </div>
                            {item.description && (
                              <div className="text-sm text-muted-foreground">
                                {item.description}
                              </div>
                            )}
                          </div>
                          {item.imageUrl && (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No items added yet
                  </div>
                )}
              </ScrollArea>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Add New Item</CardTitle>
                <CardDescription>
                  Enter the details for the item you want to add to the insurance label
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newItemName">Item Name</Label>
                  <Input
                    id="newItemName"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    placeholder="Enter item name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newItemValue">Value ({currency.code})</Label>
                  <Input
                    id="newItemValue"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newItem.value}
                    onChange={(e) => setNewItem({ ...newItem, value: e.target.value })}
                    placeholder={`Enter value in ${currency.code}`}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newItemDescription">Description (Optional)</Label>
                  <Input
                    id="newItemDescription"
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    placeholder="Enter item description"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newItemImage">Item Image (Optional)</Label>
                  <div className="grid gap-4">
                    <Input
                      id="newItemImage"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleImageUpload(e.target.files[0]);
                        }
                      }}
                    />
                    {newItem.imageUrl && (
                      <div className="relative w-20 h-20">
                        <img
                          src={newItem.imageUrl}
                          alt="Item preview"
                          className="w-full h-full object-cover rounded-md"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2"
                          onClick={() => setNewItem({ ...newItem, imageUrl: '' })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
              </CardContent>
            </Card>

            {items.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                      <span>Total Items:</span>
                      <span>{items.length}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium">
                      <span>Total Value:</span>
                      <span className="text-primary">
                        {formatCurrency(calculateTotal(), currency.code)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="preview">
  <div className="space-y-4">
    <div className="mt-4">
      <canvas 
        ref={canvasRef} 
        width={300} 
        height={400} 
        style={{ width: '300px', height: '400px' }}
        className="border border-gray-200 rounded-md mx-auto"
      />
    </div>

    {selectedCompany && (
      <Alert>
        <AlertDescription className="flex items-center gap-2">
          <img 
            src={selectedCompany.logoUrl} 
            alt={selectedCompany.name} 
            className="h-4 w-4 object-contain"
          />
          This label will be associated with {selectedCompany.name} and include their branding
        </AlertDescription>
      </Alert>
    )}
  </div>
</TabsContent>
      </Tabs>

      {formError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={resetForm}
          disabled={isLoading}
        >
          Reset Form
        </Button>
        <Button
          type="submit"
          disabled={
            !labelName.trim() ||
            !selectedCompany ||
            items.length === 0 ||
            isLoading ||
            (isPrivate && accessCode.length !== 6)
          }
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Receipt className="mr-2 h-4 w-4" />
              Create Insurance Label
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default InsuranceLabelForm;