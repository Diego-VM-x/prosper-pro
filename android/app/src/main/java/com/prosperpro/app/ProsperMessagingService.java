package com.prosperpro.app;

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

public class ProsperMessagingService extends FirebaseMessagingService {

    private static final String TAG = "ProsperMessagingService";
    private static final String CHANNEL_ID = "prosper_general_v2";
    private static final int NOTIFICATION_ID_BASE = 1000;

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        // If the app is in foreground, let the Capacitor plugin handle it.
        if (isAppInForeground()) {
            PushNotificationsPlugin.sendRemoteMessage(remoteMessage);
            return;
        }

        // App is in background or closed: show the notification natively.
        showNotification(remoteMessage);
    }

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
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
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        if (remoteMessage.getMessageId() != null) {
            intent.putExtra("google.message_id", remoteMessage.getMessageId());
        }
        for (String key : remoteMessage.getData().keySet()) {
            intent.putExtra(key, remoteMessage.getData().get(key));
        }

        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                NOTIFICATION_ID_BASE + (int) (System.currentTimeMillis() % 10000),
                intent,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_notification)
                .setContentTitle(title)
                .setContentText(body)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent);

        NotificationManager notificationManager =
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        int notificationId = NOTIFICATION_ID_BASE + (int) (System.currentTimeMillis() % 10000);
        notificationManager.notify(notificationId, builder.build());

        Log.d(TAG, "Notification shown in background: " + title);
    }

    private void createNotificationChannelIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
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

    private boolean isAppInForeground() {
        // If the Capacitor bridge instance is available, the app is alive.
        return PushNotificationsPlugin.getPushNotificationsInstance() != null;
    }
}
