terraform {
  required_version = "= 1.16.5"
  backend "azurerm" {}
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.56"
    }
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
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
variable "sku" {
  type    = string
  default = "Standard_B2as_v2"
}
variable "zone" {
  type    = string
  default = "2"
}
variable "ssh_public_key" {
  type = string
  validation {
    condition     = startswith(var.ssh_public_key, "ssh-ed25519 ")
    error_message = "Proporciona la clave pública ED25519 de VetNotify."
  }
}
variable "admin_cidr" {
  type = string
  validation {
    condition     = can(cidrhost(var.admin_cidr, 0)) && endswith(var.admin_cidr, "/32")
    error_message = "Restringe SSH a la IPv4 administrativa /32."
  }
}
variable "budget_start" {
  type        = string
  description = "Primer día del mes UTC en formato YYYY-MM-01T00:00:00Z."
}
variable "repository" {
  type    = string
  default = "cristyags/VetNotify"
}

locals {
  name = "vetnotify-${var.suffix}"
  tags = { Project = "VetNotify", Scope = "workload" }
}

resource "azurerm_resource_group" "workload" {
  name     = "rg-${local.name}"
  location = var.location
  tags     = local.tags
}
resource "azurerm_virtual_network" "workload" {
  name                = "vnet-${local.name}"
  resource_group_name = azurerm_resource_group.workload.name
  location            = var.location
  address_space       = ["10.45.0.0/16"]
  tags                = local.tags
}
resource "azurerm_subnet" "workload" {
  name                 = "k3s"
  resource_group_name  = azurerm_resource_group.workload.name
  virtual_network_name = azurerm_virtual_network.workload.name
  address_prefixes     = ["10.45.1.0/24"]
}
resource "azurerm_network_security_group" "workload" {
  name                = "nsg-${local.name}"
  resource_group_name = azurerm_resource_group.workload.name
  location            = var.location
  tags                = local.tags

  security_rule {
    name                       = "https-and-acme"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_ranges    = ["80", "443"]
    source_address_prefix      = "Internet"
    destination_address_prefix = "*"
  }
  security_rule {
    name                       = "ssh-admin"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = var.admin_cidr
    destination_address_prefix = "*"
  }
}
resource "azurerm_public_ip" "workload" {
  name                = "ip-${local.name}"
  resource_group_name = azurerm_resource_group.workload.name
  location            = var.location
  allocation_method   = "Static"
  sku                 = "Standard"
  domain_name_label   = local.name
  zones               = [var.zone]
  tags                = local.tags
}
resource "azurerm_network_interface" "workload" {
  name                = "nic-${local.name}"
  resource_group_name = azurerm_resource_group.workload.name
  location            = var.location
  ip_configuration {
    name                          = "k3s"
    subnet_id                     = azurerm_subnet.workload.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.workload.id
  }
  tags = local.tags
}
resource "azurerm_network_interface_security_group_association" "workload" {
  network_interface_id      = azurerm_network_interface.workload.id
  network_security_group_id = azurerm_network_security_group.workload.id
}
resource "azurerm_linux_virtual_machine" "k3s" {
  name                            = local.name
  resource_group_name             = azurerm_resource_group.workload.name
  location                        = var.location
  zone                            = var.zone
  size                            = var.sku
  admin_username                  = "vetops"
  disable_password_authentication = true
  network_interface_ids           = [azurerm_network_interface.workload.id]
  custom_data                     = base64encode(templatefile("${path.module}/cloud-init.yaml.tftpl", { fqdn = azurerm_public_ip.workload.fqdn }))
  tags                            = local.tags

  admin_ssh_key {
    username   = "vetops"
    public_key = var.ssh_public_key
  }
  os_disk {
    name                 = "os-${local.name}"
    caching              = "ReadWrite"
    storage_account_type = "StandardSSD_LRS"
    disk_size_gb         = 64
  }
  source_image_reference {
    publisher = "Canonical"
    offer     = "ubuntu-24_04-lts"
    sku       = "server"
    version   = var.ubuntu_image_version
  }
  lifecycle {
    # Upgrade bootstrap scripts in place on an existing node.
    ignore_changes = [custom_data]
  }
  depends_on = [azurerm_network_interface_security_group_association.workload]
}

variable "ubuntu_image_version" { type = string }

resource "azurerm_consumption_budget_resource_group" "workload" {
  name              = "vetnotify-workload"
  resource_group_id = azurerm_resource_group.workload.id
  amount            = 20
  time_grain        = "Monthly"
  time_period { start_date = var.budget_start }
  dynamic "notification" {
    for_each = toset([50, 75, 90])
    content {
      enabled        = true
      threshold      = notification.value
      operator       = "GreaterThanOrEqualTo"
      threshold_type = "Actual"
      contact_roles  = ["Owner"]
    }
  }
}

resource "azurerm_user_assigned_identity" "plan" {
  name                = "id-vetnotify-plan"
  location            = var.location
  resource_group_name = azurerm_resource_group.workload.name
  tags                = local.tags
}
resource "azurerm_federated_identity_credential" "plan" {
  name                = "github-main-plan"
  resource_group_name = azurerm_resource_group.workload.name
  parent_id           = azurerm_user_assigned_identity.plan.id
  issuer              = "https://token.actions.githubusercontent.com"
  subject             = "repo:${var.repository}:ref:refs/heads/main"
  audience            = ["api://AzureADTokenExchange"]
}
resource "azurerm_role_assignment" "plan_read" {
  scope                = azurerm_resource_group.workload.id
  role_definition_name = "Reader"
  principal_id         = azurerm_user_assigned_identity.plan.principal_id
  principal_type       = "ServicePrincipal"
}

output "fqdn" { value = azurerm_public_ip.workload.fqdn }
output "resource_group" { value = azurerm_resource_group.workload.name }
output "vm_name" { value = azurerm_linux_virtual_machine.k3s.name }
output "plan_client_id" { value = azurerm_user_assigned_identity.plan.client_id }
output "plan_principal_id" { value = azurerm_user_assigned_identity.plan.principal_id }
