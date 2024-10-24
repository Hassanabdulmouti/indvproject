// functions/src/index.ts

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';

// Initialize Firebase Admin
admin.initializeApp();

// Interfaces
interface UserData {
  email: string;
  displayName: string;
  isAdmin: boolean;
  isActive: boolean;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  lastActivity: FirebaseFirestore.Timestamp;
  lastReminderSent?: FirebaseFirestore.Timestamp;
  deactivatedAt?: FirebaseFirestore.Timestamp;
  deactivationReason?: string;
}

interface InactivityReminderData {
  minutesUntilDeactivation: number;
  lastActivity: Date;
}

interface StorageUsageData {
  totalBytes: number;
  designsBytes: number;
  boxesBytes: number;
}

// Constants
const INACTIVITY_THRESHOLD_MINUTES = 5; // 5 minutes for testing
const REMINDER_MINUTES_BEFORE = 2; // 2 minutes before deactivation
const CHECK_INTERVAL_MINUTES = 1; // Check every minute

// Email Configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: functions.config().gmail.email,
    pass: functions.config().gmail.password,
  },
  debug: true,
  logger: true
});

// Verify email configuration on initialization
transporter.verify((error, success) => {
  if (error) {
    console.error('Email configuration error:', error);
  } else {
    console.log('Email server is ready');
  }
});

