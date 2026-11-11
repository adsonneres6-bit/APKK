package com.rota123.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ClipData
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.OpenableColumns
import android.speech.tts.TextToSpeech
import android.speech.tts.Voice
import android.util.Base64
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient

import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat

import org.json.JSONObject

import java.util.Locale
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong

class MainActivity : AppCompatActivity() {

    // =========================================================
    // VARIÁVEIS
    // =========================================================

    private lateinit var webView: WebView

    @Volatile
    private var webReady = false

    private var inFlightPdfId: String? = null

    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    private var pendingPermissionRequest: PermissionRequest? = null

    private var pendingSaveBytes: ByteArray? = null
    private var pendingSaveFileName: String? = null
    private var pendingSaveRequestId: String? = null

    private var tts: TextToSpeech? = null

    private val ttsReady = AtomicBoolean(false)

    private val lastSpokenLock = Any()

    private var lastSpokenText: String? = null
    private var lastSpokenAt = 0L

    private val utteranceCounter = AtomicLong(0)

    // =========================================================
    // SELETOR DE ARQUIVOS
    // =========================================================

    private val fileChooserLauncher: ActivityResultLauncher<Intent> =
        registerForActivityResult(
            ActivityResultContracts.StartActivityForResult()
        ) { result ->

            val callback = filePathCallback

            filePathCallback = null

            if (callback != null) {

                val uris =
                    WebChromeClient.FileChooserParams.parseResult(
                        result.resultCode,
                        result.data
                    )

                callback.onReceiveValue(
                    uris ?: emptyArray()
                )
            }
        }

    // =========================================================
    // PERMISSÃO DE NOTIFICAÇÕES
    // =========================================================

    private val notificationPermissionLauncher =
        registerForActivityResult(
            ActivityResultContracts.RequestPermission()
        ) { granted ->

            Log.d(
                TAG,
                "Permissão de notificações: $granted"
            )
        }

    // =========================================================
    // PERMISSÃO DA CÂMERA
    // =========================================================

    private val cameraPermissionLauncher =
        registerForActivityResult(
            ActivityResultContracts.RequestPermission()
        ) { granted ->

            val request = pendingPermissionRequest

            pendingPermissionRequest = null

            if (request != null) {

                if (
                    granted &&
                    isTrustedOrigin(request.origin)
                ) {

                    request.grant(
                        arrayOf(
                            PermissionRequest.RESOURCE_VIDEO_CAPTURE
                        )
                    )

                } else {

                    request.deny()
                }
            }
        }

    // =========================================================
    // SALVAMENTO TSV
    // =========================================================

    private val saveDocumentLauncher: ActivityResultLauncher<String> =
        registerForActivityResult(
            ActivityResultContracts.CreateDocument(
                ROUTE_MIME_TYPE
            )
        ) { uri ->

            val bytes = pendingSaveBytes
            val requestId = pendingSaveRequestId
            val requestedName = pendingSaveFileName

            pendingSaveBytes = null
            pendingSaveRequestId = null
            pendingSaveFileName = null

            var saved = false
            var actualName: String? = null

            if (uri != null && bytes != null) {

                try {

                    val output =
                        contentResolver.openOutputStream(
                            uri,
                            "w"
                        )

                    if (output != null) {

                        output.use {
                            it.write(bytes)
                            it.flush()
                        }

                        saved = true

                        actualName =
                            queryDisplayedName(uri)
                                ?: requestedName

                        // Tenta manter acesso após reiniciar o APK.
                        try {

                            contentResolver.takePersistableUriPermission(
                                uri,
                                Intent.FLAG_GRANT_READ_URI_PERMISSION or
                                        Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                            )

                        } catch (e: SecurityException) {

                            Log.w(
                                TAG,
                                "O provedor não concedeu permissão persistente",
                                e
                            )

                            try {
                                contentResolver.takePersistableUriPermission(
                                    uri,
                                    Intent.FLAG_GRANT_READ_URI_PERMISSION
                                )
                            } catch (ignored: Exception) {
                                Log.w(
                                    TAG,
                                    "Permissão persistente indisponível"
                                )
                            }
                        } catch (e: Exception) {

                            Log.w(
                                TAG,
                                "Não foi possível persistir a URI",
                                e
                            )
                        }

                        if (!actualName.isNullOrBlank()) {

                            val name = actualName!!

                            savedFileUris[name] = uri

                            persistSavedUri(
                                name,
                                uri
                            )
                        }

                        Log.d(
                            TAG,
                            "Arquivo TSV salvo: $actualName"
                        )

                    } else {

                        Log.e(
                            TAG,
                            "Não foi possível abrir o destino TSV"
                        )
                    }

                } catch (e: Exception) {

                    Log.e(
                        TAG,
                        "Erro ao salvar TSV",
                        e
                    )
                }
            }

            if (requestId != null) {

                reportSaveResult(
                    requestId,
                    saved,
                    if (saved) actualName else null
                )
            }
        }

