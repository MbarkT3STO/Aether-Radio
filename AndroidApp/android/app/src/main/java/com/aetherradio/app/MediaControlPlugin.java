package com.aetherradio.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * MediaControlPlugin
 *
 * Capacitor plugin that bridges the web layer to the native
 * RadioPlaybackService foreground service.
 *
 * Web calls:
 *   MediaControl.startPlayback({ name, country, tags })
 *   MediaControl.updatePlayback({ name, country, tags, isPlaying })
 *   MediaControl.stopPlayback()
 *
 * Native → Web events:
 *   'playerControl' with { action: 'play' | 'pause' | 'stop' }
 */
@CapacitorPlugin(name = "MediaControl")
public class MediaControlPlugin extends Plugin {

    private BroadcastReceiver playerControlReceiver;

    @Override
    public void load() {
        // Listen for control actions from the notification buttons
        playerControlReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getStringExtra("action");
                if (action == null) return;

                JSObject data = new JSObject();
                if (RadioPlaybackService.ACTION_PLAY.equals(action)) {
                    data.put("action", "play");
                } else if (RadioPlaybackService.ACTION_PAUSE.equals(action)) {
                    data.put("action", "pause");
                } else if (RadioPlaybackService.ACTION_STOP.equals(action)) {
                    data.put("action", "stop");
                } else {
                    return;
                }
                notifyListeners("playerControl", data);
            }
        };

        IntentFilter filter = new IntentFilter("com.aetherradio.app.PLAYER_CONTROL");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(playerControlReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(playerControlReceiver, filter);
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (playerControlReceiver != null) {
            try {
                getContext().unregisterReceiver(playerControlReceiver);
            } catch (Exception ignored) {}
        }
    }

    @PluginMethod
    public void startPlayback(PluginCall call) {
        String name    = call.getString("name", "Aether Radio");
        String country = call.getString("country", "");
        String tags    = call.getString("tags", "");

        Intent intent = new Intent(getContext(), RadioPlaybackService.class);
        intent.putExtra(RadioPlaybackService.EXTRA_STATION_NAME,    name);
        intent.putExtra(RadioPlaybackService.EXTRA_STATION_COUNTRY, country);
        intent.putExtra(RadioPlaybackService.EXTRA_STATION_TAGS,    tags);
        intent.putExtra(RadioPlaybackService.EXTRA_IS_PLAYING,      true);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }

        call.resolve();
    }

    @PluginMethod
    public void updatePlayback(PluginCall call) {
        String name      = call.getString("name", "Aether Radio");
        String country   = call.getString("country", "");
        String tags      = call.getString("tags", "");
        boolean playing  = Boolean.TRUE.equals(call.getBoolean("isPlaying", true));

        Intent intent = new Intent(getContext(), RadioPlaybackService.class);
        intent.putExtra(RadioPlaybackService.EXTRA_STATION_NAME,    name);
        intent.putExtra(RadioPlaybackService.EXTRA_STATION_COUNTRY, country);
        intent.putExtra(RadioPlaybackService.EXTRA_STATION_TAGS,    tags);
        intent.putExtra(RadioPlaybackService.EXTRA_IS_PLAYING,      playing);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }

        call.resolve();
    }

    @PluginMethod
    public void stopPlayback(PluginCall call) {
        Intent intent = new Intent(getContext(), RadioPlaybackService.class);
        intent.setAction(RadioPlaybackService.ACTION_STOP);
        getContext().startService(intent);
        call.resolve();
    }
}
