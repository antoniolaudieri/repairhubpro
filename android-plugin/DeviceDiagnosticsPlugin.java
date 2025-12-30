package com.lablinkriparo.monitor;

import android.app.ActivityManager;
import android.app.DownloadManager;
import android.app.usage.StorageStats;
import android.app.usage.StorageStatsManager;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.BitmapDrawable;
import android.graphics.drawable.Drawable;
import android.hardware.Sensor;
import android.hardware.SensorManager;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Environment;
import android.os.StatFs;
import android.os.storage.StorageManager;
import android.os.SystemClock;
import android.app.AppOpsManager;
import android.provider.Settings;
import android.util.Base64;
import android.util.Log;
import android.Manifest;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@CapacitorPlugin(name = "DeviceDiagnostics")
public class DeviceDiagnosticsPlugin extends Plugin {

    private static final String TAG = "DeviceDiagnostics";
    private long downloadId = -1;
    private PluginCall pendingDownloadCall = null;

    @PluginMethod
    public void getStorageInfo(PluginCall call) {
        try {
            StatFs statFs = new StatFs(Environment.getDataDirectory().getPath());
            long totalBytes = statFs.getTotalBytes();
            long availableBytes = statFs.getAvailableBytes();
            long usedBytes = totalBytes - availableBytes;

            JSObject result = new JSObject();
            result.put("totalBytes", totalBytes);
            result.put("availableBytes", availableBytes);
            result.put("usedBytes", usedBytes);
            result.put("totalGb", totalBytes / (1024.0 * 1024.0 * 1024.0));
            result.put("availableGb", availableBytes / (1024.0 * 1024.0 * 1024.0));
            result.put("usedGb", usedBytes / (1024.0 * 1024.0 * 1024.0));
            result.put("percentUsed", (usedBytes * 100.0) / totalBytes);

            call.resolve(result);
        } catch (Exception e) {
            call.reject("Error getting storage info: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getRamInfo(PluginCall call) {
        try {
            ActivityManager activityManager = (ActivityManager) getContext().getSystemService(Context.ACTIVITY_SERVICE);
            ActivityManager.MemoryInfo memoryInfo = new ActivityManager.MemoryInfo();
            activityManager.getMemoryInfo(memoryInfo);

            long totalMb = memoryInfo.totalMem / (1024 * 1024);
            long availableMb = memoryInfo.availMem / (1024 * 1024);
            long usedMb = totalMb - availableMb;

            JSObject result = new JSObject();
            result.put("totalMb", totalMb);
            result.put("availableMb", availableMb);
            result.put("usedMb", usedMb);
            result.put("percentUsed", (usedMb * 100.0) / totalMb);

            call.resolve(result);
        } catch (Exception e) {
            call.reject("Error getting RAM info: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getSensorsInfo(PluginCall call) {
        try {
            SensorManager sensorManager = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
            JSObject result = new JSObject();

            // GPS
            JSObject gps = new JSObject();
            gps.put("available", getContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_LOCATION_GPS));
            gps.put("name", "GPS");
            result.put("gps", gps);

            // Accelerometer
            JSObject accelerometer = new JSObject();
            accelerometer.put("available", sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) != null);
            accelerometer.put("name", "Accelerometro");
            result.put("accelerometer", accelerometer);

            // Gyroscope
            JSObject gyroscope = new JSObject();
            gyroscope.put("available", sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE) != null);
            gyroscope.put("name", "Giroscopio");
            result.put("gyroscope", gyroscope);

            // Magnetometer
            JSObject magnetometer = new JSObject();
            magnetometer.put("available", sensorManager.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD) != null);
            magnetometer.put("name", "Magnetometro");
            result.put("magnetometer", magnetometer);

            // Proximity
            JSObject proximity = new JSObject();
            proximity.put("available", sensorManager.getDefaultSensor(Sensor.TYPE_PROXIMITY) != null);
            proximity.put("name", "Prossimità");
            result.put("proximity", proximity);

            // Light sensor
            JSObject lightSensor = new JSObject();
            lightSensor.put("available", sensorManager.getDefaultSensor(Sensor.TYPE_LIGHT) != null);
            lightSensor.put("name", "Sensore Luce");
            result.put("lightSensor", lightSensor);

            // Barometer
            JSObject barometer = new JSObject();
            barometer.put("available", sensorManager.getDefaultSensor(Sensor.TYPE_PRESSURE) != null);
            barometer.put("name", "Barometro");
            result.put("barometer", barometer);

            // Microphone
            JSObject microphone = new JSObject();
            microphone.put("available", getContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_MICROPHONE));
            microphone.put("name", "Microfono");
            result.put("microphone", microphone);

            // Camera
            JSObject camera = new JSObject();
            camera.put("available", getContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_CAMERA_ANY));
            camera.put("name", "Fotocamera");
            result.put("camera", camera);

