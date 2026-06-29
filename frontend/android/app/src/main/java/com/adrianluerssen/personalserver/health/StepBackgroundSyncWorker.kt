package com.adrianluerssen.personalserver.health

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

class StepBackgroundSyncWorker(
    appContext: Context,
    workerParams: WorkerParameters,
) : CoroutineWorker(appContext, workerParams) {
    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val config = StepSyncStore.read(applicationContext)
        if (!config.enabled) return@withContext Result.success()
        if (config.apiBaseUrl.isBlank()) {
            StepSyncStore.recordError(applicationContext, "Missing API base URL.")
            return@withContext Result.success()
        }
        if (config.accessToken.isBlank() && config.refreshToken.isBlank()) {
            StepSyncStore.recordError(applicationContext, "Missing native auth token.")
            return@withContext Result.success()
        }

        try {
            val metrics = readDailyStepMetrics(config.days)
            if (metrics.length() == 0) {
                StepSyncStore.recordSuccess(applicationContext, 0, Instant.now().toString())
                return@withContext Result.success()
            }

            var accessToken = config.accessToken
            var response = postJson(
                config.apiBaseUrl,
                "/activity/daily/sync",
                JSONObject().put("metrics", metrics).toString(),
                accessToken,
            )

            if (response.status == HttpURLConnection.HTTP_UNAUTHORIZED && config.refreshToken.isNotBlank()) {
                val refreshed = refreshAccessToken(config)
                if (refreshed != null) {
                    accessToken = refreshed.accessToken
                    StepSyncStore.saveTokens(applicationContext, refreshed.accessToken, refreshed.refreshToken)
                    response = postJson(
                        config.apiBaseUrl,
                        "/activity/daily/sync",
                        JSONObject().put("metrics", metrics).toString(),
                        accessToken,
                    )
                }
            }

            if (response.status in 200..299) {
                val imported = JSONObject(response.body.ifBlank { "{}" }).optInt("imported", metrics.length())
                StepSyncStore.recordSuccess(applicationContext, imported, Instant.now().toString())
                Result.success()
            } else if (response.status >= 500 || response.status == 429) {
                StepSyncStore.recordError(applicationContext, "API sync failed with ${response.status}.")
                Result.retry()
            } else {
                StepSyncStore.recordError(applicationContext, "API sync failed with ${response.status}.")
                Result.success()
            }
        } catch (exception: SecurityException) {
            StepSyncStore.recordError(applicationContext, exception.message ?: "Health Connect permission is missing.")
            Result.success()
        } catch (exception: IOException) {
            StepSyncStore.recordError(applicationContext, exception.message ?: "Network error during background step sync.")
            Result.retry()
        } catch (exception: Exception) {
            StepSyncStore.recordError(applicationContext, exception.message ?: "Background step sync failed.")
            Result.success()
        }
    }

    private suspend fun readDailyStepMetrics(days: Int): JSONArray {
        val status = HealthConnectClient.getSdkStatus(applicationContext)
        if (status != HealthConnectClient.SDK_AVAILABLE) {
            throw SecurityException("Health Connect is unavailable.")
        }

        val client = HealthConnectClient.getOrCreate(applicationContext)
        val requiredPermission = HealthPermission.getReadPermission(StepsRecord::class)
        val granted = client.permissionController.getGrantedPermissions()
        if (!granted.contains(requiredPermission)) {
            throw SecurityException("Health Connect step permission is not granted.")
        }

        val today = LocalDate.now()
        var cursor = today.minusDays((days - 1).coerceAtLeast(0).toLong())
        val zone = ZoneId.systemDefault()
        val records = JSONArray()
        while (!cursor.isAfter(today)) {
            val start = cursor.atStartOfDay(zone).toInstant()
            val end = cursor.plusDays(1).atStartOfDay(zone).toInstant()
            val aggregate = client.aggregate(
                AggregateRequest(
                    metrics = setOf(StepsRecord.COUNT_TOTAL),
                    timeRangeFilter = TimeRangeFilter.between(start, end),
                ),
            )
            val steps = aggregate[StepsRecord.COUNT_TOTAL] ?: 0L
            records.put(
                JSONObject()
                    .put("date", cursor.format(DateTimeFormatter.ISO_DATE))
                    .put("source", "health-connect-background")
                    .put("steps", steps)
                    .put("syncedAt", Instant.now().toString()),
            )
            cursor = cursor.plusDays(1)
        }
        return records
    }

    private fun refreshAccessToken(config: StepSyncStore.Config): RefreshedTokens? {
        val response = postJson(
            config.apiBaseUrl,
            "/auth/refresh",
            JSONObject().put("refreshToken", config.refreshToken).toString(),
            null,
        )
        if (response.status !in 200..299) return null
        val json = JSONObject(response.body)
        val accessToken = json.optString("accessToken", "")
        if (accessToken.isBlank()) return null
        val refreshToken = json.optString("refreshToken", config.refreshToken)
        return RefreshedTokens(accessToken, refreshToken)
    }

    private fun postJson(apiBaseUrl: String, path: String, body: String, accessToken: String?): HttpResult {
        val url = URL(apiBaseUrl.trimEnd('/') + path)
        val connection = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 15_000
            readTimeout = 25_000
            doOutput = true
            setRequestProperty("Accept", "application/json")
            setRequestProperty("Content-Type", "application/json")
            if (!accessToken.isNullOrBlank()) {
                setRequestProperty("Authorization", "Bearer $accessToken")
            }
        }

        connection.outputStream.use { stream ->
            stream.write(body.toByteArray(Charsets.UTF_8))
        }

        val status = connection.responseCode
        val input = if (status in 200..299) connection.inputStream else connection.errorStream
        val responseBody = input?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
        connection.disconnect()
        return HttpResult(status, responseBody)
    }

    private data class HttpResult(val status: Int, val body: String)
    private data class RefreshedTokens(val accessToken: String, val refreshToken: String)
}
