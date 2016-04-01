// explicity list globals here
var $ = window.$

var config = require('./config')
var createSandbox = require('./sandbox')
var url = require('url')
var request = require('browser-request')
var detective = require('detective')
var keydown = require('keydown-with-event')
var autoYield = require('auto-yield')

var cookie = require('./lib/cookie')
var Gist = require('./lib/github-gist.js')
var ui = require('./lib/ui-controller')
var editors = window.editors = require('./lib/editors')
var WindowConsole = require('./lib/console')
var ModalBody = require('./lib/modal-body')

initialize()

function initialize () {
  var sandbox
  var gistID
  var Console = new WindowConsole()
  var username = ''
  // dom nodes
  var outputEl = document.querySelector('#play')
  var actionsMenu = $('.actionsMenu')

  setTimeout(function () {
    initSandbox()
  })

  var sandboxOpts = {
    cdn: config.BROWSERIFYCDN,
    container: outputEl,
    iframeStyle: 'body, html { height: 100%; width: 100%; }'
  }

  function initSandbox () {
    sandbox = createSandbox(sandboxOpts)
    sandbox.on('modules', function (modules) {
      if (!modules) return
      packagejson.dependencies = {}
      modules.forEach(function (mod) {
        if (mod.core) return
        packagejson.dependencies[mod.name] = mod.version
      })
    })

    sandbox.on('bundleStart', function () {
      ui.$spinner.removeClass('hidden')
    })

    sandbox.on('bundleEnd', function (bundle) {
      ui.$spinner.addClass('hidden')
    })

    sandbox.on('bundleError', function (err) {
      ui.$spinner.addClass('hidden')
      console.log(err.stack)
      ui.tooltipMessage('error', 'Bundling error: \n\n' + err)
    })
  }

  var githubGist = new Gist({
    token: cookie.get('oauth-token'),
    auth: 'oauth'
  })
  var packagejson = {
    'version': '1.0.0',
    'dependencies': {
      'iframe-console': '0.1.13',
      'robot-loop': '0.1.13'
    }
  }
  var parsedURL = url.parse(window.location.href, true)
  var gistTokens = Gist.fromUrl(parsedURL)
  window.packagejson = packagejson

  var loggedIn = false
  if (cookie.get('oauth-token')) {
    $('#login').hide()
    githubGist.getUser().show(null, function (err, user) {
      if (err) console.warn(err)
      username = user.login
    })
    loggedIn = true
  }

  if (gistTokens) {
    gistID = gistTokens.id
    ui.enableShare(gistID)
  }

  window.addEventListener('message', function (msg) {
    Console.addMessage(msg)
  })

  // special parameter `code` is used to perform the auth + redirection
  // so no need to load the code
  if (parsedURL.query.code) return authenticate()

  var currentHost = parsedURL.protocol + '//' + parsedURL.hostname
  if (parsedURL.port) currentHost += ':' + parsedURL.port

  function doBundle () {
    var addRequires = 'require("iframe-console")()\n\n'
    sandbox.iframeHead = editors.get('head').getValue()
    sandbox.iframeBody = editors.get('body').getValue()
    packagejson = packagejson ? window.packagejson : packagejson
    var bundle = editors.get('bundle').getValue()
    if (packagejson.dependencies['robot-loop']) {
      bundle = autoYield(bundle, ['read', 'sleep', 'out'], ['move', 'motor'])
    }
    sandbox.bundle(addRequires + bundle, packagejson.dependencies)
  }

  // todo: move to auth.js
  function authenticate () {
    if (cookie.get('oauth-token')) {
      return
    }
    var match = window.location.href.match(/\?code=([a-z0-9]*)/)
    // Handle Code
    if (!match) return false
    var authURL = config.GATEKEEPER + '/authenticate/' + match[1]
    request({url: authURL, json: true}, function (err, resp, data) {
      if (err) return console.error(err)
      if (data.token === 'undefined') return console.error('Auth failed to acquire token')
      cookie.set('oauth-token', data.token)
      // Adjust URL
      var regex = new RegExp('\\?code=' + match[1])
      window.location.href = window.location.href.replace(regex, '').replace('&state=', '')
    })

    return true
  }

  function stringifyPackageJson () {
    return JSON.stringify(packagejson, null, '  ')
  }

  function saveGist (name, id, opts) {
    ui.$spinner.removeClass('hidden')
    var entry = editors.get('bundle').getValue()
    opts = opts || {}
    opts.isPublic = 'isPublic' in opts ? opts.isPublic : true

    doBundle()
    sandbox.once('bundleEnd', function (bundle) {
      var gist = {
        'description': name,
        'public': opts.isPublic,
        'files': {
          'index.js': {
            'content': entry
          },
          'requirebin.md': {
            'content': 'made with [cycle.sh](http://cycle.sh)'
          },
          'package.json': {
            'content': stringifyPackageJson()
          }
        }
      }

      // the gist can't have empty fields or the github api request will fail
      if (sandbox.iframeHead) gist.files['page-head.html'] = {'content': sandbox.iframeHead}
      if (sandbox.iframeBody) gist.files['page-body.html'] = {'content': sandbox.iframeBody}

      githubGist.save(gist, id, opts, function (err, newGist) {
        var newGistId = newGist.id
        if (newGist.owner && newGist.owner.login) {
          newGistId = newGist.owner.login + '/' + newGistId
        }
        ui.$spinner.addClass('hidden')
        if (err) ui.tooltipMessage('error', err.toString())
        if (newGistId && newGist.id !== id) window.location.href = '/?gist=' + newGistId
      })
    })
  }

  ui.$spinner.removeClass('hidden')
  // if gistID is not set, fallback to specific queryParams, local storage

  if (loggedIn) {
    setTimeout(function () {
      $('#username').text(username)
    })
    actionsMenu.dropkick({
      change: function (value, label) {
        if (value === 'noop') return
        if (value in actions) actions[value]()
        setTimeout(function () {
          actionsMenu.dropkick('reset')
        }, 0)
      }
    })
  }

  var actions = {
    play: function () {
      // only execute play if any editor is dirty
      var isDirty = editors.asArray()
        .filter(function (editor) {
          return editor.editor && !editor.editor.isClean()
        })
        .length > 0
      if (!isDirty) {
        return
      }

      // mark all the editors as clean
      editors.all(function (editor) {
        editor.editor.markClean()
      })

      ui.$runButton.addClass('disabled')
      ui.$preview.removeClass('disabled')
      ui.$spinner.addClass('hidden')
      doBundle()
    },

    load: function () {
      if (loggedIn) {
        $('#load-dialog').modal()
        return githubGist.getList()
      }
      startLogin()
    },

    preview: function () {
      var src = $('iframe').attr('src')
      $('#preview-btn').attr('href', src)
    },

    save: function (name) {
      if (loggedIn) {
        $('#load-dialog').modal()
        var Modal = new ModalBody(document.getElementById('modal-body'))
        Modal.clear()
        return Modal.createForm()
      }
      ui.$spinner.removeClass('hidden')
      startLogin()
    },

    'show-forks': function () {
      gistID && ui.showForks(githubGist.forks, githubGist.parent)
    },

    logout: function () {
      loggedIn = false
      cookie.unset('oauth-token')
      window.location.href = 'http://ev3.sh'
    },

    login: function () {
      startLogin()
    },

    'save-name': function (name) {
      this.save(name)
    }
  }

  function startLogin () {
    var loginURL = 'https://github.com/login/oauth/authorize' +
      '?client_id=' + config.GITHUB_CLIENT +
      '&scope=gist' +
      '&redirect_uri=' + currentHost +
      '&callback=load'
    window.location.href = loginURL
  }

  githubGist.getCode(gistID, function (err, code) {
    ui.$spinner.addClass('hidden')
    if (err) return ui.tooltipMessage('error', JSON.stringify(err))

    editors.init(code)
    editors.setActive('bundle')

    // actions done with the meta editor:
    // - update the value of the editor whenever it's focused (it always has a valid json)
    // - the runButton is disabled if the value it has is invalid
    function updatePackageJson () {
      var code = editors.get('meta').editor.getValue()
      try {
        ui.$runButton.removeClass('disabled')
        window.packagejson = packagejson = JSON.parse(code)
      } catch (e) {
        // don't allow running the code if package.json is invalid
        ui.$runButton.addClass('disabled')
      }
    }

    // perform an initial package.json check
    updatePackageJson()

    editors.get('meta')
      .on('afterFocus', function (editor) {
        editor.setValue(stringifyPackageJson())
      })
    editors.get('meta')
      .on('change', updatePackageJson)

    // remove the `disabled` class from the save button when any editor is updated
    editors.all(function (editor) {
      editor.on('change', function (e) {
        ui.$runButton.removeClass('disabled')
      })
    })

    var packageTags = $('.tagsinput')
    editors.get('bundle').on('valid', function (valid) {
      if (!valid) return
      ui.$runButton.removeClass('hidden')
      $('.editor-picker').removeClass('hidden')
      packageTags.html('')
      var modules = detective(editors.get('bundle').getValue())
      modules.map(function (module) {
        var tag =
          '<span class="tag"><a target="_blank" href="http://npmjs.org/' +
          module + '"><span>' + module + '&nbsp&nbsp</span></a></span>'
        packageTags.append(tag)
      })
      if (modules.length === 0) packageTags.append('<div class="tagsinput-add">No Modules Required Yet</div>')
    })

    // UI actions
    // TODO: move them to ui-controller.js

    $('.actionsButtons a').click(function () {
      var target = $(this)
      var action = target.attr('data-action')
      if (action in actions) actions[action]()
    })

    $('#save').click(function () {
      saveGist($('#name').val(), gistID)
    })

    // call actions.play from the button located in the instructions
    $('.run-btn').click(function (e) {
      e.preventDefault()
      $('a[data-action="play"]').click()
      return false
    })

    if (parsedURL.query.load) {
      actions.load()
    }

    keydown(['<meta>', '<enter>']).on('pressed', actions.play)
    keydown(['<control>', '<enter>']).on('pressed', actions.play)
    keydown(['<meta>', 'S']).on('pressed', function (pressed, e) {
      e.preventDefault()
      actions.play()
    })
    keydown(['<control>', 'S']).on('pressed', function (pressed, e) {
      e.preventDefault()
      actions.play()
    })

    // UI actions when there's no Gist
      // enable localStorage save when the user is working on a new gist
    editors.all(function (editor) {
      editor.on('change', function () {
        var code = editor.getValue()
        window.localStorage.setItem(editor.name + 'Code', code)
      })
    })

    // loads the current code on load
    setTimeout(function () {
      actions.play()
      // sandbox actions
    }, 500)
  })
}
