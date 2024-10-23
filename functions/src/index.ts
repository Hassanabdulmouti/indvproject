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