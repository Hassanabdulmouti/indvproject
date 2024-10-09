import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle } from 'lucide-react';
import FileUpload from './fileUpload';
import AudioRecorder from './audioRecorder';

interface AddContentFormProps {
  onAddContent: (type: 'text' | 'audio' | 'image', content: string) => void;
}

const AddContentForm: React.FC<AddContentFormProps> = ({ onAddContent }) => {
  const [contentType, setContentType] = useState<'text' | 'audio' | 'image'>('text');
  const [newContent, setNewContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newContent.trim()) {
      onAddContent(contentType, newContent);
      setNewContent('');
    }
  };

  const handleFileUpload = (url: string, type: string) => {
    const contentType = 'image' ;
    onAddContent(contentType, url);
  };

  const handleAudioUpload = (url: string) => {
    onAddContent('audio', url);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3 className="mb-2 font-semibold">Add New Content</h3>
      <select
        value={contentType}
        onChange={(e) => setContentType(e.target.value as 'text' | 'audio' | 'image')}
        className="w-full p-2 border rounded mb-2"
      >
        <option value="text">Text</option>
        <option value="audio">Audio</option>
        <option value="image">Image</option>
        <option value="document">Document</option>
      </select>
      {contentType === 'text' && (
        <>
          <Input
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Enter content"
            className="mb-2"
          />
          <Button type="submit">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Content
          </Button>
        </>
      )}
      {contentType === 'audio' && (
        <AudioRecorder onAudioUpload={handleAudioUpload} />
      )}
      {(contentType === 'image') && (
        <FileUpload 
          onFileUpload={handleFileUpload} 
          acceptedTypes={"image/*"}
        />
      )}
    </form>
  );
};

export default AddContentForm;