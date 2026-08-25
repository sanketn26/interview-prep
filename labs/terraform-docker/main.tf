terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

provider "docker" {}

resource "docker_image" "nginx" {
  name = "nginx:1.27"
}

resource "docker_container" "web" {
  count = var.web_count
  name  = "tf-web-${count.index}"
  image = docker_image.nginx.image_id

  ports {
    internal = 80
    external = 8080 + count.index
  }
}
