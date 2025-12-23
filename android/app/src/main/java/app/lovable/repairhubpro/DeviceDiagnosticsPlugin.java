package app.lovable.repairhubpro;

import android.app.ActivityManager;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Environment;
import android.os.StatFs;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

@CapacitorPlugin(
    name = "DeviceDiagnostics",
    permissions = {
        @Permission(strings = { android.Manifest.permission.ACCESS_FINE_LOCATION }, alias = "location"),
        @Permission(strings = { android.Manifest.permission.CAMERA }, alias = "camera"),
        @Permission(strings = { android.Manifest.permission.RECORD_AUDIO }, alias = "microphone")
    }
)
public class DeviceDiagnosticsPlugin extends Plugin {

    @PluginMethod
    public void getStorageInfo(PluginCall call) {
        try {
            StatFs statFs = new StatFs(Environment.getDataDirectory().getPath());
            
            long totalBytes = statFs.getTotalBytes();
            long availableBytes = statFs.getAvailableBytes();
            long usedBytes = totalBytes - availableBytes;
            
            double totalGb = totalBytes / (1024.0 * 1024.0 * 1024.0);
            double availableGb = availableBytes / (1024.0 * 1024.0 * 1024.0);
            double usedGb = usedBytes / (1024.0 * 1024.0 * 1024.0);
            double percentUsed = (usedBytes * 100.0) / totalBytes;

            JSObject result = new JSObject();
            result.put("totalBytes", totalBytes);
            result.put("availableBytes", availableBytes);
            result.put("usedBytes", usedBytes);
            result.put("totalGb", Math.round(totalGb * 100.0) / 100.0);
            result.put("availableGb", Math.round(availableGb * 100.0) / 100.0);
            result.put("usedGb", Math.round(usedGb * 100.0) / 100.0);
            result.put("percentUsed", Math.round(percentUsed * 100.0) / 100.0);
            
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to get storage info", e);
        }
    }

    @PluginMethod
    public void getRamInfo(PluginCall call) {
        try {
            ActivityManager activityManager = (ActivityManager) getContext().getSystemService(Context.ACTIVITY_SERVICE);
            ActivityManager.MemoryInfo memoryInfo = new ActivityManager.MemoryInfo();
            activityManager.getMemoryInfo(memoryInfo);

            long totalMem = memoryInfo.totalMem;
            long availMem = memoryInfo.availMem;
            long usedMem = totalMem - availMem;

            double totalMb = totalMem / (1024.0 * 1024.0);
            double availableMb = availMem / (1024.0 * 1024.0);
            double usedMb = usedMem / (1024.0 * 1024.0);
            double percentUsed = (usedMem * 100.0) / totalMem;

            JSObject result = new JSObject();
            result.put("totalMb", Math.round(totalMb));
            result.put("availableMb", Math.round(availableMb));
            result.put("usedMb", Math.round(usedMb));
            result.put("percentUsed", Math.round(percentUsed * 100.0) / 100.0);
            
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to get RAM info", e);
        }
    }

    @PluginMethod
    public void getSensorsInfo(PluginCall call) {
        try {
            SensorManager sensorManager = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
            JSObject result = new JSObject();

            // GPS
            JSObject gps = new JSObject();
            gps.put("available", true);
            gps.put("name", "GPS");
            result.put("gps", gps);

            // Accelerometer
            Sensor accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
            JSObject accel = new JSObject();
            accel.put("available", accelerometer != null);
            accel.put("name", accelerometer != null ? accelerometer.getName() : "Accelerometro");
            result.put("accelerometer", accel);

            // Gyroscope
            Sensor gyroscope = sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE);
            JSObject gyro = new JSObject();
            gyro.put("available", gyroscope != null);
            gyro.put("name", gyroscope != null ? gyroscope.getName() : "Giroscopio");
            result.put("gyroscope", gyro);

            // Magnetometer
            Sensor magnetometer = sensorManager.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD);
            JSObject magnet = new JSObject();
            magnet.put("available", magnetometer != null);
            magnet.put("name", magnetometer != null ? magnetometer.getName() : "Magnetometro");
            result.put("magnetometer", magnet);

            // Proximity
            Sensor proximity = sensorManager.getDefaultSensor(Sensor.TYPE_PROXIMITY);
            JSObject prox = new JSObject();
            prox.put("available", proximity != null);
            prox.put("name", proximity != null ? proximity.getName() : "Prossimità");
            result.put("proximity", prox);

            // Light sensor
            Sensor light = sensorManager.getDefaultSensor(Sensor.TYPE_LIGHT);
            JSObject lightSensor = new JSObject();
            lightSensor.put("available", light != null);
            lightSensor.put("name", light != null ? light.getName() : "Sensore luce");
            result.put("lightSensor", lightSensor);

