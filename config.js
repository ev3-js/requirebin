// for production:

var envs = {
  production: {
    GITHUB_CLIENT: '4d35ae56b0a8aad5cdbf',
    GATEKEEPER: 'https://ev3-sh-gatekeeper.herokuapp.com',
    BROWSERIFYCDN: 'https://my-browserify-cdn.herokuapp.com'
  },
  dev: {
    GITHUB_CLIENT: '548de78e3437268558d9', // redirect goes to localhost:5000
    GATEKEEPER: 'http://localhost:9999',
    BROWSERIFYCDN: 'https://my-browserify-cdn.herokuapp.com'
  }
}

module.exports = envs.production
