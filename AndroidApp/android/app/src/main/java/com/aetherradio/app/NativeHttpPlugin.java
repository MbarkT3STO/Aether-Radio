package com.aetherradio.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * NativeHttpPlugin — makes HTTP POST requests from native Android code,
 * completely bypassing WebView CORS restrictions.
 *
 * Used by SongRecognitionService to call the Shazam API which blocks
 * requests originating from browser/WebView contexts.
 */
@CapacitorPlugin(name = "NativeHttp")
public class NativeHttpPlugin extends Plugin {

    @PluginMethod
    public void post(PluginCall call) {
        String urlStr     = call.getString("url");
        String body       = call.getString("body", "");
        JSObject headers  = call.getObject("headers", new JSObject());

        if (urlStr == null || urlStr.isEmpty()) {
            call.reject("url is required");
            return;
        }

        // Run on a background thread — network on main thread throws NetworkOnMainThreadException
        final String finalUrl  = urlStr;
        final String finalBody = body;
        final JSObject finalHeaders = headers;

        new Thread(() -> {
            try {
                URL url = new URL(finalUrl);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setDoOutput(true);
                conn.setConnectTimeout(15_000);
                conn.setReadTimeout(15_000);

                // Set headers from JS
                if (finalHeaders != null) {
                    java.util.Iterator<String> keys = finalHeaders.keys();
                    while (keys.hasNext()) {
                        String key = keys.next();
                        String val = finalHeaders.getString(key);
                        if (val != null) conn.setRequestProperty(key, val);
                    }
                }

                // Write body
                if (finalBody != null && !finalBody.isEmpty()) {
                    byte[] bodyBytes = finalBody.getBytes(StandardCharsets.UTF_8);
                    conn.setRequestProperty("Content-Length", String.valueOf(bodyBytes.length));
                    try (OutputStream os = conn.getOutputStream()) {
                        os.write(bodyBytes);
                    }
                }

                int status = conn.getResponseCode();

                // Read response
                StringBuilder sb = new StringBuilder();
                try (BufferedReader br = new BufferedReader(
                        new InputStreamReader(
                                status >= 400 ? conn.getErrorStream() : conn.getInputStream(),
                                StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = br.readLine()) != null) sb.append(line);
                }

                conn.disconnect();

                JSObject result = new JSObject();
                result.put("status", status);
                result.put("data", sb.toString());
                call.resolve(result);

            } catch (Exception e) {
                call.reject("NativeHttp error: " + e.getMessage());
            }
        }).start();
    }
}
