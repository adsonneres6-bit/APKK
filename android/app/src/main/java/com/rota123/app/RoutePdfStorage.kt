package com.rota123.app

import android.content.ContentValues
import android.content.Context
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Log
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Permanent storage for route PDFs received from the virtual printer.
 * On Android 10+ the copy goes to the public Downloads folder via MediaStore.
 * On older versions it falls back to the legacy public Downloads dir when
 * writable, otherwise to the app's private files dir. Independent of
 * PendingPdfQueue: entries survive restarts and queue removals.
 * One unique file per completed print job, named Rota_DD-MM.pdf, Rota2_DD-MM.pdf, ...
 */
object RoutePdfStorage {

    private const val TAG = "RoutePdfStorage"
    private const val BASE_NAME = "Rota"
    private const val MIME_TYPE = "application/pdf"
    private const val NAME_REGEX = "Rota(\\d*)_(\\d{2}-\\d{2})\\.pdf"

    /**
     * Saves a permanent copy of the PDF bytes. Returns the display name of the
     * stored file, or null on failure (callers must log and continue normal
     * processing).
     */
    fun save(context: Context, bytes: ByteArray, now: Date = Date()): String? {
        return try {
            val dayMonth = SimpleDateFormat("dd-MM", Locale.US).format(now)
            val name = nextAvailableName(context, dayMonth)

            val saved = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                saveViaMediaStore(context, bytes, name)
            } else {
                saveLegacy(context, bytes, name)
            }

            if (saved == null) {
                Log.e(TAG, "Falha ao salvar PDF permanente ($name)")
            }
            saved
        } catch (e: Exception) {
            Log.e(TAG, "Falha ao salvar PDF permanente", e)
            null
        }
    }

    private fun saveViaMediaStore(context: Context, bytes: ByteArray, name: String): String? {
        val values = ContentValues().apply {
            put(MediaStore.MediaColumns.DISPLAY_NAME, name)
            put(MediaStore.MediaColumns.MIME_TYPE, MIME_TYPE)
            put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
            put(MediaStore.MediaColumns.IS_PENDING, 1)
        }

        val resolver = context.contentResolver
        val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values) ?: return null

        return try {
            resolver.openOutputStream(uri)?.use { it.write(bytes) } ?: return null
            values.clear()
            values.put(MediaStore.MediaColumns.IS_PENDING, 0)
            resolver.update(uri, values, null, null)
            name
        } catch (e: Exception) {
            Log.e(TAG, "Falha ao gravar em Downloads", e)
            runCatching { resolver.delete(uri, null, null) }
            // Keep a local copy even if the public one fails.
            savePrivate(context, bytes, name)
        }
    }

    private fun saveLegacy(context: Context, bytes: ByteArray, name: String): String? {
        val publicDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
        val target = File(publicDir, name)

        val ok = try {
            publicDir.mkdirs()
            FileOutputStream(target).use { it.write(bytes) }
            MediaScannerConnection.scanFile(context, arrayOf(target.absolutePath), arrayOf(MIME_TYPE), null)
            true
        } catch (e: Exception) {
            Log.w(TAG, "Sem acesso à pasta pública de Downloads", e)
            false
        }

        if (ok) return name
        return savePrivate(context, bytes, name)
    }

    private fun savePrivate(context: Context, bytes: ByteArray, name: String): String? {
        return try {
            val dir = File(context.filesDir, "route_pdfs").apply { mkdirs() }
            FileOutputStream(File(dir, name)).use { it.write(bytes) }
            name
        } catch (e: Exception) {
            Log.e(TAG, "Falha ao gravar cópia privada", e)
            null
        }
    }

    private fun nextAvailableName(context: Context, dayMonth: String): String {
        synchronized(this) {
            val used = existingSuffixes(context)

            var n = 2
            while (used.contains(n.toString())) n++
            val prefix = if (used.isEmpty()) BASE_NAME else "${BASE_NAME}$n"
            return "${prefix}_${dayMonth}.pdf"
        }
    }

    private fun existingSuffixes(context: Context): Set<String> {
        val used = mutableSetOf<String>()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val projection = arrayOf(MediaStore.MediaColumns.DISPLAY_NAME)
            val selection = "${MediaStore.MediaColumns.RELATIVE_PATH}=?"
            val args = arrayOf("${Environment.DIRECTORY_DOWNLOADS}/")
            runCatching {
                context.contentResolver.query(
                    MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                    projection,
                    selection,
                    args,
                    null
                )?.use { cursor ->
                    val nameIdx = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.DISPLAY_NAME)
                    while (cursor.moveToNext()) {
                        Regex(NAME_REGEX).matchEntire(cursor.getString(nameIdx))?.let { m ->
                            used.add(m.groupValues[1])
                        }
                    }
                }
            }.onFailure { Log.w(TAG, "Não foi possível listar Downloads", it) }
        } else {
            val publicDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
            publicDir?.list { _, name -> Regex(NAME_REGEX).matchEntire(name) != null }
                ?.forEach { name -> Regex(NAME_REGEX).matchEntire(name)?.let { used.add(it.groupValues[1]) } }
        }

        // Include private fallback copies so no name is reused across locations.
        File(context.filesDir, "route_pdfs")
            .list { _, name -> Regex(NAME_REGEX).matchEntire(name) != null }
            ?.forEach { name -> Regex(NAME_REGEX).matchEntire(name)?.let { used.add(it.groupValues[1]) } }

        return used
    }
}
