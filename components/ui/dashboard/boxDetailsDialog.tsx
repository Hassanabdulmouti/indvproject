import React, { useState } from 'react';
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateBoxPrivacy, addContentToBox, deleteBoxContent, Box, BoxContent } from '@/firebase/dbOp';
import { PlusCircle, Trash2, Eye, EyeOff } from 'lucide-react';
import AudioRecorder from './audioRecorder';
import FileUpload from './fileUpload';

interface BoxDetailsDialogProps {
  box: Box;
  boxContents: BoxContent[];
  onAddContent: (type: 'text' | 'audio' | 'image' | 'document', content: string) => Promise<void>;
  onClose: () => void;
  onContentDeleted: () => Promise<void>;
  onBoxUpdated: (updatedBox: Box) => void;
}

const BoxDetailsDialog: React.FC<BoxDetailsDialogProps> = ({ 
  box, 
  boxContents, 
  onAddContent, 
  onClose, 
  onContentDeleted,
  onBoxUpdated
}) => {
  const [isPrivate, setIsPrivate] = useState<boolean>(box.isPrivate);
  const [accessCode, setAccessCode] = useState<string>(box.accessCode || '');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [newTextContent, setNewTextContent] = useState<string>('');
  const [newContentType, setNewContentType] = useState<'text' | 'audio' | 'image' | 'document'>('text');
  const [showAccessCode, setShowAccessCode] = useState<boolean>(false);

  const handlePrivacyChange = async () => {
    setIsUpdating(true);
    try {
      if (isPrivate && accessCode.length !== 6) {
        throw new Error("Access code must be 6 digits for private boxes");
      }
      await updateBoxPrivacy(box.id, isPrivate, isPrivate ? accessCode : undefined);
      const updatedBox = { ...box, isPrivate, accessCode: isPrivate ? accessCode : undefined };
      onBoxUpdated(updatedBox);
    } catch (error) {
      console.error('Error updating box privacy:', error);
      // You might want to show an error message to the user here
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAccessCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.replace(/\D/g, '').slice(0, 6);
    setAccessCode(newValue);
  };

  const handleAddTextContent = async () => {
    if (newTextContent.trim()) {
      try {
        await onAddContent('text', newTextContent);
        setNewTextContent('');
      } catch (error) {
        console.error('Error adding text content:', error);
      }
    }
  };

  const handleAudioUpload = async (url: string) => {
    try {
      await onAddContent('audio', url);
    } catch (error) {
      console.error('Error adding audio content:', error);
    }
  };

  const handleFileUpload = async (url: string, type: string) => {
    try {
      await onAddContent(type.startsWith('image/') ? 'image' : 'document', url);
    } catch (error) {
      console.error('Error adding file content:', error);
    }
  };

  const handleDeleteContent = async (contentId: string) => {
    try {
      await deleteBoxContent(contentId);
      await onContentDeleted();
    } catch (error) {
      console.error('Error deleting content:', error);
    }
  };

  return (
    <DialogContent className="sm:max-w-[800px]">
      <DialogHeader>
        <DialogTitle>{box.name}</DialogTitle>
      </DialogHeader>
      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="contents">Contents</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Box Details</CardTitle>
            </CardHeader>
            <CardContent>
              <p><strong>Description:</strong> {box.description}</p>
              <p><strong>Created At:</strong> {box.createdAt.toLocaleString()}</p>
              <p><strong>Updated At:</strong> {box.updatedAt.toLocaleString()}</p>
              <p><strong>Privacy:</strong> {isPrivate ? 'Private' : 'Public'}</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="contents">
          <Card>
            <CardHeader>
              <CardTitle>Box Contents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {boxContents.map((content) => (
                  <div key={content.id} className="flex justify-between items-center">
                    <div>
                      <strong>{content.type}: </strong>
                      {content.type === 'text' && content.value}
                      {content.type === 'audio' && <audio controls src={content.value} />}
                      {content.type === 'image' && <img src={content.value} alt="Box content" className="max-w-xs h-auto" />}
                      {content.type === 'document' && <a href={content.value} target="_blank" rel="noopener noreferrer">View Document</a>}
                    </div>
                    <Button variant="destructive" onClick={() => handleDeleteContent(content.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                <select 
                  value={newContentType} 
                  onChange={(e) => setNewContentType(e.target.value as 'text' | 'audio' | 'image' | 'document')}
                  className="w-full p-2 border rounded"
                >
                  <option value="text">Text</option>
                  <option value="audio">Audio</option>
                  <option value="image">Image</option>
                  <option value="document">Document</option>
                </select>
                {newContentType === 'text' && (
                  <div>
                    <Input
                      value={newTextContent}
                      onChange={(e) => setNewTextContent(e.target.value)}
                      placeholder="Enter text content"
                    />
                    <Button onClick={handleAddTextContent} className="mt-2">
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Text
                    </Button>
                  </div>
                )}
                {newContentType === 'audio' && (
                  <AudioRecorder onAudioUpload={handleAudioUpload} />
                )}
                {(newContentType === 'image' || newContentType === 'document') && (
                  <FileUpload
                    onFileUpload={handleFileUpload}
                    acceptedTypes={newContentType === 'image' ? 'image/*' : '*/*'}
                  />
                )}
              </div>
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
                    id="box-privacy"
                    checked={isPrivate}
                    onCheckedChange={(checked) => {
                      setIsPrivate(checked);
                      if (!checked) {
                        setAccessCode('');
                      }
                    }}
                    disabled={isUpdating}
                  />
                  <Label htmlFor="box-privacy">Private Box</Label>
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
                        {showAccessCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}
                <Button 
                  onClick={handlePrivacyChange}
                  disabled={isPrivate && accessCode.length !== 6 || isUpdating}
                >
                  {isUpdating ? 'Updating...' : 'Update Privacy Settings'}
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

export default BoxDetailsDialog;