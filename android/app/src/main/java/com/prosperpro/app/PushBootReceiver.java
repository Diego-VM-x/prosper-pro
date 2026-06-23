package com.prosperpro.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;
import com.google.firebase.messaging.FirebaseMessaging;

public class PushBootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d("PushBootReceiver", "Boot or package replaced, requesting FCM token refresh");
        FirebaseMessaging.getInstance().getToken()
            .addOnCompleteListener(task -> {
                if (task.isSuccessful()) {
                    Log.d("PushBootReceiver", "FCM token refreshed after boot: " + task.getResult());
                } else {
                    Log.e("PushBootReceiver", "FCM token refresh after boot failed", task.getException());
                }
            });
    }
}
