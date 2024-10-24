// app/(authenticated)/admin/page.tsx

'use client'

import { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/firebase/clientApp';
import { 
  getAllUsers, 
  setAdminStatus, 
  deactivateAccount, 
  reactivateAccount, 
  deleteAccount,
  getUserStorageUsage,
  User,
  StorageUsage 
} from '@/firebase/dbOp';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertCircle, CheckCircle2, XCircle, HardDrive, UserCog, UserMinus, Trash2 } from 'lucide-react';

interface UserWithStorage extends User {
  storage?: StorageUsage;
}

export default function AdminDashboard() {
  const [user] = useAuthState(auth);
  const [users, setUsers] = useState<UserWithStorage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingUser, setProcessingUser] = useState<string | null>(null);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  useEffect(() => {
    const fetchUsers = async () => {
      if (user) {
        try {
          const fetchedUsers = await getAllUsers();
          const usersWithStorage = await Promise.all(
            fetchedUsers.map(async (user) => {
              try {
                const storage = await getUserStorageUsage(user.uid);
                return { ...user, storage };
              } catch (error) {
                console.error(`Failed to fetch storage for user ${user.uid}:`, error);
                return user;
              }
            })
          );
          setUsers(usersWithStorage);
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
      setProcessingUser(uid);
      setError(null);
      await setAdminStatus(uid, !currentStatus);
      setUsers(users.map(u => u.uid === uid ? {...u, isAdmin: !currentStatus} : u));
    } catch (err) {
      setError('Failed to update admin status');
      console.error(err);
    } finally {
      setProcessingUser(null);
    }
  };

  const handleToggleActive = async (uid: string, currentStatus: boolean) => {
    try {
      setProcessingUser(uid);
      setError(null);
      if (currentStatus) {
        await deactivateAccount(uid);
      } else {
        await reactivateAccount(uid);
      }
      setUsers(users.map(u => u.uid === uid ? {...u, isActive: !currentStatus} : u));
    } catch (err) {
      setError(`Failed to ${currentStatus ? 'deactivate' : 'reactivate'} account`);
      console.error(err);
    } finally {
      setProcessingUser(null);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        setProcessingUser(uid);
        setError(null);
        await deleteAccount(uid);
        setUsers(users.filter(u => u.uid !== uid));
      } catch (err) {
        if (err instanceof Error) {
          setError(`Failed to delete account: ${err.message}`);
        } else {
          setError('Failed to delete account: Unknown error');
        }
        console.error(err);
      } finally {
        setProcessingUser(null);
      }
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please log in to access the admin dashboard.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
            <div>Loading user data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Admin Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Storage Usage</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.uid}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.displayName}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge 
                          variant={user.isAdmin ? "default" : "secondary"}
                          className="w-fit"
                        >
                          {user.isAdmin ? 'Admin' : 'User'}
                        </Badge>
                        <Badge 
                          variant={user.isActive ? "default" : "destructive"}
                          className="w-fit"
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.storage ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <HardDrive className="h-4 w-4" />
                            <span className="font-medium">
                              Total: {formatBytes(user.storage.totalBytes)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500 pl-6">
                            <div>Designs: {formatBytes(user.storage.designsBytes)}</div>
                            <div>Boxes: {formatBytes(user.storage.boxesBytes)}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">Calculating...</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleToggleAdmin(user.uid, user.isAdmin)}
                              disabled={processingUser === user.uid}
                            >
                              <UserCog className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {user.isAdmin ? 'Remove admin rights' : 'Make admin'}
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleToggleActive(user.uid, user.isActive)}
                              disabled={processingUser === user.uid}
                            >
                              {user.isActive ? (
                                <UserMinus className="h-4 w-4" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {user.isActive ? 'Deactivate account' : 'Reactivate account'}
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => handleDeleteUser(user.uid)}
                              disabled={processingUser === user.uid}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Delete account
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}