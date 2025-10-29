# Google Drive Viewer

**Google Drive Viewer** is a lightweight, no-OAuth WordPress plugin that lets you embed and browse folders from your Google Drive directly on your site using a simple `[google_drive_viewer]` shortcode.

It uses a **server-side API key** (not client OAuth) for simplicity and security, supports **Shared Drives**, and provides a **Google Drive–style table interface** for navigating folders and downloading or previewing files.

---

## 🚀 Features

- ✅ Browse Google Drive folders directly within your WordPress pages  
- ✅ Uses API Key (no OAuth or Google login required)  
- ✅ Supports Shared Drives / Team Drives  
- ✅ Clean Google Drive–inspired interface  
- ✅ Cached API responses for performance  
- ✅ Works inside Elementor or any block/shortcode editor  
- ✅ Restrict access by WordPress capability (e.g., to logged-in dealers)  
- ✅ Built-in debug buffer and REST diagnostics  

---

## 📦 Installation

1. **Upload the plugin:**
   - Copy the entire `/google-drive-viewer/` folder into your site’s `/wp-content/plugins/` directory.
   - Or zip it and upload via **Plugins → Add New → Upload Plugin** in your WordPress admin.

2. **Activate it** via **Plugins → Installed Plugins**.

3. Go to **Settings → Google Drive Viewer** and configure it.

---

## ⚙️ Configuration

### 1. Create a Google Cloud API Key

1. Visit [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Create a new **API Key** (under *Credentials → Create Credentials → API Key*).
3. Click **Restrict Key** and set:
   - **Application restrictions:** Choose **IP addresses** → Add your server’s public IP (Hostinger cPanel will show this under *Advanced → Server Info*).
   - **API restrictions:** Choose **Restrict Key** → Select **Google Drive API**.
4. Save.

> ⚠️ **Do not use referrer restrictions** — these won’t work for server-side API calls.

---

### 2. Add Your Folder Mapping

In **Settings → Google Drive Viewer**, define which Drive folders you want to show:

