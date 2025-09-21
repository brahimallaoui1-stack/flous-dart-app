
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

// Initialize Firebase Admin SDK
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

  const { groupId, senderName, groupName, notificationType, newMemberName, recipientId } = await request.json();

  if (!groupId || !groupName || !notificationType) {
    return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
  }

  const db = getFirestore();

  try {
    let userIdsToNotify: string[] = [];
    let notificationPayload;
    let alertData: any = {
        groupId,
        groupName,
        type: notificationType,
        createdAt: FieldValue.serverTimestamp(),
        isRead: false,
    };
    
    // Determine who to notify and construct payloads
    const groupDoc = await db.collection('groups').doc(groupId).get();
    if (!groupDoc.exists) {
        return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404 });
    }
    const groupData = groupDoc.data()!;
    
    // If a specific recipient is targeted, only they get the notification.
    // Otherwise, all members of the group are notified.
    if (recipientId) {
        userIdsToNotify = [recipientId];
    } else {
        userIdsToNotify = groupData.members || [];
    }

    switch (notificationType) {
        case 'paymentConfirmation':
            if (!senderName) return NextResponse.json({ success: false, error: 'Missing senderName' }, { status: 400 });
            notificationPayload = {
                title: `Confirmation de paiement - ${groupName}`,
                body: `${senderName} a confirmé avoir reçu les fonds pour ce tour !`
            };
            alertData.body = notificationPayload.body;
            break;
        case 'newMemberJoined':
            if (!newMemberName) return NextResponse.json({ success: false, error: 'Missing newMemberName' }, { status: 400 });
            notificationPayload = {
                title: `Nouveau membre dans ${groupName}`,
                body: `Bienvenue à ${newMemberName} qui vient de rejoindre le groupe !`
            };
            alertData.body = notificationPayload.body;
            break;
        case 'groupIsFull':
            notificationPayload = {
                title: `Groupe complet : ${groupName}`,
                body: `Le groupe est maintenant complet ! L'ordre de passage sera bientôt déterminé.`
            };
            alertData.body = notificationPayload.body;
            break;
        case 'yourTurn':
             notificationPayload = {
                title: `Félicitations, c'est votre tour ! 🎉`,
                body: `C'est à votre tour de recevoir les fonds pour le groupe "${groupName}".`
            };
            alertData.body = notificationPayload.body;
            break;
        default:
            return NextResponse.json({ success: false, error: 'Invalid notification type' }, { status: 400 });
    }

    if (userIdsToNotify.length === 0) {
      return NextResponse.json({ success: true, message: 'No members to notify.' });
    }
    
    // Save alerts to Firestore for each user
    const batch = db.batch();
    userIdsToNotify.forEach(userId => {
        // We don't save "yourTurn" notification for the sender themselves to avoid clutter.
        if (notificationType === 'yourTurn' && userId === senderName) return;

        const alertRef = db.collection('users').doc(userId).collection('alerts').doc();
        batch.set(alertRef, alertData);
    });
    await batch.commit();

    // Get FCM tokens for push notifications
    const usersQuery = await db.collection('users').where(admin.firestore.FieldPath.documentId(), 'in', userIdsToNotify).get();
    let tokens: string[] = [];
    usersQuery.forEach(userDoc => {
      const userData = userDoc.data();
      if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
        tokens = tokens.concat(userData.fcmTokens);
      }
    });

    const uniqueTokens = [...new Set(tokens)];
    if (uniqueTokens.length === 0) {
      return NextResponse.json({ success: true, message: 'Alerts saved, but no device tokens for push notifications.' });
    }

    // Send push notifications
    const message = {
      notification: notificationPayload,
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
    let errorMessage = 'Internal Server Error';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
