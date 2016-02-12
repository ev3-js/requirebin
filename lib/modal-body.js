module.exports = ModalBody

function ModalBody (target) {
  if (!(this instanceof ModalBody)) {
    return new ModalBody(target)
  }
  this.target = target
}

ModalBody.prototype.fillModal = function (msg, id, onclick) {
  this.target.innerHTML += `<button id="button-${id}" type="button" class="list-group-item">${msg}</button>`
  setTimeout(function () {
    $(`#button-${id}`).click(function () {
      return onclick(id, function () {
        window.location.href = '/?gist=' + id
      })
    })
  })
}

ModalBody.prototype.clear = function () {
  this.target.innerHTML = ''
}
