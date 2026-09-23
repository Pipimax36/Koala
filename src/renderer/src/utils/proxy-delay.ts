export function compareProxyDelay(
  a: { history: { delay: number }[] },
  b: { history: { delay: number }[] }
): number {
  const rank = (item: typeof a): number => {
    const delay = item.history.at(-1)?.delay
    return delay && delay > 0 ? delay : Number.POSITIVE_INFINITY
  }
  const left = rank(a),
    right = rank(b)
  return left === right ? 0 : left < right ? -1 : 1
}
