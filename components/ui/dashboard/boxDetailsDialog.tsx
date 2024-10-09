import React from 'react';
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import AddContentForm from './addContentForm';
import { Box, BoxContent } from '@/firebase/dbOp'; // Import interfaces from dbOp

interface BoxDetailsDialogProps {
  box: Box;
  boxContents: BoxContent[];
  onAddContent: (type: 'text' | 'audio' | 'image' | 'document', content: string) => void;
  onClose: () => void;
}

const BoxDetailsDialog: React.FC<BoxDetailsDialogProps> = ({ box, boxContents, onAddContent, onClose }) => {
  const renderContent = (content: BoxContent) => {
    switch (content.type) {
      case 'text':
        return <p>{content.value}</p>;
      case 'audio':
        return <audio controls src={content.value} />;
      case 'image':
        return <img src={content.value} alt="Box content" className="max-w-full h-auto" />;
      case 'document':
        return <a href={content.value} target="_blank" rel="noopener noreferrer">View Document</a>;
      default:
        return <p>Unsupported content type</p>;
    }
  };

  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{box.name} Details</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right">
            Name
          </Label>
          <Input id="name" value={box.name} className="col-span-3" readOnly />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="description" className="text-right">
            Description
          </Label>
          <Input id="description" value={box.description} className="col-span-3" readOnly />
        </div>
        <div>
          <h3 className="mb-2 font-semibold">Contents</h3>
          {boxContents.map((content) => (
            <div key={content.id} className="mb-2">
              <p>{content.type}:</p>
              {renderContent(content)}
            </div>
          ))}
        </div>
        <AddContentForm onAddContent={onAddContent} />
        <Button onClick={onClose}>Close</Button>
      </div>
    </DialogContent>
  );
};

export default BoxDetailsDialog;