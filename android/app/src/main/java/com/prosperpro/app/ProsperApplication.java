package com.prosperpro.app;

import android.app.Application;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;

public class ProsperApplication extends Application {

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannels();
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);

        NotificationChannel general = new NotificationChannel(
                "prosper_general_v2",
                "Notificaciones generales",
                NotificationManager.IMPORTANCE_HIGH
        );
        general.setDescription("Alertas, recordatorios y noticias de Prosper Pro");
        general.enableVibration(true);
        general.setShowBadge(true);

        NotificationChannel reminders = new NotificationChannel(
                "prosper_reminders_v2",
                "Recordatorios",
                NotificationManager.IMPORTANCE_HIGH
        );
        reminders.setDescription("Recordatorios de planes, pagos y calendario");
        reminders.enableVibration(true);
        reminders.setShowBadge(true);

        manager.createNotificationChannel(general);
        manager.createNotificationChannel(reminders);
    }
}
