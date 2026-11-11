package com.rota123.app

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import java.io.ByteArrayOutputStream

/**
 * Receives VIEW/SEND intents for PDF files, stores them in the persistent
 * PDF queue and opens MainActivity, which delivers them once the web app is ready.
 */
class FileHandlerActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val intent = intent ?: run { finish(); return }
        val uri: Uri? = when (intent.action) {
            Intent.ACTION_VIEW -> intent.data

            Intent.ACTION_SEND -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    intent.getParcelableExtra(
                        Intent.EXTRA_STREAM,
                        Uri::class.java
                    )
                } else {
                    @Suppress("DEPRECATION")
                    intent.getParcelableExtra<Uri>(
                        Intent.EXTRA_STREAM
                    )
                }
            }

            else -> null
        }

        if (uri == null) {
            finish()
            return
        }

        try {
            val fileName = getFileName(uri)
            val mimeType = contentResolver.getType(uri) ?: "application/pdf"
            val bytes = readFileBytes(uri)

            PendingPdfQueue.enqueue(this, bytes, fileName, mimeType)

            val mainIntent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            }
            startActivity(mainIntent)
        } catch (e: Exception) {
            android.util.Log.e("Rota123", "Failed to read PDF file", e)
        }

        finish()
    }

    private fun getFileName(uri: Uri): String {
        var name: String? = null
        contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            val nameIndex = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
            if (nameIndex >= 0 && cursor.moveToFirst()) {
                name = cursor.getString(nameIndex)
            }
        }
        return name?.takeIf { it.isNotBlank() }
            ?: uri.lastPathSegment?.takeIf { it.isNotBlank() }
            ?: "arquivo.pdf"
    }

    private fun readFileBytes(uri: Uri): ByteArray {
        contentResolver.openInputStream(uri)?.use { inputStream ->
            val buffer = ByteArrayOutputStream()
            inputStream.copyTo(buffer)
            return buffer.toByteArray()
        }
        throw IllegalStateException("Unable to open input stream for $uri")
    }
}
