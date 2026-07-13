# 🇵🇬 SevisBirth V2: National CRVS Digital Public Infrastructure

A production-ready prototype of the Papua New Guinea Civil Registration and Vital Statistics (CRVS) system. Built on Digital Public Infrastructure (DPI) principles, this application demonstrates a secure, offline-capable, and federally verifiable birth registration pipeline.

## 🚀 Key Features & DPI Upgrades

This version represents a shift from a basic CRUD app to a realistic government-grade system:

1. **Rural Offline-First CHW Interface:** 
   Community Health Workers in remote villages can toggle "Field Mode". The application uses browser `localStorage` to queue birth registrations securely on the device. A "Sync Queue" UI allows CHWs to push data to the national server once they return to cellular coverage.
2. **Data Agreement & Consent:**
   Compliant with modern privacy standards. The CHW must physically read a data collection agreement to the parent/guardian and check the "Consent" box before the form can be submitted. A "Witness Name" (Village Chief/Midwife) is required for village births.
3. **Official CIR Verification Dossier:**
   The PNGCIR Registrar no longer just clicks "Approve". They are presented with a legal "Verification Dossier" cross-referencing facility data, witness names, and parent IDs. The system enforces a strict two-step audit (Verify → Issue NID) under the Civil Registration Act.
4. **Realistic SSO Architecture (OIDC):**
   The Mock SevisPass clearly displays the OpenID Connect (OIDC) authorization flow. The application acts as a Relying Party (RP), deferring all authentication to the national Identity Provider (IdP). No passwords are stored locally.
5. **Verifiable Credential (VC) Wallet:**
   The Parent/Citizen SevisWallet now generates a scannable QR code representing a mock W3C Verifiable Credential, allowing parents to selectively disclose their child's Name and NID to third parties (e.g., schools, banks) without revealing medical data.
6. **Tier-Based Trust Policy:**
   High-trust actions (Ward Approval, NID Issuance) are strictly blocked if the user authenticates with a Tier 1 (Unverified) SevisPass identity. Tier 2 (National ID Card verified) is enforced at the server level.

---

## 🛠️ System Architecture

*   **Frontend:** HTML5, Bootstrap 5, Chart.js (Analytics), Vanilla JS (Offline Sync logic).
*   **Backend:** PHP 8+ (Built-in server for prototyping).
*   **Database:** SQLite (Simulating the National CRVS Database).
*   **Identity Layer:** Mock SevisPass IdP (Simulating PNG's national OIDC provider).

### The 6 Core User Interfaces
| Role | Interface Purpose | Key Function |
| :--- | :--- | :--- |
| **CHW** | Village Capture | Offline forms, data consent, witness validation. |
| **Facility Admin** | Hospital Capture | Direct integration with facility births. |
| **Ward Officer** | Local Verification | Tier 2 policy enforcement, local government approval. |
| **CIR Registrar** | National Registry | Legal verification dossier, NID generation. |
| **Parent / Citizen** | SevisWallet | Viewing issued NIDs, selective VC disclosure via QR. |
| **System Admin** | Analytics/Monitor | Exception handling, provincial charts, audit log review. |

---

## 💻 Setup & Installation

### Prerequisites
*   PHP 8.0 or higher installed and in your system PATH.
*   A modern web browser.

### Step 1: Get the Files
Create a folder named `sevisbirth_v2` and place the three files (`database.php`, `mock_sevispass.php`, `index.php`) inside it.

### Step 2: Clear Old Data (Important!)
If you have run previous versions of this prototype, **delete** the `sevisbirth.db` file in your folder. The database schema has been significantly upgraded and will auto-generate fresh data on the next run.

### Step 3: Start the Servers
Open your terminal, navigate to the `sevisbirth_v2` folder, and start two PHP servers:

**Terminal 1 (Main Application - Port 8000):**
```bash
cd sevisbirth_v2
php -S localhost:8000
```

**Terminal 2 (Mock National IDP - Port 9000):**
```bash
cd sevisbirth_v2
php -S localhost:9000 mock_sevispass.php
```

### Step 4: Access the App
Open your browser and go to: **http://localhost:8000**

---

## 🧪 Testing the Workflows

To see the full end-to-end CRVS pipeline, follow these steps:

### 1. The CHW Rural Offline Capture
1. From the login screen, click **Community Health Worker**.
2. You will be redirected to the SevisPass IDP. Leave the credentials as `png.citizen` / `demo`. Ensure **Tier 2** is selected. Click Authorize.
3. On the CHW Dashboard, toggle **"Field Mode (Offline)"**.
4. Fill out the form. Use `SP-PARENT-123` for the Mother's SevisPass ID. Enter a Witness Name.
5. **Check the Data Agreement box** and hit Submit. Notice it saves locally (simulated). Click "Sync Now" to push it to the database.

### 2. The Ward Officer Verification
1. Log out and log back in as the **Ward / District Officer** (Tier 2).
2. View the queue. Click **Verify** on the record the CHW just submitted.
3. *Try logging in as Tier 1 Ward Officer to see the system block you from verifying.*

### 3. The CIR National Registry
1. Log out and log in as the **PNGCIR National Registrar** (Tier 2).
2. Find the Ward Approved record and click **Verify Dossier**.
3. Review the cross-referenced data (Mother ID, Witness, Location).
4. Click **Approve & Generate NID**. The system creates a legal National ID (e.g., `NID-2024-000007`).

### 4. The Citizen Verifiable Wallet
1. Log out and log in as **Parent / Citizen**.
2. Because you used `SP-PARENT-123` for the mother in step 1, the new birth certificate will appear here alongside pre-seeded data.
3. Notice the **QR Code** generated for the verified credential.

### 5. System Admin Analytics
1. Log out and log in as **System Admin**.
2. View the Chart.js analytics showing Urban vs. Rural birth ratios and Provincial coverage.
3. Check the **Exception Queue** to see records stuck in disputes, and the **Audit Log** to see the immutable trail of every login, submission, and approval.
```
