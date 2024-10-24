import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Share2, Printer, Download, Eye } from 'lucide-react';
import { InsuranceLabel, InsuranceItem } from '@/firebase/dbOp';

interface InsuranceLabelCardProps {
  label: InsuranceLabel;
  onShare: () => void;
  onPrint: () => void;
  onView: () => void;
}

const InsuranceLabelCard: React.FC<InsuranceLabelCardProps> = ({
  label,
  onShare,
  onPrint,
  onView
}) => {
  const formatCurrency = (value: number, currencyCode?: string) => {
    // Default to SEK if no currency code is provided
    const currency = currencyCode?.toUpperCase() || 'SEK';
    
    try {
      return new Intl.NumberFormat('sv-SE', { 
        style: 'currency', 
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(value);
    } catch (error) {
      // Fallback formatting
      return `${value.toLocaleString('sv-SE')} ${currency}`;
    }
  };

  const defaultCurrency = label.currency || 'SEK';

  return (
    <Card className="w-full">
      <CardHeader className="border-b">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{label.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Insurance Label
            </p>
          </div>
          {label.insuranceCompany && (
            <img
              src={label.insuranceCompany.logoUrl}
              alt={label.insuranceCompany.name}
              className="h-12 object-contain"
            />
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Insured Items</h3>
            <p className="text-sm font-medium">
              Total Value: {formatCurrency(label.totalValue || 0, defaultCurrency)}
            </p>
          </div>
          
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {(label.items || []).map((item: InsuranceItem) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-2 hover:bg-accent rounded-lg"
                >
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    {item.description && (
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    )}
                  </div>
                  <p className="font-medium">
                    {formatCurrency(item.value || 0, item.currency || defaultCurrency)}
                  </p>
                </div>
              ))}
              {(!label.items || label.items.length === 0) && (
                <p className="text-center text-muted-foreground py-4">
                  No items added yet
                </p>
              )}
            </div>
          </ScrollArea>

          <div className="flex gap-4 mt-4">
            <div className="flex-1">
              {label.qrCodeUrl ? (
                <img
                  src={label.qrCodeUrl}
                  alt="QR Code"
                  className="w-32 h-32 object-contain"
                />
              ) : (
                <div className="w-32 h-32 bg-muted flex items-center justify-center rounded">
                  No QR Code
                </div>
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-medium mb-2">Label Information</h4>
              <p className="text-sm text-muted-foreground">
                Created: {label.createdAt?.toLocaleDateString() || 'Unknown'}
              </p>
              <p className="text-sm text-muted-foreground">
                Last Updated: {label.updatedAt?.toLocaleDateString() || 'Unknown'}
              </p>
              {label.description && (
                <p className="text-sm text-muted-foreground mt-2">
                  {label.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="border-t p-4 flex gap-2">
        <Button variant="outline" onClick={onShare}>
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
        <Button variant="outline" onClick={onPrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
        <Button 
          variant="outline" 
          onClick={() => label.qrCodeUrl && window.open(label.qrCodeUrl, '_blank')}
          disabled={!label.qrCodeUrl}
        >
          <Download className="h-4 w-4 mr-2" />
          Download QR
        </Button>
        <Button variant="default" onClick={onView}>
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
};

export default InsuranceLabelCard;