    // =========================================================
    // CRIAÇÃO DA ACTIVITY
    // =========================================================

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {

        super.onCreate(savedInstanceState)

        window.statusBarColor =
            Color.parseColor("#0f172a")

        restoreSavedUris()

        initTts()

        webView = WebView(this).apply {

            setBackgroundColor(
                Color.parseColor("#0f172a")
            )

            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true

            settings.mediaPlaybackRequiresUserGesture = false

            settings.allowFileAccess = false
            settings.allowContentAccess = true

            settings.cacheMode =
                android.webkit.WebSettings.LOAD_DEFAULT

            // =================================================
            // NAVEGAÇÃO
            // =================================================

            webViewClient = object : WebViewClient() {

                override fun shouldOverrideUrlLoading(
                    view: WebView?,
                    request: WebResourceRequest?
                ): Boolean {

                    val url =
                        request?.url ?: return false

                    if (isTrustedOrigin(url)) {
                        return false
                    }

                    return try {

                        startActivity(
                            Intent(
                                Intent.ACTION_VIEW,
                                url
                            )
                        )

                        true

                    } catch (e: Exception) {

                        Log.e(
                            TAG,
                            "Erro ao abrir link externo",
                            e
                        )

                        true
                    }
                }

                override fun onPageStarted(
                    view: WebView?,
                    url: String?,
                    favicon: android.graphics.Bitmap?
                ) {

                    super.onPageStarted(
                        view,
                        url,
                        favicon
                    )

                    webReady = false

                    inFlightPdfId = null
                }
            }

            // =================================================
            // CÂMERA E IMPORTAÇÃO
            // =================================================

            webChromeClient = object : WebChromeClient() {

                override fun onShowFileChooser(
                    webView: WebView?,
                    callback: ValueCallback<Array<Uri>>,
                    params: FileChooserParams
                ): Boolean {

                    filePathCallback?.onReceiveValue(
                        emptyArray()
                    )

                    filePathCallback = callback

                    return try {

                        fileChooserLauncher.launch(
                            buildChooserIntent(params)
                        )

                        true

                    } catch (e: Exception) {

                        Log.e(
                            TAG,
                            "Erro ao abrir seletor",
                            e
                        )

                        filePathCallback = null

                        callback.onReceiveValue(
                            emptyArray()
                        )

                        false
                    }
                }

                override fun onPermissionRequest(
                    request: PermissionRequest?
                ) {

                    request ?: return

                    runOnUiThread {

                        if (!isTrustedOrigin(request.origin)) {

                            request.deny()

                            return@runOnUiThread
                        }

                        val needsCamera =
                            request.resources.contains(
                                PermissionRequest.RESOURCE_VIDEO_CAPTURE
                            )

                        if (!needsCamera) {

                            request.deny()

                            return@runOnUiThread
                        }

                        val cameraGranted =
                            ContextCompat.checkSelfPermission(
                                this@MainActivity,
                                Manifest.permission.CAMERA
                            ) == PackageManager.PERMISSION_GRANTED

                        if (cameraGranted) {

                            request.grant(
                                arrayOf(
                                    PermissionRequest.RESOURCE_VIDEO_CAPTURE
                                )
                            )

                        } else {

                            pendingPermissionRequest?.deny()

                            pendingPermissionRequest = request

                            cameraPermissionLauncher.launch(
                                Manifest.permission.CAMERA
                            )
                        }
                    }
                }

                override fun onPermissionRequestCanceled(
                    request: PermissionRequest?
                ) {

                    super.onPermissionRequestCanceled(
                        request
                    )

                    if (
                        request != null &&
                        pendingPermissionRequest === request
                    ) {

                        pendingPermissionRequest = null
                    }
                }
            }

            // =================================================
            // PONTE JAVASCRIPT
            // =================================================

            addJavascriptInterface(
                Rota123Bridge(),
                "AndroidRota123"
            )
        }

        setContentView(webView)

        requestNotificationPermissionIfNeeded()

        webView.loadUrl(PWA_URL)

        handleRouteIntent(intent)
    }

