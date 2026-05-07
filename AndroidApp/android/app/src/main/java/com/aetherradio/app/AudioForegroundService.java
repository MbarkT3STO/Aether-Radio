package com.aetherradio.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
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
 *  3. Receives notification button broadcasts INSIDE the service (always alive)
 *     and forwards them to JS via the Capacitor bridge
 *
 * The BroadcastReceiver lives here — NOT in the plugin — so it works even
 * when the activity is paused/stopped.
 */
public class AudioForegroundService extends Service {

    private static final String TAG        = "AudioForegroundService";
    public static final String CHANNEL_ID  = "aether_radio_playback";
    public static final int    NOTIF_ID    = 1001;

    // Intent actions from AudioPlayerPlugin (JS → service)
    public static final String ACTION_START  = "com.aetherradio.app.ACTION_START";
    public static final String ACTION_STOP   = "com.aetherradio.app.ACTION_STOP";
    public static final String ACTION_PAUSE  = "com.aetherradio.app.ACTION_PAUSE";
    public static final String ACTION_RESUME = "com.aetherradio.app.ACTION_RESUME";

    // Broadcast actions from notification buttons (service → JS)
    public static final String ACTION_BTN_PLAY  = "com.aetherradio.BTN_PLAY";
    public static final String ACTION_BTN_PAUSE = "com.aetherradio.BTN_PAUSE";
    public static final String ACTION_BTN_STOP  = "com.aetherradio.BTN_STOP";

    // Intent extras
    public static final String EXTRA_TRACK   = "track";
    public static final String EXTRA_ARTIST  = "artist";
    public static final String EXTRA_COVER   = "cover";
    public static final String EXTRA_PLAYING = "isPlaying";

