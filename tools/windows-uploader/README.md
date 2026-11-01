# KOKO Windows photo uploader

This first Windows tool watches a folder for JPEG, PNG, and WebP images and sends stable files to the private album represented by one gallery QR. It is independent of the camera model and works with images copied from a card or saved by tethering software.

## Setup

1. In the admin gallery page for a booking, create the album QR and select **ตั้งค่า Windows ให้ส่งรูปจากโฟลเดอร์อัตโนมัติ**. Save the downloaded `koko-uploader-<booking>.json` file on the event computer.
2. Download `KokoUploader.ps1` from the same admin page. Start PowerShell in the folder containing the script and run:

   ```powershell
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\KokoUploader.ps1 -ConfigPath .\koko-uploader-<booking>.json -WatchPath "C:\KOKO\Incoming"
   ```

3. Install Canon EOS Utility for the connected camera. Set its image destination to `C:\KOKO\Incoming` and select JPEG transfer for live sharing. Start the uploader before shooting.

The first run protects the upload credential for the current Windows user with Windows DPAPI and removes the plaintext credential from the config file. Keep the config and its `.state.json` file together. The source photos remain in the watched folder; the state file prevents successful uploads from being sent again. If the admin creates a replacement uploader credential, download and use a new config.

## What it supports

- Windows PowerShell 5.1 included with Windows 11; no Node.js or package installation is required.
- JPEG, PNG, and WebP files up to 25 MB each.
- Polls the folder every three seconds and waits until each file stops changing before upload.
- Uploads one file at a time, retries failures with increasing delays, and stores local success state so it can resume after a restart.
- Uploads directly to the signed R2 URL. The web server only handles small metadata requests.

RAW files such as Canon CR3 are left in the folder and ignored. Use JPEG transfer for live sharing; keep RAW files for the normal editing and archive workflow. Larger images should be exported as JPEG under the current 25 MB limit.

## Camera connection

The uploader does not control the camera. Connect it with USB and let EOS Utility transfer images into the watched folder. The later KOKO Photobooth application can write into this same folder and add capture/session metadata when that workflow is built.

The current API associates every uploaded file with the one album selected during setup. It does not yet create a new QR automatically for each Photobooth group. Do not configure a customer-private album as a public event gallery.
