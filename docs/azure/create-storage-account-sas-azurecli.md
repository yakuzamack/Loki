# 🚀 How to Create an Azure Storage Account and Generate a SAS Token

This guide provides step-by-step instructions for creating an **Azure Storage Account** and generating a **Shared Access Signature (SAS) token** with **full permissions** that expires in **3 months**. 

## **📌 Option 1: Using Azure CLI**
### **Prerequisites**
Before you begin, ensure you have:
- **Azure CLI** installed: [Installation Guide](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli)
- **Logged in to Azure** using the command:
  ```sh
  az login
  ```

Set the correct subscription (if applicable):
```
az account set --subscription "<SUBSCRIPTION_ID>"
```
🛠 Step 1: Create a Resource Group
A resource group is required to organize Azure resources.

```
az group create --name MyResourceGroup --location eastus
```
Replace MyResourceGroup with your preferred name.

🗂 Step 2: Create the Storage Account
Run the following command:

```
az storage account create \
    --name mystorageaccount12345 \
    --resource-group MyResourceGroup \
    --location eastus \
    --sku Standard_LRS \
    --kind StorageV2 \
    --access-tier Hot
```
- Replace mystorageaccount12345 with a unique name.
- Standard_LRS is the redundancy type.

🔑 Step 3: Generate a SAS Token
Retrieve the Storage Account Key:

```
az storage account keys list \
    --account-name mystorageaccount12345 \
    --resource-group MyResourceGroup \
    --query "[0].value" --output tsv
```

Copy the key value.

Create a SAS Token that expires in 3 months with all permissions:

```
az storage account generate-sas \
    --permissions rwdlacup \
    --account-name mystorageaccount12345 \
    --services bqt \
    --resource-types sco \
    --expiry $(date -u -d "3 months" '+%Y-%m-%dT%H:%MZ') \
    --https-only
```

- This generates a SAS token valid for:

  - Blobs (b), Queues (q), and Tables (t)
  - Service (s), Container (c), and Object (o)
  - All permissions: Read (r), Write (w), Delete (d), List (l), Add (a), Create (c), Update (u), Process (p)

- Copy the SAS Token and append it to your Storage Account URL:

```
https://mystorageaccount12345.blob.core.windows.net/?<SAS_TOKEN>
```
