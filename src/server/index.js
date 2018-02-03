'use strict'
const chalk = require('chalk')
const https = require('https')
const MongoClient = require('mongodb').MongoClient

// const Gdax = require('gdax')
let inserted = 0
let matched = 0
let modified = 0


//
//  this section needs to come from a config file
//
const starter = '2018-01-13T22:00:00-00:00'
const ender   = '2018-01-14T00:00:00-00:00'

//scraper target
const targetExchange = 'GDAX'
const targetProduct = 'BCH-USD'
const targetAPIurl = 'api.gdax.com'
const targetProductString = '/products/' + targetProduct + '/candles?granularity=60&start=' + starter + '&end=' + ender
// dB info
const dbUrl = 'mongodb://localhost:27017'
const dbName = 'scraper'

const step = 7200


const normData = data => {
  return {
    _id: data[0],
    low: data[1],
    high: data[2],
    open: data[3],
    close: data[4],
    volume:data[5]  
  }
}
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
  const insertData = (data) => {
    return new Promise((resolve) => {
      const _id = data._id
      delete data._id
      db.updateOne({"_id": _id}, {$set: data}, {"upsert": true}, (err, r)=>{
        inserted += r.upsertedCount
        matched += r.matchedCount
        modified += r.modifiedCount
        resolve(r)
      })
    })
  }
  let data = ''
  
  const req = https.request(options, res => {
    if (res.statusCode == 200) console.log('GET call successful')
    inserted = 0
    matched = 0
    modified = 0
    res.on('data', d => {data += d})
    res.on('end', () => {
      data = JSON.parse(data)
      data = data.map(normData)
      data = data.map(insertData, db)
      const commit = Promise.all(data)
      commit
        .then(()=>{
          console.log(inserted + ' documents inserted')
          console.log(matched + ' documents matched')
          console.log(modified + ' documents modified')
        })
        .then(()=>{
          client.close()
          console.log('process complete')
          process.exit(0)
        })
        .catch(console.log.bind(console))
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