    // =========================================================
    // DOMÍNIOS CONFIÁVEIS
    // =========================================================

    private fun isTrustedOrigin(uri: Uri?): Boolean {

        if (uri?.scheme != "https") {
            return false
        }

        return when (
            uri.host?.lowercase()
        ) {

            "rota123.com.br",
            "www.rota123.com.br",
            "roteirizador-1khn.bolt.host" -> true

            else -> false
        }
    }

    // =========================================================
    // INTENTS
    // =========================================================

    override fun onNewIntent(intent: Intent?) {

        super.onNewIntent(intent)

        setIntent(intent)

        handleRouteIntent(intent)

        webView.post {
            deliverNextPdf()
        }
    }

    private fun handleRouteIntent(intent: Intent?) {

        if (intent == null) return

        if (intent.action == ACTION_OPEN_ROUTE) {

            val fileName =
                intent.getStringExtra(
                    EXTRA_ROUTE_FILE_NAME
                )

            if (!fileName.isNullOrBlank()) {

                webView.post {

                    openSavedRouteOnMainThread(
                        fileName
                    )
                }
            }
        }
    }

    // =========================================================
    // ENTREGA DE PDFs AO FRONTEND
    // =========================================================

    private fun deliverNextPdf() {

        if (!webReady) return

        if (inFlightPdfId != null) return

        val currentUrl =
            webView.url ?: return

        if (
            !isTrustedOrigin(
                Uri.parse(currentUrl)
            )
        ) return

        val entry =
            PendingPdfQueue.peekOldest(this)
                ?: return

        inFlightPdfId = entry.id

        val safeId =
            JSONObject.quote(entry.id)

        val safeBase64 =
            JSONObject.quote(
                Base64.encodeToString(
                    entry.bytes,
                    Base64.NO_WRAP
                )
            )

        val safeFileName =
            JSONObject.quote(
                entry.fileName
            )

        val safeMimeType =
            JSONObject.quote(
                entry.mimeType
            )

        val js = """
            (function() {

                if (!window.__rota123ReceiveExternalFile) {
                    return false;
                }

                var base64 = $safeBase64;

                var fileName = $safeFileName;

                var mimeType = $safeMimeType;

                var bytes = Uint8Array.from(
                    atob(base64),
                    function(c) {
                        return c.charCodeAt(0);
                    }
                );

                var blob = new Blob(
                    [bytes],
                    { type: mimeType }
                );

                var file = new File(
                    [blob],
                    fileName,
                    { type: mimeType }
                );

                return window.__rota123ReceiveExternalFile(
                    file,
                    $safeId
                );

            })();
        """.trimIndent()

        webView.evaluateJavascript(js) { result ->

            if (result != "true") {

                inFlightPdfId = null

                Log.w(
                    TAG,
                    "Frontend ainda não recebeu o PDF"
                )
            }
        }
    }

    // =========================================================
    // SELETOR DE ARQUIVOS
    // =========================================================

    private fun buildChooserIntent(
        params: WebChromeClient.FileChooserParams
    ): Intent {

        val accepts =
            params.acceptTypes?.filter {
                it.isNotBlank()
            } ?: emptyList()

        val mimes =
            LinkedHashSet<String>()

        for (accept in accepts) {

            if (accept.contains("/")) {

                mimes.add(accept)

            } else {

                when (
                    accept.lowercase()
                        .removePrefix(".")
                ) {

                    "pdf" -> {
                        mimes.add(
                            "application/pdf"
                        )
                    }

                    "xlsx", "xlsm" -> {
                        mimes.add(
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        )
                    }

                    "xls" -> {
                        mimes.add(
                            "application/vnd.ms-excel"
                        )
                    }

                    "csv" -> {
                        mimes.add(
                            "text/csv"
                        )
                    }

                    "tsv" -> {
                        mimes.add(
                            ROUTE_MIME_TYPE
                        )
                    }
                }
            }
        }

        if (mimes.isEmpty()) {

            return Intent.createChooser(
                params.createIntent(),
                null
            )
        }

        val query =
            Intent(
                Intent.ACTION_GET_CONTENT
            ).apply {

                addCategory(
                    Intent.CATEGORY_OPENABLE
                )

                type = "*/*"

                putExtra(
                    Intent.EXTRA_MIME_TYPES,
                    (
                            mimes +
                                    "application/octet-stream"
                            ).toTypedArray()
                )

                if (
                    params.mode ==
                    WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE
                ) {

                    putExtra(
                        Intent.EXTRA_ALLOW_MULTIPLE,
                        true
                    )
                }
            }

        return Intent.createChooser(
            query,
            null
        )
    }

