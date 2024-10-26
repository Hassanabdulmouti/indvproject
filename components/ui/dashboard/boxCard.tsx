import React, { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { BoxIcon, Trash2, QrCode, Download, Lock, Unlock, Share2, Eye, EyeOff, Mail, Link as LinkIcon, Loader2, Plus, Check, X } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Box, Contact, createContact, getUserContacts, deleteContact } from '@/firebase/dbOp';
import { functions } from '@/firebase/clientApp';
import { httpsCallable } from 'firebase/functions';

interface BoxCardProps {
  box: Box;
  onViewDetails: () => void;
  onDeleteBox: () => void;
  onPrivacyChange?: (isPrivate: boolean) => Promise<void>;
}

const BoxCard: React.FC<BoxCardProps> = ({
  box,
  onViewDetails,
  onDeleteBox,
  onPrivacyChange
}) => {

  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isEmailShareDialogOpen, setIsEmailShareDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactEmails, setSelectedContactEmails] = useState<string[]>([]);
  const [manualEmails, setManualEmails] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState(false);
  
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [contactError, setContactError] = useState<string | null>(null);

  const qrCodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (qrCodeRef.current && box.qrCodeUrl) {
      qrCodeRef.current.innerHTML = box.qrCodeUrl;
    }
    loadContacts();
  }, [box.qrCodeUrl]);

  const loadContacts = async () => {
    try {
      const userContacts = await getUserContacts();
      setContacts(userContacts);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateEmails = (emailString: string): boolean => {
    const emailArray = emailString.split(',').map(email => email.trim());
    return emailArray.every(email => validateEmail(email));
  };

  const handleDownloadDesign = async () => {
    if (box.qrCodeUrl) {
      try {
        const response = await fetch(box.qrCodeUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${box.name}-design.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error downloading design:', error);
      }
    }
  };

  const handleCopyLink = async () => {
    const shareUrl = `${window.location.origin}/box/${box.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDeleteBox();
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting box:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddContact = async () => {
    setContactError(null);
    
    if (!newContactName.trim() || !newContactEmail.trim()) {
      setContactError('Please fill in all fields');
      return;
    }

    if (!validateEmail(newContactEmail)) {
      setContactError('Please enter a valid email address');
      return;
    }

    try {
      await createContact(newContactName.trim(), newContactEmail.trim());
      await loadContacts();
      setIsAddingContact(false);
      setNewContactName('');
      setNewContactEmail('');
    } catch (error) {
      setContactError('Error creating contact');
      console.error('Error creating contact:', error);
    }
  };

  const handleEmailShare = async () => {
    setEmailError(null);
    setEmailSuccess(false);

    const allEmails = [
      ...selectedContactEmails,
      ...manualEmails.split(',').map(email => email.trim()).filter(email => email)
    ];

    if (allEmails.length === 0) {
      setEmailError('Please select at least one contact or enter an email address');
      return;
    }

    if (manualEmails && !validateEmails(manualEmails)) {
      setEmailError('Please enter valid email addresses');
      return;
    }

    setIsSendingEmail(true);

    try {
      const shareBoxViaEmail = httpsCallable(functions, 'shareBoxViaEmail');
      await shareBoxViaEmail({
        boxId: box.id,
        recipientEmails: allEmails,
        message: emailMessage.trim(),
        origin: window.location.origin
      });

      setEmailSuccess(true);
      setTimeout(() => {
        setIsEmailShareDialogOpen(false);
        setManualEmails('');
        setSelectedContactEmails([]);
        setEmailMessage('');
        setEmailSuccess(false);
      }, 2000);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Error sharing via email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handlePrivacyToggle = async () => {
    if (onPrivacyChange) {
      try {
        await onPrivacyChange(!box.isPrivate);
      } catch (error) {
        console.error('Error toggling privacy:', error);
      }
    }
  };

  const renderShareDialog = () => (
    <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share {box.name}</DialogTitle>
          <DialogDescription>
            Choose how you'd like to share this digital label
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Button
            className="w-full"
            variant="outline"
            onClick={() => {
              setIsShareDialogOpen(false);
              setIsEmailShareDialogOpen(true);
            }}
          >
            <Mail className="mr-2 h-4 w-4" />
            Share via Email
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or copy link</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Share Link</Label>
            <div className="flex space-x-2">
              <Input
                readOnly
                value={`${window.location.origin}/box/${box.id}`}
                className="flex-1"
              />
              <Button variant="outline" onClick={handleCopyLink}>
                {copied ? 'Copied!' : <LinkIcon className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {box.isPrivate && (
          <Alert>
            <AlertDescription>
              This box is private. Only people with the access code can view its contents.
            </AlertDescription>
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );

  const renderEmailShareDialog = () => (
    <Dialog open={isEmailShareDialogOpen} onOpenChange={setIsEmailShareDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share {box.name} via Email</DialogTitle>
          <DialogDescription>
            Select contacts or enter email addresses manually
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Contacts</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingContact(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </div>

            <ScrollArea className="h-[200px] border rounded-md p-2">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between p-2 hover:bg-accent rounded-md cursor-pointer"
                  onClick={() => {
                    setSelectedContactEmails(prev =>
                      prev.includes(contact.email)
                        ? prev.filter(email => email !== contact.email)
                        : [...prev, contact.email]
                    );
                  }}
                >
                  <div>
                    <div className="font-medium">{contact.name}</div>
                    <div className="text-sm text-muted-foreground">{contact.email}</div>
                  </div>
                  {selectedContactEmails.includes(contact.email) && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              ))}
            </ScrollArea>
          </div>

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
              disabled={isSendingEmail}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Add a message (optional)</Label>
            <Textarea
              id="message"
              placeholder="Enter your message here..."
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
              disabled={isSendingEmail}
            />
          </div>

          {emailError && (
            <Alert variant="destructive">
              <AlertDescription>{emailError}</AlertDescription>
            </Alert>
          )}

          {emailSuccess && (
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
          <Button variant="outline" onClick={() => setIsEmailShareDialogOpen(false)} disabled={isSendingEmail}>
            Cancel
          </Button>
          <Button onClick={handleEmailShare} disabled={isSendingEmail}>
            {isSendingEmail ? (
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

  const renderAddContactDialog = () => (
    <Dialog open={isAddingContact} onOpenChange={setIsAddingContact}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Contact</DialogTitle>
          <DialogDescription>
            Add a new contact to your address book
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={newContactName}
              onChange={(e) => setNewContactName(e.target.value)}
              placeholder="Contact name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={newContactEmail}
              onChange={(e) => setNewContactEmail(e.target.value)}
              placeholder="contact@example.com"
            />
          </div>

          {contactError && (
            <Alert variant="destructive">
              <AlertDescription>{contactError}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsAddingContact(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddContact}>
            Add Contact
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
<Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex-1 truncate mr-2">{box.name}</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrivacyToggle}
                title={box.isPrivate ? "Make Public" : "Make Private"}
              >
                <Badge variant={box.isPrivate ? "secondary" : "default"}>
                  {box.isPrivate ? (
                    <><Lock className="h-3 w-3 mr-1" /> Private</>
                  ) : (
                    <><Unlock className="h-3 w-3 mr-1" /> Public</>
                  )}
                </Badge>
              </Button>
            </div>
          </div>
          <CardDescription className="line-clamp-2">
            {box.description}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Created: {box.createdAt.toLocaleDateString()}
            </div>
            
            {box.isPrivate && box.accessCode && (
              <div className="flex items-center gap-2">
                <Label>Access Code:</Label>
                <div className="flex-1 relative">
                  <Input
                    type={showAccessCode ? "text" : "password"}
                    value={box.accessCode}
                    readOnly
                    className="pr-10"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0"
                    onClick={() => setShowAccessCode(!showAccessCode)}
                  >
                    {showAccessCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            {box.qrCodeUrl && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">QR Code Design:</h3>
                <div className="flex justify-center">
                  <img
                    src={box.qrCodeUrl}
                    alt="QR Code Design"
                    className="max-w-xs w-full h-auto"
                  />
                </div>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={handleDownloadDesign}
                >
                  <Download className="mr-2 h-4 w-4" /> Download Design
                </Button>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onViewDetails}>
            <BoxIcon className="mr-2 h-4 w-4" /> Details
          </Button>
          <Button variant="outline" onClick={() => setIsShareDialogOpen(true)}>
            <Share2 className="mr-2 h-4 w-4" /> Share
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open(`${window.location.origin}/box/${box.id}`, '_blank')}
          >
            <QrCode className="mr-2 h-4 w-4" /> View
          </Button>
          <Button
            variant="destructive"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </CardFooter>
      </Card>

      {/* Share Dialog */}
      {renderShareDialog()}

      {/* Email Share Dialog */}
      {renderEmailShareDialog()}

      {/* Add Contact Dialog */}
      {renderAddContactDialog()}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Box</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{box.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BoxCard;