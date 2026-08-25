output "container_names" {
  value = docker_container.web[*].name
}

output "urls" {
  value = [for c in docker_container.web : "http://localhost:${c.ports[0].external}"]
}
