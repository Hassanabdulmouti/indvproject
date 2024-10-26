'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getBoxContents, getBoxDetails, validateAccessCode } from '@/firebase/dbOp';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from 'lucide-react';

interface BoxContent {
  id: string;
  type: 'text' | 'audio' | 'image' | 'document';
  value: string;
  createdAt: { toDate: () => Date };
}

interface BoxDetails {
  name: string;
  description: string;
  isPrivate: boolean;
}

const BoxContentPage: React.FC = () => {
  const { id } = useParams();
  const [contents, setContents] = useState<BoxContent[]>([]);
  const [boxDetails, setBoxDetails] = useState<BoxDetails | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [accessCode, setAccessCode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAccessCode, setShowAccessCode] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchedDetails = await getBoxDetails(id as string);
        setBoxDetails(fetchedDetails as BoxDetails);
        
        if (!fetchedDetails.isPrivate) {
          const fetchedContents = await getBoxContents(id as string);
          setContents(fetchedContents as BoxContent[]);
          setIsAuthenticated(true);
        }
      } catch (err) {
        setError('Failed to fetch box data');
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
        const fetchedContents = await getBoxContents(id as string);
        setContents(fetchedContents as BoxContent[]);
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

  if (loading) return <div>Loading...</div>;
  if (error) return <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>;

  if (boxDetails?.isPrivate && !isAuthenticated) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Private Box</CardTitle>
            <CardDescription>This box is private. Please enter the access code to view its contents.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAccessCodeSubmit}>
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
              <Button type="submit" className="mt-2">Submit</Button>
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
          <CardTitle>{boxDetails?.name || 'Unnamed Box'}</CardTitle>
          <CardDescription>{boxDetails?.description || 'No description available'}</CardDescription>
        </CardHeader>
      </Card>

      <h2 className="text-2xl font-bold mb-4">Box Contents</h2>
      {contents.map((content) => (
        <Card key={content.id} className="mb-4">
          <CardHeader>
            <CardTitle className="text-xl font-semibold capitalize">{content.type}</CardTitle>
          </CardHeader>
          <CardContent>
            {content.type === 'text' && <p>{content.value}</p>}
            {content.type === 'audio' && <audio controls src={content.value} />}
            {content.type === 'image' && <img src={content.value} alt="Box content" className="max-w-full h-auto" />}
            {content.type === 'document' && <a href={content.value} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">View Document</a>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default BoxContentPage;