    private MediaSessionCompat  mediaSession;
    private NotificationManager notifManager;
    private BroadcastReceiver   btnReceiver;
    private Bitmap              cachedArt;

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
        setupMediaSession();
        registerButtonReceiver();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            // Restarted by Android after kill — re-post with last known state
            startForegroundNow(cachedArt);
            return START_STICKY;
        }

        String action = intent.getAction();
        Log.i(TAG, "onStartCommand action=" + action);

        if (ACTION_START.equals(action) || ACTION_RESUME.equals(action)) {
            String t = intent.getStringExtra(EXTRA_TRACK);
            String a = intent.getStringExtra(EXTRA_ARTIST);
            String c = intent.getStringExtra(EXTRA_COVER);
            if (t != null) currentTrack  = t;
            if (a != null) currentArtist = a;
            if (c != null) currentCover  = c;
            isPlaying = intent.getBooleanExtra(EXTRA_PLAYING, true);
            updatePlaybackState(isPlaying);
            fetchArtAndStart();

        } else if (ACTION_PAUSE.equals(action)) {
            isPlaying = false;
            updatePlaybackState(false);
            notifManager.notify(NOTIF_ID, buildNotification(cachedArt));

        } else if (ACTION_STOP.equals(action)) {
            stopForeground(true);
            stopSelf();
        }

        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }

    @Override
    public void onDestroy() {
        Log.i(TAG, "onDestroy");
        unregisterButtonReceiver();
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
        }
        super.onDestroy();
    }

    // ── MediaSession ───────────────────────────────────────────────────────

    private void setupMediaSession() {
        mediaSession = new MediaSessionCompat(this, "AetherRadioSession");
        mediaSession.setFlags(
            MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS |
            MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS
        );
        mediaSession.setActive(true);
        updatePlaybackState(true);
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

    // ── Notification button BroadcastReceiver (lives in the service) ───────

    private void registerButtonReceiver() {
        btnReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                Log.i(TAG, "btnReceiver: " + action);

                if (ACTION_BTN_PAUSE.equals(action)) {
                    // Update notification immediately so the button flips to Play
                    isPlaying = false;
                    updatePlaybackState(false);
                    notifManager.notify(NOTIF_ID, buildNotification(cachedArt));
                    // Forward to JS
                    forwardToJS("pause");

                } else if (ACTION_BTN_PLAY.equals(action)) {
                    isPlaying = true;
                    updatePlaybackState(true);
                    notifManager.notify(NOTIF_ID, buildNotification(cachedArt));
                    forwardToJS("play");

                } else if (ACTION_BTN_STOP.equals(action)) {
                    forwardToJS("stop");
                    stopForeground(true);
                    stopSelf();
                }
            }
        };

        IntentFilter filter = new IntentFilter();
        filter.addAction(ACTION_BTN_PLAY);
        filter.addAction(ACTION_BTN_PAUSE);
        filter.addAction(ACTION_BTN_STOP);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(btnReceiver, filter, RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(btnReceiver, filter);
        }
    }

    private void unregisterButtonReceiver() {
        if (btnReceiver != null) {
            try { unregisterReceiver(btnReceiver); } catch (Exception ignored) {}
            btnReceiver = null;
        }
    }

    /**
     * Forward a button action to JS via Capacitor's triggerJSEvent.
     * This works even when the activity is paused — same mechanism used by
     * capacitor-music-controls-plugin-v3 for Android 13+.
     */
    private void forwardToJS(String action) {
        try {
            // Build a JSON payload matching what AudioPlayerPlugin.notifyListeners sends
            String json = "{\"action\":\"" + action + "\"}";
            // triggerJSEvent fires a document-level CustomEvent in the WebView
            com.getcapacitor.Bridge bridge = getBridge();
            if (bridge != null) {
                bridge.triggerJSEvent("audioPlayerAction", "document", json);
            }
        } catch (Exception e) {
            Log.w(TAG, "forwardToJS failed: " + e.getMessage());
        }
    }

    /** Get the Capacitor Bridge from the static holder set by MainActivity. */
    private com.getcapacitor.Bridge getBridge() {
        return MainActivity.capacitorBridge;
    }

    // ── Notification ───────────────────────────────────────────────────────

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                CHANNEL_ID,
                "Aether Radio Playback",
                NotificationManager.IMPORTANCE_LOW
            );
            ch.setDescription("Shows what's playing in Aether Radio");
            ch.setShowBadge(false);
            notifManager.createNotificationChannel(ch);
        }
    }

    private void fetchArtAndStart() {
        // Post immediately (required within 5 s of startForegroundService)
        startForegroundNow(cachedArt);

        if (!currentCover.isEmpty() && currentCover.startsWith("http")) {
            new Thread(() -> {
                Bitmap art = fetchBitmap(currentCover);
                if (art != null) {
                    cachedArt = art;
                    notifManager.notify(NOTIF_ID, buildNotification(art));
                }
            }).start();
        } else {
            if (cachedArt == null) cachedArt = getLocalArt();
            notifManager.notify(NOTIF_ID, buildNotification(cachedArt));
        }
    }

    private void startForegroundNow(Bitmap art) {
        startForeground(NOTIF_ID, buildNotification(art));
    }

    private Notification buildNotification(Bitmap art) {
        Context ctx = getApplicationContext();

        int piFlags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
            ? PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            : PendingIntent.FLAG_UPDATE_CURRENT;

        // Tap → open app
        Intent openIntent = new Intent(ctx, MainActivity.class);
        openIntent.setAction(Intent.ACTION_MAIN);
        openIntent.addCategory(Intent.CATEGORY_LAUNCHER);
        openIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        PendingIntent openPi = PendingIntent.getActivity(ctx, 0, openIntent, piFlags);

        // Play / Pause toggle
        String btnAction = isPlaying ? ACTION_BTN_PAUSE : ACTION_BTN_PLAY;
        int    btnIcon   = isPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play;
        String btnLabel  = isPlaying ? "Pause" : "Play";
        PendingIntent ppPi = PendingIntent.getBroadcast(ctx, 1, new Intent(btnAction), piFlags);

        // Stop
        PendingIntent stopPi = PendingIntent.getBroadcast(ctx, 2, new Intent(ACTION_BTN_STOP), piFlags);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(ctx, CHANNEL_ID)
            .setSmallIcon(R.drawable.notification)
            .setContentTitle(currentTrack)
            .setContentText(currentArtist)
            .setContentIntent(openPi)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .addAction(btnIcon, btnLabel, ppPi)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop", stopPi);

        if (art != null) builder.setLargeIcon(art);

        builder.setStyle(new MediaStyle()
            .setMediaSession(mediaSession.getSessionToken())
            .setShowActionsInCompactView(0, 1));

        return builder.build();
    }

    private Bitmap getLocalArt() {
        try {
            InputStream is = getAssets().open("public/assets/logo.png");
            return BitmapFactory.decodeStream(is);
        } catch (Exception e) { return null; }
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
