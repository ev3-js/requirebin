module.exports = ModalBody

function ModalBody (target) {
  if (!(this instanceof ModalBody)) {
    return new ModalBody(target)
  }
  this.target = target
}

ModalBody.prototype.fillModal = function (msg) {
  this.target.innerHTML += `<div>${msg}</div>`
}

ModalBody.prototype.clear = function () {
  this.target.innerHTML = ''
}
