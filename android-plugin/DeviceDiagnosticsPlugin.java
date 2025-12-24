package app.lovable.repairhubpro;

import android.app.ActivityManager;
import android.app.usage.StorageStats;
import android.app.usage.StorageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
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
import android.provider.Settings;
import android.util.Base64;

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
import java.util.List;
import java.util.UUID;

@CapacitorPlugin(name = "DeviceDiagnostics")
public class DeviceDiagnosticsPlugin extends Plugin {

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

    @PluginMethod
    public void requestUsageStatsPermission(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            
            JSObject result = new JSObject();
            result.put("granted", false); // User needs to grant manually
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Error requesting permission: " + e.getMessage());
        }
    }

    @PluginMethod
    public void testSensor(PluginCall call) {
        String sensorType = call.getString("sensorType", "");
        JSObject result = new JSObject();
        
        try {
            SensorManager sensorManager = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
            boolean working = false;
            
            switch (sensorType.toLowerCase()) {
                case "accelerometer":
                    working = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) != null;
                    break;
                case "gyroscope":
                    working = sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE) != null;
                    break;
                case "magnetometer":
                    working = sensorManager.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD) != null;
                    break;
                case "proximity":
                    working = sensorManager.getDefaultSensor(Sensor.TYPE_PROXIMITY) != null;
                    break;
                case "light":
                    working = sensorManager.getDefaultSensor(Sensor.TYPE_LIGHT) != null;
                    break;
                case "barometer":
                    working = sensorManager.getDefaultSensor(Sensor.TYPE_PRESSURE) != null;
                    break;
                case "gps":
                    working = getContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_LOCATION_GPS);
                    break;
                case "microphone":
                    working = getContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_MICROPHONE);
                    break;
                case "camera":
                    working = getContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_CAMERA_ANY);
                    break;
            }
            
            result.put("working", working);
            call.resolve(result);
        } catch (Exception e) {
            result.put("working", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
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
}