// Activity Management Functions
export const updateUserLastActivity = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  try {
    await admin.firestore().collection('users').doc(context.auth.uid).update({
      lastActivity: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`Updated last activity for user ${context.auth.uid}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating last activity:', error);
    throw new functions.https.HttpsError('internal', 'Error updating last activity');
  }
});

export const checkInactiveUsers = functions.pubsub
  .schedule(`every ${CHECK_INTERVAL_MINUTES} minutes`)
  .onRun(async (context) => {
    console.log('Starting inactive users check');
    
    try {
      const now = admin.firestore.Timestamp.now();
      const inactivityThreshold = new Date(now.toDate().getTime() - (INACTIVITY_THRESHOLD_MINUTES * 60 * 1000));
      const reminderThreshold = new Date(now.toDate().getTime() - ((INACTIVITY_THRESHOLD_MINUTES - REMINDER_MINUTES_BEFORE) * 60 * 1000));

      const usersSnapshot = await admin.firestore().collection('users')
        .where('isActive', '==', true)
        .get();

      const batch = admin.firestore().batch();
      const emailPromises: Promise<any>[] = [];

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data() as UserData;
        const lastActivity = userData.lastActivity?.toDate() || userData.createdAt.toDate();

        if (lastActivity < inactivityThreshold) {
          console.log(`Deactivating user ${userData.email}`);
          batch.update(userDoc.ref, {
            isActive: false,
            deactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
            deactivationReason: 'inactivity',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          emailPromises.push(sendDeactivationNotification(userData.email));
        }
        else if (
          lastActivity < reminderThreshold &&
          (!userData.lastReminderSent || userData.lastReminderSent.toDate() < reminderThreshold)
        ) {
          console.log(`Sending reminder to user ${userData.email}`);
          batch.update(userDoc.ref, {
            lastReminderSent: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          emailPromises.push(sendInactivityReminder(userData.email, {
            minutesUntilDeactivation: REMINDER_MINUTES_BEFORE,
            lastActivity: lastActivity
          }));
        }
      }

      await batch.commit();
      const emailResults = await Promise.allSettled(emailPromises);
      
      console.log('Email results:', emailResults);
      console.log('Completed inactive users check');
      
      return { success: true };
    } catch (error) {
      console.error('Error checking inactive users:', error);
      return { error: 'Failed to check inactive users' };
    }
});

// Email Functions
async function sendInactivityReminder(email: string, data: InactivityReminderData) {
  console.log(`Sending reminder email to ${email}`);
  const mailOptions = {
    from: `"Your App" <${functions.config().gmail.email}>`,
    to: email,
    subject: '⚠️ Account Inactivity Warning - Action Required',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ff9900;">⚠️ Urgent: Account Inactivity Warning</h2>
        <p>We noticed you haven't been active in your account since ${data.lastActivity.toLocaleTimeString()}.</p>
        <p style="color: #ff0000; font-weight: bold;">
          Your account will be automatically deactivated in ${data.minutesUntilDeactivation} minutes!
        </p>
        <p>To keep your account active, please log in immediately.</p>
        <p>
          <a href="${functions.config().app.url}/auth/login" 
             style="display: inline-block; padding: 10px 20px; background-color: #ff9900; color: white; text-decoration: none; border-radius: 5px;">
            Log In Now
          </a>
        </p>
        <p style="color: #666; font-size: 12px;">
          This is a test notification. In production, the deactivation period would be longer.
        </p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Reminder email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending reminder email:', error);
    throw error;
  }
}

async function sendDeactivationNotification(email: string) {
  console.log(`Sending deactivation email to ${email}`);
  const mailOptions = {
    from: `"Your App" <${functions.config().gmail.email}>`,
    to: email,
    subject: '🔒 Account Deactivated Due to Inactivity',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ff0000;">Account Deactivated</h2>
        <p>Your account has been automatically deactivated due to 5 minutes of inactivity.</p>
        <p>You can reactivate your account at any time by logging in:</p>
        <p>
          <a href="${functions.config().app.url}/auth/login" 
             style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
            Reactivate Account
          </a>
        </p>
        <p style="color: #666; font-size: 12px;">
          This is a test notification. In production, the deactivation period would be longer.
        </p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Deactivation email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending deactivation email:', error);
    throw error;
  }
}

// User Management Functions
export const setAdminStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const callerUid = context.auth.uid;
  const { targetUid, isAdmin } = data;

  try {
    const callerSnapshot = await admin.firestore().collection('users').doc(callerUid).get();
    const callerData = callerSnapshot.data();

    if (!callerData || !callerData.isAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'User must be an admin to perform this action.');
    }

    await admin.firestore().collection('users').doc(targetUid).update({ isAdmin });
    return { success: true };
  } catch (error) {
    console.error('Error setting admin status:', error);
    throw new functions.https.HttpsError('internal', 'Error setting admin status');
  }
});

export const getAllUsers = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  try {
    const callerSnapshot = await admin.firestore().collection('users').doc(context.auth.uid).get();
    const callerData = callerSnapshot.data();

    if (!callerData || !callerData.isAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'User must be an admin to perform this action.');
    }

    const usersSnapshot = await admin.firestore().collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }));

    return { users };
  } catch (error) {
    console.error('Error fetching users:', error);
    throw new functions.https.HttpsError('internal', 'Error fetching users');
  }
});

// Box Sharing Function
export const shareBoxViaEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to share boxes');
  }

  const { boxId, recipientEmails, message, origin } = data;

  try {
    const boxSnapshot = await admin.firestore().collection('boxes').doc(boxId).get();
    const boxData = boxSnapshot.data();

    if (!boxData) {
      throw new functions.https.HttpsError('not-found', 'Box not found');
    }

    const senderSnapshot = await admin.firestore().collection('users').doc(context.auth.uid).get();
    const senderData = senderSnapshot.data();

    if (!senderData) {
      throw new functions.https.HttpsError('not-found', 'Sender data not found');
    }

    if (boxData.userId !== context.auth.uid && !senderData.isAdmin && boxData.isPrivate) {
      throw new functions.https.HttpsError('permission-denied', 'You do not have permission to share this box');
    }

    const shareUrl = `${origin}/box/${boxId}`;
    const mailOptions = {
      from: `"${senderData.displayName} via Your App" <${functions.config().gmail.email}>`,
      to: recipientEmails.join(', '),
      subject: `${senderData.displayName} shared a box with you: ${boxData.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>${senderData.displayName} has shared a box with you</h2>
          ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
          <div style="margin: 20px 0; padding: 20px; background-color: #f5f5f5; border-radius: 8px;">
            <h3 style="margin: 0 0 10px 0;">${boxData.name}</h3>
            <p style="margin: 0;">${boxData.description}</p>
          </div>
          <p>
            <a href="${shareUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
              View Box
            </a>
          </p>
          ${boxData.isPrivate ? `
            <p style="margin-top: 20px; padding: 10px; background-color: #fff3cd; border-radius: 4px;">
              <strong>Access Code:</strong> ${boxData.accessCode}
            </p>
          ` : ''}
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    await admin.firestore().collection('shareHistory').add({
      boxId,
      sharedBy: context.auth.uid,
      sharedWith: recipientEmails,
      sharedAt: admin.firestore.FieldValue.serverTimestamp(),
      message: message || null
    });

    return { success: true };
  } catch (error) {
    console.error('Error sharing box via email:', error);
    throw new functions.https.HttpsError('internal', 'Error sharing box via email');
  }
});
// Update the getUserStorageUsage function with explicit return type
export const getUserStorageUsage = functions.https.onCall(async (data, context): Promise<StorageUsageData> => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  try {
    const callerSnapshot = await admin.firestore().collection('users').doc(context.auth.uid).get();
    const callerData = callerSnapshot.data();

    if (!callerData || !callerData.isAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'User must be an admin to perform this action.');
    }

    const { targetUid } = data;
    if (!targetUid) {
      throw new functions.https.HttpsError('invalid-argument', 'Target user ID is required');
    }

    const [designFiles] = await admin.storage().bucket().getFiles({
      prefix: `designs/${targetUid}`
    });

    const [boxFiles] = await admin.storage().bucket().getFiles({
      prefix: `boxes/${targetUid}`
    });

    const designsBytes = designFiles.reduce((acc, file) => {
      return acc + parseInt(String(file.metadata.size) || '0');
    }, 0);

    const boxesBytes = boxFiles.reduce((acc, file) => {
      return acc + parseInt(String(file.metadata.size) || '0');
    }, 0);

    const response: StorageUsageData = {
      totalBytes: designsBytes + boxesBytes,
      designsBytes: designsBytes,
      boxesBytes: boxesBytes
    };

    return response;
  } catch (error) {
    console.error('Error calculating storage usage:', error);
    throw new functions.https.HttpsError('internal', 'Error calculating storage usage');
  }
});


