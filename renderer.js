const remote = require('electron').remote
const dialog = remote.dialog
const fs = require('fs')
const path = require('path')

var is_new_file = true
var has_changes_made = true
var curFilePath = null
var curFileName = null
var exit_file_operation_complete = false


var showdown = require('showdown')
var converter = new showdown.Converter({
  omitExtraWLInCodeBlocks: true,
  parseImgDimensions: true,
  simplifiedAutoLink: true,
  excludeTrailingPunctuationFromURLs: true,
  strikethrough: true,
  tables: true,
  ghCodeBlocks: true,
  tasklists: true,
  smoothLivePreview: true,
  simpleLineBreaks: true,
  encodeEmails: true,
  openLinksInNewWindow: true
})

showdown.setFlavor('github')

var editor = ace.edit("editor")
editor.setTheme("ace/theme/monokai")
editor.getSession().setMode("ace/mode/markdown")
editor.getSession().setUseWrapMode(true)

document.getElementById('live-preview').innerHTML = converter.makeHtml(editor.getValue())

editor.getSession().on('change', function () {
  document.getElementById('file-modified').hidden = false
  has_changes_made = true
  document.getElementById('live-preview').innerHTML = converter.makeHtml(editor.getValue())
})






// Contextual menu buttons
document.getElementById('ctx-close-btn').addEventListener('click', function (e) { remote.getCurrentWindow().close() })
document.getElementById('ctx-min-btn').addEventListener('click', function (e) { remote.getCurrentWindow().minimize() })
document.getElementById('ctx-max-btn').addEventListener('click', function (e) {
  var window = remote.getCurrentWindow()
  if (!window.isMaximized()) window.maximize()
  else window.unmaximize()
})





// Opening and saving files

function save_file() {
  if (is_new_file) {
    dialog.showSaveDialog({
      title: 'Save file as...',
      buttonLabel: 'Save',
      filters: [
        { name: 'Markdown', extensions: ['md'] },
        { name: 'Plain text', extensions: ['txt'] },
        { name: 'All files', extensions: ['*'] }
      ]
    }, (filename) => {
      if (filename === undefined)
        return
      fs.writeFile(filename, editor.getValue(), function (err) {
        if (err) {
          let errNotify = new Notification('Conduit', {
            body: '(' + err.code + ') Error saving file: ' + err.message
          })
          return
        }

        is_new_file = false
        let saveNotification = new Notification('Conduit', {
          body: 'File saved successfully!'
        })

        update_filename_title(path.basename(filename))
        has_changes_made = false
      })
    })
  }
  else {
    // This is not a new file, so just overwrite changes
    fs.writeFile(curFilePath, editor.getValue(), function (err) {
      if (err) {
        let errNotify = new Notification('Conduit', {
          body: '(' + err.code + ') Error saving file: ' + err.message
        })
        return
      }
      document.getElementById('file-modified').hidden = true
      has_changes_made = false
    })
  }
}

function open_file() {
  dialog.showOpenDialog({
    title: 'Open Markdown File',
    buttonLabel: 'Open',
    filters: [
      { name: 'Markdown', extentions: ['md', 'markdown'] },
      { name: 'Plain text', extensions: ['txt'] },
      { name: 'All files', extensions: ['*'] }
    ],
    properties: ['openFile']
  }, (filenames) => {
    if (filenames === undefined)
      return
    fs.readFile(filenames[0], 'utf-8', function (err, data) {
      if (err) {
        let errNotify = new Notification('Conduit', {
          body: '(' + err.code + ') Error reading file: ' + err.message
        })
        return
      }
      editor.setValue(data)
      update_filename_title(path.basename(filenames[0]))
      document.getElementById('file-modified').hidden = true
      is_new_file = false
      has_changes_made = false
      curFilePath = filenames[0]
    })
  })
}

function display_unsaved_changes_dialog() {
  exit_file_operation_complete = false
  dialog.showMessageBox({
    type: 'warning',
    buttons: ['Cancel', 'Close without saving', 'Save changes'],
    defaultId: 2,
    title: 'Unsaved changes!',
    message: 'You currently have unsaved changes. Opening a new file will cause you to lose your work! What would you like to do?',
    cancelId: 0
  }, function (resp, checked) {
    console.info(resp)
    if (resp == 0)
      return
    else if (resp == 1) {
      // Close without saving
      exit_file_operation_complete = true
      return
    }
    else if (resp == 2) {
      // Save changes and close
      save_file()
      exit_file_operation_complete = true
    }
    else
      return
  })
  exit_file_operation_complete = false
}

function update_filename_title(filename) {
  document.getElementById('filename-text').innerHTML = filename
}






document.getElementById('ctx-open-btn').addEventListener('click', function (e) {
  if (has_changes_made) {
    display_unsaved_changes_dialog()
    if (exit_file_operation_complete)
      open_file()
  }
  else
    open_file()
})

document.getElementById('ctx-save-btn').addEventListener('click', function (e) { save_file() })
document.getElementById('ctx-new-btn').addEventListener('click', function (e) {
  if (has_changes_made) display_unsaved_changes_dialog()

  if (exit_file_operation_complete || !has_changes_made) {
    update_filename_title('untitled document')
    has_changes_made = false
    is_new_file = true
    editor.setValue('')
    document.getElementById('file-modified').hidden = false
  }
})