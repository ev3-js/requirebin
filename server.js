var app = require('express')

app.get('*', function (req, res) {
  res.send('index.html')
})

app.listen(process.env.PORT)
