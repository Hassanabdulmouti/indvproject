import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Receipt,
  Trash2,
  Download,
  Lock,
  Unlock,
  Share2,
  Eye,
  EyeOff,
  Mail,
  Link as LinkIcon,
  Loader2,
  Plus,
  Check,
  QrCode,
} from 'lucide-react';
import { InsuranceLabel, Contact, getUserContacts, createContact } from '@/firebase/dbOp';
import { functions } from '@/firebase/clientApp';
import { httpsCallable } from 'firebase/functions';
import { formatCurrency } from '@/lib/config/insurance';

interface InsuranceLabelCardProps {
  label: InsuranceLabel;
  onViewDetails: () => void;
  onShare: () => void;
  onPrint: () => void;
  onPrivacyChange?: (isPrivate: boolean) => Promise<void>;
  onDeleteLabel?: (labelId: string) => Promise<void>;
}

const InsuranceLabelCard: React.FC<InsuranceLabelCardProps> = ({
  label,
  onViewDetails,
  onShare,
  onPrint,
  onPrivacyChange,
  onDeleteLabel
}) => {
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isEmailShareDialogOpen, setIsEmailShareDialogOpen] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactEmails, setSelectedContactEmails] = useState<string[]>([]);
  const [manualEmails, setManualEmails] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState(false);
  
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [contactError, setContactError] = useState<string | null>(null);

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

  const handleDelete = async () => {
    if (!onDeleteLabel) return;
    setIsDeleting(true);
    try {
      await onDeleteLabel(label.id);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting label:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadDesign = async () => {
    if (label.qrCodeUrl) {
      try {
        const response = await fetch(label.qrCodeUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${label.name}-insurance-label.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error downloading design:', error);
      }
    }
  };

  const handlePrivacyToggle = async () => {
    if (onPrivacyChange) {
      try {
        await onPrivacyChange(!label.isPrivate);
      } catch (error) {
        console.error('Error toggling privacy:', error);
      }
    }
  };

  const handleCopyLink = async () => {
    const shareUrl = `${window.location.origin}/label/${label.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
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
      setEmailError('Please select at least one recipient');
      return;
    }

    if (manualEmails && !validateEmails(manualEmails)) {
      setEmailError('Please enter valid email addresses');
      return;
    }

    setIsSendingEmail(true);

    try {
      const shareInsuranceLabel = httpsCallable(functions, 'shareLabelViaEmail');
      await shareInsuranceLabel({
        labelId: label.id,
        recipientEmails: allEmails,
        message: emailMessage.trim(),
        origin: window.location.origin
      });

      setEmailSuccess(true);
      setTimeout(() => {
        setIsEmailShareDialogOpen(false);
        setSelectedContactEmails([]);
        setManualEmails('');
        setEmailMessage('');
      }, 2000);
    } catch (error) {
      setEmailError('Failed to share label');
      console.error('Error sharing label:', error);
    } finally {
      setIsSendingEmail(false);
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

  const renderShareDialog = () => (
    <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share {label.name}</DialogTitle>
          <DialogDescription>
            Choose how you'd like to share this insurance label
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Button
            className="w-full"
            variant="outline"
            onClick={() => {
              setIsShareDialogOpen(false);
              setIsEmailShareDialogOpen(true);
              loadContacts();
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
                value={`${window.location.origin}/label/${label.id}`}
                className="flex-1"
              />
              <Button variant="outline" onClick={handleCopyLink}>
                {copied ? 'Copied!' : <LinkIcon className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {label.isPrivate && (
          <Alert>
            <AlertDescription>
              This label is private. Only people with the access code can view its contents.
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
          <DialogTitle>Share {label.name} via Email</DialogTitle>
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
              <AlertDescription>Insurance label shared successfully!</AlertDescription>
            </Alert>
          )}

          {label.isPrivate && (
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
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="truncate mr-2">{label.name}</CardTitle>
              <CardDescription className="line-clamp-2">
              {label.description || 'No description'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {onPrivacyChange && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrivacyToggle}
                  title={label.isPrivate ? "Make Public" : "Make Private"}
                >
                  <Badge variant={label.isPrivate ? "secondary" : "default"}>
                    {label.isPrivate ? (
                      <><Lock className="h-3 w-3 mr-1" /> Private</>
                    ) : (
                      <><Unlock className="h-3 w-3 mr-1" /> Public</>
                    )}
                  </Badge>
                </Button>
              )}
              {label.insuranceCompany && (
                <img
                  src={label.insuranceCompany.logoUrl}
                  alt={label.insuranceCompany.name}
                  className="h-8 object-contain"
                />
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Created:</span>
            <span>{label.createdAt.toLocaleDateString()}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Value:</span>
            <span className="font-medium">
              {formatCurrency(label.totalValue, label.currency)}
            </span>
          </div>

          {label.isPrivate && label.accessCode && (
            <div className="flex items-center gap-2">
              <Label>Access Code:</Label>
              <div className="flex-1 relative">
                <Input
                  type={showAccessCode ? "text" : "password"}
                  value={label.accessCode}
                  readOnly
                  className="pr-10"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowAccessCode(!showAccessCode)}
                >
                  {showAccessCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          {label.qrCodeUrl && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Label Design:</h3>
              <div className="flex justify-center">
                <img
                  src={label.qrCodeUrl}
                  alt="Label Design"
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

          <ScrollArea className="h-[120px] border rounded-md p-2">
            {label.items?.length > 0 ? (
              label.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 py-1 hover:bg-accent rounded-md px-2"
                >
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-8 h-8 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <span className="text-sm font-medium">{item.name}</span>
                    {item.description && (
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    )}
                  </div>
                  <span className="text-sm font-medium">
                    {formatCurrency(item.value, item.currency || label.currency)}
                  </span>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No items added yet
              </div>
            )}
          </ScrollArea>
        </CardContent>

        <CardFooter className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onViewDetails}>
            <Receipt className="mr-2 h-4 w-4" /> Details
          </Button>
          <Button variant="outline" onClick={() => setIsShareDialogOpen(true)}>
            <Share2 className="mr-2 h-4 w-4" /> Share
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open(`${window.location.origin}/label/${label.id}`, '_blank')}
          >
            <QrCode className="mr-2 h-4 w-4" /> View
          </Button>
          <Button variant="outline" onClick={handleDownloadDesign}>
            <Download className="mr-2 h-4 w-4" /> Download
          </Button>
          {onDeleteLabel && (
            <Button
              variant="destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Insurance Label</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{label.name}"? This action cannot be undone.
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

      {/* Share Dialogs */}
      {renderShareDialog()}
      {renderEmailShareDialog()}
      {renderAddContactDialog()}
    </>
  );
};

export default InsuranceLabelCard;