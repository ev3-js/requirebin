var consoleEl = document.getElementById('console')

var styles = {
  log: {
    color: 'black'
  },
  error: {
    color: 'red'
  },
  warn: {
    color: 'yellow'
  }
}

module.exports = Console

function Console (element) {
  this.element = element || consoleEl
}

Console.prototype.addMessage = function (msg) {
  this.element.innerHTML += `<div style="${objectToString(styles[msg.data.type])}">${msg.data.data}</div>`
  this.element.scrollTop = this.element.scrollHeight
}

Console.prototype.clear = function () {
  this.element.innerHTML = ''
}

function objectToString (obj) {
  var str = ''
  for (var key in obj) {
    str += `${key}: ${obj[key]};`
  }
  return str
}
