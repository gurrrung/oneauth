module.exports = {
  hasNull(target, requiredKeys) {
    for (const member of requiredKeys) {
      if (!target[member]) return true
    }
    return false
  },
}
