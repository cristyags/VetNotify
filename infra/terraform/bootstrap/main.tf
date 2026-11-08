terraform {
  required_version = "= 1.16.5"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.56"
    }
  }
}

provider "azurerm" {
  features {}
  subscription_id     = var.subscription_id
  storage_use_azuread = true
}

variable "subscription_id" { type = string }
variable "location" {
  type    = string
  default = "mexicocentral"
}
variable "suffix" {
  type = string
  validation {
    condition     = can(regex("^[a-z0-9]{6,12}$", var.suffix))
    error_message = "Usa un sufijo alfanumérico dedicado a VetNotify."
  }
}

data "azurerm_client_config" "current" {}

resource "azurerm_resource_group" "state" {
  name     = "rg-vetnotify-state-${var.suffix}"
  location = var.location
  tags     = { Project = "VetNotify", Scope = "state" }
}

resource "azurerm_storage_account" "state" {
  name                            = "vetnotifyst${var.suffix}"
  resource_group_name             = azurerm_resource_group.state.name
  location                        = var.location
  account_tier                    = "Standard"
  account_replication_type        = "LRS"
  min_tls_version                 = "TLS1_2"
  shared_access_key_enabled       = false
  allow_nested_items_to_be_public = false
  default_to_oauth_authentication = true
  https_traffic_only_enabled      = true
  tags                            = { Project = "VetNotify", Scope = "state" }

  blob_properties {
    versioning_enabled = true
    delete_retention_policy { days = 14 }
    container_delete_retention_policy { days = 14 }
  }
}

resource "azurerm_storage_container" "state" {
  name                  = "tfstate"
  storage_account_id    = azurerm_storage_account.state.id
  container_access_type = "private"
}

resource "azurerm_role_assignment" "bootstrap_state" {
  scope                = azurerm_storage_container.state.resource_manager_id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = data.azurerm_client_config.current.object_id
  principal_type       = "User"
}

output "resource_group" { value = azurerm_resource_group.state.name }
output "storage_account" { value = azurerm_storage_account.state.name }
output "container" { value = azurerm_storage_container.state.name }