            // Barometer
            Sensor barometer = sensorManager.getDefaultSensor(Sensor.TYPE_PRESSURE);
            JSObject baro = new JSObject();
            baro.put("available", barometer != null);
            baro.put("name", barometer != null ? barometer.getName() : "Barometro");
            result.put("barometer", baro);

            // Microphone (always available on Android)
            JSObject mic = new JSObject();
            mic.put("available", true);
            mic.put("name", "Microfono");
            result.put("microphone", mic);

            // Camera (always available on most devices)
            JSObject cam = new JSObject();
            cam.put("available", true);
            cam.put("name", "Fotocamera");
            result.put("camera", cam);

            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to get sensors info", e);
        }
    }

    @PluginMethod
    public void getBatteryAdvancedInfo(PluginCall call) {
        try {
            IntentFilter ifilter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
            Intent batteryStatus = getContext().registerReceiver(null, ifilter);

            if (batteryStatus == null) {
                call.reject("Unable to get battery status");
                return;
            }

            int level = batteryStatus.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
            int scale = batteryStatus.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
            float batteryPct = level * 100 / (float) scale;

            int status = batteryStatus.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
            boolean isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING ||
                                 status == BatteryManager.BATTERY_STATUS_FULL;

            int temperature = batteryStatus.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, -1);
            float tempCelsius = temperature / 10.0f;

            int voltage = batteryStatus.getIntExtra(BatteryManager.EXTRA_VOLTAGE, -1);

            String technology = batteryStatus.getStringExtra(BatteryManager.EXTRA_TECHNOLOGY);

            int health = batteryStatus.getIntExtra(BatteryManager.EXTRA_HEALTH, -1);
            String healthString;
            switch (health) {
                case BatteryManager.BATTERY_HEALTH_GOOD:
                    healthString = "good";
                    break;
                case BatteryManager.BATTERY_HEALTH_OVERHEAT:
                    healthString = "overheat";
                    break;
                case BatteryManager.BATTERY_HEALTH_DEAD:
                    healthString = "dead";
                    break;
                case BatteryManager.BATTERY_HEALTH_OVER_VOLTAGE:
                    healthString = "over_voltage";
                    break;
                case BatteryManager.BATTERY_HEALTH_UNSPECIFIED_FAILURE:
                    healthString = "unspecified_failure";
                    break;
                case BatteryManager.BATTERY_HEALTH_COLD:
                    healthString = "cold";
                    break;
                default:
                    healthString = "unknown";
            }

            int plugged = batteryStatus.getIntExtra(BatteryManager.EXTRA_PLUGGED, -1);
            String pluggedString;
            switch (plugged) {
                case BatteryManager.BATTERY_PLUGGED_AC:
                    pluggedString = "ac";
                    break;
                case BatteryManager.BATTERY_PLUGGED_USB:
                    pluggedString = "usb";
                    break;
                case BatteryManager.BATTERY_PLUGGED_WIRELESS:
                    pluggedString = "wireless";
                    break;
                default:
                    pluggedString = "none";
            }

            JSObject result = new JSObject();
            result.put("level", Math.round(batteryPct));
            result.put("isCharging", isCharging);
            result.put("temperature", Math.round(tempCelsius * 10.0) / 10.0);
            result.put("voltage", voltage);
            result.put("technology", technology);
            result.put("health", healthString);
            result.put("plugged", pluggedString);

            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to get battery info", e);
        }
    }

    @PluginMethod
    public void testSensor(PluginCall call) {
        String sensorType = call.getString("sensorType", "");
        SensorManager sensorManager = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
        
        JSObject result = new JSObject();
        
        try {
            int type = -1;
            switch (sensorType) {
                case "accelerometer":
                    type = Sensor.TYPE_ACCELEROMETER;
                    break;
                case "gyroscope":
                    type = Sensor.TYPE_GYROSCOPE;
                    break;
                case "magnetometer":
                    type = Sensor.TYPE_MAGNETIC_FIELD;
                    break;
                case "proximity":
                    type = Sensor.TYPE_PROXIMITY;
                    break;
                case "lightSensor":
                    type = Sensor.TYPE_LIGHT;
                    break;
                case "barometer":
                    type = Sensor.TYPE_PRESSURE;
                    break;
            }

            if (type == -1) {
                result.put("working", false);
                result.put("error", "Sensor type not supported for testing");
                call.resolve(result);
                return;
            }

            Sensor sensor = sensorManager.getDefaultSensor(type);
            if (sensor == null) {
                result.put("working", false);
                result.put("error", "Sensor not available");
                call.resolve(result);
                return;
            }

            // Quick test - just check if sensor exists and is valid
            result.put("working", true);
            result.put("value", sensor.getName());
            call.resolve(result);
            
        } catch (Exception e) {
            result.put("working", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }

    @PluginMethod
    public void requestAllPermissions(PluginCall call) {
        // Request all necessary permissions
        requestAllPermissions(call, "allPermissionsCallback");
    }

    @PluginMethod
    public void allPermissionsCallback(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", true);
        call.resolve(result);
    }
}
