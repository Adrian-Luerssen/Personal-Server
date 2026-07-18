package com.adrianluerssen.personalserver.health

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import androidx.activity.result.ActivityResult
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.PermissionState
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.concurrent.TimeUnit
import kotlin.math.max
import kotlin.math.roundToLong

@CapacitorPlugin(
    name = "PersonalServerHealth",
    permissions = [
        Permission(alias = "activityRecognition", strings = [Manifest.permission.ACTIVITY_RECOGNITION])
    ]
)
class PersonalServerHealthPlugin : Plugin(), SensorEventListener {
    private val stepSyncWorkName = "personal-server-background-step-sync"
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val mainHandler = Handler(Looper.getMainLooper())
    private val requiredPermissions = setOf(
        HealthPermission.getReadPermission(StepsRecord::class)
    )
    private var liveStepStreamActive = false
    private var liveBaselineSteps = 0L
    private var liveBaselineSensorValue: Float? = null
    private var liveStreamDate = LocalDate.now()

    @PluginMethod
    fun getStatus(call: PluginCall) {
        scope.launch {
            try {
                val status = HealthConnectClient.getSdkStatus(context)
                val response = JSObject()
                response.put("status", statusToString(status))
                if (status == HealthConnectClient.SDK_AVAILABLE) {
                    val client = HealthConnectClient.getOrCreate(context)
                    val granted = client.permissionController.getGrantedPermissions()
                    response.put("permissionsGranted", granted.containsAll(requiredPermissions))
                } else {
                    response.put("permissionsGranted", false)
                }
                response.put("liveStepSensorAvailable", getStepCounterSensor() != null)
                response.put("activityRecognitionGranted", hasActivityRecognitionPermission())
                resolveOnMain(call, response)
            } catch (exception: Exception) {
                rejectOnMain(call, "Failed to read Health Connect status", exception)
            }
        }
    }

    @PluginMethod
    fun startStepStream(call: PluginCall) {
        if (!hasActivityRecognitionPermission()) {
            requestPermissionForAlias("activityRecognition", call, "activityRecognitionPermissionResult")
            return
        }

        val sensor = getStepCounterSensor()
        if (sensor == null) {
            val response = JSObject()
            response.put("started", false)
            response.put("sensorAvailable", false)
            call.resolve(response)
            return
        }

        liveBaselineSteps = max(0L, call.getLong("baselineSteps", 0L) ?: 0L)
        liveBaselineSensorValue = null
        liveStreamDate = parseDate(call.getString("date"), LocalDate.now())
        val started = getSensorManager().registerListener(this, sensor, SensorManager.SENSOR_DELAY_UI)
        liveStepStreamActive = started

        val response = JSObject()
        response.put("started", started)
        response.put("sensorAvailable", true)
        response.put("activityRecognitionGranted", true)
        response.put("baselineSteps", liveBaselineSteps)
        response.put("date", liveStreamDate.format(DateTimeFormatter.ISO_DATE))
        call.resolve(response)
    }

    @PluginMethod
    fun stopStepStream(call: PluginCall) {
        stopLiveStepStream()
        val response = JSObject()
        response.put("stopped", true)
        call.resolve(response)
    }

    @PluginMethod
    fun configureStepSync(call: PluginCall) {
        val input = JSObject()
        input.put("enabled", call.getBoolean("enabled", false) ?: false)
        input.put("intervalMinutes", call.getLong("intervalMinutes", StepSyncStore.MIN_INTERVAL_MINUTES) ?: StepSyncStore.MIN_INTERVAL_MINUTES)
        input.put("days", call.getInt("days", 7) ?: 7)
        input.put("apiBaseUrl", call.getString("apiBaseUrl", ""))
        input.put("accessToken", call.getString("accessToken", ""))
        input.put("refreshToken", call.getString("refreshToken", ""))
        val config = StepSyncStore.save(context, input)
        if (config.enabled) {
            scheduleStepSync(config)
        } else {
            WorkManager.getInstance(context).cancelUniqueWork(stepSyncWorkName)
        }
        call.resolve(stepSyncStatus(config))
    }

    @PluginMethod
    fun getStepSyncStatus(call: PluginCall) {
        call.resolve(stepSyncStatus(StepSyncStore.read(context)))
    }

