'use client'

import React, { useState, useEffect } from 'react';
import { auth } from '@/firebase/clientApp';
import { 
  createBox, 
  getUserBoxes, 
  getBoxContents, 
  addContentToBox, 
  deleteBox,
  Box,
  BoxContent,
  InsuranceLabel
} from '@/firebase/dbOp';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthState } from 'react-firebase-hooks/auth';
import { Package, Shield } from 'lucide-react';
import DashboardStats from "@/components/ui/dashboard/dashboardStats";
import CreateBoxForm from "@/components/ui/dashboard/createBoxForm";
import InsuranceCreateBoxForm from "@/components/ui/dashboard/insuranceLabelForm";
import BoxList from "@/components/ui/dashboard/boxList";
import BoxDetailsDialog from "@/components/ui/dashboard/boxDetailsDialog";
import InsuranceLabelCard from "@/components/ui/dashboard/insuranceLabelCard";
import InsuranceDetailsDialog from "@/components/ui/dashboard/insuranceDetailsDialog";

type BoxType = 'regular' | 'insurance';

const Dashboard: React.FC = () => {
  const [error, setError] = useState<string>('');
  const [user] = useAuthState(auth);
  const [boxes, setBoxes] = useState<(Box | InsuranceLabel)[]>([]);
  const [selectedBox, setSelectedBox] = useState<Box | InsuranceLabel | null>(null);
  const [boxContents, setBoxContents] = useState<BoxContent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<BoxType>('regular');
  const [createBoxType, setCreateBoxType] = useState<BoxType>('regular');

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

  const handleContentDeleted = async () => {
    if (selectedBox) {
      try {
        const updatedContents = await getBoxContents(selectedBox.id);
        setBoxContents(updatedContents);
      } catch (err) {
        setError('Failed to refresh box contents');
      }
    }
  };

  useEffect(() => {
    const fetchBoxes = async () => {
      if (user) {
        try {
          const fetchedBoxes = await getUserBoxes(user.uid);
          setBoxes(fetchedBoxes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
        } catch (err) {
          setError('Failed to fetch boxes');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchBoxes();
  }, [user]);

  const handleViewDetails = async (box: Box | InsuranceLabel) => {
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

  const handleShare = async (box: Box | InsuranceLabel) => {
    // Implement sharing functionality
    console.log('Sharing:', box.name);
  };

  const handlePrint = async (box: Box | InsuranceLabel) => {
    // Implement printing functionality
    console.log('Printing:', box.name);
  };

  const getFilteredBoxes = () => {
    return boxes.filter(box => {
      if (activeTab === 'insurance') {
        return 'type' in box && box.type === 'insurance';
      }
      return !('type' in box) || box.type !== 'insurance';
    });
  };

  const regularBoxes = boxes.filter(box => !('type' in box) || box.type !== 'insurance');
  const insuranceLabels = boxes.filter(box => 'type' in box && box.type === 'insurance') as InsuranceLabel[];

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (error) return <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      
      <DashboardStats 
        totalBoxes={regularBoxes.length}
        totalInsuranceLabels={insuranceLabels.length}
        latestBoxName={boxes[0]?.name || 'No boxes yet'}
      />

      <Tabs value={createBoxType} onValueChange={(value: string) => setCreateBoxType(value as BoxType)}>
        <TabsList className="w-full mb-4">
          <TabsTrigger value="regular" className="flex-1">
            <Package className="mr-2 h-4 w-4" />
            Regular Box
          </TabsTrigger>
          <TabsTrigger value="insurance" className="flex-1">
            <Shield className="mr-2 h-4 w-4" />
            Insurance Label
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="regular">
          <CreateBoxForm onBoxCreated={(newBox) => setBoxes(prev => [newBox, ...prev])} />
        </TabsContent>
        
        <TabsContent value="insurance">
          <InsuranceCreateBoxForm onLabelCreated={(newLabel) => setBoxes(prev => [newLabel, ...prev])} />
        </TabsContent>
      </Tabs>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Your Labels</h2>
        
        <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as BoxType)}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="regular" className="flex-1">
              <Package className="mr-2 h-4 w-4" />
              Regular Boxes ({regularBoxes.length})
            </TabsTrigger>
            <TabsTrigger value="insurance" className="flex-1">
              <Shield className="mr-2 h-4 w-4" />
              Insurance Labels ({insuranceLabels.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="regular">
            <div className="grid gap-4">
              {regularBoxes.map((box) => (
                <BoxList
                  key={box.id}
                  boxes={[box]}
                  onViewDetails={handleViewDetails}
                  onDeleteBox={handleDeleteBox}
                />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="insurance">
            <div className="grid gap-4">
              {insuranceLabels.map((label) => (
                <InsuranceLabelCard
                  key={label.id}
                  label={label}
                  onShare={() => handleShare(label)}
                  onPrint={() => handlePrint(label)}
                  onView={() => handleViewDetails(label)}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        {selectedBox && (
          'type' in selectedBox && selectedBox.type === 'insurance' ? (
            <InsuranceDetailsDialog
              label={selectedBox as InsuranceLabel}
              onClose={handleCloseDialog}
              onLabelUpdated={(updatedLabel) => {
                setBoxes(prevBoxes => 
                  prevBoxes.map(box => box.id === updatedLabel.id ? updatedLabel : box)
                );
              }}
            />
          ) : (
            <BoxDetailsDialog
              box={selectedBox as Box}
              boxContents={boxContents}
              onAddContent={handleAddContent}
              onClose={handleCloseDialog}
              onContentDeleted={handleContentDeleted}
              onBoxUpdated={(updatedBox) => {
                setBoxes(prevBoxes => 
                  prevBoxes.map(box => box.id === updatedBox.id ? updatedBox : box)
                );
              }}
            />
          )
        )}
      </Dialog>
    </div>
  );
};

export default Dashboard;