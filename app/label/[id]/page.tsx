'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getInsuranceLabel, validateAccessCode } from '@/firebase/dbOp';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Receipt, Download } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from '@/lib/config/insurance';
import { InsuranceLabel } from '@/firebase/dbOp';

const InsuranceLabelPage: React.FC = () => {
  const { id } = useParams();
  const [label, setLabel] = useState<InsuranceLabel | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [accessCode, setAccessCode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAccessCode, setShowAccessCode] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchedLabel = await getInsuranceLabel(id as string);
        setLabel(fetchedLabel);
        
        if (!fetchedLabel.isPrivate) {
          setIsAuthenticated(true);
        }
      } catch (err) {
        setError('Failed to fetch insurance label');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleAccessCodeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const isValid = await validateAccessCode(id as string, accessCode);
      if (isValid) {
        const fetchedLabel = await getInsuranceLabel(id as string);
        setLabel(fetchedLabel);
        setIsAuthenticated(true);
      } else {
        setError('Invalid access code');
      }
    } catch (err) {
      setError('Failed to validate access code');
    } finally {
      setLoading(false);
    }
  };

  const handleAccessCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.replace(/\D/g, '').slice(0, 6);
    setAccessCode(newValue);
  };

  const handleDownloadDesign = async () => {
    if (label?.qrCodeUrl) {
      try {
        const response = await fetch(label.qrCodeUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${label.name}-insurance-label.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error downloading design:', error);
      }
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
    </div>
  );

  if (error) return (
    <div className="container mx-auto p-4">
      <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
    </div>
  );

  if (label?.isPrivate && !isAuthenticated) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Private Insurance Label</CardTitle>
            <CardDescription>This insurance label is private. Please enter the access code to view its contents.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAccessCodeSubmit} className="space-y-4">
              <div className="relative">
                <Input
                  type={showAccessCode ? "text" : "password"}
                  value={accessCode}
                  onChange={handleAccessCodeChange}
                  placeholder="Enter 6-digit access code"
                  pattern="\d{6}"
                  required
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
              <Button type="submit" className="w-full">Submit</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{label?.name || 'Unnamed Label'}</CardTitle>
              <CardDescription>{label?.description || 'No description available'}</CardDescription>
            </div>
            {label?.insuranceCompany && (
              <img
                src={label.insuranceCompany.logoUrl}
                alt={label.insuranceCompany.name}
                className="h-8 object-contain"
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Created:</span>
            <span>{label?.createdAt.toLocaleDateString()}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Value:</span>
            <span className="font-medium">
              {label && formatCurrency(label.totalValue, label.currency)}
            </span>
          </div>

          {label?.qrCodeUrl && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Label Design:</h3>
              <div className="flex justify-center">
                <img
                  src={label.qrCodeUrl}
                  alt="Label Design"
                  className="max-w-xs w-full h-auto"
                />
              </div>
              <Button
                className="w-full"
                variant="outline"
                onClick={handleDownloadDesign}
              >
                <Download className="mr-2 h-4 w-4" /> Download Design
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Insured Items:</h3>
            <ScrollArea className="h-[300px] border rounded-md">
              {label?.items.map((item) => (
                <div
                  key={item.id}
                  className="p-4 border-b last:border-b-0 hover:bg-accent"
                >
                  <div className="flex items-start gap-4">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-medium">{item.name}</h4>
                      {item.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.description}
                        </p>
                      )}
                      <div className="text-sm font-medium mt-2">
                        {formatCurrency(item.value, label.currency)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InsuranceLabelPage;