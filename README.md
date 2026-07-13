## SevisBirth: National CRVS Digital Public Infrastructure

A production-ready prototype of the Papua New Guinea Civil Registration and Vital Statistics (CRVS) system. Built on Digital Public Infrastructure (DPI) principles, this application demonstrates a secure, offline-capable, and legally compliant birth registration pipeline.

## Research Justification: Why Build This?

This system is not just a technical exercise; it is a direct response to documented national challenges and legal frameworks in Papua New Guinea:

1. **The Identity Crisis (UNICEF & PNG CRI):** 
   According to UNICEF, Papua New Guinea has one of the lowest birth registration rates in the East Asia and Pacific region, historically hovering around **13% to 20%**. Millions of children are "invisible" to the state, unable to access secondary education, open bank accounts, or claim land rights. SevisBirth bridges this gap by decentralizing capture to Health Workers.
2. **Geographic & Infrastructure Barriers:** 
   With over 85% of the population living in rural areas with limited internet connectivity, a traditional web portal fails. The CHW interface *must* be offline-first, utilizing local storage queues to sync data when connectivity returns.
3. **The Legal Framework (Civil Registration Act):** 
   The *Births, Deaths and Marriages Registration Act* legally mandates how identities are verified. Village births require a witness (Village Chief/Midwife) to legally attest to the birth. This system enforces that legally, requiring a Witness Name and explicit Data Agreement consent before submission.
4. **Digital Government Act 2022 & DICT Policy:** 
   PNG's Department of Information and Communications Technology (DICT) is pushing for a National Digital Identity (SevisPass) to act as a Single Sign-On (OIDC) for all government services. This system uses SevisPass to enforce **Tier 2 (Verified)** identity policies before high-trust actions (like CIR backend completion) can occur, ensuring data sovereignty.
5. **National Health Plan 2021-2030:** 
   Integrating CRVS with Health Information Systems (HIS) is a national objective. The Health Facility interface bridges the gap between hospitals (PMGH) and the civil registry.

---

## Key Features & System Capabilities

1. **Rural Offline-First CHW Interface:** 
   Community Health Workers in remote villages can toggle "Field Mode". The application uses browser `localStorage` to queue birth registrations securely on the device. A "Sync Queue" UI allows CHWs to push data to the national server once they return to cellular coverage.
2. **Legal Data Agreement & Consent:**
   Compliant with modern privacy standards. The CHW must physically read a data collection agreement to the parent/guardian and check the "Consent" box before the form can be submitted. A "Witness Name" is required for village births.
3. **Official CIR Backend Completion (BC ID Generation):**
   The PNGCIR Registrar no longer generates a National ID (NID). Instead, they are presented with a legal "Verification Dossier" cross-referencing facility data, witness names, and parent IDs. The Registrar completes the backend birth registration and generates a **Birth Certificate ID (BC ID)** / Identity Record (IR) Link.
4. **Verifiable Credential (VC) Wallet:**
   Once the CIR completes the registration, the Birth Certificate ID is pushed to the Parent/Citizen SevisWallet. The wallet generates a scannable QR code representing a mock W3C Verifiable Credential, allowing parents to selectively disclose their child's Name and BC ID to third parties (e.g., schools, banks) without revealing medical data.
5. **Tier-Based Trust Policy (OIDC):**
   High-trust actions (Ward Approval, CIR Registration Completion) are strictly blocked if the user authenticates with a Tier 1 (Unverified) SevisPass identity. Tier 2 (National ID Card verified) is enforced at the server level.
6. **Polished, Responsive UI/UX:**
   Built with Bootstrap 5, themed in PNG National Colors (Black, Red, Gold). Forms are constrained using a `.form-wrap` class for optimal reading width, with enlarged touch targets for mobile device usage in the field.

---

## System Architecture