    @PluginMethod
    fun clearStepSyncCredentials(call: PluginCall) {
        StepSyncStore.clearCredentials(context)
        WorkManager.getInstance(context).cancelUniqueWork(stepSyncWorkName)
        call.resolve(stepSyncStatus(StepSyncStore.read(context)))
    }

    @PermissionCallback
    private fun activityRecognitionPermissionResult(call: PluginCall) {
        if (hasActivityRecognitionPermission()) {
            startStepStream(call)
            return
        }

        val response = JSObject()
        response.put("started", false)
        response.put("needsPermission", true)
        response.put("activityRecognitionGranted", false)
        call.resolve(response)
    }

    @PluginMethod
    fun requestStepPermissions(call: PluginCall) {
        val status = HealthConnectClient.getSdkStatus(context)
        if (status != HealthConnectClient.SDK_AVAILABLE) {
            val response = JSObject()
            response.put("granted", false)
            response.put("status", statusToString(status))
            call.resolve(response)
            return
        }
        startActivityForResult(call, Intent(context, HealthConnectPermissionActivity::class.java), "permissionResult")
    }

    @ActivityCallback
    private fun permissionResult(call: PluginCall, result: ActivityResult) {
        val data = result.data
        val response = JSObject()
        response.put("granted", result.resultCode == Activity.RESULT_OK && data?.getBooleanExtra("granted", false) == true)
        response.put("grantedCount", data?.getIntExtra("grantedCount", 0) ?: 0)
        call.resolve(response)
    }

    @PluginMethod
    fun openSettings(call: PluginCall) {
        try {
            val intent = Intent("androidx.health.ACTION_HEALTH_CONNECT_SETTINGS")
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            if (intent.resolveActivity(context.packageManager) != null) {
                context.startActivity(intent)
            } else {
                val packageIntent = Intent(
                    Intent.ACTION_VIEW,
                    Uri.parse("market://details?id=com.google.android.apps.healthdata")
                )
                packageIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(packageIntent)
            }
            call.resolve()
        } catch (exception: Exception) {
            call.reject("Failed to open Health Connect settings", exception)
        }
    }

    @PluginMethod
    fun readDailySteps(call: PluginCall) {
        scope.launch {
            try {
                val status = HealthConnectClient.getSdkStatus(context)
                if (status != HealthConnectClient.SDK_AVAILABLE) {
                    rejectOnMain(call, "Health Connect is not available")
                    return@launch
                }

                val client = HealthConnectClient.getOrCreate(context)
                val granted = client.permissionController.getGrantedPermissions()
                if (!granted.containsAll(requiredPermissions)) {
                    rejectOnMain(call, "Health Connect step permission is not granted")
                    return@launch
                }

                val today = LocalDate.now()
                val from = parseDate(call.getString("from"), today.minusDays(29))
                val to = parseDate(call.getString("to"), today)
                if (to.isBefore(from)) {
                    rejectOnMain(call, "to must be on or after from")
                    return@launch
                }

                val zone = ZoneId.systemDefault()
                val records = JSArray()
                var cursor = from
                while (!cursor.isAfter(to)) {
                    val start = cursor.atStartOfDay(zone).toInstant()
                    val end = cursor.plusDays(1).atStartOfDay(zone).toInstant()
                    val aggregate = client.aggregate(
                        AggregateRequest(
                            metrics = setOf(StepsRecord.COUNT_TOTAL),
                            timeRangeFilter = TimeRangeFilter.between(start, end)
                        )
                    )
                    val steps = aggregate[StepsRecord.COUNT_TOTAL] ?: 0L
                    val item = JSONObject()
                    item.put("date", cursor.format(DateTimeFormatter.ISO_DATE))
                    item.put("source", "health-connect")
                    item.put("steps", steps)
                    item.put("syncedAt", java.time.Instant.now().toString())
                    records.put(item)
                    cursor = cursor.plusDays(1)
                }

                val response = JSObject()
                response.put("records", records)
                resolveOnMain(call, response)
            } catch (exception: Exception) {
                rejectOnMain(call, "Failed to read Health Connect steps", exception)
            }
        }
    }

