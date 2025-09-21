
'use client';

import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db, app } from './firebase';

export async function requestNotificationPermission() {
    if (!await isSupported()) {
        console.log("Firebase Messaging is not supported in this browser.");
        return null;
    }
    const messaging = getMessaging(app);
    try {
        const permission = await Notification.requestPermission();
        return permission;
    } catch (error) {
        console.error('Error requesting notification permission:', error);
        return null;
    }
}

export async function saveMessagingDeviceToken(userId: string) {
    if (!await isSupported()) {
        console.log("Firebase Messaging is not supported in this browser.");
        return;
    }
    const messaging = getMessaging(app);
    try {
        const currentToken = await getToken(messaging, { vapidKey: 'BM-a-sC5g3WfH6_mSgC22jN3OFv-afOa5nNJNqGqhL5v6CqfP6Q1s8W4x8D3jJ8qR9r7n8zX_d9b2F0wZ9e7A4' });
        if (currentToken) {
            console.log('Got FCM device token:', currentToken);
            const userRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
                const tokens = userDoc.data()?.fcmTokens || [];
                if (!tokens.includes(currentToken)) {
                    await updateDoc(userRef, {
                        fcmTokens: arrayUnion(currentToken)
                    });
                    console.log('FCM token saved to user document.');
                } else {
                     console.log('FCM token already exists for this user.');
                }
            }
        } else {
            console.log('No registration token available. Request permission to generate one.');
            requestNotificationPermission();
        }
    } catch (error) {
        console.error('Error getting or saving FCM token:', error);
    }
}

export const onForegroundMessage = (callback: (payload: any) => void) => {
  const messagingInstance = getMessaging(app);
  return onMessage(messagingInstance, (payload) => {
    console.log('Foreground message received:', payload);
    callback(payload);
  });
};
