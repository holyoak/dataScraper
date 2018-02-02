'use strict'
const chalk = require('chalk')
const https = require('https')
const MongoClient = require('mongodb').MongoClient

// const Gdax = require('gdax')


//
//  this section needs to come from a config file
//
const starter = '2018-02-01T22:00:00-00:00'
const ender   = '2018-02-02T00:00:00-00:00'

//scraper target
const targetExchange = 'GDAX'
const targetProduct = 'BCH-USD'
const targetAPIurl = 'api.gdax.com'
const targetProductString = '/products/BCH-USD/candles?granularity=60&start=' + starter + '&end=' + ender
// dB info
const dbUrl = 'mongodb://localhost:27017'
const dbName = 'scraper'

const step = 7200
//  end config section
//  
MongoClient.connect(dbUrl, function (err, client) {
  console.log('connecting to mongo')
  if (err) console.log(chalk.red(err))
  else {
    const db = client.db(dbName)
    const collection = db.collection(targetExchange + '-' + targetProduct)
    init(collection, client)
    console.log(chalk.green('Connected successfully to ' + dbName + ' database'))
  }
})

function init(db, client) {
  const options = {
    hostname: targetAPIurl,
    path: targetProductString,
    method: 'GET',
    agent: false,
    headers: {
      'User-Agent': 'something',
    },
  }
  let data = ''
  
  const req = https.request(options, res => {
    console.log('statusCode:', res.statusCode)
    
    res.on('data', d => {data += d})
    res.on('end', () => {
      data = JSON.parse(data)
      data.forEach((d, i)=>{
        console.log('insert #' + i)
        db.insertOne({
          time: d[0],
          low: d[1],
          high: d[2],
          open: d[3],
          close: d[4],
          volume:d[5]
        })
      })
    })
  })
  req.on('error', e => {console.error(chalk.red(e))})
  req.end()
  // const publicClient = new Gdax.PublicClient()
  // publicClient.getProductTradeStream('BTC-USD', 8408000, 8409000)
  //   .then((data)=>{
  //     myCallback(null, 1, data)
  //   })
}
