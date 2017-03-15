import test from 'tape'

import { isNil, EditorSession, map } from 'substance'
import { DocumentConfigurator, documentConversion, JsContext } from '../../index.es'
import CellEngine from '../../src/document/CellEngine'
import TestBackend from '../backend/TestBackend'

test('CellEngine: setup engine without cells', (t) => {
  t.plan(2)
  setupCellEngine()
  .then(({cellEngine}) => {
    t.notOk(isNil(cellEngine), 'Should have setup a CellEngine')
    t.equal(_getCells(cellEngine).length, 0, 'There should be no cells initially')
  })
})

test('CellEngine: setup engine but with initial cells', (t) => {
  t.plan(1)
  return setupEditorSession('/tests/documents/simple/default.html')
  .then(({editorSession}) => {
    const doc = editorSession.getDocument()
    doc.create({
      type: 'cell',
    })
    doc.create({
      type: 'inline-cell',
      path: ['p1', 'content'],
      startOffset: 1,
      endOffset: 2
    })
    doc.create({
      type: 'select',
      name: 'foo',
      path: ['p1', 'content'],
      startOffset: 4,
      endOffset: 5
    })
    doc.create({
      type: 'range-input',
      name: 'bar',
      path: ['p1', 'content'],
      startOffset: 7,
      endOffset: 8
    })
    const cellEngine = new CellEngine(editorSession)
    t.equal(_getCells(cellEngine).length, 4, 'There should be 4 cells')
  })
})

test('CellEngine: detect creation and deletion of cells', (t) => {
  _shouldUpdatedOnCreateDelete(t, 'cell')
})

test('CellEngine: detect creation and deletion of inline-cells', (t) => {
  _shouldUpdatedOnCreateDelete(t, 'inline-cell', {
    path: ['p1', 'content'],
    startOffset: 1,
    endOffset: 2
  })
})

test('CellEngine: detect creation and deletion of select', (t) => {
  _shouldUpdatedOnCreateDelete(t, 'select', {
    name: 'foo',
    path: ['p1', 'content'],
    startOffset: 1,
    endOffset: 2
  })
})

test('CellEngine: detect creation and deletion of range-input', (t) => {
  _shouldUpdatedOnCreateDelete(t, 'range-input', {
    name: 'foo',
    path: ['p1', 'content'],
    startOffset: 1,
    endOffset: 2
  })
})

function _shouldUpdatedOnCreateDelete(t, type, nodeData = {}) {
  t.plan(2)

  nodeData.type = type
  setupCellEngine()
  .then(({cellEngine, editorSession}) => {
    editorSession.transaction((tx) => {
      tx.create(nodeData)
    })
    let cells = _getCells(cellEngine)
    t.equal(cells.length, 1, 'There should be one cell registered after creation of cell.')
    editorSession.transaction((tx) => {
      tx.delete(cells[0].id)
    })
    cells = _getCells(cellEngine)
    t.equal(cells.length, 0, 'There should be no cells registered after deletion of cell.')
  })
}

function _getCells(cellEngine) {
  return map(cellEngine._cells).concat(map(cellEngine._inputs))
}

function setupCellEngine() {
  return setupEditorSession('/tests/documents/simple/default.html')
  .then(({editorSession}) => {
    const doc = editorSession.getDocument()
    const cellEngine =new CellEngine(editorSession)
    return {editorSession, doc, cellEngine}
  })
}

function setupEditorSession(archiveURL) {
  let configurator = new DocumentConfigurator()
  let backend = new TestBackend()
  let archive = backend.getArchive(archiveURL)
  return new Promise((resolve, reject) => {
    archive.readFile('index.html').then((docHTML) => {
      let doc = documentConversion.importHTML(docHTML)
      let editorSession = new EditorSession(doc, {
        configurator: configurator,
        context: {
          stencilaContexts: {
            'js': new JsContext()
          }
        }
      })
      resolve({editorSession})
    }).catch((err) => {
      reject(err)
    })
  })
}