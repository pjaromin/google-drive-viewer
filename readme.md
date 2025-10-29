# Google Drive Viewer - Wordpress Plugin

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

```
resources=1AbCDefGhijkLmNoPQrstUVwxYZ12345
manuals=1ZXCVbnm1234asdfQWERtyui5678hjkl
```

Each line maps a shortcode key (e.g., `resources`) to a Google Drive Folder ID  
(found in the URL: `https://drive.google.com/drive/folders/<FOLDER_ID>`).

---

### 3. Optional Settings

| Setting | Description |
|----------|-------------|
| **Cache TTL** | Seconds to cache Drive API responses (default 300 = 5 minutes). |
| **Restrict Capability** | Limit access to users with a specific WordPress capability (e.g., `dealer`, `manage_options`, or `read`). Leave blank for public access. |

---

## 🧩 Usage

Add the shortcode to any page or Elementor section:

```shortcode
[google_drive_viewer key="resources"]
```

This will render an embedded Google Drive-style browser for the folder mapped to the key `resources`.

You can add multiple folders on the same page by using different keys.

---

## 🎨 Customization

### Editing the Style

The main stylesheet is located at:
```
/wp-content/plugins/google-drive-viewer/assets/gdv.css
```

You can safely modify or override this via your theme or child theme.

Typical customizations include:
- Changing link color (`#1a73e8`) or hover color (`#f6f8fb`)
- Adjusting font sizes, row height, or table padding
- Replacing or resizing icons
- Changing table border, background, or hover styles

### Editing the Interface / Behavior

Front-end logic resides in:
```
/wp-content/plugins/google-drive-viewer/assets/gdv.js
```

You can:
- Add support for new MIME types in the `iconFor()` function
- Change or add columns in the table markup (`render()` function)
- Customize the file actions (e.g., open preview in modal instead of new tab)

---

## 🧠 Developer Notes

### REST Endpoints

| Endpoint | Description | Method |
|-----------|--------------|--------|
| `/wp-json/gdv/v1/ping` | Health check | `GET` |
| `/wp-json/gdv/v1/debug` | Returns last 50 debug log lines | `GET` |
| `/wp-json/gdv/v1/list?folderId=XXXX` | Returns folder listing (files + subfolders) | `GET` |

All endpoints require a valid REST nonce header (`X-WP-Nonce`) automatically handled by the plugin’s front end.

---

### Debugging

If you encounter errors:
1. Check `Settings → Google Drive Viewer` for your API key and folder mappings.  
2. Open your browser console and look for messages like:
   ```
   Google Drive Viewer error: REST 500
   ```
3. Visit:
   ```
   /wp-json/gdv/v1/debug
   ```
   to view the last 50 debug log lines stored in WordPress options.

---

## 🪶 Example Output

A typical embedded folder view looks like this:

| Name | Last updated | Actions |
|------|---------------|----------|
| 📁 Manuals | 10/22/2025 | – |
| 📄 Product Price List.pdf | 10/20/2025 | 🔍 ⬇️ |
| 📊 Inventory 2024.xlsx | 10/18/2025 | 🔍 ⬇️ |

- Click a **folder name** to navigate  
- Click a **file name** to open preview  
- Use **View (🔍)** or **Download (⬇️)** icons for actions  

---

## 🧱 Folder Security Notes

This plugin displays **publicly shared folders** from Google Drive.  
To restrict access:
- Use the **Restrict Capability** setting (so only logged-in users can view it), or  
- Use Google Drive’s sharing options (“Anyone with the link” read-only or domain-limited sharing).

---

## 🧩 Advanced Configuration

### Elementor Compatibility
Fully compatible — just drop a “Shortcode” widget into any Elementor layout and add:
```
[google_drive_viewer key="resources"]
```

### Caching
Drive API responses are cached in WordPress transients for the duration specified in **Cache TTL**.  
Default: 300 seconds (5 minutes).

### Supported File Types
Built-in MIME-to-icon mapping includes:
- Folders  
- PDFs  
- Images (JPG, PNG, SVG, etc.)  
- Audio / Video  
- Google Sheets / Excel  
- Google Slides / Presentations  
- Google Docs / Word  
- CSV / Text  
- Generic fallback document icon  

---

## 🧑‍💻 Contributing

Pull requests are welcome!  
To contribute:
1. Fork this repo  
2. Create a feature branch  
3. Submit a PR with a brief description of the change  

Ideas:
- Add MIME icons for more file types  
- Add dark mode  
- Add column sorting or pagination  
- Add folder upload (authenticated version)

---

## 🛠️ Technical Stack

- **Language:** PHP 7.4+ / JavaScript (ES6)  
- **Framework:** WordPress REST API  
- **Storage:** WordPress transients + options (no custom tables)  
- **UI:** Pure CSS + SVG (no dependencies)

---

## 🪪 License

Released under the **GNU General Public License v2 (GPL-2.0)**.  
You are free to use, modify, and redistribute under the same license.

---

## 🧾 Credits

Developed by **ZDL Pro Audio Group**  
Author: [Jaromin Guitars / Zeppelin Design Labs](https://dealer.zdlpro.com)  
Lead Developer: Patrick Jaromin  (OK, it was really ChatGPT 5.0)

© 2025 ZDL Pro Audio Group. All rights reserved.
