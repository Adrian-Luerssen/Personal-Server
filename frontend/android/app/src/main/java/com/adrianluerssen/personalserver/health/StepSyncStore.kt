package com.adrianluerssen.personalserver.health

import android.content.Context
import com.getcapacitor.JSObject
import kotlin.math.max
import kotlin.math.min

object StepSyncStore {
    private const val PREFS_NAME = "personal_server_step_sync"
    private const val KEY_ENABLED = "enabled"
    private const val KEY_INTERVAL_MINUTES = "interval_minutes"
    private const val KEY_DAYS = "days"
    private const val KEY_API_BASE_URL = "api_base_url"
    private const val KEY_ACCESS_TOKEN = "access_token"
    private const val KEY_REFRESH_TOKEN = "refresh_token"
    private const val KEY_LAST_SYNC_AT = "last_sync_at"
    private const val KEY_LAST_IMPORTED = "last_imported"
    private const val KEY_LAST_ERROR = "last_error"
    const val MIN_INTERVAL_MINUTES = 15L
    const val MAX_DAYS = 30

    data class Config(
        val enabled: Boolean,
        val intervalMinutes: Long,
        val days: Int,
        val apiBaseUrl: String,
        val accessToken: String,
        val refreshToken: String,
        val lastSyncAt: String?,
        val lastImported: Int,
        val lastError: String?,
    )

    fun read(context: Context): Config {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return Config(
            enabled = prefs.getBoolean(KEY_ENABLED, false),
            intervalMinutes = max(MIN_INTERVAL_MINUTES, prefs.getLong(KEY_INTERVAL_MINUTES, MIN_INTERVAL_MINUTES)),
            days = max(1, min(MAX_DAYS, prefs.getInt(KEY_DAYS, 7))),
            apiBaseUrl = prefs.getString(KEY_API_BASE_URL, "") ?: "",
            accessToken = prefs.getString(KEY_ACCESS_TOKEN, "") ?: "",
            refreshToken = prefs.getString(KEY_REFRESH_TOKEN, "") ?: "",
            lastSyncAt = prefs.getString(KEY_LAST_SYNC_AT, null),
            lastImported = prefs.getInt(KEY_LAST_IMPORTED, 0),
            lastError = prefs.getString(KEY_LAST_ERROR, null),
        )
    }

    fun save(context: Context, input: JSObject): Config {
        val enabled = input.optBoolean("enabled", false)
        val interval = max(MIN_INTERVAL_MINUTES, input.optLong("intervalMinutes", MIN_INTERVAL_MINUTES))
        val days = max(1, min(MAX_DAYS, input.optInt("days", 7)))
        val apiBaseUrl = input.optString("apiBaseUrl", "").trim().trimEnd('/')
        val accessToken = input.optString("accessToken", "")
        val refreshToken = input.optString("refreshToken", "")

        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(KEY_ENABLED, enabled)
            .putLong(KEY_INTERVAL_MINUTES, interval)
            .putInt(KEY_DAYS, days)
            .putString(KEY_API_BASE_URL, apiBaseUrl)
            .putString(KEY_ACCESS_TOKEN, accessToken)
            .putString(KEY_REFRESH_TOKEN, refreshToken)
            .apply()

        return read(context)
    }

    fun saveTokens(context: Context, accessToken: String, refreshToken: String?) {
        val editor = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_ACCESS_TOKEN, accessToken)
        if (!refreshToken.isNullOrBlank()) {
            editor.putString(KEY_REFRESH_TOKEN, refreshToken)
        }
        editor.apply()
    }

    fun clearCredentials(context: Context) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(KEY_ENABLED, false)
            .remove(KEY_ACCESS_TOKEN)
            .remove(KEY_REFRESH_TOKEN)
            .apply()
    }

    fun recordSuccess(context: Context, imported: Int, syncedAt: String) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_LAST_SYNC_AT, syncedAt)
            .putInt(KEY_LAST_IMPORTED, imported)
            .remove(KEY_LAST_ERROR)
            .apply()
    }

    fun recordError(context: Context, message: String) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_LAST_ERROR, message.take(240))
            .apply()
    }
}
