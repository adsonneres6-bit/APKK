package com.rota123.app

import android.content.Context
import org.json.JSONObject
import java.io.File
import java.io.IOException
import java.security.MessageDigest

/**
 * Persistent queue of PDFs received from outside the app (Open with, Share, virtual printer).
 * Entries survive restarts and are removed only after the web layer acknowledges them.
 */
object PendingPdfQueue {

    class Entry(
        val id: String,
        val fileName: String,
        val mimeType: String,
        val bytes: ByteArray
    )

    private val lock = Any()

    private val idPattern = Regex("[0-9a-f]{64}")

    fun enqueue(context: Context, bytes: ByteArray, fileName: String, mimeType: String): String {
        synchronized(lock) {
            val dir = queueDir(context)
            val id = sha256(bytes)
            val pdf = File(dir, "$id.pdf")
            val meta = File(dir, "$id.json")
            if (pdf.isFile && meta.isFile) return id

            val tmp = File(dir, "$id.tmp")
            tmp.writeBytes(bytes)
            if (!tmp.renameTo(pdf)) {
                tmp.delete()
                throw IOException("Nao foi possivel guardar o PDF recebido.")
            }
            meta.writeText(
                JSONObject()
                    .put("fileName", fileName)
                    .put("mimeType", mimeType)
                    .toString()
            )
            return id
        }
    }

    fun peekOldest(context: Context): Entry? {
        synchronized(lock) {
            val dir = queueDir(context)
            val metas = dir.listFiles { f -> f.name.endsWith(".json") }
                ?.sortedBy { it.lastModified() }
                ?: return null

            for (meta in metas) {
                val id = meta.name.removeSuffix(".json")
                val pdf = File(dir, "$id.pdf")
                if (!idPattern.matches(id) || !pdf.isFile) continue
                val entry = try {
                    val json = JSONObject(meta.readText())
                    Entry(
                        id,
                        json.getString("fileName"),
                        json.getString("mimeType"),
                        pdf.readBytes()
                    )
                } catch (e: Exception) {
                    continue
                }
                return entry
            }
            return null
        }
    }

    fun remove(context: Context, id: String) {
        if (!idPattern.matches(id)) return
        synchronized(lock) {
            val dir = queueDir(context)
            File(dir, "$id.json").delete()
            File(dir, "$id.pdf").delete()
        }
    }

    private fun queueDir(context: Context): File =
        File(context.filesDir, "pending_pdfs").apply { mkdirs() }

    private fun sha256(bytes: ByteArray): String =
        MessageDigest.getInstance("SHA-256")
            .digest(bytes)
            .joinToString("") { "%02x".format(it) }
}