    // =========================================================
    // PERMISSÃO DE NOTIFICAÇÕES
    // =========================================================

    private fun requestNotificationPermissionIfNeeded() {

        if (
            Build.VERSION.SDK_INT <
            Build.VERSION_CODES.TIRAMISU
        ) return

        val granted =
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED

        if (!granted) {

            notificationPermissionLauncher.launch(
                Manifest.permission.POST_NOTIFICATIONS
            )
        }
    }

    // =========================================================
    // TEXT TO SPEECH
    // =========================================================

    private fun initTts() {

        ttsReady.set(false)

        tts = TextToSpeech(this) { status ->

            runOnUiThread {

                if (status != TextToSpeech.SUCCESS) {

                    ttsReady.set(false)

                    Log.e(
                        TAG,
                        "Falha ao inicializar TTS"
                    )

                    return@runOnUiThread
                }

                val engine = tts

                if (engine == null) {

                    ttsReady.set(false)

                    Log.e(
                        TAG,
                        "Mecanismo TTS indisponível"
                    )

                    return@runOnUiThread
                }

                try {

                    val locale =
                        Locale("pt", "BR")

                    val languageResult =
                        engine.setLanguage(locale)

                    var ready =
                        languageResult != TextToSpeech.LANG_MISSING_DATA &&
                                languageResult != TextToSpeech.LANG_NOT_SUPPORTED &&
                                languageResult >= TextToSpeech.LANG_AVAILABLE

                    if (ready) {

                        val preferredVoice =
                            pickBestPtBrVoice(engine)

                        if (preferredVoice != null) {

                            val result =
                                engine.setVoice(
                                    preferredVoice
                                )

                            if (
                                result ==
                                TextToSpeech.SUCCESS
                            ) {

                                Log.d(
                                    TAG,
                                    "Voz selecionada: ${preferredVoice.name}"
                                )

                            } else {

                                Log.w(
                                    TAG,
                                    "Falha ao selecionar voz preferida"
                                )

                                engine.setLanguage(
                                    locale
                                )
                            }
                        }

                        // Voz um pouco mais suave.
                        engine.setSpeechRate(
                            0.92f
                        )

                        engine.setPitch(
                            0.95f
                        )
                    }

                    ttsReady.set(ready)

                    Log.d(
                        TAG,
                        "TTS pronto: $ready"
                    )

                } catch (e: Exception) {

                    ttsReady.set(false)

                    Log.e(
                        TAG,
                        "Erro ao configurar TTS",
                        e
                    )
                }
            }
        }
    }

    // =========================================================
    // SELEÇÃO DA MELHOR VOZ PT-BR
    // =========================================================

    private fun pickBestPtBrVoice(
        engine: TextToSpeech
    ): Voice? {

        return try {

            val voices =
                engine.voices ?: return null

            val candidates =
                voices.filter { voice ->

                    voice.locale.language.equals(
                        "pt",
                        ignoreCase = true
                    ) &&
                            voice.locale.country.equals(
                                "BR",
                                ignoreCase = true
                            )
                }

            if (candidates.isEmpty()) {
                return null
            }

            // Prefere voz de qualidade disponível
            // sem depender de conexão com a internet.
            candidates.maxWithOrNull(
                compareBy<Voice> {

                    if (
                        it.isNetworkConnectionRequired
                    ) 0 else 1

                }.thenBy {

                    it.quality
                }
            )

        } catch (e: Exception) {

            Log.e(
                TAG,
                "Erro ao selecionar voz",
                e
            )

            null
        }
    }

    // =========================================================
    // NOMES DOS ARQUIVOS TSV
    // =========================================================

