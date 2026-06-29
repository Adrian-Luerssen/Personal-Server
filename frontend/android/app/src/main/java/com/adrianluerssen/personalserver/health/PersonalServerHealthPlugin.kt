package com.adrianluerssen.personalserver.health

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import androidx.activity.result.ActivityResult
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@CapacitorPlugin(name = "PersonalServerHealth")
class PersonalServerHealthPlugin : Plugin() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val mainHandler = Handler(Looper.getMainLooper())
    private val requiredPermissions = setOf(
        HealthPermission.getReadPermission(StepsRecord::class)
    )

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
                resolveOnMain(call, response)
            } catch (exception: Exception) {
                rejectOnMain(call, "Failed to read Health Connect status", exception)
            }
        }
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
        scope.cancel()
        super.handleOnDestroy()
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

    private fun resolveOnMain(call: PluginCall, response: JSObject) {
        mainHandler.post { call.resolve(response) }
    }

    private fun rejectOnMain(call: PluginCall, message: String, exception: Exception? = null) {
        mainHandler.post {
            if (exception == null) call.reject(message) else call.reject(message, exception)
        }
    }
}
