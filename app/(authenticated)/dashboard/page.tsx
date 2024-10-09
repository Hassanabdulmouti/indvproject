'use client'

import React, { useState, useEffect } from 'react';
import { auth } from '@/firebase/clientApp';
import { createBox, getUserBoxes, getBoxContents, addContentToBox, deleteBox } from '@/firebase/dbOp';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog } from "@/components/ui/dialog";
import { useAuthState } from 'react-firebase-hooks/auth';
import DashboardStats from "@/components/ui/dashboard/dashboardStats";
import CreateBoxForm from "@/components/ui/dashboard/createBoxForm";
import BoxList from "@/components/ui/dashboard/boxList";
import BoxDetailsDialog from "@/components/ui/dashboard/boxDetailsDialog";
import { Box, BoxContent } from '@/firebase/dbOp';

const Dashboard: React.FC = () => {
  const [error, setError] = useState<string>('');
  const [user] = useAuthState(auth);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [selectedBox, setSelectedBox] = useState<Box | null>(null);
  const [boxContents, setBoxContents] = useState<BoxContent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  const handleAddContent = async (type: 'text' | 'audio' | 'image' | 'document', content: string) => {
    if (selectedBox) {
      try {
        await addContentToBox(selectedBox.id, type, content);
        const updatedContents = await getBoxContents(selectedBox.id);
        setBoxContents(updatedContents);
      } catch (err) {
        setError('Failed to add content');
      }
    }
  };

  useEffect(() => {
    const fetchBoxes = async () => {
      if (user) {
        try {
          const fetchedBoxes = await getUserBoxes(user.uid);
          setBoxes(fetchedBoxes);
        } catch (err) {
          setError('Failed to fetch boxes');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchBoxes();
  }, [user]);



  const handleViewDetails = async (box: Box) => {
    setSelectedBox(box);
    try {
      const contents = await getBoxContents(box.id);
      setBoxContents(contents);
      setIsDialogOpen(true);
    } catch (err) {
      setError('Failed to fetch box contents');
    }
  };

  const handleDeleteBox = async (boxId: string) => {
    try {
      await deleteBox(boxId);
      setBoxes(boxes.filter(box => box.id !== boxId));
    } catch (err) {
      setError('Failed to delete box');
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedBox(null);
    setBoxContents([]);
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (error) return <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      
      <DashboardStats 
        totalBoxes={boxes.length} 
        latestBoxName={boxes.length > 0 ? boxes[0].name : 'No boxes yet'}
      />

      <CreateBoxForm/>

      <h2 className="text-xl font-semibold mb-4">Your Boxes</h2>
      <BoxList 
        boxes={boxes} 
        onViewDetails={handleViewDetails}
        onDeleteBox={handleDeleteBox}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        {selectedBox && (
          <BoxDetailsDialog
            box={selectedBox}
            boxContents={boxContents}
            onAddContent={handleAddContent}
            onClose={handleCloseDialog}
          />
        )}
      </Dialog>
    </div>
  );
};

export default Dashboard;