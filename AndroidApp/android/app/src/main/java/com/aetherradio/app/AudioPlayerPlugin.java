package com.aetherradio.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * AudioPlayerPlugin
 *
 * Capacitor plugin that bridges JavaScript ↔ AudioForegroundService.
 *
 * JS calls:
 *   AudioPlayerPlugin.startForeground({ track, artist, cover })  → starts/updates foreground service
 *   AudioPlayerPlugin.pauseForeground()                          → updates notification to paused
 *   AudioPlayerPlugin.stopForeground()                           → stops foreground service
 *
 * Native → JS events (notification button taps):
 *   'play'   → user tapped Play in notification
 *   'pause'  → user tapped Pause in notification
 *   'stop'   → user tapped Stop in notification
 */
@CapacitorPlugin(name = "AudioPlayer")
public class AudioPlayerPlugin extends Plugin {

    private static final String TAG = "AudioPlayerPlugin";

    private BroadcastReceiver notifReceiver;

    @Override
    public void load() {
        registerNotificationReceiver();
    }

    // ── JS-callable methods ────────────────────────────────────────────────

    @PluginMethod
    public void startForeground(PluginCall call) {
        String track  = call.getString("track",  "Aether Radio");
        String artist = call.getString("artist", "Live Radio");
        String cover  = call.getString("cover",  "");

        Log.i(TAG, "startForeground: " + track + " — " + artist);

        Intent intent = new Intent(getContext(), AudioForegroundService.class);
        intent.setAction(AudioForegroundService.ACTION_START);
        intent.putExtra(AudioForegroundService.EXTRA_TRACK,   track);
        intent.putExtra(AudioForegroundService.EXTRA_ARTIST,  artist);
        intent.putExtra(AudioForegroundService.EXTRA_COVER,   cover);
        intent.putExtra(AudioForegroundService.EXTRA_PLAYING, true);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }

        call.resolve();
    }

    @PluginMethod
    public void pauseForeground(PluginCall call) {
        Log.i(TAG, "pauseForeground");

        Intent intent = new Intent(getContext(), AudioForegroundService.class);
        intent.setAction(AudioForegroundService.ACTION_PAUSE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }

        call.resolve();
    }

    @PluginMethod
    public void stopForeground(PluginCall call) {
        Log.i(TAG, "stopForeground");

        Intent intent = new Intent(getContext(), AudioForegroundService.class);
        intent.setAction(AudioForegroundService.ACTION_STOP);
        getContext().startService(intent);

        call.resolve();
    }

    // ── Notification button receiver ───────────────────────────────────────

    private void registerNotificationReceiver() {
        notifReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                Log.i(TAG, "notifReceiver: " + action);

                JSObject data = new JSObject();

                if ("com.aetherradio.PLAY".equals(action)) {
                    data.put("action", "play");
                    notifyListeners("notificationAction", data);
                } else if ("com.aetherradio.PAUSE".equals(action)) {
                    data.put("action", "pause");
                    notifyListeners("notificationAction", data);
                } else if ("com.aetherradio.STOP".equals(action)) {
                    data.put("action", "stop");
                    notifyListeners("notificationAction", data);
                }
            }
        };

        IntentFilter filter = new IntentFilter();
        filter.addAction("com.aetherradio.PLAY");
        filter.addAction("com.aetherradio.PAUSE");
        filter.addAction("com.aetherradio.STOP");

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(notifReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(notifReceiver, filter);
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (notifReceiver != null) {
            try {
                getContext().unregisterReceiver(notifReceiver);
            } catch (Exception e) {
                Log.w(TAG, "unregisterReceiver: " + e.getMessage());
            }
        }
    }
}
