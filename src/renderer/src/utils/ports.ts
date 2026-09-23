export function validPorts(ports: number[]): boolean {
  if (ports.some((port) => !Number.isInteger(port) || port < 0 || port > 65535)) return false
  const enabled = ports.filter((port) => port !== 0)
  return new Set(enabled).size === enabled.length
}
