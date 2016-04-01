// for production:

var envs = {
  production: {
    GITHUB_CLIENT: '4d35ae56b0a8aad5cdbf',
    GATEKEEPER: 'https://ev3-sh-gatekeeper.herokuapp.com/',
    BROWSERIFYCDN: 'https://wzrd.in'
  },
  dev: {
    GITHUB_CLIENT: '4d35ae56b0a8aad5cdbf', // redirect goes to localhost:5000
    GATEKEEPER: 'https://ev3-sh-gatekeeper.herokuapp.com/',
    BROWSERIFYCDN: 'https://wzrd.in'
  }
}

module.exports = envs.dev
