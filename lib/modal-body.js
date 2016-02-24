module.exports = ModalBody

function ModalBody (target) {
  if (!(this instanceof ModalBody)) {
    return new ModalBody(target)
  }
  this.target = target
}

ModalBody.prototype.fillModal = function (msg, id, gistID, onclick) {
  this.target.innerHTML += `<button id="button-${id}" type="button" class="list-group-item">${msg}</button>`
  setTimeout(function () {
    $(`#button-${id}`).click(function () {
      return onclick(gistID, function () {
        window.location.href = '/?gist=' + gistID
      })
    })
  })
}

ModalBody.prototype.clear = function () {
  this.target.innerHTML = ''
}
