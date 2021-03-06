import { forEach } from 'substance'
import Host from '../host/Host'
import ArticleEngineAdapter from '../article/ArticleEngineAdapter'
import SheetEngineAdapter from '../sheet/SheetEngineAdapter'
import getQueryStringParam from '../util/getQueryStringParam'

export default function setupStencilaContext(archive) {
  // Get configuration options from environment variables and query parameters
  const libs = {
    core: window.STENCILA_LIBCORE
  }
  // Stencila Host (for requesting external execution contexts etc)
  let hosts = []
  // Use the origin as a remote Stencila Host?
  if (window.STENCILA_ORIGIN_HOST) {
    hosts.push(window.location.origin)
  }
  // List of any other remote Stencila Hosts
  // Deprecated `peers` configuration option (hosts seems like a less confusing name)
  const hostsExtra = (
    getQueryStringParam('hosts') || window.STENCILA_HOSTS ||
    getQueryStringParam('peers') || window.STENCILA_PEERS
  )
  if (hostsExtra) hosts = hosts.concat(hostsExtra.split(','))
  // Try to discover hosts on http://127.0.0.1?
  const discover = parseFloat(getQueryStringParam('discover') || window.STENCILA_DISCOVER || '-1')
  // Instantiate and initialise the host
  let host = new Host({libs, peers:hosts, discover})
  return host.initialize().then(() => {
    let entries = archive.getDocumentEntries()
    forEach(entries, entry => {
      let { id, type } = entry
      let editorSession = archive.getEditorSession(id)
      if (type === 'article') {
        let engineAdapter = new ArticleEngineAdapter(editorSession)
        engineAdapter.connect(host.engine, { id })
      } else if (type === 'sheet') {
        let engineAdapter = new SheetEngineAdapter(editorSession)
        engineAdapter.connect(host.engine, { id })
      }
    })
    return {
      host,
      functionManager: host.functionManager,
      engine: host.engine
    }
  })
}
