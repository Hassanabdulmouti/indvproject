import React from 'react';
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import AddContentForm from './addContentForm';
import { Box, BoxContent, deleteBoxContent } from '@/firebase/dbOp';

interface BoxDetailsDialogProps {
  box: Box;
  boxContents: BoxContent[];
  onAddContent: (type: 'text' | 'audio' | 'image' | 'document', content: string) => void;
  onClose: () => void;
  onContentDeleted: () => void;
}

const BoxDetailsDialog: React.FC<BoxDetailsDialogProps> = ({ 
  box, 
  boxContents, 
  onAddContent, 
  onClose, 
  onContentDeleted 
}) => {
  const handleDeleteContent = async (contentId: string) => {
    try {
      await deleteBoxContent(contentId);
      onContentDeleted();
    } catch (error) {
      console.error("Error deleting content:", error);
      // Optionally, add error handling UI here
    }
  };

  const renderContent = (content: BoxContent) => {
    return (
      <div className="flex justify-between items-center mb-2">
        <div>
          <p className="font-semibold">{content.type}:</p>
          {content.type === 'text' && <p>{content.value}</p>}
          {content.type === 'audio' && <audio controls src={content.value} />}
          {content.type === 'image' && <img src={content.value} alt="Box content" className="max-w-full h-auto" />}
          {content.type === 'document' && <a href={content.value} target="_blank" rel="noopener noreferrer">View Document</a>}
        </div>
        <Button variant="destructive" onClick={() => handleDeleteContent(content.id)}>Delete</Button>
      </div>
    );
  };

  return (
    <DialogContent className="max-w-lg mx-auto p-6 bg-white rounded-lg shadow-lg">
      <DialogHeader>
        <DialogTitle className="text-2xl font-bold text-gray-900">{box.name} Details</DialogTitle>
      </DialogHeader>
      <div className="grid gap-6 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right text-gray-900">
            Name
          </Label>
          <Input id="name" value={box.name} className="col-span-3" readOnly />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="description" className="text-right text-gray-900">
            Description
          </Label>
          <Input id="description" value={box.description} className="col-span-3" readOnly />
        </div>
        <div>
          <h3 className="mb-2 font-semibold text-gray-800">Contents</h3>
          {boxContents.length > 0 ? (
            <div className="space-y-2">
              {boxContents.map((content) => (
                <div key={content.id} className="p-2 bg-gray-100 rounded">
                  {renderContent(content)}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No contents in this box yet.</p>
          )}
        </div>
        <AddContentForm onAddContent={onAddContent} />
        <DialogFooter className="flex justify-end space-x-2">
          <Button onClick={onClose} className="bg-blue-600 text-white hover:bg-blue-700">
            Close
          </Button>
        </DialogFooter>
      </div>
    </DialogContent>
  );
};

export default BoxDetailsDialog;