import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { functions } from '@/firebase/clientApp';
import { httpsCallable } from 'firebase/functions';
import { Box } from '@/firebase/dbOp';
import { Loader2 } from 'lucide-react';
import ContactSelector from './ContactSelector';

interface ShareEmailDialogProps {
  box: Box;
  isOpen: boolean;
  onClose: () => void;
}

const ShareEmailDialog: React.FC<ShareEmailDialogProps> = ({ box, isOpen, onClose }) => {
  const [manualEmails, setManualEmails] = useState('');
  const [selectedContactEmails, setSelectedContactEmails] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validateEmails = (emailString: string): boolean => {
    const emailArray = emailString.split(',').map(email => email.trim());
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailArray.every(email => emailRegex.test(email));
  };

  const handleShare = async () => {
    setError(null);
    setSuccess(false);

    const allEmails = [
      ...selectedContactEmails,
      ...manualEmails.split(',').map(email => email.trim()).filter(email => email)
    ];

    if (allEmails.length === 0) {
      setError('Please select at least one contact or enter an email address');
      return;
    }

    if (manualEmails && !validateEmails(manualEmails)) {
      setError('Please enter valid email addresses');
      return;
    }

    setIsSending(true);

    try {
      const shareBoxViaEmail = httpsCallable(functions, 'shareBoxViaEmail');
      await shareBoxViaEmail({
        boxId: box.id,
        recipientEmails: allEmails,
        message: message.trim(),
        origin: window.location.origin
      });

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setManualEmails('');
        setSelectedContactEmails([]);
        setMessage('');
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error sharing via email');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share {box.name} via Email</DialogTitle>
          <DialogDescription>
            Select contacts or enter email addresses manually
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <ContactSelector
            selectedEmails={selectedContactEmails}
            onEmailsChange={setSelectedContactEmails}
          />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or enter emails manually</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="emails">
              Email Addresses (separate multiple emails with commas)
            </Label>
            <Input
              id="emails"
              placeholder="email@example.com, another@example.com"
              value={manualEmails}
              onChange={(e) => setManualEmails(e.target.value)}
              disabled={isSending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Add a message (optional)</Label>
            <Textarea
              id="message"
              placeholder="Enter your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSending}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>Digital label shared successfully!</AlertDescription>
            </Alert>
          )}

          {box.isPrivate && (
            <Alert>
              <AlertDescription>
                Recipients will receive the access code in their email.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={handleShare} disabled={isSending}>
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Share'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShareEmailDialog;
