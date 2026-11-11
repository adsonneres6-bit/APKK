# Rota 123 - Android Wrapper

Este projeto Android é um "wrapper" nativo que envolve o PWA web do Rota 123.
Seu único propósito é registrar o aplicativo no Android como manipulador de arquivos PDF,
para que o sistema mostre "Rota 123" na lista "Abrir com" quando o usuário toca em um PDF.

## Como funciona

1. O usuário toca em um PDF no gerenciador de arquivos, Gmail, Downloads, etc.
2. O Android mostra "Rota 123" na lista "Abrir com" (graças à intent filter no AndroidManifest.xml)
3. O `FileHandlerActivity` lê o arquivo PDF, converte para base64
4. O `MainActivity` carrega o PWA no WebView e injeta o arquivo via JavaScript
5. O PWA detecta o arquivo e o encaminha para a importação de PDF existente

## Requisitos

- Android Studio (Hedgehog 2023.1 ou superior)
- JDK 17
- Android SDK 34

## Configuração

1. Abra a pasta `android/` no Android Studio
2. Em `MainActivity.kt`, atualize a constante `PWA_URL` para a URL de produção do seu PWA:
   ```kotlin
   private const val PWA_URL = "https://sua-url.vercel.app"
   ```
3. Compile o APK: `Build > Build Bundle(s) / APK(s) > Build APK(s)`
4. Instale no dispositivo Android

## Intent Filters

O aplicativo registra dois intent filters:

- **ACTION_VIEW** com `application/pdf`: faz o app aparecer em "Abrir com" para PDFs
- **ACTION_SEND** com `application/pdf`: faz o app aparecer em "Compartilhar" para PDFs

## Publicação

Para publicar na Play Store:
1. Gere um App Bundle (.aab): `Build > Generate Signed Bundle / APK`
2. Crie uma entradas na Play Console
3. Upload do .aab
