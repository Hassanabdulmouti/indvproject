import React, { useState } from 'react';
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileEdit, Trash2, Download, Eye, EyeOff, Share2, Loader2
} from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  InsuranceLabel, 
  InsuranceItem,
  updateBoxPrivacy, 
  uploadFile 
} from '@/firebase/dbOp';
import { formatCurrency } from '@/utils/currency';

interface InsuranceDetailsDialogProps {
  label: InsuranceLabel;
  onClose: () => void;
  onLabelUpdated: (updatedLabel: InsuranceLabel) => void;
}

const InsuranceDetailsDialog: React.FC<InsuranceDetailsDialogProps> = ({
  label,
  onClose,
  onLabelUpdated
}) => {
  // State management
  const [activeTab, setActiveTab] = useState('details');
  const [isPrivate, setIsPrivate] = useState(label.isPrivate);
  const [accessCode, setAccessCode] = useState(label.accessCode || '');
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<InsuranceItem | null>(null);
  const [updatedItemValue, setUpdatedItemValue] = useState<string>('');

  const defaultCurrency = label.currency || 'SEK';

  const handlePrivacyChange = async () => {
    setIsUpdating(true);
    setError(null);
    try {
      await updateBoxPrivacy(label.id, isPrivate, isPrivate ? accessCode : undefined);
      onLabelUpdated({
        ...label,
        isPrivate,
        accessCode: isPrivate ? accessCode : undefined
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update privacy settings');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAccessCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.replace(/\D/g, '').slice(0, 6);
    setAccessCode(newValue);
  };

  const handleUpdateItemValue = async () => {
    if (!editingItem || !updatedItemValue) return;

    setIsUpdating(true);
    setError(null);
    try {
      const updatedItems = label.items.map(item =>
        item.id === editingItem.id
          ? { ...item, value: parseFloat(updatedItemValue) }
          : item
      );

      const totalValue = updatedItems.reduce((sum, item) => sum + item.value, 0);

      onLabelUpdated({
        ...label,
        items: updatedItems,
        totalValue
      });

      setEditingItem(null);
      setUpdatedItemValue('');
    } catch (err) {
      setError('Failed to update item value');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-[800px]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <div className="flex-1">{label.name}</div>
          {label.insuranceCompany && (
            <img
              src={label.insuranceCompany.logoUrl}
              alt={label.insuranceCompany.name}
              className="h-8 object-contain"
            />
          )}
        </DialogTitle>
      </DialogHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Label Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Description</Label>
                <p className="text-sm text-muted-foreground">
                  {label.description || 'No description'}
                </p>
              </div>

              <div>
                <Label>Total Value</Label>
                <p className="text-lg font-medium">
                  {formatCurrency(label.totalValue || 0, defaultCurrency)}
                </p>
              </div>

              <div>
                <Label>Insurance Company</Label>
                <p className="text-sm">
                  {label.insuranceCompany?.name || 'Not specified'}
                </p>
              </div>

              <div>
                <Label>Created</Label>
                <p className="text-sm">
                  {label.createdAt.toLocaleString()}
                </p>
              </div>

              <div>
                <Label>Last Updated</Label>
                <p className="text-sm">
                  {label.updatedAt.toLocaleString()}
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => window.print()}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Report
                </Button>
                <Button variant="outline">
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items">
          <Card>
            <CardHeader>
              <CardTitle>Insured Items</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {(label.items || []).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 p-4 border rounded-lg"
                    >
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-20 h-20 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 space-y-2">
                        <div className="font-medium">{item.name}</div>
                        {item.description && (
                          <p className="text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                        {editingItem?.id === item.id ? (
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              value={updatedItemValue}
                              onChange={(e) => setUpdatedItemValue(e.target.value)}
                              placeholder="Enter new value"
                            />
                            <Button
                              size="sm"
                              onClick={handleUpdateItemValue}
                              disabled={isUpdating}
                            >
                              {isUpdating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Update'
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingItem(null);
                                setUpdatedItemValue('');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {formatCurrency(item.value || 0, item.currency || defaultCurrency)}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingItem(item);
                                setUpdatedItemValue(item.value.toString());
                              }}
                            >
                              <FileEdit className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={isPrivate}
                    onCheckedChange={setIsPrivate}
                    disabled={isUpdating}
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
                        onChange={handleAccessCodeChange}
                        placeholder="Enter 6-digit access code"
                        pattern="\d{6}"
                        required={isPrivate}
                        disabled={isUpdating}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowAccessCode(!showAccessCode)}
                      >
                        {showAccessCode ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handlePrivacyChange}
                  disabled={isUpdating || (isPrivate && accessCode.length !== 6)}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Privacy Settings'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-4 flex justify-end">
        <Button onClick={onClose}>Close</Button>
      </div>
    </DialogContent>
  );
};

export default InsuranceDetailsDialog;