*   **Frontend:** HTML5, Bootstrap 5, Chart.js (Analytics), Vanilla JS (Offline Sync logic).
*   **Backend:** PHP 8+ (Built-in server for prototyping).
*   **Database:** SQLite (Simulating the National CRVS Database).
*   **Identity Layer:** Mock SevisPass IdP (Simulating PNG's national OIDC provider).

### The 6 Core User Interfaces
| Role | Interface Purpose | Key Function |
| :--- | :--- | :--- |
| **CHW** | Village Capture | Offline forms, data consent, witness validation. |
| **Facility Admin** | Hospital Capture | Direct integration with facility births (HIS). |
| **Ward Officer** | Local Verification | Tier 2 policy enforcement, local government approval. |
| **CIR Registrar** | National Registry | Legal verification dossier, BC ID generation. |
| **Parent / Citizen** | SevisWallet | Viewing issued BC IDs, selective VC disclosure via QR. |
| **System Admin** | Analytics/Monitor | Exception handling, provincial charts, audit log review. |

---

## 💻 Setup & Installation

### Prerequisites
*   PHP 8.0 or higher installed and in your system PATH.
*   A modern web browser.

### Step 1: Get the Files
Create a folder named `sevisbirth` and place the three files (`database.php`, `mock_sevispass.php`, `index.php`) inside it.

### Step 2: Clear Old Data (Important!)
If you have run previous versions of this prototype, **delete** the `sevisbirth.db` file in your folder. The database schema has been significantly upgraded (replacing NID with BC ID) and will auto-generate fresh data on the next run.

### Step 3: Start the Servers
Open your terminal, navigate to the `sevisbirth` folder, and start two PHP servers:

**Terminal 1 (Main Application - Port 8000):**
```bash
cd sevisbirth
php -S localhost:8000
```

**Terminal 2 (Mock National IDP - Port 9000):**
```bash
cd sevisbirth
php -S localhost:9000 mock_sevispass.php
```

### Step 4: Access the App
Open your browser and go to: **http://localhost:8000**

---

## Testing the End-to-End Workflow

To see the full CRVS pipeline, follow these steps:

### 1. The CHW Rural Offline Capture
1. From the login screen, click **Community Health Worker**.
2. You will be redirected to the SevisPass IDP. Leave credentials as `png.citizen` / `demo`. Ensure **Tier 2** is selected. Click Authorize.
3. On the CHW Dashboard, toggle **"Field Mode (Offline)"**.
4. Fill out the form. Use `SP-PARENT-123` for the Mother's SevisPass ID. Enter a Witness Name.
5. **Check the Data Agreement box** and hit Submit. Notice it saves locally (simulated). Click "Sync Now" to push it to the database.

### 2. The Ward Officer Verification
1. Log out and log back in as the **Ward / District Officer** (Tier 2).
2. View the queue. Click **Verify** on the record the CHW just submitted.
3. *Try logging in as Tier 1 Ward Officer to see the system block you from verifying.*

### 3. The CIR Backend Registration
1. Log out and log in as the **PNGCIR National Registrar** (Tier 2).
2. Find the Ward Approved record and click **Verify Dossier**.
3. Review the cross-referenced data (Mother ID, Witness, Location).
4. Click **Approve & Generate BC ID**. The system completes the registration and creates a Birth Certificate ID (e.g., `BC-2024-000007`).

### 4. The Citizen Verifiable Wallet
1. Log out and log in as **Parent / Citizen**.
2. Because you used `SP-PARENT-123` for the mother in step 1, the new birth certificate will appear here alongside pre-seeded data.
3. Notice the **QR Code** generated for the verified credential, representing the selective disclosure of the Child's Name and BC ID.

### 5. System Admin Analytics
1. Log out and log in as **System Admin**.
2. View the Chart.js analytics showing Urban vs. Rural birth ratios and Provincial coverage.
3. Check the **Exception Queue** to see records stuck in disputes, and the **Audit Log** to see the immutable trail of every login, submission, and approval.
