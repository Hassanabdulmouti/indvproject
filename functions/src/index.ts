// functions/src/index.ts

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';

admin.initializeApp();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: functions.config().gmail.email,
      pass: functions.config().gmail.password,
    },
  });

  export const shareBoxViaEmail = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to share boxes');
    }
  
    const { boxId, recipientEmails, message } = data;
  
    try {
      // Get box details
      const boxSnapshot = await admin.firestore().collection('boxes').doc(boxId).get();
      const boxData = boxSnapshot.data();
  
      if (!boxData) {
        throw new functions.https.HttpsError('not-found', 'Box not found');
      }
  
      // Get sender's user details
      const senderSnapshot = await admin.firestore().collection('users').doc(context.auth.uid).get();
      const senderData = senderSnapshot.data();
  
      if (!senderData) {
        throw new functions.https.HttpsError('not-found', 'Sender data not found');
      }
  
      // Verify sender has access to share the box
      if (boxData.userId !== context.auth.uid && !senderData.isAdmin && boxData.isPrivate) {
        throw new functions.https.HttpsError('permission-denied', 'You do not have permission to share this box');
      }
  
      const shareUrl = `${data.origin}/box/${boxId}`;
      const accessCodeInfo = boxData.isPrivate ? `\nAccess Code: ${boxData.accessCode}` : '';
  
      const mailOptions = {
        from: `"${senderData.displayName} via YourApp" <${functions.config().gmail.email}>`,
        to: recipientEmails.join(', '),
        subject: `${senderData.displayName} shared a digital label with you: ${boxData.name}`,
        text: `
          ${senderData.displayName} has shared a digital label with you: ${boxData.name}
          
          ${message ? `Message: ${message}\n` : ''}
          
          View the digital label here: ${shareUrl}
          ${accessCodeInfo}
          
          Description: ${boxData.description}
        `,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>${senderData.displayName} has shared a digital label with you</h2>
            
            ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
            
            <div style="margin: 20px 0; padding: 20px; background-color: #f5f5f5; border-radius: 8px;">
              <h3 style="margin: 0 0 10px 0;">${boxData.name}</h3>
              <p style="margin: 0;">${boxData.description}</p>
            </div>
            
            <p>
              <a href="${shareUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
                View Digital Label
              </a>
            </p>
            
            ${boxData.isPrivate ? `
              <p style="margin-top: 20px; padding: 10px; background-color: #fff3cd; border-radius: 4px;">
                <strong>Access Code:</strong> ${boxData.accessCode}
              </p>
            ` : ''}
            
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
            
            <p style="color: #666; font-size: 12px;">
              This is an automated message from YourApp. Please do not reply to this email.
            </p>
          </div>
        `
      };
  
      await transporter.sendMail(mailOptions);
  
      // Log the share action
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
  


export const sendDeactivationEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to send email');
  }

  const { email } = data;

  const mailOptions = {
    from: 'Your App Name <noreply@yourapp.com>',
    to: email,
    subject: 'Account Deactivation Confirmation',
    text: 'Your account has been deactivated. If you wish to reactivate your account, please log in to your account.',
    html: '<p>Your account has been deactivated. If you wish to reactivate your account, please log in to your account.</p>',
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new functions.https.HttpsError('internal', 'Error sending email');
  }
});

export const getAllUsers = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const callerUid = context.auth.uid;
  
  try {
    const callerSnapshot = await admin.firestore().collection('users').doc(callerUid).get();
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

    // Delete user data from Firestore
    await admin.firestore().collection('users').doc(targetUid).delete();
    
    // Delete user authentication
    await admin.auth().deleteUser(targetUid);

    return { success: true };
  } catch (error) {
    console.error('Error deleting user account:', error);
    throw new functions.https.HttpsError('internal', 'Error deleting user account');
  }
});

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
      ...(isActive ? { deactivatedAt: null } : { deactivatedAt: admin.firestore.FieldValue.serverTimestamp() })
    });

    return { success: true };
  } catch (error) {
    console.error('Error toggling account activation:', error);
    throw new functions.https.HttpsError('internal', 'Error toggling account activation');
  }
});


export const getUserStorageUsage = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const callerUid = context.auth.uid;
  const { targetUid } = data;

  try {
    // Verify admin status
    const callerSnapshot = await admin.firestore().collection('users').doc(callerUid).get();
    const callerData = callerSnapshot.data();

    if (!callerData || !callerData.isAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'User must be an admin to perform this action.');
    }

    if (!targetUid) {
      throw new functions.https.HttpsError('invalid-argument', 'Target user ID is required');
    }

    // Get all files in designs directory
    const [designFiles] = await admin.storage().bucket().getFiles({
      prefix: `designs/${targetUid}`
    });

    // Get all files in boxes directory
    const [boxFiles] = await admin.storage().bucket().getFiles({
      prefix: `boxes/${targetUid}`
    });

    // Calculate total sizes
    const designsSize = designFiles.reduce((acc, file) => {
      const size = parseInt(String(file.metadata.size) || '0');
      return acc + size;
    }, 0);

    const boxesSize = boxFiles.reduce((acc, file) => {
      const size = parseInt(String(file.metadata.size) || '0');
      return acc + size;
    }, 0);

    const totalSize = designsSize + boxesSize;

    return {
      totalBytes: totalSize,
      designsBytes: designsSize,
      boxesBytes: boxesSize
    };
  } catch (error) {
    console.error('Error calculating storage usage:', error);
    throw new functions.https.HttpsError('internal', 'Error calculating storage usage');
  }
});
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

// Testing constants (in minutes)
const INACTIVITY_THRESHOLD_MINUTES = 5;
const REMINDER_MINUTES_BEFORE = 2;
const CHECK_INTERVAL_MINUTES = 1; // Check every minute for testing

export const updateUserLastActivity = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  try {
    await admin.firestore().collection('users').doc(context.auth.uid).update({
      lastActivity: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating last activity:', error);
    throw new functions.https.HttpsError('internal', 'Error updating last activity');
  }
});

// Update the schedule to run every minute for testing
export const checkInactiveUsers = functions.pubsub
  .schedule(`every ${CHECK_INTERVAL_MINUTES} minutes`)
  .onRun(async (context) => {
    try {
      const now = admin.firestore.Timestamp.now();
      
      // Convert minutes to milliseconds for threshold calculations
      const inactivityThreshold = new Date(
        now.toDate().getTime() - (INACTIVITY_THRESHOLD_MINUTES * 60 * 1000)
      );
      const reminderThreshold = new Date(
        now.toDate().getTime() - ((INACTIVITY_THRESHOLD_MINUTES - REMINDER_MINUTES_BEFORE) * 60 * 1000)
      );

      console.log('Checking for inactive users...'); // Debug log
      console.log(`Inactivity threshold: ${inactivityThreshold}`);
      console.log(`Reminder threshold: ${reminderThreshold}`);

      const usersSnapshot = await admin.firestore().collection('users')
        .where('isActive', '==', true)
        .get();

      console.log(`Found ${usersSnapshot.size} active users`); // Debug log

      const batch = admin.firestore().batch();
      const emailPromises: Promise<any>[] = [];

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data() as UserData;
        const lastActivity = userData.lastActivity?.toDate() || userData.createdAt.toDate();

        console.log(`Checking user ${userData.email}`); // Debug log
        console.log(`Last activity: ${lastActivity}`);

        // Check for users who need to be deactivated
        if (lastActivity < inactivityThreshold) {
          console.log(`Deactivating user ${userData.email}`); // Debug log
          
          batch.update(userDoc.ref, {
            isActive: false,
            deactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
            deactivationReason: 'inactivity',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          emailPromises.push(sendDeactivationNotification(userData.email));
        }
        // Check for users who need a reminder
        else if (
          lastActivity < reminderThreshold &&
          (!userData.lastReminderSent || userData.lastReminderSent.toDate() < reminderThreshold)
        ) {
          console.log(`Sending reminder to user ${userData.email}`); // Debug log
          
          batch.update(userDoc.ref, {
            lastReminderSent: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          const minutesLeft = REMINDER_MINUTES_BEFORE;
          emailPromises.push(sendInactivityReminder(userData.email, {
            minutesUntilDeactivation: minutesLeft,
            lastActivity: lastActivity
          }));
        }
      }

      await batch.commit();
      await Promise.all(emailPromises);

      console.log('Finished checking inactive users'); // Debug log
      return { success: true };
    } catch (error) {
      console.error('Error checking inactive users:', error);
      return { error: 'Failed to check inactive users' };
    }
});

interface InactivityReminderData {
  minutesUntilDeactivation: number;
  lastActivity: Date;
}

async function sendInactivityReminder(email: string, data: InactivityReminderData) {
  const mailOptions = {
    from: `"Your App" <${functions.config().gmail.email}>`,
    to: email,
    subject: '⚠️ Account Inactivity Warning - Action Required in 2 Minutes',
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

  return transporter.sendMail(mailOptions);
}

async function sendDeactivationNotification(email: string) {
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

  return transporter.sendMail(mailOptions);
}