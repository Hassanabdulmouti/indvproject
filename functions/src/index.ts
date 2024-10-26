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
  secure: true
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
              This is an automated message from Moveout project. Please do not reply to this email.
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
  

  export const shareLabelViaEmail = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to share boxes');
    }
  
    const { labelId, recipientEmails, message } = data;
  
    try {
      const boxSnapshot = await admin.firestore().collection('boxes').doc(labelId).get();
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
  
      const shareUrl = `${data.origin}/label/${labelId}`;
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
              This is an automated message from Moveout project. Please do not reply to this email.
            </p>
          </div>
        `
      };
  
      await transporter.sendMail(mailOptions);
  
      await admin.firestore().collection('shareHistory').add({
        labelId,
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
    from: 'Moveout project <noreply@yourapp.com>',
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

    await admin.firestore().collection('users').doc(targetUid).delete();
    
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
    const callerSnapshot = await admin.firestore().collection('users').doc(callerUid).get();
    const callerData = callerSnapshot.data();

    if (!callerData || !callerData.isAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'User must be an admin to perform this action.');
    }

    if (!targetUid) {
      throw new functions.https.HttpsError('invalid-argument', 'Target user ID is required');
    }

    const [designFiles] = await admin.storage().bucket().getFiles({
      prefix: `designs/${targetUid}`
    });

    const [boxFiles] = await admin.storage().bucket().getFiles({
      prefix: `boxes/${targetUid}`
    });

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

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const TWO_MINUTES_MS = 2 * 60 * 1000;

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

export const checkInactiveUsers = functions.pubsub
  .schedule('*/1 * * * *') 
  .timeZone('UTC')          
  .onRun(async (context) => {
    console.log('Starting inactive users check...');
    
    try {
      const now = Date.now();
      
      const inactivityThreshold = new Date(now - FIVE_MINUTES_MS);
      const reminderThreshold = new Date(now - (FIVE_MINUTES_MS - TWO_MINUTES_MS));

      console.log('Thresholds calculated:', {
        currentTime: new Date(now).toISOString(),
        inactivityThreshold: inactivityThreshold.toISOString(),
        reminderThreshold: reminderThreshold.toISOString()
      });

      // Get active users
      const usersSnapshot = await admin.firestore()
        .collection('users')
        .where('isActive', '==', true)
        .get();

      console.log(`Found ${usersSnapshot.size} active users to check`);

      const batch = admin.firestore().batch();
      const emailPromises: Promise<any>[] = [];
      let hasUpdates = false;

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data() as UserData;
        const lastActivity = userData.lastActivity?.toDate() || userData.createdAt.toDate();
        const timeSinceLastActivity = now - lastActivity.getTime();

        console.log(`Processing user ${userData.email}:`, {
          lastActivity: lastActivity.toISOString(),
          minutesInactive: timeSinceLastActivity / 1000 / 60
        });

        if (lastActivity < inactivityThreshold) {
          console.log(`Deactivating user ${userData.email}`);
          
          batch.update(userDoc.ref, {
            isActive: false,
            deactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
            deactivationReason: 'inactivity',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          hasUpdates = true;

          emailPromises.push(
            sendDeactivationNotification(userData.email)
              .catch(error => {
                console.error(`Failed to send deactivation email to ${userData.email}:`, error);
                return null;
              })
          );
        }

        else if (
          lastActivity < reminderThreshold &&
          (!userData.lastReminderSent || userData.lastReminderSent.toDate() < reminderThreshold)
        ) {
          console.log(`Preparing reminder for user ${userData.email}`);
          
          batch.update(userDoc.ref, {
            lastReminderSent: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          hasUpdates = true;

          const minutesLeft = Math.max(1, Math.ceil((FIVE_MINUTES_MS - timeSinceLastActivity) / 1000 / 60));
          
          emailPromises.push(
            sendInactivityReminder(userData.email, {
              minutesUntilDeactivation: minutesLeft,
              lastActivity: lastActivity
            })
              .catch(error => {
                console.error(`Failed to send reminder email to ${userData.email}:`, error);
                return null;
              })
          );
        }
      }

      if (hasUpdates) {
        try {
          await batch.commit();
          console.log('Successfully committed batch updates');
        } catch (error) {
          console.error('Error committing batch updates:', error);
          throw error;
        }
      }

      // Wait for all emails to be sent
      if (emailPromises.length > 0) {
        const results = await Promise.allSettled(emailPromises);
        console.log(`Email operations completed: ${results.length} total`);
      }

      return null; // Proper return type for Cloud Functions
    } catch (error) {
      console.error('Error in checkInactiveUsers:', error);
      throw error;
    }
});

interface InactivityReminderData {
  minutesUntilDeactivation: number;
  lastActivity: Date;
}
async function sendInactivityReminder(email: string, data: InactivityReminderData) {
  console.log(`Sending inactivity reminder email to ${email}`, data);
  
  const mailOptions = {
    from: `"Moveout project" <${functions.config().gmail.email}>`,
    to: email,
    subject: '⚠️ Account Inactivity Warning - Action Required',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ff9900;">⚠️ Account Inactivity Warning</h2>
        <p>We noticed you haven't been active in your account since ${data.lastActivity.toLocaleString()}.</p>
        <p style="color: #ff0000; font-weight: bold;">
          Your account will be automatically deactivated in ${data.minutesUntilDeactivation} ${
            data.minutesUntilDeactivation === 1 ? 'minute' : 'minutes'
          }!
        </p>
        <p>To keep your account active, please take any action in the app (click, type, or scroll).</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
        <p style="color: #666; font-size: 12px;">
          This is a testing notification. Time shown is in your local timezone.
        </p>
      </div>
    `
  };

  return await transporter.sendMail(mailOptions);
}
async function sendDeactivationNotification(email: string) {
  console.log(`Sending deactivation notification email to ${email}`);
  
  const mailOptions = {
    from: `"Moveout project" <${functions.config().gmail.email}>`,
    to: email,
    subject: '🔒 Account Deactivated Due to Inactivity',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ff0000;">Account Deactivated</h2>
        <p>Your account has been automatically deactivated due to 5 minutes of inactivity.</p>
        <p>You can reactivate your account by logging in again:</p>
        <p>
          <a href="${functions.config().app.url}/auth/login" 
             style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
            Reactivate Account
          </a>
        </p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
        <p style="color: #666; font-size: 12px;">
          This is a testing notification. To prevent future deactivations, please maintain regular activity in the app.
        </p>
      </div>
    `
  };

  return await transporter.sendMail(mailOptions);
}

