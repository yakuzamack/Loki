# Create Storage Account Using Azure Portal

Follow these steps to create a Storage Account and SAS Token via the Azure Portal.

## 🛠 Step 1: Create a Storage Account
1. Go to the Azure Portal.
2. Navigate to Storage accounts and click Create.
3. Configure the following:
    - Subscription: Select your subscription.
    - Resource Group: Click Create new or select an existing one.
    - Storage Account Name: Enter a unique name (e.g., 7200727c985343598e3646).
    - Redundancy: Locally Redundant Storage (LRS).
4. Click Review + Create, then Create.

## 🔑 Step 2: Generate a SAS Token
1. Go to Storage accounts in the Azure Portal.
2. Click on your storage account (mystorageaccount12345).
3. In the left menu, select Shared Access Signature.
4. Configure:
    - Permissions: Check all (Read, Write, Delete, List, Add, Create, Update, Process).
    - Allowed Services: Select Blob, Queue, Table.
    - Allowed Resource Types: Select Service, Container, Object.
    - Expiry Date: Set to 3 months from today.
    - Protocol: Choose HTTPS only.
5. Click Generate SAS and connection string.
6. Copy the SAS Token and Blob Service SAS URL.

## Step 3: Edit the Client and Agent Config Files
1. Copy your storage bin domain and SAS token value.
2. Modify `/agent/config.js` and `/client/config.js` to have the storage domain and SAS token.

## 🎯 Final Notes
- The SAS token provides full access to the storage account. 
  - If your payload is reversed they will be able to use the SAS token to read the C2 channels, provided they also have the AES key.

