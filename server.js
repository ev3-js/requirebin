var app = require('express')()

app.get('*', function (req, res) {
  res.send(__dirname + '/index.html')
})

app.listen(process.env.PORT)