    override fun handleOnDestroy() {
        stopLiveStepStream()
        scope.cancel()
        super.handleOnDestroy()
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (!liveStepStreamActive || event?.sensor?.type != Sensor.TYPE_STEP_COUNTER) return
        val sensorValue = event.values.firstOrNull() ?: return
        val today = LocalDate.now()
        if (today != liveStreamDate) {
            liveStreamDate = today
            liveBaselineSteps = 0L
            liveBaselineSensorValue = sensorValue
        }
        val baselineSensor = liveBaselineSensorValue ?: sensorValue.also {
            liveBaselineSensorValue = it
        }
        val delta = max(0L, (sensorValue - baselineSensor).roundToLong())
        val steps = liveBaselineSteps + delta

        val payload = JSObject()
        payload.put("date", liveStreamDate.format(DateTimeFormatter.ISO_DATE))
        payload.put("source", "android-step-counter-live")
        payload.put("steps", steps)
        payload.put("delta", delta)
        payload.put("baselineSteps", liveBaselineSteps)
        payload.put("sensorSteps", sensorValue.roundToLong())
        payload.put("syncedAt", java.time.Instant.now().toString())
        notifyListeners("stepCountChange", payload, true)
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        // Step counter accuracy changes do not require UI handling.
    }

    private fun parseDate(value: String?, fallback: LocalDate): LocalDate {
        if (value.isNullOrBlank()) return fallback
        return LocalDate.parse(value.take(10), DateTimeFormatter.ISO_DATE)
    }

    private fun statusToString(status: Int): String {
        return when (status) {
            HealthConnectClient.SDK_AVAILABLE -> "available"
            HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> "update_required"
            else -> "unavailable"
        }
    }

    private fun getSensorManager(): SensorManager {
        return context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    }

    private fun getStepCounterSensor(): Sensor? {
        return getSensorManager().getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
    }

    private fun hasActivityRecognitionPermission(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return true
        return getPermissionState("activityRecognition") == PermissionState.GRANTED
    }

    private fun stopLiveStepStream() {
        if (liveStepStreamActive) {
            getSensorManager().unregisterListener(this)
        }
        liveStepStreamActive = false
        liveBaselineSensorValue = null
    }

    private fun scheduleStepSync(config: StepSyncStore.Config) {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
        val periodicRequest = PeriodicWorkRequestBuilder<StepBackgroundSyncWorker>(
            config.intervalMinutes,
            TimeUnit.MINUTES,
        )
            .setConstraints(constraints)
            .addTag(stepSyncWorkName)
            .build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            stepSyncWorkName,
            ExistingPeriodicWorkPolicy.UPDATE,
            periodicRequest,
        )

        val immediateRequest = OneTimeWorkRequestBuilder<StepBackgroundSyncWorker>()
            .setConstraints(constraints)
            .addTag("$stepSyncWorkName-now")
            .build()
        WorkManager.getInstance(context).enqueueUniqueWork(
            "$stepSyncWorkName-now",
            ExistingWorkPolicy.REPLACE,
            immediateRequest,
        )
    }

    private fun stepSyncStatus(config: StepSyncStore.Config): JSObject {
        val response = JSObject()
        response.put("supported", true)
        response.put("enabled", config.enabled)
        response.put("scheduled", config.enabled)
        response.put("intervalMinutes", config.intervalMinutes)
        response.put("days", config.days)
        response.put("hasApiBaseUrl", config.apiBaseUrl.isNotBlank())
        response.put("hasAccessToken", config.accessToken.isNotBlank())
        response.put("hasRefreshToken", config.refreshToken.isNotBlank())
        response.put("lastSyncAt", config.lastSyncAt)
        response.put("lastImported", config.lastImported)
        response.put("lastError", config.lastError)
        response.put("liveStepSensorAvailable", getStepCounterSensor() != null)
        response.put("activityRecognitionGranted", hasActivityRecognitionPermission())
        return response
    }

    private fun resolveOnMain(call: PluginCall, response: JSObject) {
        mainHandler.post { call.resolve(response) }
    }

    private fun rejectOnMain(call: PluginCall, message: String, exception: Exception? = null) {
        mainHandler.post {
            if (exception == null) call.reject(message) else call.reject(message, exception)
        }
    }
}
