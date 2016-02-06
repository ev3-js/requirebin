// for production:

var envs = {
  production: {
    GITHUB_CLIENT: '6854b77cb4d0e137ee58',
    GATEKEEPER: 'https://cycle-shell-gatekeeper.herokuapp.com',
    BROWSERIFYCDN: 'https://wzrd.in'
  },
  dev: {
    GITHUB_CLIENT: '6854b77cb4d0e137ee58', // redirect goes to localhost:5000
    GATEKEEPER: 'https://cycle-shell-gatekeeper.herokuapp.com',
    BROWSERIFYCDN: 'https://wzrd.in'
  }
}

module.exports = envs.dev
