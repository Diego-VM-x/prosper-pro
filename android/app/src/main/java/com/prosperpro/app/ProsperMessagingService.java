package com.prosperpro.app;

import android.app.ActivityManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;

import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.List;

public class ProsperMessagingService extends FirebaseMessagingService {

    private static final String TAG = "ProsperMessagingService";
    private static final String CHANNEL_ID = "prosper_general_v2";
    private static final int NOTIFICATION_ID_BASE = 1000;

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        boolean isForeground = isAppInForeground();
        Log.d(TAG, "FCM message received. foreground=" + isForeground
                + " messageId=" + remoteMessage.getMessageId()
                + " data=" + remoteMessage.getData());

        // Keep the background process alive while we handle this message.
        if (!isForeground) {
            try {
                ProsperForegroundService.start(this);
            } catch (Exception e) {
                Log.w(TAG, "Could not start foreground service", e);
            }
        }

        // If the app is truly in the foreground, let the Capacitor plugin handle it
        // so the JS layer receives the payload and shows the in-app/local notification.
        if (isForeground) {
            Log.d(TAG, "App is in foreground; delegating to Capacitor plugin");
            PushNotificationsPlugin.sendRemoteMessage(remoteMessage);
            return;
        }

        // App is in background or closed: show the notification natively ourselves.
        Log.d(TAG, "App is in background/closed; showing native notification");
        showNotification(remoteMessage);
    }

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        Log.d(TAG, "FCM token refreshed");
        PushNotificationsPlugin.onNewToken(token);
    }

    private void showNotification(RemoteMessage remoteMessage) {
        String title = remoteMessage.getNotification() != null
                ? remoteMessage.getNotification().getTitle()
                : remoteMessage.getData().get("title");

        String body = remoteMessage.getNotification() != null
                ? remoteMessage.getNotification().getBody()
                : remoteMessage.getData().get("body");

        if (title == null) title = "Prosper Pro";
        if (body == null) body = "";

        createNotificationChannelIfNeeded();

        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (remoteMessage.getMessageId() != null) {
            intent.putExtra("google.message_id", remoteMessage.getMessageId());
        }
        for (String key : remoteMessage.getData().keySet()) {
            intent.putExtra(key, remoteMessage.getData().get(key));
        }

        int requestCode = NOTIFICATION_ID_BASE + (int) (System.currentTimeMillis() % 10000);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                requestCode,
                intent,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_notification)
                .setContentTitle(title)
                .setContentText(body)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent);

        NotificationManager notificationManager =
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        int notificationId = NOTIFICATION_ID_BASE + (int) (System.currentTimeMillis() % 10000);
        try {
            notificationManager.notify(notificationId, builder.build());
            Log.d(TAG, "Native notification shown: " + title);
        } catch (Exception e) {
            Log.e(TAG, "Failed to show native notification", e);
        }
    }

    private void createNotificationChannelIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;
        if (manager.getNotificationChannel(CHANNEL_ID) != null) return;

        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Notificaciones generales",
                NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Alertas, recordatorios y noticias de Prosper Pro");
        channel.enableVibration(true);
        channel.setShowBadge(true);
        manager.createNotificationChannel(channel);
    }

    /**
     * Checks whether the app process is currently in the foreground.
     * This is more reliable than checking whether the Capacitor plugin instance
     * exists, because the plugin instance can remain alive while the app is in
     * the background.
     */
    private boolean isAppInForeground() {
        ActivityManager activityManager = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
        if (activityManager == null) return false;

        List<ActivityManager.RunningAppProcessInfo> processes = activityManager.getRunningAppProcesses();
        if (processes == null) return false;

        String packageName = getPackageName();
        for (ActivityManager.RunningAppProcessInfo processInfo : processes) {
            if (processInfo.processName.equals(packageName)) {
                return processInfo.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
                        || processInfo.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_VISIBLE;
            }
        }
        return false;
    }
}
