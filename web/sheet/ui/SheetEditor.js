'use strict';

var Component = require('substance/ui/Component');
var SheetComponent = require('./SheetComponent');
var $$ = Component.$$;


function SheetEditor() {
  SheetEditor.super.apply(this, arguments);

  this.handleActions({
    'selectCell': this.selectCell,
    'activateCell': this.activateCell,
    'commitCell': this.commitCell,
  });

  this.selection = [0,0,0,0];
  this.startCellEl = null;
  this.endCellEl = null;

  // binding this, as these handlers are attached to global DOM elements
  this.onGlobalKeydown = this.onGlobalKeydown.bind(this);
  this.onGlobalKeypress = this.onGlobalKeypress.bind(this);
  this.onWindowResize = this.onWindowResize.bind(this);
}

SheetEditor.Prototype = function() {

  this.render = function() {
    var el = $$('div').addClass('sc-sheet-editor');
    el.append(
      $$(SheetComponent, { doc: this.props.doc }).ref('sheet')
    );
    el.append(
      $$('div').addClass('selection').ref('selection')
    );
    // react only to mousedowns on cells in display mode
    el.on('mousedown', 'td.display', this.onMouseDown);
    if (this._isEditing()) {
      el.on('keydown', this.onEditingKeyDown);
    }
    return el;
  };

  this.didMount = function() {
    // ATTENTION: we need to override the hacky parent implementation

    // HACK: without contenteditables we don't receive keyboard events on this level
    window.document.body.addEventListener('keydown', this.onGlobalKeydown, false);
    window.document.body.addEventListener('keypress', this.onGlobalKeypress, false);
    window.addEventListener('resize', this.onWindowResize, false);
  };

  this.dispose = function() {
    window.document.body.removeEventListener('keydown', this.onGlobalKeydown);
    window.document.body.removeEventListener('keypress', this.onGlobalKeypress);
    window.removeEventListener('resize', this.onWindowResize);
  };

  this.selectCell = function(cell) {
    if (this.activeCell && this.activeCell !== cell) {
      this.activeCell.disableEditing();
    }
    var node = cell.getNode();
    if (node) {
      console.log('Show expression bar.');
    }
    this._rerenderSelection();
    this.removeClass('edit');
  };

  this.activateCell = function(cell) {
    if (this.activeCell && this.activeCell !== cell) {
      this.activeCell.disableEditing();
    }
    this.activeCell = cell;
    this._rerenderSelection();
    this.addClass('edit');
  };

  this.commitCell = function(cell, key) {
    this.activeCell = null;
    this._commitCellContent(cell);
    if (key === 'enter') {
      this._selectNextCell(1, 0);
    } else {
      this.selectCell(cell);
    }
  };

  this.onMouseDown = function(event) {
    this.isSelecting = true;
    this.$el.on('mouseenter', 'td', this.onMouseEnter.bind(this));
    this.$el.one('mouseup', this.onMouseUp.bind(this));
    this.startCellEl = event.target;
    this.endCellEl = this.startCellEl;
    this._updateSelection();
  };

  this.onMouseEnter = function(event) {
    if (!this.isSelecting) return;
    if (this.endCellEl !== event.target) {
      this.endCellEl = event.target;
      this._updateSelection();
    }
  };

  this.onMouseUp = function() {
    this.isSelecting = false;
    this.$el.off('mouseenter');
    this._updateSelection();
    this.startCellEl = null;
    this.endCellEl = null;
  };

  /*
    Will be bound to body element to receive events while not
    editing a cell.

    Note: these need to be done on keydown to prevent default browser
    behavior.
  */
  this.onGlobalKeydown = function(event) {
    if (this._isEditing()) return;
    var handled = false;
    // LEFT
    if (event.keyCode === 37) {
      if (event.shiftKey) {
        this._expandSelection(0, -1);
      } else {
        this._selectNextCell(0, -1);
      }
      handled = true;
    }
    // RIGHT
    else if (event.keyCode === 39) {
      if (event.shiftKey) {
        this._expandSelection(0, 1);
      } else {
        this._selectNextCell(0, 1);
      }
      handled = true;
    }
    // UP
    else if (event.keyCode === 38) {
      if (event.shiftKey) {
        this._expandSelection(-1, 0);
      } else {
        this._selectNextCell(-1, 0);
      }
      handled = true;
    }
    // DOWN
    else if (event.keyCode === 40) {
      if (event.shiftKey) {
        this._expandSelection(1, 0);
      } else {
        this._selectNextCell(1, 0);
      }
      handled = true;
    }
    // ENTER
    else if (event.keyCode === 13) {
      this._activateCurrentCell();
      handled = true;
    }
    // SPACE
    else if (event.keyCode === 32) {
      console.log('Toggling view mode.');
      this._togglePreviewCell();
      handled = true;
    }
    if (handled) {
      event.stopPropagation();
      event.preventDefault();
    }
  };

  /*
    Will be bound to body element to receive events while not
    editing a cell.

    Note: only 'keypress' allows us to detect key events which
    would result in content changes.
  */
  this.onGlobalKeypress = function(event) {
    var character = String.fromCharCode(event.charCode);
    if (character) {
      console.log('TODO: overwrite cell content and activate cell editing.');
    }
  };

  this.onEditingKeyDown = function(event) {
    // console.log('####', event.keyCode, event);
    var handled = false;
    // ESCAPE
    if (event.keyCode === 27) {
      if (this.activeCell) {
        this.activeCell.disableEditing();
        this.removeClass('edit');
        this._rerenderSelection();
      }
      handled = true;
    }
    // ENTER
    else if (event.keyCode === 13) {
      this._commitCellContent(this.activeCell);
      this._selectNextCell(1, 0);
      handled = true;
    }
    // TAB
    else if (event.keyCode === 9) {
      this._commitCellContent(this.activeCell);
      if (event.shiftKey) {
        this._selectNextCell(0, -1);
      } else {
        this._selectNextCell(0, 1);
      }
      handled = true;
    }
    if (handled) {
      event.stopPropagation();
      event.preventDefault();
    }
  };

  this._isEditing = function() {
    return !!this.activeCell;
  };

  this._commitCellContent = function(cell) {
    var cellNode = cell.props.node;
    var sheet = this.refs.sheet;
    this.send('updateCell', cellNode, sheet);
  };

  this._getPosition = function(cellEl) {
    var row, col;
    if (cellEl.hasAttribute('data-col')) {
      col = cellEl.getAttribute('data-col');
      row = cellEl.parentNode.getAttribute('data-row');
    } else {
      throw new Error('FIXME!');
    }
    return {
      row: row,
      col: col
    };
  };

  this._updateSelection = function() {
    if (this.startCellEl) {
      var startPos = this._getPosition(this.startCellEl);
      var endPos = this._getPosition(this.endCellEl);
      var minRow = Math.min(startPos.row, endPos.row);
      var minCol = Math.min(startPos.col, endPos.col);
      var maxRow = Math.max(startPos.row, endPos.row);
      var maxCol = Math.max(startPos.col, endPos.col);
      var sel = [minRow, minCol, maxRow, maxCol];
      this.setSelection(sel);
    }
  };

  this._selectNextCell = function(rowDiff, colDiff) {
    var sel = this.selection;
    sel[0] = sel[0] + rowDiff;
    // TODO: also ensure upper bound
    if (rowDiff < 0) {
      sel[0] = Math.max(0, sel[0]);
    }
    sel[2] = sel[0];

    sel[1] = sel[1] + colDiff;
    // TODO: also ensure upper bound
    if (colDiff < 0) {
      sel[1] = Math.max(0, sel[1]);
    }
    sel[3] = sel[1];
    this.setSelection(sel);
  };

  this._expandSelection = function(rowDiff, colDiff) {
    var sel = this.selection;
    sel[2] = sel[2] + rowDiff;
    // TODO: also ensure upper bound
    if (rowDiff < 0) {
      sel[2] = Math.max(0, sel[2]);
    }

    sel[3] = sel[3] + colDiff;
    // TODO: also ensure upper bound
    if (colDiff < 0) {
      sel[3] = Math.max(0, sel[3]);
    }

    this.setSelection(sel);
  };

  this.setSelection = function(sel) {
    if (this.activeCell) {
      this.activeCell.disableEditing();
      this.activeCell = null;
      this.removeClass('edit');
    }
    this.selection = sel;
    this._rerenderSelection();
  };

  this._rerenderSelection = function() {
    var sel = this.selection;
    if (sel) {
      var rect = this.refs.sheet._getRectangle(sel);
      this.refs.selection.css(rect);
    }
  };

  this._togglePreviewCell = function() {
    var row = this.selection[0];
    var col = this.selection[1];
    var cell = this.refs.sheet.getCellAt(row, col);
    if (cell) {
      cell.togglePreview();
    }
  };

  this._activateCurrentCell = function() {
    var row = this.selection[0];
    var col = this.selection[1];
    var cell = this.refs.sheet.getCellAt(row, col);
    if (cell) {
      cell.enableEditing();
    }
  };

  this.onWindowResize = function() {
    this._rerenderSelection();
  };

};

Component.extend(SheetEditor);

module.exports = SheetEditor;
