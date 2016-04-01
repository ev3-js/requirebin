var Github = require('github-api')
var request = require('browser-request')
var events = require('events')
var url = require('url')
var ModalBody = require('./modal-body')

module.exports = Gist

function Gist (options) {
  this.github = new Github(options)
  this.parent = null
  this.forks = null
}

Gist.prototype = Object.create(events.EventEmitter.prototype)

Gist.prototype.getUser = function () {
  return this.github.getUser()
}

Gist.prototype.getList = function () {
  var self = this
  var Modal = new ModalBody(document.getElementById('modal-body'))
  Modal.clear()
  var user = this.github.getUser()
  user.gists(function (err, gists) {
    if (err) return err
    gists.forEach(function (gist) {
      Modal.fillModal(gist.description, gist.id, gist.owner.login + '/' + gist.id, self.getCode.bind(self))
    })
  })
}

Gist.prototype.save = function (gist, id, opts, callback) {
  var github = this.github

  var complete = function (err, gistId) {
    if (err) {
      if (typeof err !== 'string') err = JSON.stringify(err)
      err = Error(err)
    }

    callback(err, gistId)
  }

  github.getGist(id).read(function (err) {
    if (err && err.error === 404) {
      // a gist with this id does not exist. create a new one:
      github.getGist().create(gist, function (err, data) {
        if (err) return complete(err)
        complete(null, data)
      })
      return
    }
    // check for non-404 error
    if (err) return complete('get error' + JSON.stringify(err))

    // The gist exists. Update it:
    github.getGist(id).update(gist, function (err, data) {
      if (!err) return complete(null, data) // successful update.

      // Arbitrary error while updating
      if (err.error !== 404) return complete(err)

      github.getGist(id).fork(function (err, data) {
        if (err) return complete(err) // failed to fork

        github.getGist(data.id).update(gist, function (err, data) {
          if (err) return complete(err) // failed to update fork

          return complete(null, data) // successful fork update
        })
      })
    })
  })
}

Gist.prototype.load = function (id, callback) {
  return request('https://api.github.com/gists/' + id, callback)
}

Gist.prototype.forks = function (id, callback) {
  return request('https://api.github.com/gists/' + id + '/forks', callback)
}

Gist.prototype.getCode = function (gistID, cb) {
  var self = this
  var parsedURL = url.parse(window.location.href, true)
  var code = {}

  function invokeCallback () {
    cb(false, code)
  }

  function fromUrl () {
    var q = parsedURL.query
    for (var i = 0; i < arguments.length; i += 1) {
      q = q && q[arguments[i]]
    }
    return q
  }

  if (gistID) {
    this.emit('beforeLoadGist')
    return this.load(gistID, function (err, gist) {
      self.emit('loadGist')
      if (err) return cb(err)
      var json = JSON.parse(gist.body)
      if (!json.files || !json.files['index.js']) {
        return cb({error: 'no index.js in this gist', json: json})
      }
      var headHtml = json.files['page-head.html'] || {content: ''}
      var bodyHtml = json.files['page-body.html'] || {content: ''}
      code.head = headHtml.content
      code.body = bodyHtml.content
      // it's ensured that both files below are in the gist
      // otherwise the gist is corrupted
      code.meta = json.files['package.json'].content
      code.bundle = json.files['index.js'].content
      code.name = json.description

      self.processForks(json.forks, json.fork_of)
      invokeCallback()
    })
  }

  // priority:
  // - query.sketch[code|head|body|packageJson]
  // - localStorage.getItem(bundleCode|headCode|bodyCode|metaCode)
  // - default values set in ./editors
  code.bundle = fromUrl('sketch', 'code') ||
    window.localStorage.getItem('bundleCode') ||
    document.querySelector('#bundle-template').innerHTML
  code.head = fromUrl('sketch', 'head') ||
    window.localStorage.getItem('headCode') || ''
  code.body = fromUrl('sketch', 'body') ||
    window.localStorage.getItem('bodyCode') || ''
  code.meta = fromUrl('sketch', 'packageJson') ||
    window.localStorage.getItem('metaCode') || ''
  invokeCallback()
}

Gist.prototype.processForks = function (forks, parent) {
  if (parent) {
    this.parent = {
      id: parent.id,
      user: parent.owner.login,
      userOnGithub: parent.owner.html_url,
      gistLink: parent.url,
      requireBinLink: '?gist=' + parent.owner.login + '/' + parent.id
    }
  }
  this.forks = forks.map(function (fork) {
    return {
      id: fork.id,
      user: fork.user.login,
      userOnGithub: fork.user.html_url,
      gistLink: fork.url,
      requireBinLink: '?gist=' + fork.user.login + '/' + fork.id
    }
  })
}

Gist.fromUrl = function (parsedURL) {
  var gistID
  var tokens
  if (parsedURL.query.gist) {
    gistID = parsedURL.query.gist
  } else if (parsedURL.hash) {
    gistID = parsedURL.hash.replace('#', '')
  }
  if (!gistID) return
  if (gistID.indexOf('/') > -1) {
    var parts = gistID.split('/')
    tokens = {
      user: parts[0],
      id: parts[1]
    }
  } else {
    tokens = {
      id: gistID
    }
  }
  return tokens
}
