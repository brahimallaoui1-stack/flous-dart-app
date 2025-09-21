
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

// Initialize Firebase Admin SDK
// Important: This requires GOOGLE_APPLICATION_CREDENTIALS to be set in your environment variables.
// The value should be the base64 encoded service account key.
try {
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(
        Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS || '', 'base64').toString('utf-8')
    );

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'flous-dart-manager'
    });
  }
} catch (error) {
  console.error('Firebase Admin initialization error:', error);
}

export async function POST(request: Request) {
  if (admin.apps.length === 0) {
    return NextResponse.json({ success: false, error: 'Firebase Admin SDK not initialized.' }, { status: 500 });
  }

  const { groupId, senderName, groupName } = await request.json();

  if (!groupId || !senderName || !groupName) {
    return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const db = getFirestore();

    // 1. Get the group to find all members
    const groupDoc = await db.collection('groups').doc(groupId).get();
    if (!groupDoc.exists) {
      return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404 });
    }
    const groupData = groupDoc.data();
    const memberIds: string[] = groupData?.members || [];

    if (memberIds.length === 0) {
      return NextResponse.json({ success: true, message: 'No members to notify.' });
    }

    // 2. Get all user documents to collect FCM tokens
    const usersQuery = await db.collection('users').where(admin.firestore.FieldPath.documentId(), 'in', memberIds).get();
    
    let tokens: string[] = [];
    usersQuery.forEach(userDoc => {
      const userData = userDoc.data();
      if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
        tokens = tokens.concat(userData.fcmTokens);
      }
    });

    const uniqueTokens = [...new Set(tokens)];

    if (uniqueTokens.length === 0) {
      return NextResponse.json({ success: true, message: 'No registered device tokens found for members.' });
    }
    
    // 3. Send notifications
    const message = {
      notification: {
        title: `Confirmation de paiement - ${groupName}`,
        body: `${senderName} a confirmé avoir reçu les fonds pour ce tour !`
      },
      tokens: uniqueTokens,
    };

    const response = await getMessaging().sendEachForMulticast(message);
    console.log('Successfully sent message:', response);

    if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
            if (!resp.success) {
            failedTokens.push(uniqueTokens[idx]);
            }
        });
        console.log('List of tokens that caused failures: ' + failedTokens);
    }


    return NextResponse.json({ success: true, response });
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
