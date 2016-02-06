var app = require('express')()

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html')
})

app.get('*', function (req, res) {
  res.sendFile(__dirname + req.path)
})

app.listen(process.env.PORT || 3000)
