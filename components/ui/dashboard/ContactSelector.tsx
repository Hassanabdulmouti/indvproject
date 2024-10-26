import React, { useState, useEffect } from 'react';
import { Contact, getUserContacts, createContact } from '@/firebase/dbOp';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Plus, X } from 'lucide-react';

interface ContactSelectorProps {
  selectedEmails: string[];
  onEmailsChange: (emails: string[]) => void;
}

const ContactSelector: React.FC<ContactSelectorProps> = ({
  selectedEmails,
  onEmailsChange,
}) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const userContacts = await getUserContacts();
      setContacts(userContacts);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const handleAddContact = async () => {
    setError(null);
    
    if (!newContactName.trim() || !newContactEmail.trim()) {
      setError('Please fill in all fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newContactEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      await createContact(newContactName.trim(), newContactEmail.trim());
      await loadContacts();
      setIsAddingContact(false);
      setNewContactName('');
      setNewContactEmail('');
    } catch (error) {
      setError('Error creating contact');
      console.error('Error creating contact:', error);
    }
  };

  const toggleContact = (email: string) => {
    const newEmails = selectedEmails.includes(email)
      ? selectedEmails.filter(e => e !== email)
      : [...selectedEmails, email];
    onEmailsChange(newEmails);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label>Select Contacts</Label>
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
            onClick={() => toggleContact(contact.email)}
          >
            <div>
              <div className="font-medium">{contact.name}</div>
              <div className="text-sm text-muted-foreground">{contact.email}</div>
            </div>
            {selectedEmails.includes(contact.email) && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </div>
        ))}
      </ScrollArea>

      <Dialog open={isAddingContact} onOpenChange={setIsAddingContact}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
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

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddingContact(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddContact}>
              Add Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContactSelector;