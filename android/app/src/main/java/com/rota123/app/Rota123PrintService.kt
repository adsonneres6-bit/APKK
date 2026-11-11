package com.rota123.app

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.ParcelFileDescriptor
import android.print.PrintAttributes
import android.print.PrinterCapabilitiesInfo
import android.print.PrinterId
import android.print.PrinterInfo
import android.printservice.PrintJob
import android.printservice.PrintService
import android.printservice.PrinterDiscoverySession
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * Virtual printer "Rota 123 — Importar PDF". A printed document is saved to the
 * app cache and a notification opens the existing import flow (FileHandlerActivity).
 * Background services cannot open screens on Android 10+, hence the notification.
 */
class Rota123PrintService : PrintService() {

    private val mainHandler = Handler(Looper.getMainLooper())
    private val ioExecutor: ExecutorService = Executors.newSingleThreadExecutor()

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onDestroy() {
        ioExecutor.shutdown()
        super.onDestroy()
    }

    override fun onCreatePrinterDiscoverySession(): PrinterDiscoverySession {
        return object : PrinterDiscoverySession() {
            override fun onStartPrinterDiscovery(priorityList: List<PrinterId>) {
                publishPrinter()
            }

            override fun onValidatePrinters(printerIds: List<PrinterId>) {
                publishPrinter()
            }

            override fun onStopPrinterDiscovery() {}

            override fun onStartPrinterStateTracking(printerId: PrinterId) {}

            override fun onStopPrinterStateTracking(printerId: PrinterId) {}

            override fun onDestroy() {}

            private fun publishPrinter() {
                addPrinters(listOf(buildPrinter(generatePrinterId(LOCAL_PRINTER_ID))))
            }
        }
    }

    override fun onPrintJobQueued(printJob: PrintJob) {
        if (!canPostNotifications()) {
            printJob.fail(getString(R.string.print_import_permission_required))
            return
        }
        printJob.start()
        val data = printJob.document.data
        if (data == null) {
            printJob.fail(getString(R.string.print_import_failed))
            return
        }

        ioExecutor.execute {
            val result = runCatching { spoolToCache(data) }
            mainHandler.post {
                result
                    .onSuccess { file ->
                        printJob.complete()
                        notifyImportReady(file)
                    }
                    .onFailure { error ->
                        Log.e(TAG, "Failed to capture printed PDF", error)
                        printJob.fail(getString(R.string.print_import_failed))
                    }
            }
        }
    }

    override fun onRequestCancelPrintJob(printJob: PrintJob) {
        printJob.cancel()
    }

    private fun spoolToCache(data: ParcelFileDescriptor): File {
        pruneOldPrintFiles()
        val file = File(cacheDir, "$FILE_PREFIX${System.currentTimeMillis()}.pdf")
        val bytes = try {
            ParcelFileDescriptor.AutoCloseInputStream(data).use { input -> input.readBytes() }
        } catch (error: Exception) {
            throw error
        }
        try {
            FileOutputStream(file).use { it.write(bytes) }
        } catch (error: Exception) {
            file.delete()
            throw error
        }
        // Permanent copy for "Minhas Rotas" later; failure must not block the import flow.
        RoutePdfStorage.save(this, bytes)
        return file
    }

    private fun pruneOldPrintFiles() {
        val cutoff = System.currentTimeMillis() - PRINT_FILE_TTL_MS
        cacheDir.listFiles { f -> f.name.startsWith(FILE_PREFIX) && f.lastModified() < cutoff }
            ?.forEach { it.delete() }
    }

    private fun notifyImportReady(file: File) {
        val uri = FileProvider.getUriForFile(this, FILE_AUTHORITY, file)
        val openImport = Intent(this, FileHandlerActivity::class.java).apply {
            action = Intent.ACTION_VIEW
            setDataAndType(uri, "application/pdf")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        val contentIntent = PendingIntent.getActivity(
            this,
            file.name.hashCode(),
            openImport,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setColor(NOTIFICATION_COLOR)
            .setContentTitle(getString(R.string.print_import_ready_title))
            .setContentText(getString(R.string.print_import_ready_text))
            .setStyle(NotificationCompat.BigTextStyle().bigText(getString(R.string.print_import_ready_text)))
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setContentIntent(contentIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .build()
        NotificationManagerCompat.from(this).notify(file.name.hashCode(), notification)
    }

    private fun canPostNotifications(): Boolean {
        if (!NotificationManagerCompat.from(this).areNotificationsEnabled()) return false
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = getSystemService(NotificationManager::class.java)
        manager.deleteNotificationChannel(LEGACY_CHANNEL_ID)
        val channel = NotificationChannel(
            CHANNEL_ID,
            getString(R.string.print_import_channel_name),
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            enableLights(true)
            lightColor = NOTIFICATION_COLOR
            enableVibration(true)
            vibrationPattern = VIBRATION_PATTERN
            lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
            setSound(
                RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            )
        }
        manager.createNotificationChannel(channel)
    }

    private fun buildPrinter(printerId: PrinterId): PrinterInfo {
        val capabilities = PrinterCapabilitiesInfo.Builder(printerId)
            .addMediaSize(PrintAttributes.MediaSize.ISO_A4, true)
            .addResolution(PrintAttributes.Resolution("rota123_300dpi", "300 dpi", 300, 300), true)
            .setColorModes(
                PrintAttributes.COLOR_MODE_MONOCHROME or PrintAttributes.COLOR_MODE_COLOR,
                PrintAttributes.COLOR_MODE_COLOR
            )
            .setMinMargins(PrintAttributes.Margins(0, 0, 0, 0))
            .build()
        return PrinterInfo.Builder(
            printerId,
            getString(R.string.print_import_service_name),
            PrinterInfo.STATUS_IDLE
        )
            .setCapabilities(capabilities)
            .build()
    }

    companion object {
        private const val TAG = "Rota123Print"
        private const val LOCAL_PRINTER_ID = "rota123_import"
        private const val CHANNEL_ID = "rota123_print_import_alert"
        private const val LEGACY_CHANNEL_ID = "rota123_print_import"
        private const val NOTIFICATION_COLOR = 0xFF2563EB.toInt()
        private val VIBRATION_PATTERN = longArrayOf(0, 250, 150, 250)
        private const val FILE_PREFIX = "rota123-print-"
        private const val FILE_AUTHORITY = "com.rota123.app.fileprovider"
        private const val PRINT_FILE_TTL_MS = 24L * 60 * 60 * 1000
    }
}
