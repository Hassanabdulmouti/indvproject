import React, { useRef, useEffect, useState } from 'react';
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
  BoxIcon,
  Trash2,
  QrCode,
  Download,
  Lock,
  Unlock,
  Share2,
  Eye,
  EyeOff,
  Mail,
  Link as LinkIcon,
  Loader2
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Box } from '@/firebase/dbOp';
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
  // State management
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isEmailShareDialogOpen, setIsEmailShareDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const qrCodeRef = useRef<HTMLDivElement>(null);

  // Load QR code on mount
  useEffect(() => {
    if (qrCodeRef.current && box.qrCodeUrl) {
      qrCodeRef.current.innerHTML = box.qrCodeUrl;
    }
  }, [box.qrCodeUrl]);

  // Helper functions
  const validateEmails = (emailString: string): boolean => {
    const emailArray = emailString.split(',').map(email => email.trim());
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailArray.every(email => emailRegex.test(email));
  };

  // Event handlers
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

  const handleEmailShare = async () => {
    setEmailError(null);
    setEmailSuccess(false);

    if (!emailRecipients.trim()) {
      setEmailError('Please enter at least one email address');
      return;
    }

    if (!validateEmails(emailRecipients)) {
      setEmailError('Please enter valid email addresses');
      return;
    }

    setIsSendingEmail(true);

    try {
      const shareBoxViaEmail = httpsCallable(functions, 'shareBoxViaEmail');
      await shareBoxViaEmail({
        boxId: box.id,
        recipientEmails: emailRecipients.split(',').map(email => email.trim()),
        message: emailMessage.trim(),
        origin: window.location.origin
      });

      setEmailSuccess(true);
      setTimeout(() => {
        setIsEmailShareDialogOpen(false);
        setEmailRecipients('');
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

  // Render functions
  const renderShareOptions = () => (
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
          <Button
            variant="outline"
            onClick={handleCopyLink}
          >
            {copied ? 'Copied!' : <LinkIcon className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
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
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share {box.name}</DialogTitle>
            <DialogDescription>
              Choose how you'd like to share this digital label
            </DialogDescription>
          </DialogHeader>
          
          {renderShareOptions()}

          {box.isPrivate && (
            <Alert>
              <AlertDescription>
                This box is private. Only people with the access code can view its contents.
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsShareDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Share Dialog */}
      <Dialog open={isEmailShareDialogOpen} onOpenChange={setIsEmailShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share {box.name} via Email</DialogTitle>
            <DialogDescription>
              Send this digital label to one or more email addresses
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emails">
                Email Addresses (separate multiple emails with commas)
              </Label>
              <Input
                id="emails"
                placeholder="email@example.com, another@example.com"
                value={emailRecipients}
                onChange={(e) => setEmailRecipients(e.target.value)}
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
            <Button
              variant="outline"
              onClick={() => setIsEmailShareDialogOpen(false)}
              disabled={isSendingEmail}
            >
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
