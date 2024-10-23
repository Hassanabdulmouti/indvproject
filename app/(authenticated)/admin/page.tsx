// app/(authenticated)/admin/page.tsx

'use client'

import { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/firebase/clientApp';
import { getAllUsers, setAdminStatus, deactivateAccount, reactivateAccount, deleteAccount } from '@/firebase/dbOp';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User } from '@/firebase/dbOp';
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AdminDashboard() {
  const [user] = useAuthState(auth);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      if (user) {
        try {
          const fetchedUsers = await getAllUsers();
          setUsers(fetchedUsers);
        } catch (err) {
          setError('Failed to fetch users');
          console.error(err);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchUsers();
  }, [user]);

  const handleToggleAdmin = async (uid: string, currentStatus: boolean) => {
    try {
      await setAdminStatus(uid, !currentStatus);
      setUsers(users.map(u => u.uid === uid ? {...u, isAdmin: !currentStatus} : u));
    } catch (err) {
      setError('Failed to update admin status');
      console.error(err);
    }
  };

  const handleToggleActive = async (uid: string, currentStatus: boolean) => {
    try {
      if (currentStatus) {
        await deactivateAccount(uid);
      } else {
        await reactivateAccount(uid);
      }
      setUsers(users.map(u => u.uid === uid ? {...u, isActive: !currentStatus} : u));
    } catch (err) {
      setError(`Failed to ${currentStatus ? 'deactivate' : 'reactivate'} account`);
      console.error(err);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await deleteAccount(uid);
        setUsers(users.filter(u => u.uid !== uid));
      } catch (err) {
        if (err instanceof Error) {
          setError(`Failed to delete account: ${err.message}`);
        } else {
          setError('Failed to delete account: Unknown error');
        }
        console.error(err);
      }
    }
  };

  if (!user) return <div>Please log in to access this page.</div>;
  if (loading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Dashboard</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.uid}>
                <TableCell>{user.displayName}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.isAdmin ? 'Yes' : 'No'}</TableCell>
                <TableCell>{user.isActive ? 'Yes' : 'No'}</TableCell>
                <TableCell>
                  <Button onClick={() => handleToggleAdmin(user.uid, user.isAdmin)} className="mr-2">
                    {user.isAdmin ? 'Remove Admin' : 'Make Admin'}
                  </Button>
                  <Button onClick={() => handleToggleActive(user.uid, user.isActive)} className="mr-2">
                    {user.isActive ? 'Deactivate' : 'Reactivate'}
                  </Button>
                  <Button onClick={() => handleDeleteUser(user.uid)} variant="destructive">
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}