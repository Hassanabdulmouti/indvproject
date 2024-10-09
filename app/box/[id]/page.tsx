'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getBoxContents, getBoxDetails } from '@/firebase/dbOp';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface BoxContent {
  id: string;
  type: 'text' | 'audio' | 'image' | 'document';
  value: string;
  createdAt: { toDate: () => Date };
}

interface BoxDetails {
  name: string;
  description: string;
}

const BoxContentPage: React.FC = () => {
  const { id } = useParams();
  const [contents, setContents] = useState<BoxContent[]>([]);
  const [boxDetails, setBoxDetails] = useState<BoxDetails | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fetchedContents, fetchedDetails] = await Promise.all([
          getBoxContents(id as string),
          getBoxDetails(id as string)
        ]);
        setContents(fetchedContents as BoxContent[]);
        setBoxDetails(fetchedDetails as BoxDetails);
      } catch (err) {
        setError('Failed to fetch box data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (error) return <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>;

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