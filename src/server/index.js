'use strict'
const chalk = require('chalk')
const https = require('https')
const MongoClient = require('mongodb').MongoClient

// const Gdax = require('gdax')


//
//  this section needs to come from a config file
//
//scraper target
const targetAPIurl = 'api.gdax.com'
const targetProduct = '/products/ETH-USD/candles?granularity=60'
// dB info
const dbUrl = 'mongodb://localhost:27017'
const dbName = 'scraper'
//  end config section

init()
function init() {


const options = {
  hostname: targetAPIurl,
  path: targetProduct,
  method: 'GET',
  agent: false,
  headers: {
    'User-Agent': 'something',
  },
}

const req = https.request(options, res => {
  console.log('statusCode:', res.statusCode)
  console.log('headers:', res.headers)

  res.on('data', d => {
    process.stdout.write(d)
  })
})

req.on('error', e => {
  console.error(chalk.red(e))
})
req.end()
  // const publicClient = new Gdax.PublicClient()
  // publicClient.getProductTradeStream('BTC-USD', 8408000, 8409000)
  //   .then((data)=>{
  //     myCallback(null, 1, data)
  //   })
}
