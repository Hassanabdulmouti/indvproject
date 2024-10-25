'use client'

import React, { useState, useEffect } from 'react';
import { auth } from '@/firebase/clientApp';
import { 
  createBox, 
  getUserBoxes, 
  getBoxContents, 
  addContentToBox, 
  deleteBox,
  updateBoxPrivacy,
  Box,
  BoxContent,
  InsuranceLabel,
  getUserInsuranceLabels
} from '@/firebase/dbOp';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthState } from 'react-firebase-hooks/auth';
import { Package, Shield, AlertCircle, Loader2 } from 'lucide-react';
import DashboardStats from "@/components/ui/dashboard/dashboardStats";
import CreateBoxForm from "@/components/ui/dashboard/createBoxForm";
import InsuranceLabelForm from "@/components/ui/dashboard/insuranceLabelForm";
import BoxList from "@/components/ui/dashboard/boxList";
import BoxDetailsDialog from "@/components/ui/dashboard/boxDetailsDialog";
import InsuranceLabelCard from "@/components/ui/dashboard/insuranceLabelCard";
import InsuranceDetailsDialog from "@/components/ui/dashboard/insuranceDetailsDialog";

type BoxType = 'regular' | 'insurance';

const Dashboard: React.FC = () => {
  const [user] = useAuthState(auth);
  const [error, setError] = useState<string>('');
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [insuranceLabels, setInsuranceLabels] = useState<InsuranceLabel[]>([]);
  const [selectedItem, setSelectedItem] = useState<Box | InsuranceLabel | null>(null);
  const [boxContents, setBoxContents] = useState<BoxContent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<BoxType>('regular');
  const [createBoxType, setCreateBoxType] = useState<BoxType>('regular');
  const [updatingPrivacy, setUpdatingPrivacy] = useState<string | null>(null);

  // Load boxes and insurance labels
  useEffect(() => {
    const loadUserContent = async () => {
      if (!user) return;

      try {
        const [fetchedBoxes, fetchedLabels] = await Promise.all([
          getUserBoxes(user.uid),
          getUserInsuranceLabels(user.uid)
        ]);

        setBoxes(fetchedBoxes.filter(box => !('type' in box)) as Box[]);
        setInsuranceLabels(fetchedLabels);
      } catch (err) {
        console.error('Error fetching user content:', err);
        setError('Failed to load your content');
      } finally {
        setLoading(false);
      }
    };

    loadUserContent();
  }, [user]);

  // Content management handlers
  const handleAddContent = async (type: 'text' | 'audio' | 'image' | 'document', content: string) => {
    if (!selectedItem) return;

    try {
      await addContentToBox(selectedItem.id, type, content);
      const updatedContents = await getBoxContents(selectedItem.id);
      setBoxContents(updatedContents);
    } catch (err) {
      setError('Failed to add content');
    }
  };

  const handleContentDeleted = async () => {
    if (!selectedItem) return;

    try {
      const updatedContents = await getBoxContents(selectedItem.id);
      setBoxContents(updatedContents);
    } catch (err) {
      setError('Failed to refresh contents');
    }
  };

  // View and dialog handlers
  const handleViewDetails = async (item: Box | InsuranceLabel) => {
    setSelectedItem(item);
    try {
      if (!('type' in item) || item.type !== 'insurance') {
        const contents = await getBoxContents(item.id);
        setBoxContents(contents);
      }
      setIsDialogOpen(true);
    } catch (err) {
      setError('Failed to load details');
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedItem(null);
    setBoxContents([]);
  };

  // Box and label management handlers
  const handleBoxCreated = (newBox: Box) => {
    setBoxes(prev => [newBox, ...prev]);
  };

  const handleLabelCreated = (newLabel: InsuranceLabel) => {
    setInsuranceLabels(prev => [newLabel, ...prev]);
  };

  const handleDeleteBox = async (boxId: string) => {
    try {
      await deleteBox(boxId);
      setBoxes(prev => prev.filter(box => box.id !== boxId));
    } catch (err) {
      setError('Failed to delete box');
    }
  };

  const handleDeleteLabel = async (labelId: string) => {
    try {
      await deleteBox(labelId);
      setInsuranceLabels(prev => prev.filter(label => label.id !== labelId));
    } catch (err) {
      setError('Failed to delete label');
    }
  };

  const handlePrivacyChange = async (labelId: string, isPrivate: boolean) => {
    setUpdatingPrivacy(labelId);
    try {
      await updateBoxPrivacy(labelId, isPrivate);
      setInsuranceLabels(prev => prev.map(label => 
        label.id === labelId ? { ...label, isPrivate } : label
      ));
    } catch (err) {
      setError('Failed to update privacy settings');
    } finally {
      setUpdatingPrivacy(null);
    }
  };

  // Utility handlers
  const handleShare = async (item: Box | InsuranceLabel) => {
    console.log('Sharing:', item.name);
    // Implement sharing logic
  };

  const handlePrint = async (item: Box | InsuranceLabel) => {
    console.log('Printing:', item.name);
    // Implement printing logic
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      
      <DashboardStats 
        totalBoxes={boxes.length}
        totalInsuranceLabels={insuranceLabels.length}
        latestBoxName={[...boxes, ...insuranceLabels].sort((a, b) => 
          b.createdAt.getTime() - a.createdAt.getTime()
        )[0]?.name || 'No items yet'}
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={createBoxType} onValueChange={(value: string) => setCreateBoxType(value as BoxType)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="regular">
            <Package className="mr-2 h-4 w-4" />
            Regular Box
          </TabsTrigger>
          <TabsTrigger value="insurance">
            <Shield className="mr-2 h-4 w-4" />
            Insurance Label
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="regular">
          <CreateBoxForm onBoxCreated={handleBoxCreated} />
        </TabsContent>
        
        <TabsContent value="insurance">
          <InsuranceLabelForm onLabelCreated={handleLabelCreated} />
        </TabsContent>
      </Tabs>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Your Labels</h2>
        
        <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as BoxType)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="regular">
              <Package className="mr-2 h-4 w-4" />
              Regular Boxes ({boxes.length})
            </TabsTrigger>
            <TabsTrigger value="insurance">
              <Shield className="mr-2 h-4 w-4" />
              Insurance Labels ({insuranceLabels.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="regular">
            <div className="grid gap-4">
              {boxes.map((box) => (
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
                  onViewDetails={() => handleViewDetails(label)}
                  onPrivacyChange={
                    updatingPrivacy === label.id
                      ? undefined
                      : async (isPrivate) => handlePrivacyChange(label.id, isPrivate)
                  }
                  onDeleteLabel={handleDeleteLabel}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        {selectedItem && (
          'type' in selectedItem && selectedItem.type === 'insurance' ? (
            <InsuranceDetailsDialog
              label={selectedItem as InsuranceLabel}
              onClose={handleCloseDialog}
              onLabelUpdated={(updatedLabel) => {
                setInsuranceLabels(prev => 
                  prev.map(label => label.id === updatedLabel.id ? updatedLabel : label)
                );
              }}
            />
          ) : (
            <BoxDetailsDialog
              box={selectedItem as Box}
              boxContents={boxContents}
              onAddContent={handleAddContent}
              onClose={handleCloseDialog}
              onContentDeleted={handleContentDeleted}
              onBoxUpdated={(updatedBox) => {
                setBoxes(prev => 
                  prev.map(box => box.id === updatedBox.id ? updatedBox : box)
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