<div align="center">

# ✨ Heavenly Node ✨

*A sleek, high-performance web proxy & streaming service.*

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0.html)
[![Node.js Version](https://img.shields.io/badge/Node.js-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Status](https://img.shields.io/badge/Status-Active-brightgreen.svg)]()
[![Improved By](https://img.shields.io/badge/Improved%20By-Syshi-7c3aed?style=flat&logo=github)](https://github.com/)

---

</div>

## 🌌 Overview

**Heavenly Node** is a fast, lightweight, and modern web application proxy service designed for seamless web browsing and dynamic content streaming. Built on top of Node.js and Express, Heavenly Node processes web requests on-the-fly with minimal latency and high fidelity.

---

## ⚡ Features & Highlights

- 🚀 **On-The-Fly Processing:** Streams and modifies data on the fly without buffering entire responses.
- ✨ **Ethereal Blue Design:** Modern glassmorphism UI with smooth ambient glow and responsive layouts.
- 🔗 **Smart URL Rewriting:** Automatically handles relative URLs and search queries seamlessly.
- 📺 **Media Compatible:** Supports streaming media content directly through proxy middleware.
- 🛠️ **Easy Deployment:** Deploy to Vercel, AWS, Cyclic, or your own server in minutes.

---

## 🚀 One-Click Deployment

Deploy your own instance of **Heavenly Node** with a single click:

| Provider | Deploy Link |
| :--- | :--- |
| **Vercel** | [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fnfriedly%2Fnodeunblocker.com) |
| **AWS Amplify** | [![Deploy to AWS](https://oneclick.amplifyapp.com/button.svg)](https://console.aws.amazon.com/amplify/home#/deploy?repo=https://github.com/nfriedly/nodeunblocker.com) |
| **Cyclic** | [![Deploy to Cyclic](https://deploy.cyclic.sh/button.svg)](https://deploy.cyclic.sh/) |

---

## 💻 Local Quick Start

Get **Heavenly Node** running on your local machine in seconds:

### Prerequisites

- 🟢 [Node.js](https://nodejs.org/) (v16 or higher recommended)
- 📦 [npm](https://www.npmjs.com/)

### Installation Steps

1. **Clone or Download the Repository:**
   ```bash
   git clone https://github.com/nfriedly/nodeunblocker.com.git
   cd nodeunblocker.com
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Start the Server:**
   ```bash
   npm start
   ```

4. **Access the Application:**
   Open your browser and navigate to `http://localhost:8080/` ✨

---

## 🛠️ Technology Stack

- **Server Framework:** [Express.js](https://expressjs.com/)
- **Core Proxy Engine:** `unblocker` package
- **Multi-Process Management:** `gatling`
- **Frontend UI:** Vanilla HTML5, CSS3 Glassmorphism, Space Grotesk & Outfit typography

---

## Navigation Preferences

Quick Settings groups bookmark and main search navigation separately. Each has a New Tab preference and an independent about:blank preference. about:blank takes precedence and always opens a new tab; the New Tab preference is remembered. Direct bookmarks open normally in that tab for compatibility.

Show Proxied URL is enabled by default and uses real top-level `/proxy/…` navigation. Disabling it opens a Heavenly browsing page whose current website survives refresh within that browser session. about:blank keeps its native address; enabling Show Proxied URL displays the path inside Heavenly instead. Framed browsing includes Back, Forward, and Open normally controls. Pages that refuse framing recover through normal navigation, and Open normally remains available during slow loading.

Existing saved about:blank preferences apply to both new controls until changed independently. Bookmark and history storage formats stay compatible. Heavenly history records visits in all supported proxy launch modes, including redirects, in-page URL changes, and back/forward navigation.

### Verification

```bash
npm test

# Optional browser regressions; requires Playwright in the test environment.
# This script starts its own local app and fixture servers.
node test/browser/navigation_history.cjs
HEAVENLY_BROWSER=firefox node test/browser/navigation_history.cjs
HEAVENLY_BROWSER=webkit node test/browser/navigation_history.cjs

# Existing Chromium touch/ordering checks; start the app first.
node test/browser/bookmark_management.cjs
```

Browser checks use isolated profiles and emulated touch viewports. They do not establish physical iPad or touchscreen verification.

---

## 📜 License & Credits

This project is open-source and released under the terms of the **[GNU Affero General Public License v3.0](https://www.gnu.org/licenses/agpl-3.0.html)**.

- **Original Project:** Created by [Nathan Friedly](http://nfriedly.com/).
- **Improvements & Heavenly Rebrand:** Enhanced and maintained by **Syshi**.

---

<div align="center">
  <sub>Made with 💙 by Syshi &bull; Powered by Heavenly Node</sub>
</div>