            call.resolve(result);
        } catch (Exception e) {
            call.reject("Error getting sensors info: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getBatteryAdvancedInfo(PluginCall call) {
        try {
            IntentFilter ifilter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
            Intent batteryStatus = getContext().registerReceiver(null, ifilter);

            JSObject result = new JSObject();

            if (batteryStatus != null) {
                int level = batteryStatus.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
                int scale = batteryStatus.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
                float batteryPct = level * 100 / (float) scale;
                result.put("level", batteryPct);

                int status = batteryStatus.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
                boolean isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING ||
                        status == BatteryManager.BATTERY_STATUS_FULL;
                result.put("isCharging", isCharging);

                int temperature = batteryStatus.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, -1);
                result.put("temperature", temperature / 10.0); // Convert to Celsius

                int voltage = batteryStatus.getIntExtra(BatteryManager.EXTRA_VOLTAGE, -1);
                result.put("voltage", voltage);

                String technology = batteryStatus.getStringExtra(BatteryManager.EXTRA_TECHNOLOGY);
                result.put("technology", technology);

                int health = batteryStatus.getIntExtra(BatteryManager.EXTRA_HEALTH, -1);
                String healthStr = "unknown";
                switch (health) {
                    case BatteryManager.BATTERY_HEALTH_GOOD:
                        healthStr = "good";
                        break;
                    case BatteryManager.BATTERY_HEALTH_OVERHEAT:
                        healthStr = "overheat";
                        break;
                    case BatteryManager.BATTERY_HEALTH_DEAD:
                        healthStr = "dead";
                        break;
                    case BatteryManager.BATTERY_HEALTH_OVER_VOLTAGE:
                        healthStr = "over_voltage";
                        break;
                    case BatteryManager.BATTERY_HEALTH_UNSPECIFIED_FAILURE:
                        healthStr = "unspecified_failure";
                        break;
                    case BatteryManager.BATTERY_HEALTH_COLD:
                        healthStr = "cold";
                        break;
                }
                result.put("health", healthStr);

                int plugged = batteryStatus.getIntExtra(BatteryManager.EXTRA_PLUGGED, -1);
                String pluggedStr = "none";
                switch (plugged) {
                    case BatteryManager.BATTERY_PLUGGED_AC:
                        pluggedStr = "ac";
                        break;
                    case BatteryManager.BATTERY_PLUGGED_USB:
                        pluggedStr = "usb";
                        break;
                    case BatteryManager.BATTERY_PLUGGED_WIRELESS:
                        pluggedStr = "wireless";
                        break;
                }
                result.put("plugged", pluggedStr);
            }

            call.resolve(result);
        } catch (Exception e) {
            call.reject("Error getting battery info: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getInstalledAppsStorage(PluginCall call) {
        try {
            PackageManager pm = getContext().getPackageManager();
            List<ApplicationInfo> apps = pm.getInstalledApplications(PackageManager.GET_META_DATA);
            
            JSArray appsArray = new JSArray();
            List<JSObject> appsList = new ArrayList<>();

            for (ApplicationInfo appInfo : apps) {
                try {
                    JSObject appData = new JSObject();
                    appData.put("packageName", appInfo.packageName);
                    
                    String appName = pm.getApplicationLabel(appInfo).toString();
                    appData.put("appName", appName);
                    
                    boolean isSystemApp = (appInfo.flags & ApplicationInfo.FLAG_SYSTEM) != 0;
                    appData.put("isSystemApp", isSystemApp);

                    // Get app size
                    long totalSize = 0;
                    long appSize = 0;
                    long dataSize = 0;
                    long cacheSize = 0;

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        try {
                            StorageStatsManager storageStatsManager = (StorageStatsManager) 
                                getContext().getSystemService(Context.STORAGE_STATS_SERVICE);
                            StorageManager storageManager = (StorageManager) 
                                getContext().getSystemService(Context.STORAGE_SERVICE);
                            
                            UUID storageUuid = storageManager.getUuidForPath(new File(appInfo.sourceDir));
                            StorageStats storageStats = storageStatsManager.queryStatsForPackage(
                                storageUuid, appInfo.packageName, android.os.Process.myUserHandle());
                            
                            appSize = storageStats.getAppBytes();
                            dataSize = storageStats.getDataBytes();
                            cacheSize = storageStats.getCacheBytes();
                            totalSize = appSize + dataSize;
                        } catch (Exception e) {
                            // Fallback to file size
                            File sourceDir = new File(appInfo.sourceDir);
                            totalSize = sourceDir.length();
                            appSize = totalSize;
                        }
                    } else {
                        // For older Android versions
                        File sourceDir = new File(appInfo.sourceDir);
                        totalSize = sourceDir.length();
                        appSize = totalSize;
                    }

                    appData.put("totalSizeMb", totalSize / (1024.0 * 1024.0));
                    appData.put("appSizeMb", appSize / (1024.0 * 1024.0));
                    appData.put("dataSizeMb", dataSize / (1024.0 * 1024.0));
                    appData.put("cacheSizeMb", cacheSize / (1024.0 * 1024.0));

                    // Get app icon as base64 (optional, can be heavy)
                    try {
                        Drawable icon = pm.getApplicationIcon(appInfo);
                        Bitmap bitmap = drawableToBitmap(icon);
                        if (bitmap != null) {
                            // Scale down for performance
                            Bitmap scaledBitmap = Bitmap.createScaledBitmap(bitmap, 48, 48, true);
                            ByteArrayOutputStream baos = new ByteArrayOutputStream();
                            scaledBitmap.compress(Bitmap.CompressFormat.PNG, 80, baos);
                            byte[] byteArray = baos.toByteArray();
                            String base64 = Base64.encodeToString(byteArray, Base64.NO_WRAP);
                            appData.put("iconBase64", "data:image/png;base64," + base64);
                            scaledBitmap.recycle();
                        }
                    } catch (Exception e) {
                        // Icon not available
                    }

                    appsList.add(appData);
                } catch (Exception e) {
                    // Skip this app
                }
            }

            // Sort by size descending
            Collections.sort(appsList, new Comparator<JSObject>() {
                @Override
                public int compare(JSObject a, JSObject b) {
                    try {
                        double sizeA = a.getDouble("totalSizeMb");
                        double sizeB = b.getDouble("totalSizeMb");
                        return Double.compare(sizeB, sizeA);
                    } catch (Exception e) {
                        return 0;
                    }
                }
            });

            // Limit to top 50 apps
            int limit = Math.min(50, appsList.size());
            for (int i = 0; i < limit; i++) {
                appsArray.put(appsList.get(i));
            }

            JSObject result = new JSObject();
            result.put("apps", appsArray);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Error getting installed apps: " + e.getMessage());
        }
    }

    // Helper method to check if USAGE_STATS permission is granted
    private boolean hasUsageStatsPermission() {
        try {
            AppOpsManager appOps = (AppOpsManager) getContext().getSystemService(Context.APP_OPS_SERVICE);
            int mode = appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(),
                getContext().getPackageName()
            );
            return mode == AppOpsManager.MODE_ALLOWED;
        } catch (Exception e) {
            return false;
        }
    }

    @PluginMethod
    public void checkUsageStatsPermission(PluginCall call) {
        try {
            boolean granted = hasUsageStatsPermission();
            JSObject result = new JSObject();
            result.put("granted", granted);
            call.resolve(result);
        } catch (Exception e) {
            JSObject result = new JSObject();
            result.put("granted", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }

    @PluginMethod
    public void requestUsageStatsPermission(PluginCall call) {
        try {
            // Check current permission status first
            boolean alreadyGranted = hasUsageStatsPermission();
            
            Intent intent;
            
            // Try to open settings directly for this app (Android 10+)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                try {
                    intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
                    intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(intent);
                } catch (Exception e) {
                    // Fallback to general usage access settings
                    intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
                    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(intent);
                }
            } else {
                // For older Android versions, open general usage access settings
                intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            }
            
            JSObject result = new JSObject();
            result.put("granted", alreadyGranted);
            result.put("settingsOpened", true);
            result.put("packageName", getContext().getPackageName());
            call.resolve(result);
        } catch (Exception e) {
            // Last resort: open app info settings
            try {
                Intent appSettingsIntent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                appSettingsIntent.setData(Uri.parse("package:" + getContext().getPackageName()));
                appSettingsIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(appSettingsIntent);
                
                JSObject result = new JSObject();
                result.put("granted", false);
                result.put("settingsOpened", true);
                result.put("openedAppInfo", true);
                result.put("message", "Vai su Permessi > Accesso utilizzo e attivalo");
                call.resolve(result);
            } catch (Exception ex) {
                call.reject("Error requesting permission: " + e.getMessage());
            }
        }
    }

    @PluginMethod
    public void testSensor(PluginCall call) {
        String sensorType = call.getString("sensorType", "");
        JSObject result = new JSObject();
        
        try {
            SensorManager sensorManager = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
            boolean working = false;
            String errorMsg = null;
            
            switch (sensorType.toLowerCase()) {
                case "accelerometer":
                    Sensor accel = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
                    working = accel != null;
                    if (working) {
                        result.put("value", "Sensore rilevato: " + accel.getName());
                    }
                    break;
                case "gyroscope":
                    Sensor gyro = sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE);
                    working = gyro != null;
                    if (working) {
                        result.put("value", "Sensore rilevato: " + gyro.getName());
                    }
                    break;
                case "magnetometer":
                    Sensor mag = sensorManager.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD);
                    working = mag != null;
                    if (working) {
                        result.put("value", "Sensore rilevato: " + mag.getName());
                    }
                    break;
                case "proximity":
                    Sensor prox = sensorManager.getDefaultSensor(Sensor.TYPE_PROXIMITY);
                    working = prox != null;
                    if (working) {
                        result.put("value", "Sensore rilevato: " + prox.getName());
                    }
                    break;
                case "light":
                    Sensor light = sensorManager.getDefaultSensor(Sensor.TYPE_LIGHT);
                    working = light != null;
                    if (working) {
                        result.put("value", "Sensore rilevato: " + light.getName());
                    }
                    break;
                case "barometer":
                    Sensor baro = sensorManager.getDefaultSensor(Sensor.TYPE_PRESSURE);
                    working = baro != null;
                    if (working) {
                        result.put("value", "Sensore rilevato: " + baro.getName());
                    }
                    break;
                case "gps":
                    // Check if GPS hardware exists
                    boolean hasGpsFeature = getContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_LOCATION_GPS);
                    if (!hasGpsFeature) {
                        working = false;
                        errorMsg = "Hardware GPS non presente";
                    } else {
                        // Check if location is enabled
                        android.location.LocationManager locationManager = (android.location.LocationManager) 
                            getContext().getSystemService(Context.LOCATION_SERVICE);
                        
                        boolean gpsEnabled = locationManager.isProviderEnabled(android.location.LocationManager.GPS_PROVIDER);
                        boolean networkEnabled = locationManager.isProviderEnabled(android.location.LocationManager.NETWORK_PROVIDER);
                        
                        if (gpsEnabled || networkEnabled) {
                            working = true;
                            result.put("value", "GPS " + (gpsEnabled ? "attivo" : "via rete"));
                        } else {
                            working = false;
                            errorMsg = "Localizzazione disattivata nelle impostazioni";
                        }
                    }
                    break;
                case "microphone":
                    working = getContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_MICROPHONE);
                    if (working) {
                        result.put("value", "Microfono disponibile");
                    }
                    break;
                case "camera":
                    working = getContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_CAMERA_ANY);
                    if (working) {
                        result.put("value", "Fotocamera disponibile");
                    }
                    break;
                default:
                    errorMsg = "Sensore non riconosciuto: " + sensorType;
            }
            
            result.put("working", working);
            if (errorMsg != null) {
                result.put("error", errorMsg);
            }
            call.resolve(result);
        } catch (Exception e) {
            result.put("working", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        String packageName = call.getString("packageName", "");
        
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + packageName));
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            
            JSObject result = new JSObject();
            result.put("opened", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Error opening app settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openDeviceSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            
            JSObject result = new JSObject();
            result.put("opened", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Error opening device settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getAppUsageStats(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                UsageStatsManager usageStatsManager = (UsageStatsManager) 
                    getContext().getSystemService(Context.USAGE_STATS_SERVICE);
                
                // Get stats for the last 7 days for more accurate recent data
                long endTime = System.currentTimeMillis();
                long startTime = endTime - (7L * 24 * 60 * 60 * 1000);
                
                List<UsageStats> usageStatsList = usageStatsManager.queryUsageStats(
                    UsageStatsManager.INTERVAL_DAILY, startTime, endTime);
                
                // Aggregate stats by package (since we're querying daily)
                Map<String, long[]> aggregatedStats = new HashMap<>();
                
                if (usageStatsList != null) {
                    for (UsageStats usageStats : usageStatsList) {
                        String pkg = usageStats.getPackageName();
                        long timeMs = usageStats.getTotalTimeInForeground();
                        long lastUsed = usageStats.getLastTimeUsed();
                        
                        if (aggregatedStats.containsKey(pkg)) {
                            long[] existing = aggregatedStats.get(pkg);
                            existing[0] += timeMs; // Add time
                            existing[1] = Math.max(existing[1], lastUsed); // Keep latest
                        } else {
                            aggregatedStats.put(pkg, new long[]{timeMs, lastUsed});
                        }
                    }
                }
                
                JSArray statsArray = new JSArray();
                
                for (Map.Entry<String, long[]> entry : aggregatedStats.entrySet()) {
                    long[] values = entry.getValue();
                    JSObject stat = new JSObject();
                    stat.put("packageName", entry.getKey());
                    stat.put("totalTimeMs", values[0]);
                    stat.put("totalTimeMinutes", values[0] / (1000 * 60));
                    stat.put("lastTimeUsed", values[1]);
                    statsArray.put(stat);
                }
                
                JSObject result = new JSObject();
                result.put("stats", statsArray);
                result.put("hasPermission", usageStatsList != null && !usageStatsList.isEmpty());
                result.put("count", statsArray.length());
                call.resolve(result);
            } else {
                JSObject result = new JSObject();
                result.put("stats", new JSArray());
                result.put("hasPermission", false);
                result.put("error", "API level too low");
                call.resolve(result);
            }
        } catch (Exception e) {
            call.reject("Error getting usage stats: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getAppVersion(PluginCall call) {
        try {
            PackageInfo pInfo = getContext().getPackageManager().getPackageInfo(
                getContext().getPackageName(), 0);
            
            JSObject result = new JSObject();
            result.put("versionName", pInfo.versionName);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                result.put("versionCode", pInfo.getLongVersionCode());
            } else {
                result.put("versionCode", pInfo.versionCode);
            }
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Error getting app version: " + e.getMessage());
        }
    }

    @PluginMethod
    public void downloadApk(PluginCall call) {
        String url = call.getString("url", "");
        String fileName = call.getString("fileName", "update.apk");
        
        if (url.isEmpty()) {
            call.reject("URL is required");
            return;
        }
        
        try {
            DownloadManager downloadManager = (DownloadManager) 
                getContext().getSystemService(Context.DOWNLOAD_SERVICE);
            
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            request.setTitle("Aggiornamento LabLinkRiparo");
            request.setDescription("Download in corso...");
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);
            request.setMimeType("application/vnd.android.package-archive");
            
            downloadId = downloadManager.enqueue(request);
            pendingDownloadCall = call;
            
            // Register receiver to handle download completion
            BroadcastReceiver onComplete = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                    if (id == downloadId && pendingDownloadCall != null) {
                        // Query for the download file path
                        DownloadManager.Query query = new DownloadManager.Query();
                        query.setFilterById(downloadId);
                        Cursor cursor = downloadManager.query(query);
                        
                        if (cursor.moveToFirst()) {
                            int statusIndex = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS);
                            int status = cursor.getInt(statusIndex);
                            
                            if (status == DownloadManager.STATUS_SUCCESSFUL) {
                                int uriIndex = cursor.getColumnIndex(DownloadManager.COLUMN_LOCAL_URI);
                                String localUri = cursor.getString(uriIndex);
                                
                                JSObject result = new JSObject();
                                result.put("success", true);
                                result.put("filePath", localUri);
                                pendingDownloadCall.resolve(result);
                            } else {
                                JSObject result = new JSObject();
                                result.put("success", false);
                                result.put("error", "Download failed");
                                pendingDownloadCall.resolve(result);
                            }
                        }
                        cursor.close();
                        pendingDownloadCall = null;
                        context.unregisterReceiver(this);
                    }
                }
            };
            
            getContext().registerReceiver(onComplete, 
                new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE));
            
        } catch (Exception e) {
            Log.e(TAG, "Error downloading APK: " + e.getMessage());
            call.reject("Error downloading APK: " + e.getMessage());
        }
    }

    @PluginMethod
    public void installApk(PluginCall call) {
        String filePath = call.getString("filePath", "");
        
        if (filePath.isEmpty()) {
            call.reject("File path is required");
            return;
        }
        
        try {
            // Remove file:// prefix if present
            if (filePath.startsWith("file://")) {
                filePath = filePath.substring(7);
            }
            
            File file = new File(filePath);
            if (!file.exists()) {
                call.reject("APK file not found");
                return;
            }
            
            Intent intent = new Intent(Intent.ACTION_VIEW);
            Uri apkUri;
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                apkUri = FileProvider.getUriForFile(getContext(),
                    getContext().getPackageName() + ".fileprovider", file);
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } else {
                apkUri = Uri.fromFile(file);
            }
            
            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            
            getContext().startActivity(intent);
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error installing APK: " + e.getMessage());
            call.reject("Error installing APK: " + e.getMessage());
        }
    }

    // ==================== SECURITY & INTEGRITY METHODS ====================

    @PluginMethod
    public void getSecurityStatus(PluginCall call) {
        try {
            JSObject result = new JSObject();
            
            // Root detection
            boolean isRooted = checkRootStatus();
            result.put("isRooted", isRooted);
            result.put("rootMethod", detectRootMethod());
            
            // Bootloader status
            String bootState = getSystemProperty("ro.boot.verifiedbootstate");
            String flashLocked = getSystemProperty("ro.boot.flash.locked");
            boolean isBootloaderUnlocked = "orange".equals(bootState) || "1".equals(flashLocked) == false;
            result.put("isBootloaderUnlocked", isBootloaderUnlocked);
            result.put("verifiedBootState", bootState != null ? bootState : "unknown");
            
            // Developer options
            int devOptions = Settings.Global.getInt(
                getContext().getContentResolver(),
                Settings.Global.DEVELOPMENT_SETTINGS_ENABLED, 0);
            result.put("isDeveloperOptionsEnabled", devOptions == 1);
            
            // USB Debugging
            int adbEnabled = Settings.Global.getInt(
                getContext().getContentResolver(),
                Settings.Global.ADB_ENABLED, 0);
            result.put("isUsbDebuggingEnabled", adbEnabled == 1);
            
            // Build tags
            String buildTags = Build.TAGS;
            result.put("buildTags", buildTags != null ? buildTags : "unknown");
            result.put("isTestBuild", buildTags != null && buildTags.contains("test-keys"));
            
            // Security patch level
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                result.put("securityPatchLevel", Build.VERSION.SECURITY_PATCH);
            } else {
                result.put("securityPatchLevel", "unknown");
            }
            
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error getting security status: " + e.getMessage());
            call.reject("Error getting security status: " + e.getMessage());
        }
    }

    private boolean checkRootStatus() {
        // Check for common root indicators
        String[] rootPaths = {
            "/system/app/Superuser.apk",
            "/sbin/su",
            "/system/bin/su",
            "/system/xbin/su",
            "/data/local/xbin/su",
            "/data/local/bin/su",
            "/system/sd/xbin/su",
            "/system/bin/failsafe/su",
            "/data/local/su",
            "/su/bin/su",
            "/system/app/SuperSU.apk",
            "/system/app/SuperSU/SuperSU.apk",
            "/system/etc/init.d/99SuperSUDaemon",
            "/dev/com.koushikdutta.superuser.daemon/",
            "/system/xbin/daemonsu"
        };
        
        for (String path : rootPaths) {
            if (new File(path).exists()) {
                return true;
            }
        }
        
        // Check for Magisk
        String[] magiskPaths = {
            "/sbin/.magisk",
            "/cache/.disable_magisk",
            "/dev/.magisk.unblock",
            "/data/adb/magisk",
            "/data/adb/magisk.img",
            "/data/adb/magisk.db"
        };
        
        for (String path : magiskPaths) {
            if (new File(path).exists()) {
                return true;
            }
        }
        
        // Check for root packages
        PackageManager pm = getContext().getPackageManager();
        String[] rootPackages = {
            "com.noshufou.android.su",
            "com.thirdparty.superuser",
            "eu.chainfire.supersu",
            "com.koushikdutta.superuser",
            "com.zachspong.temprootremovejb",
            "com.ramdroid.appquarantine",
            "com.topjohnwu.magisk"
        };
        
        for (String pkg : rootPackages) {
            try {
                pm.getPackageInfo(pkg, 0);
                return true;
            } catch (PackageManager.NameNotFoundException e) {
                // Package not found, continue
            }
        }
        
        return false;
    }

    private String detectRootMethod() {
        // Check for Magisk
        if (new File("/data/adb/magisk").exists() || 
            new File("/sbin/.magisk").exists()) {
            return "magisk";
        }
        
        // Check for SuperSU
        if (new File("/system/app/SuperSU.apk").exists() ||
            new File("/system/app/SuperSU/SuperSU.apk").exists()) {
            return "supersu";
        }
        
        // Check for generic su binary
        if (new File("/system/xbin/su").exists() ||
            new File("/system/bin/su").exists()) {
            return "su_binary";
        }
        
        return null;
    }

    private String getSystemProperty(String propName) {
        try {
            Class<?> systemProperties = Class.forName("android.os.SystemProperties");
            java.lang.reflect.Method get = systemProperties.getMethod("get", String.class);
            String value = (String) get.invoke(null, propName);
            return (value != null && !value.isEmpty()) ? value : null;
        } catch (Exception e) {
            return null;
        }
    }

    @PluginMethod
    public void getDangerousPermissions(PluginCall call) {
        try {
            PackageManager pm = getContext().getPackageManager();
            List<ApplicationInfo> apps = pm.getInstalledApplications(PackageManager.GET_META_DATA);
            
            String[] dangerousPermissions = {
                Manifest.permission.READ_CONTACTS,
                Manifest.permission.WRITE_CONTACTS,
                Manifest.permission.READ_SMS,
                Manifest.permission.SEND_SMS,
                Manifest.permission.READ_CALL_LOG,
                Manifest.permission.WRITE_CALL_LOG,
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION,
                Manifest.permission.CAMERA,
                Manifest.permission.RECORD_AUDIO,
                Manifest.permission.READ_EXTERNAL_STORAGE,
                Manifest.permission.WRITE_EXTERNAL_STORAGE,
                Manifest.permission.READ_PHONE_STATE,
                Manifest.permission.CALL_PHONE,
                Manifest.permission.READ_CALENDAR,
                Manifest.permission.WRITE_CALENDAR
            };
            
            JSArray appsArray = new JSArray();
            
            for (ApplicationInfo appInfo : apps) {
                try {
                    PackageInfo pkgInfo = pm.getPackageInfo(appInfo.packageName, 
                        PackageManager.GET_PERMISSIONS);
                    
                    if (pkgInfo.requestedPermissions == null) continue;
                    
                    JSArray grantedDangerous = new JSArray();
                    
                    for (int i = 0; i < pkgInfo.requestedPermissions.length; i++) {
                        String perm = pkgInfo.requestedPermissions[i];
                        int flags = pkgInfo.requestedPermissionsFlags[i];
                        
                        // Check if permission is granted
                        if ((flags & PackageInfo.REQUESTED_PERMISSION_GRANTED) != 0) {
                            for (String dangerous : dangerousPermissions) {
                                if (perm.equals(dangerous)) {
                                    // Get short name
                                    String shortName = perm.substring(perm.lastIndexOf('.') + 1);
                                    grantedDangerous.put(shortName);
                                    break;
                                }
                            }
                        }
                    }
                    
                    if (grantedDangerous.length() > 0) {
                        JSObject appData = new JSObject();
                        appData.put("packageName", appInfo.packageName);
                        appData.put("appName", pm.getApplicationLabel(appInfo).toString());
                        appData.put("permissions", grantedDangerous);
                        appData.put("permissionCount", grantedDangerous.length());
                        appData.put("isSystemApp", (appInfo.flags & ApplicationInfo.FLAG_SYSTEM) != 0);
                        
                        // Get app icon
                        try {
                            Drawable icon = pm.getApplicationIcon(appInfo);
                            Bitmap bitmap = drawableToBitmap(icon);
                            if (bitmap != null) {
                                Bitmap scaledBitmap = Bitmap.createScaledBitmap(bitmap, 48, 48, true);
                                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                                scaledBitmap.compress(Bitmap.CompressFormat.PNG, 80, baos);
                                byte[] byteArray = baos.toByteArray();
                                String base64 = Base64.encodeToString(byteArray, Base64.NO_WRAP);
                                appData.put("iconBase64", "data:image/png;base64," + base64);
                                scaledBitmap.recycle();
                            }
                        } catch (Exception e) {
                            // Icon not available
                        }
                        
                        appsArray.put(appData);
                    }
                } catch (Exception e) {
                    // Skip this app
                }
            }
            
            JSObject result = new JSObject();
            result.put("apps", appsArray);
            result.put("totalApps", appsArray.length());
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error getting dangerous permissions: " + e.getMessage());
            call.reject("Error getting dangerous permissions: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getDeviceUptime(PluginCall call) {
        try {
            long uptimeMs = SystemClock.elapsedRealtime();
            long uptimeSeconds = uptimeMs / 1000;
            long uptimeMinutes = uptimeSeconds / 60;
            long uptimeHours = uptimeMinutes / 60;
            long uptimeDays = uptimeHours / 24;
            
            // Calculate last boot time
            long currentTimeMs = System.currentTimeMillis();
            long bootTimeMs = currentTimeMs - uptimeMs;
            
            JSObject result = new JSObject();
            result.put("uptimeMs", uptimeMs);
            result.put("uptimeSeconds", uptimeSeconds);
            result.put("uptimeMinutes", uptimeMinutes);
            result.put("uptimeHours", uptimeHours);
            result.put("uptimeDays", uptimeDays);
            result.put("lastBootTime", bootTimeMs);
            result.put("formattedUptime", formatUptime(uptimeMs));
            
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error getting device uptime: " + e.getMessage());
            call.reject("Error getting device uptime: " + e.getMessage());
        }
    }

    private String formatUptime(long uptimeMs) {
        long seconds = uptimeMs / 1000;
        long minutes = seconds / 60;
        long hours = minutes / 60;
        long days = hours / 24;
        
        hours = hours % 24;
        minutes = minutes % 60;
        
        if (days > 0) {
            return String.format("%dd %dh %dm", days, hours, minutes);
        } else if (hours > 0) {
            return String.format("%dh %dm", hours, minutes);
        } else {
            return String.format("%dm", minutes);
        }
    }

    @PluginMethod
    public void checkSystemIntegrity(PluginCall call) {
        try {
            JSObject result = new JSObject();
            
            // Check if /system is read-only
            boolean systemReadOnly = isSystemReadOnly();
            result.put("systemReadOnly", systemReadOnly);
            
            // Check for official build
            String buildTags = Build.TAGS;
            boolean officialBuild = buildTags == null || !buildTags.contains("test-keys");
            result.put("officialBuild", officialBuild);
            
            // Check SELinux status
            String seLinuxStatus = getSeLinuxStatus();
            result.put("seLinuxStatus", seLinuxStatus);
            result.put("seLinuxEnforcing", "Enforcing".equals(seLinuxStatus));
            
            // Check for system modifications
            boolean systemModified = checkSystemModifications();
            result.put("systemModified", systemModified);
            
            // Check verified boot state
            String verifiedBootState = getSystemProperty("ro.boot.verifiedbootstate");
            result.put("verifiedBootState", verifiedBootState != null ? verifiedBootState : "unknown");
            
            // Check device encryption
            boolean isEncrypted = checkDeviceEncryption();
            result.put("isEncrypted", isEncrypted);
            
            // Calculate integrity score (0-100)
            int integrityScore = 100;
            if (!systemReadOnly) integrityScore -= 25;
            if (!officialBuild) integrityScore -= 20;
            if (!"Enforcing".equals(seLinuxStatus)) integrityScore -= 20;
            if (systemModified) integrityScore -= 25;
            if (!isEncrypted) integrityScore -= 10;
            result.put("integrityScore", Math.max(0, integrityScore));
            
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error checking system integrity: " + e.getMessage());
            call.reject("Error checking system integrity: " + e.getMessage());
        }
    }

    private boolean isSystemReadOnly() {
        try {
            java.io.BufferedReader reader = new java.io.BufferedReader(
                new java.io.FileReader("/proc/mounts"));
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.contains("/system")) {
                    reader.close();
                    return line.contains("ro,") || line.contains(",ro ");
                }
            }
            reader.close();
        } catch (Exception e) {
            // Default to true if cannot read
        }
        return true;
    }

    private String getSeLinuxStatus() {
        try {
            // Try to read SELinux status from /sys/fs/selinux/enforce
            File enforceFile = new File("/sys/fs/selinux/enforce");
            if (enforceFile.exists()) {
                java.io.BufferedReader reader = new java.io.BufferedReader(
                    new java.io.FileReader(enforceFile));
                String status = reader.readLine();
                reader.close();
                return "1".equals(status) ? "Enforcing" : "Permissive";
            }
            
            // Fallback: use getenforce command
            Process process = Runtime.getRuntime().exec("getenforce");
            java.io.BufferedReader reader = new java.io.BufferedReader(
                new java.io.InputStreamReader(process.getInputStream()));
            String status = reader.readLine();
            reader.close();
            return status != null ? status : "Unknown";
        } catch (Exception e) {
            return "Unknown";
        }
    }

    private boolean checkSystemModifications() {
        // Check for common system modification indicators
        String[] modIndicators = {
            "/system/xposed.prop",
            "/system/framework/XposedBridge.jar",
            "/data/data/de.robv.android.xposed.installer",
            "/data/user/0/org.meowcat.edxposed.manager",
            "/data/adb/lspd"
        };
        
        for (String path : modIndicators) {
            if (new File(path).exists()) {
                return true;
            }
        }
        
        // Check for modified build.prop
        File buildProp = new File("/system/build.prop");
        if (!buildProp.canRead()) {
            return true; // Cannot read, might be modified
        }
        
        return false;
    }

    private boolean checkDeviceEncryption() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                // Check if device is encrypted
                String encryptionState = getSystemProperty("ro.crypto.state");
                return "encrypted".equals(encryptionState);
            }
        } catch (Exception e) {
            // Default to false if cannot determine
        }
        return false;
    }

    private Bitmap drawableToBitmap(Drawable drawable) {
        if (drawable instanceof BitmapDrawable) {
            return ((BitmapDrawable) drawable).getBitmap();
        }

        int width = drawable.getIntrinsicWidth();
        int height = drawable.getIntrinsicHeight();
        
        if (width <= 0 || height <= 0) {
            width = 48;
            height = 48;
        }

        Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        drawable.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
        drawable.draw(canvas);
        return bitmap;
    }

    @PluginMethod
    public void getTotalCacheSize(PluginCall call) {
        try {
            Context context = getContext();
            PackageManager pm = context.getPackageManager();
            long totalCacheBytes = 0;
            int appCount = 0;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                StorageStatsManager storageStatsManager = (StorageStatsManager) context.getSystemService(Context.STORAGE_STATS_SERVICE);
                
                if (storageStatsManager != null && hasUsageStatsPermission()) {
                    List<ApplicationInfo> apps = pm.getInstalledApplications(PackageManager.GET_META_DATA);
                    android.os.UserHandle userHandle = android.os.Process.myUserHandle();
                    UUID storageUuid = StorageManager.UUID_DEFAULT;

                    for (ApplicationInfo app : apps) {
                        try {
                            StorageStats stats = storageStatsManager.queryStatsForPackage(storageUuid, app.packageName, userHandle);
                            totalCacheBytes += stats.getCacheBytes();
                            appCount++;
                        } catch (Exception e) {
                            // Skip apps we can't query
                        }
                    }
                }
            }

            JSObject result = new JSObject();
            result.put("totalCacheBytes", totalCacheBytes);
            result.put("totalCacheMb", totalCacheBytes / (1024.0 * 1024.0));
            result.put("totalCacheGb", totalCacheBytes / (1024.0 * 1024.0 * 1024.0));
            result.put("appsScanned", appCount);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Error getting cache size: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openStorageSettings(PluginCall call) {
        try {
            Context context = getContext();
            Intent intent;
            
            // Try to open the storage manager (Free up space)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N_MR1) {
                intent = new Intent(StorageManager.ACTION_MANAGE_STORAGE);
            } else {
                // Fallback to internal storage settings
                intent = new Intent(Settings.ACTION_INTERNAL_STORAGE_SETTINGS);
            }
            
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            
            JSObject result = new JSObject();
            result.put("opened", true);
            call.resolve(result);
        } catch (Exception e) {
            // Fallback to device settings
            try {
                Intent fallbackIntent = new Intent(Settings.ACTION_SETTINGS);
                fallbackIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(fallbackIntent);
                
                JSObject result = new JSObject();
                result.put("opened", true);
                result.put("fallback", true);
                call.resolve(result);
            } catch (Exception e2) {
                call.reject("Error opening storage settings: " + e2.getMessage());
            }
        }
    }

    @PluginMethod
    public void clearAppCache(PluginCall call) {
        try {
            Context context = getContext();
            
            // Clear this app's own cache
            File cacheDir = context.getCacheDir();
            long freedBytes = deleteDir(cacheDir);
            
            // Also clear external cache if available
            File externalCacheDir = context.getExternalCacheDir();
            if (externalCacheDir != null) {
                freedBytes += deleteDir(externalCacheDir);
            }
            
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("freedBytes", freedBytes);
            result.put("freedMb", freedBytes / (1024.0 * 1024.0));
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Error clearing cache: " + e.getMessage());
        }
    }

    private long deleteDir(File dir) {
        long freedBytes = 0;
        if (dir != null && dir.isDirectory()) {
            String[] children = dir.list();
            if (children != null) {
                for (String child : children) {
                    File file = new File(dir, child);
                    if (file.isDirectory()) {
                        freedBytes += deleteDir(file);
                    } else {
                        long fileSize = file.length();
                        if (file.delete()) {
                            freedBytes += fileSize;
                        }
                    }
                }
            }
        }
        return freedBytes;
    }
}