    private fun sanitizeFileName(
        raw: String
    ): String {

        var cleaned =
            raw.trim().replace(
                Regex("""[/\\:"<>|*?]"""),
                "_"
            )

        if (cleaned.isBlank()) {
            return ""
        }

        // Remove extensões duplicadas.
        val extensions =
            listOf(
                ".tsv",
                ".txt",
                ".csv"
            )

        var changed: Boolean

        do {

            changed = false

            for (extension in extensions) {

                if (
                    cleaned.endsWith(
                        extension,
                        ignoreCase = true
                    )
                ) {

                    cleaned =
                        cleaned.dropLast(
                            extension.length
                        )

                    changed = true

                    break
                }
            }

        } while (changed)

        cleaned =
            cleaned.trim().trimEnd('.')

        if (cleaned.isBlank()) {
            return ""
        }

        return "$cleaned.tsv"
    }

    // =========================================================
    // CONSULTAR NOME REAL DO ARQUIVO
    // =========================================================

    private fun queryDisplayedName(
        uri: Uri
    ): String? {

        return try {

            contentResolver.query(
                uri,
                arrayOf(
                    OpenableColumns.DISPLAY_NAME
                ),
                null,
                null,
                null
            )?.use { cursor ->

                if (cursor.moveToFirst()) {

                    cursor.getString(0)

                } else {

                    null
                }
            }

        } catch (e: Exception) {

            Log.e(
                TAG,
                "Erro ao consultar nome do arquivo",
                e
            )

            null
        }
    }

    // =========================================================
    // PERSISTÊNCIA DAS URIS
    // =========================================================

    private fun persistSavedUri(
        fileName: String,
        uri: Uri
    ) {

        getSharedPreferences(
            SAVED_FILES_PREFS,
            MODE_PRIVATE
        ).edit()
            .putString(
                fileName,
                uri.toString()
            )
            .apply()
    }

    private fun restoreSavedUris() {

        val prefs =
            getSharedPreferences(
                SAVED_FILES_PREFS,
                MODE_PRIVATE
            )

        for ((name, value) in prefs.all) {

            if (value is String) {

                try {

                    savedFileUris[name] =
                        Uri.parse(value)

                } catch (e: Exception) {

                    Log.e(
                        TAG,
                        "Erro ao restaurar URI",
                        e
                    )
                }
            }
        }
    }

    // =========================================================
    // ABRIR ARQUIVO SALVO
    // =========================================================

    private fun openSavedRoute(
        fileName: String
    ): Boolean {

        val uri =
            savedFileUris[fileName]
                ?: return false

        if (!canReadSavedUri(uri)) {
            return false
        }

        webView.post {

            openSavedRouteOnMainThread(
                fileName
            )
        }

        return true
    }

    private fun canReadSavedUri(
        uri: Uri
    ): Boolean {

        return try {

            contentResolver.openInputStream(
                uri
            )?.use {

                true

            } ?: false

        } catch (e: Exception) {

            Log.e(
                TAG,
                "Arquivo TSV indisponível",
                e
            )

            false
        }
    }

    private fun openSavedRouteOnMainThread(
        fileName: String
    ): Boolean {

        val uri =
            savedFileUris[fileName]
                ?: return false

        if (!canReadSavedUri(uri)) {
            return false
        }

        return try {

            val viewIntent =
                Intent(
                    Intent.ACTION_VIEW
                ).apply {

                    setDataAndType(
                        uri,
                        ROUTE_MIME_TYPE
                    )

                    addFlags(
                        Intent.FLAG_GRANT_READ_URI_PERMISSION
                    )

                    clipData =
                        ClipData.newUri(
                            contentResolver,
                            fileName,
                            uri
                        )
                }

            startActivity(
                Intent.createChooser(
                    viewIntent,
                    "Abrir rota com"
                )
            )

            true

        } catch (e: Exception) {

            Log.e(
                TAG,
                "Erro ao abrir arquivo TSV",
                e
            )

            false
        }
    }

    // =========================================================
    // NOTIFICAÇÃO DE ROTA PRONTA
    // =========================================================

    private fun showRouteReadyNotification(
        fileName: String
    ): Boolean {

        val uri =
            savedFileUris[fileName]
                ?: return false

        if (!canReadSavedUri(uri)) {
            return false
        }

        if (
            Build.VERSION.SDK_INT >=
            Build.VERSION_CODES.TIRAMISU
        ) {

            val granted =
                ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.POST_NOTIFICATIONS
                ) == PackageManager.PERMISSION_GRANTED

            if (!granted) {
                return false
            }
        }

