import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload } from 'lucide-react';
import { storage } from '@/firebase/clientApp';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface FileUploadProps {
  onFileUpload: (url: string, type: string) => void;
  acceptedTypes: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, acceptedTypes }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    const storageRef = ref(storage, `files/${Date.now()}_${file.name}`);

    try {
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      onFileUpload(downloadURL, file.type);
    } catch (error) {
      console.error("Error uploading file: ", error);
    } finally {
      setUploading(false);
      setFile(null);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Input
        type="file"
        onChange={handleFileChange}
        accept={acceptedTypes}
        disabled={uploading}
      />
      <Button onClick={handleUpload} disabled={!file || uploading}>
        <Upload className="mr-2 h-4 w-4" /> Upload
      </Button>
    </div>
  );
};

export default FileUpload;