// Account Management Functions
export const toggleAccountActivation = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const callerUid = context.auth.uid;
  const { targetUid, isActive } = data;

  try {
    const callerSnapshot = await admin.firestore().collection('users').doc(callerUid).get();
    const callerData = callerSnapshot.data();

    if (!callerData) {
      throw new functions.https.HttpsError('not-found', 'Caller user data not found.');
    }

    if (!(callerData.isAdmin || callerUid === targetUid)) {
      throw new functions.https.HttpsError('permission-denied', 'User must be an admin or the account owner to perform this action.');
    }

    await admin.firestore().collection('users').doc(targetUid).update({ 
      isActive: isActive,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...(isActive ? { 
        deactivatedAt: null,
        deactivationReason: null 
      } : { 
        deactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
        deactivationReason: 'manual'
      })
    });

    // If activating the account, also update the last activity
    if (isActive) {
      await admin.firestore().collection('users').doc(targetUid).update({
        lastActivity: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error toggling account activation:', error);
    throw new functions.https.HttpsError('internal', 'Error toggling account activation');
  }
});

export const deleteUserAccount = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const callerUid = context.auth.uid;
  const { targetUid } = data;

  try {
    const callerSnapshot = await admin.firestore().collection('users').doc(callerUid).get();
    const callerData = callerSnapshot.data();

    if (!callerData) {
      throw new functions.https.HttpsError('not-found', 'Caller user data not found.');
    }

    if (!(callerData.isAdmin || callerUid === targetUid)) {
      throw new functions.https.HttpsError('permission-denied', 'User must be an admin or the account owner to perform this action.');
    }

    // Get user data before deletion
    const targetUserSnapshot = await admin.firestore().collection('users').doc(targetUid).get();
    const targetUserData = targetUserSnapshot.data();

    // Delete user's files from storage
    try {
      const [designFiles] = await admin.storage().bucket().getFiles({
        prefix: `designs/${targetUid}`
      });
      const [boxFiles] = await admin.storage().bucket().getFiles({
        prefix: `boxes/${targetUid}`
      });

      // Delete all files
      const deletePromises = [...designFiles, ...boxFiles].map(file => file.delete());
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting user files:', error);
      // Continue with account deletion even if file deletion fails
    }

    // Delete user's boxes
    const boxesSnapshot = await admin.firestore().collection('boxes')
      .where('userId', '==', targetUid)
      .get();
    
    const boxDeletePromises = boxesSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(boxDeletePromises);

    // Delete user's contacts
    const contactsSnapshot = await admin.firestore().collection('contacts')
      .where('userId', '==', targetUid)
      .get();
    
    const contactDeletePromises = contactsSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(contactDeletePromises);

    // Delete user record from Firestore
    await admin.firestore().collection('users').doc(targetUid).delete();
    
    // Delete user authentication
    await admin.auth().deleteUser(targetUid);

    // Send deletion confirmation email if we have the user's email
    if (targetUserData?.email) {
      const mailOptions = {
        from: `"Your App" <${functions.config().gmail.email}>`,
        to: targetUserData.email,
        subject: 'Account Deletion Confirmation',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Account Deleted</h2>
            <p>Your account has been successfully deleted.</p>
            <p>If you didn't request this deletion, please contact our support team immediately.</p>
            <p style="color: #666; font-size: 12px;">
              This is an automated message, please do not reply to this email.
            </p>
          </div>
        `
      };

      try {
        await transporter.sendMail(mailOptions);
      } catch (error) {
        console.error('Error sending deletion confirmation email:', error);
        // Continue even if email fails
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting user account:', error);
    throw new functions.https.HttpsError('internal', 'Error deleting user account');
  }
});

// Helper function to verify email configuration
export const verifyEmailConfig = functions.https.onRequest(async (req, res) => {
  try {
    await transporter.verify();
    res.json({ status: 'Email configuration is valid' });
  } catch (error) {
    console.error('Email configuration error:', error);
    res.status(500).json({ error: 'Email configuration is invalid' });
  }
});

// HTTP function to manually trigger inactive user check (for testing)
export const manualCheckInactiveUsers = functions.https.onRequest(async (req, res) => {
  try {
    const result = await checkInactiveUsers.run(null, {});
    res.json({ status: 'Check completed', result });
  } catch (error) {
    console.error('Error running manual check:', error);
    res.status(500).json({ error: 'Failed to run inactive users check' });
  }
});