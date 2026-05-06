package com.aetherradio.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Binder;
import android.os.Build;
import android.os.IBinder;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import android.support.v4.media.MediaMetadataCompat;

import androidx.core.app.NotificationCompat;
import androidx.media.app.NotificationCompat.MediaStyle;

/**
 * RadioPlaybackService
 *
 * A foreground service that keeps the app alive while audio is playing.
 * It shows a persistent media notification with playback controls.
 *
 * The actual audio playback is handled by the WebView (HTML5 Audio).
 * This service only manages the foreground state and notification.
 */
public class RadioPlaybackService extends Service {

    public static final String CHANNEL_ID = "aether_radio_playback";
    public static final String ACTION_PLAY   = "com.aetherradio.app.ACTION_PLAY";
    public static final String ACTION_PAUSE  = "com.aetherradio.app.ACTION_PAUSE";
    public static final String ACTION_STOP   = "com.aetherradio.app.ACTION_STOP";

    public static final String EXTRA_STATION_NAME    = "station_name";
    public static final String EXTRA_STATION_COUNTRY = "station_country";
    public static final String EXTRA_STATION_TAGS    = "station_tags";
    public static final String EXTRA_IS_PLAYING      = "is_playing";

    private static final int NOTIFICATION_ID = 1001;

    private MediaSessionCompat mediaSession;
    private String stationName    = "Aether Radio";
    private String stationCountry = "";
    private String stationTags    = "";
    private boolean isPlaying     = false;

    public class LocalBinder extends Binder {
        RadioPlaybackService getService() { return RadioPlaybackService.this; }
    }

    private final IBinder binder = new LocalBinder();

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        initMediaSession();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_STICKY;

        String action = intent.getAction();

        // Update station info if provided
        if (intent.hasExtra(EXTRA_STATION_NAME)) {
            stationName    = intent.getStringExtra(EXTRA_STATION_NAME);
            stationCountry = intent.getStringExtra(EXTRA_STATION_COUNTRY);
            stationTags    = intent.getStringExtra(EXTRA_STATION_TAGS);
            isPlaying      = intent.getBooleanExtra(EXTRA_IS_PLAYING, true);
        }