        webView.post {

            showRouteReadyNotificationOnMainThread(
                fileName
            )
        }

        return true
    }

    private fun showRouteReadyNotificationOnMainThread(
        fileName: String
    ) {

        try {

            val manager =
                getSystemService(
                    NOTIFICATION_SERVICE
                ) as NotificationManager

            if (
                Build.VERSION.SDK_INT >=
                Build.VERSION_CODES.O
            ) {

                val channel =
                    NotificationChannel(
                        ROUTE_CHANNEL_ID,
                        "Rotas preparadas",
                        NotificationManager.IMPORTANCE_DEFAULT
                    )

                manager.createNotificationChannel(
                    channel
                )
            }

            val openIntent =
                Intent(
                    this,
                    MainActivity::class.java
                ).apply {

                    action =
                        ACTION_OPEN_ROUTE

                    putExtra(
                        EXTRA_ROUTE_FILE_NAME,
                        fileName
                    )

                    flags =
                        Intent.FLAG_ACTIVITY_NEW_TASK or
                                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                                Intent.FLAG_ACTIVITY_SINGLE_TOP
                }

            val pendingIntent =
                PendingIntent.getActivity(
                    this,
                    fileName.hashCode(),
                    openIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or
                            PendingIntent.FLAG_IMMUTABLE
                )

            val notification =
                NotificationCompat.Builder(
                    this,
                    ROUTE_CHANNEL_ID
                )
                    .setSmallIcon(
                        android.R.drawable.stat_sys_download_done
                    )
                    .setContentTitle(
                        "Rota pronta!"
                    )
                    .setContentText(
                        "Toque para abrir sua planilha."
                    )
                    .setContentIntent(
                        pendingIntent
                    )
                    .setAutoCancel(true)
                    .setPriority(
                        NotificationCompat.PRIORITY_DEFAULT
                    )
                    .build()

            NotificationManagerCompat.from(
                this
            ).notify(
                fileName.hashCode(),
                notification
            )

        } catch (e: SecurityException) {

            Log.e(
                TAG,
                "Permissão de notificação negada",
                e
            )

        } catch (e: Exception) {

            Log.e(
                TAG,
                "Erro ao criar notificação",
                e
            )
        }
    }

    // =========================================================
    // RESULTADO DO SALVAMENTO
    // =========================================================

    private fun reportSaveResult(
        requestId: String,
        saved: Boolean,
        actualFileName: String? = null
    ) {

        val nameJson =
            actualFileName?.let {
                JSONObject.quote(it)
            } ?: "null"

        val js = """
            if (window.__rota123SaveResult) {
                window.__rota123SaveResult(
                    ${JSONObject.quote(requestId)},
                    $saved,
                    $nameJson
                );
            }
        """.trimIndent()

        webView.post {

            webView.evaluateJavascript(
                js,
                null
            )
        }
    }

    // =========================================================
    // TEXT TO SPEECH - INICIALIZAÇÃO
    // =========================================================

    // A implementação de initTts() está acima,
    // junto à seleção da voz pt-BR.

    // =========================================================
    // FINALIZAÇÃO
    // =========================================================

    override fun onDestroy() {

        filePathCallback?.onReceiveValue(
            emptyArray()
        )

        filePathCallback = null

        pendingPermissionRequest?.deny()

        pendingPermissionRequest = null

        pendingSaveBytes = null
        pendingSaveFileName = null
        pendingSaveRequestId = null

        ttsReady.set(false)

        tts?.stop()
        tts?.shutdown()

        tts = null

        webView.destroy()

        super.onDestroy()
    }

    // =========================================================
    // PONTE JAVASCRIPT / ANDROID
    // =========================================================

    inner class Rota123Bridge {

        @JavascriptInterface
        fun isNativeApp(): Boolean = true

        @JavascriptInterface
        fun getPWAUrl(): String =
            PWA_URL

        @JavascriptInterface
        fun isTtsReady(): Boolean =
            ttsReady.get()

        // =====================================================
        // FALAR
        // =====================================================

        @JavascriptInterface
        fun speak(text: String) {

            if (text.isBlank()) return

            if (!ttsReady.get()) return

            val now =
                System.currentTimeMillis()

            synchronized(lastSpokenLock) {

                if (
                    text == lastSpokenText &&
                    now - lastSpokenAt <
                    DUPLICATE_SPEECH_WINDOW_MS
                ) {

                    return
                }

                lastSpokenText = text
                lastSpokenAt = now
            }

            val utteranceId =
                "rota123-${utteranceCounter.incrementAndGet()}"

            webView.post {

                tts?.speak(
                    text,
                    TextToSpeech.QUEUE_FLUSH,
                    null,
                    utteranceId
                )
            }
        }

        // =====================================================
        // PARAR VOZ
        // =====================================================

        @JavascriptInterface
        fun stopSpeaking() {

            webView.post {
                tts?.stop()
            }
        }

        // =====================================================
        // SALVAR TSV
        // =====================================================

        @JavascriptInterface
        fun saveBlob(
            base64: String,
            fileName: String,
            mimeType: String,
            requestId: String
        ): Boolean {

            if (
                base64.isBlank() ||
                fileName.isBlank()
            ) {

                return false
            }

            if (
                base64.length >
                MAX_SAVE_BYTES_BASE64
            ) {

                return false
            }

            val safeName =
                sanitizeFileName(
                    fileName
                )

            if (safeName.isBlank()) {
                return false
            }

            val decoded = try {

                Base64.decode(
                    base64,
                    Base64.DEFAULT
                )

            } catch (e: Exception) {

                Log.e(
                    TAG,
                    "Base64 inválido",
                    e
                )

                return false
            }

            if (decoded.isEmpty()) {
                return false
            }

            webView.post {

                if (pendingSaveBytes != null) {

                    Log.w(
                        TAG,
                        "Já existe salvamento pendente"
                    )

                    reportSaveResult(
                        requestId,
                        false
                    )

                    return@post
                }

                pendingSaveBytes =
                    decoded

                pendingSaveFileName =
                    safeName

                pendingSaveRequestId =
                    requestId

                try {

                    saveDocumentLauncher.launch(
                        safeName
                    )

                } catch (e: Exception) {

                    pendingSaveBytes = null
                    pendingSaveFileName = null
                    pendingSaveRequestId = null

                    Log.e(
                        TAG,
                        "Erro ao abrir salvamento",
                        e
                    )

                    reportSaveResult(
                        requestId,
                        false
                    )
                }
            }

            return true
        }

        // =====================================================
        // PDF PRONTO
        // =====================================================

        @JavascriptInterface
        fun notifyPdfReady() {

            webView.post {

                webReady = true

                deliverNextPdf()
            }
        }

        // =====================================================
        // CONFIRMAR PDF
        // =====================================================

        @JavascriptInterface
        fun ackPdf(id: String) {

            webView.post {

                PendingPdfQueue.remove(
                    this@MainActivity,
                    id
                )

                if (
                    inFlightPdfId == id
                ) {

                    inFlightPdfId = null
                }

                deliverNextPdf()
            }
        }

        // =====================================================
        // NOTIFICAR ROTA PRONTA
        // =====================================================

        @JavascriptInterface
        fun notifyRouteReady(
            fileName: String
        ): Boolean {

            return showRouteReadyNotification(
                fileName
            )
        }

        // =====================================================
        // ABRIR TSV
        // =====================================================

        @JavascriptInterface
        fun openSavedFile(
            fileName: String
        ): Boolean {

            return openSavedRoute(
                fileName
            )
        }
    }

    // =========================================================
    // CONSTANTES
    // =========================================================

    companion object {

        private const val TAG =
            "Rota123"

        private const val ACTION_OPEN_ROUTE =
            "com.rota123.app.OPEN_ROUTE"

        private const val EXTRA_ROUTE_FILE_NAME =
            "route_file_name"

        private const val ROUTE_CHANNEL_ID =
            "rota123_route_ready"

        private const val ROUTE_MIME_TYPE =
            "text/tab-separated-values"

        private const val SAVED_FILES_PREFS =
            "rota123_saved_files"

        private val savedFileUris =
            ConcurrentHashMap<String, Uri>()

        private const val PWA_URL =
            "https://roteirizador-1khn.bolt.host"

        private const val DUPLICATE_SPEECH_WINDOW_MS =
            2500L

        private const val MAX_SAVE_BYTES_BASE64 =
            20 * 1024 * 1024 / 3 * 4
    }
}