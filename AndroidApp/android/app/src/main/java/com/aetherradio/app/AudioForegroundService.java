package com.aetherradio.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.os.IBinder;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.media.app.NotificationCompat.MediaStyle;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * AudioForegroundService
 *
 * A proper Android foreground service that:
 *  1. Keeps the process alive when the app is backgrounded / screen locked
 *  2. Posts a media-style notification to the notification shade
 *  3. Survives battery optimisation on OEM devices (Samsung, Xiaomi, etc.)
 *
 * Started via startForegroundService() from AudioPlayerPlugin (JS → native).
 * Uses START_STICKY so Android restarts it if killed under memory pressure.
 */
public class AudioForegroundService extends Service {

    private static final String TAG          = "AudioForegroundService";
    public  static final String CHANNEL_ID   = "aether_radio_playback";
    public  static final int    NOTIF_ID     = 1001;

    // Intent actions sent from AudioPlayerPlugin
    public static final String ACTION_START   = "com.aetherradio.app.ACTION_START";
    public static final String ACTION_STOP    = "com.aetherradio.app.ACTION_STOP";
    public static final String ACTION_PAUSE   = "com.aetherradio.app.ACTION_PAUSE";
    public static final String ACTION_RESUME  = "com.aetherradio.app.ACTION_RESUME";

    // Intent extras
    public static final String EXTRA_TRACK   = "track";
    public static final String EXTRA_ARTIST  = "artist";
    public static final String EXTRA_COVER   = "cover";
    public static final String EXTRA_PLAYING = "isPlaying";

    private MediaSessionCompat mediaSession;
    private NotificationManager notifManager;

    // Current state
    private String  currentTrack  = "Aether Radio";
    private String  currentArtist = "Live Radio";
    private String  currentCover  = "";
    private boolean isPlaying     = true;

    // ── Lifecycle ──────────────────────────────────────────────────────────

    @Override
    public void onCreate() {
        super.onCreate();
        Log.i(TAG, "onCreate");

        notifManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        createNotificationChannel();

        // Set up MediaSession so the notification is recognised as a media notification
        mediaSession = new MediaSessionCompat(this, "AetherRadioSession");
        mediaSession.setFlags(
            MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS |
            MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS
        );
        mediaSession.setActive(true);
        updatePlaybackState(true);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            // Restarted by Android after kill — re-post notification with last known state
            startForegroundWithNotification();
            return START_STICKY;
        }

        String action = intent.getAction();
        Log.i(TAG, "onStartCommand action=" + action);

        if (ACTION_START.equals(action) || ACTION_RESUME.equals(action)) {
            currentTrack  = intent.getStringExtra(EXTRA_TRACK)  != null ? intent.getStringExtra(EXTRA_TRACK)  : currentTrack;
            currentArtist = intent.getStringExtra(EXTRA_ARTIST) != null ? intent.getStringExtra(EXTRA_ARTIST) : currentArtist;
            currentCover  = intent.getStringExtra(EXTRA_COVER)  != null ? intent.getStringExtra(EXTRA_COVER)  : currentCover;
            isPlaying     = intent.getBooleanExtra(EXTRA_PLAYING, true);
            updatePlaybackState(isPlaying);
            startForegroundWithNotification();

        } else if (ACTION_PAUSE.equals(action)) {
            isPlaying = false;
            updatePlaybackState(false);
            // Update notification to show paused state but keep foreground alive
            notifManager.notify(NOTIF_ID, buildNotification(null));

        } else if (ACTION_STOP.equals(action)) {
            stopForeground(true);
            stopSelf();
        }

        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null; // Not a bound service
    }

    @Override
    public void onDestroy() {
        Log.i(TAG, "onDestroy");
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
        }
        super.onDestroy();
    }

    // ── Notification ───────────────────────────────────────────────────────

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Aether Radio Playback",
                NotificationManager.IMPORTANCE_LOW  // silent, no sound/vibration
            );
            channel.setDescription("Shows what's playing in Aether Radio");
            channel.setShowBadge(false);
            notifManager.createNotificationChannel(channel);
        }
    }

    private void startForegroundWithNotification() {
        if (!currentCover.isEmpty() && currentCover.startsWith("http")) {
            // Fetch cover art on a background thread, then update notification
            new Thread(() -> {
                Bitmap art = fetchBitmap(currentCover);
                startForeground(NOTIF_ID, buildNotification(art));
            }).start();
            // Post immediately with no art so startForeground() is called within 5 s
            startForeground(NOTIF_ID, buildNotification(null));
        } else {
            startForeground(NOTIF_ID, buildNotification(getLocalArt()));
        }
    }

    private Notification buildNotification(Bitmap art) {
        Context ctx = getApplicationContext();

        // Tap notification → open app
        Intent openIntent = new Intent(ctx, MainActivity.class);
        openIntent.setAction(Intent.ACTION_MAIN);
        openIntent.addCategory(Intent.CATEGORY_LAUNCHER);
        openIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        int piFlags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
            ? PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            : PendingIntent.FLAG_UPDATE_CURRENT;
        PendingIntent openPi = PendingIntent.getActivity(ctx, 0, openIntent, piFlags);

        // Play/Pause action
        String ppAction  = isPlaying ? "com.aetherradio.PAUSE" : "com.aetherradio.PLAY";
        int    ppIcon    = isPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play;
        String ppLabel   = isPlaying ? "Pause" : "Play";
        Intent ppIntent  = new Intent(ppAction);
        PendingIntent ppPi = PendingIntent.getBroadcast(ctx, 1, ppIntent, piFlags);

        // Stop action
        Intent stopIntent = new Intent("com.aetherradio.STOP");
        PendingIntent stopPi = PendingIntent.getBroadcast(ctx, 2, stopIntent, piFlags);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(ctx, CHANNEL_ID)
            .setSmallIcon(R.drawable.notification)
            .setContentTitle(currentTrack)
            .setContentText(currentArtist)
            .setContentIntent(openPi)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .addAction(ppIcon, ppLabel, ppPi)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop", stopPi);

        if (art != null) {
            builder.setLargeIcon(art);
        }

        // MediaStyle makes it appear as a proper media notification
        MediaStyle style = new MediaStyle()
            .setMediaSession(mediaSession.getSessionToken())
            .setShowActionsInCompactView(0, 1); // show play/pause + stop in compact view
        builder.setStyle(style);

        return builder.build();
    }

    private void updatePlaybackState(boolean playing) {
        if (mediaSession == null) return;
        PlaybackStateCompat state = new PlaybackStateCompat.Builder()
            .setState(
                playing ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED,
                PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN,
                playing ? 1f : 0f
            )
            .setActions(
                PlaybackStateCompat.ACTION_PLAY |
                PlaybackStateCompat.ACTION_PAUSE |
                PlaybackStateCompat.ACTION_PLAY_PAUSE |
                PlaybackStateCompat.ACTION_STOP
            )
            .build();
        mediaSession.setPlaybackState(state);
    }

    private Bitmap getLocalArt() {
        try {
            InputStream is = getAssets().open("public/assets/logo.png");
            return BitmapFactory.decodeStream(is);
        } catch (Exception e) {
            return null;
        }
    }

    private Bitmap fetchBitmap(String urlStr) {
        try {
            URL url = new URL(urlStr);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
            conn.connect();
            return BitmapFactory.decodeStream(conn.getInputStream());
        } catch (Exception e) {
            Log.w(TAG, "fetchBitmap failed: " + e.getMessage());
            return null;
        }
    }
}