        if (ACTION_STOP.equals(action)) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_REMOVE);
            } else {
                stopForeground(true);
            }
            stopSelf();
            return START_NOT_STICKY;
        }

        if (ACTION_PAUSE.equals(action)) {
            isPlaying = false;
            broadcastAction(ACTION_PAUSE);
        } else if (ACTION_PLAY.equals(action)) {
            isPlaying = true;
            broadcastAction(ACTION_PLAY);
        }

        updateMediaSession();
        startForeground(NOTIFICATION_ID, buildNotification());
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return binder;
    }

    @Override
    public void onDestroy() {
        if (mediaSession != null) {
            mediaSession.release();
        }
        super.onDestroy();
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Radio Playback",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Shows currently playing radio station");
            channel.setShowBadge(false);
            channel.setSound(null, null);

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private void initMediaSession() {
        mediaSession = new MediaSessionCompat(this, "AetherRadio");
        mediaSession.setFlags(
            MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS |
            MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS
        );

        mediaSession.setCallback(new MediaSessionCompat.Callback() {
            @Override
            public void onPlay() {
                isPlaying = true;
                broadcastAction(ACTION_PLAY);
                updateMediaSession();
                startForeground(NOTIFICATION_ID, buildNotification());
            }

            @Override
            public void onPause() {
                isPlaying = false;
                broadcastAction(ACTION_PAUSE);
                updateMediaSession();
                startForeground(NOTIFICATION_ID, buildNotification());
            }

            @Override
            public void onStop() {
                broadcastAction(ACTION_STOP);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    stopForeground(STOP_FOREGROUND_REMOVE);
                } else {
                    stopForeground(true);
                }
                stopSelf();
            }
        });

        mediaSession.setActive(true);
    }

    private void updateMediaSession() {
        if (mediaSession == null) return;

        long actions = PlaybackStateCompat.ACTION_PLAY_PAUSE |
                       PlaybackStateCompat.ACTION_STOP;
        if (isPlaying) {
            actions |= PlaybackStateCompat.ACTION_PAUSE;
        } else {
            actions |= PlaybackStateCompat.ACTION_PLAY;
        }

        PlaybackStateCompat state = new PlaybackStateCompat.Builder()
            .setActions(actions)
            .setState(
                isPlaying ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED,
                PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN,
                1.0f
            )
            .build();
        mediaSession.setPlaybackState(state);

        String subtitle = stationCountry;
        if (stationTags != null && !stationTags.isEmpty()) {
            subtitle = subtitle.isEmpty() ? stationTags : subtitle + " · " + stationTags;
        }

        // Use the app launcher icon as album art so it appears in the
        // media notification artwork area on all Android versions / OEM skins
        Bitmap albumArt = BitmapFactory.decodeResource(getResources(), R.mipmap.ic_launcher);

        MediaMetadataCompat metadata = new MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, stationName)
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, subtitle.isEmpty() ? "Aether Radio" : subtitle)
            .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, "Aether Radio")
            .putString(MediaMetadataCompat.METADATA_KEY_DISPLAY_TITLE, stationName)
            .putString(MediaMetadataCompat.METADATA_KEY_DISPLAY_SUBTITLE, subtitle.isEmpty() ? "Aether Radio" : subtitle)
            .putString(MediaMetadataCompat.METADATA_KEY_DISPLAY_DESCRIPTION, "Aether Radio")
            // METADATA_KEY_ART is what the media notification widget uses for artwork
            .putBitmap(MediaMetadataCompat.METADATA_KEY_ART, albumArt)
            // METADATA_KEY_ALBUM_ART is the fallback used by some OEM skins
            .putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, albumArt)
            .build();
        mediaSession.setMetadata(metadata);
    }

    private Notification buildNotification() {
        // Intent to open the app when notification is tapped
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent openPendingIntent = PendingIntent.getActivity(
            this, 0, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Play/Pause action
        String toggleAction = isPlaying ? ACTION_PAUSE : ACTION_PLAY;
        int toggleIcon = isPlaying
            ? android.R.drawable.ic_media_pause
            : android.R.drawable.ic_media_play;
        String toggleLabel = isPlaying ? "Pause" : "Play";

        Intent toggleIntent = new Intent(this, RadioPlaybackService.class);
        toggleIntent.setAction(toggleAction);
        PendingIntent togglePendingIntent = PendingIntent.getService(
            this, 1, toggleIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Stop action
        Intent stopIntent = new Intent(this, RadioPlaybackService.class);
        stopIntent.setAction(ACTION_STOP);
        PendingIntent stopPendingIntent = PendingIntent.getService(
            this, 2, stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // App logo bitmap — used as both the large icon and the media session artwork
        Bitmap appLogo = BitmapFactory.decodeResource(getResources(), R.mipmap.ic_launcher);

        String subtitle = stationCountry;
        if (stationTags != null && !stationTags.isEmpty()) {
            subtitle = subtitle.isEmpty() ? stationTags : subtitle + " · " + stationTags;
        }

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            // App name always visible as the notification header label
            .setContentTitle(stationName)
            .setContentText(subtitle.isEmpty() ? "Aether Radio" : subtitle)
            // setSubText shows "Aether Radio" as the app label above the title
            .setSubText("Aether Radio")
            // Small icon: monochrome white-on-transparent vector (status bar + header)
            .setSmallIcon(R.drawable.ic_notification)
            // Large icon: full-color app logo (left side of notification)
            .setLargeIcon(appLogo)
            .setContentIntent(openPendingIntent)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setShowWhen(false)
            .addAction(toggleIcon, toggleLabel, togglePendingIntent)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop", stopPendingIntent)
            .setStyle(new MediaStyle()
                .setMediaSession(mediaSession.getSessionToken())
                // Show Play/Pause (0) and Stop (1) in the compact notification view
                .setShowActionsInCompactView(0, 1))
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
    }

    private void broadcastAction(String action) {
        Intent broadcast = new Intent("com.aetherradio.app.PLAYER_CONTROL");
        broadcast.putExtra("action", action);
        sendBroadcast(broadcast);
    }
}
