#!/usr/bin/env node
'use strict'
const chalk = require('chalk')
const https = require('https')
const fs = require('fs')
const MongoClient = require('mongodb').MongoClient

const config = require('../config.json')
const utils = require('./utils')

let timeStamp = new Date()
let currTargProd = 0
const app = {}

MongoClient.connect(config.db.url, function (err, client) {
  console.log('connecting to mongo')
  if (err) {
    console.log('MonggDB error')
    console.log(chalk.red(err))
    utils.log('MonggDB error: ' + err)
    utils.endProcess(1, null)
  }
  else {
    app.client = client
    app.db = utils.selectCollection(app.client, config.targetExchange + '-' + config.targetProducts[currTargProd])
    console.log(chalk.green('Connected successfully to ' + config.db.name + ' database'))
    utils.log('Connected successfully to ' + config.db.name + ' database')
    let msg = 'Starting data-minion history for ' + app.db.s.name
    console.log(msg)
    utils.log(msg)
    init(app.db, client)
  }
})

function init(db, client) {
  const stamps = {
    end: timeStamp.toISOString().slice(0,-5)
  }
  const msg = 'Getting set ending at ' + stamps.end
  console.log(msg)
  utils.log(msg)
  timeStamp.setHours(timeStamp.getHours() - config.interval_in_hours)
  stamps.start = timeStamp.toISOString().slice(0,-5)
  const options = {
    hostname: config.targetAPIurl,
    path: utils.getTargetString(config, stamps, currTargProd),
    method: 'GET',
    agent: false,
    headers: {
      'User-Agent': 'node-client',
      'Accept' : 'application/json',
      'Content-Type': 'application/json',
    }
  }

  let data = ''
  const req = https.request(options, res => {
    if (res.statusCode == 200) console.log('GET call successful')
    res.on('data', d => {data += d})
    res.on('end', () => {
      data = JSON.parse(data)
      if (data.length > 0) {
        data = utils.normData(data)
        utils.insertData(client, db, data, recurse)
      }
      else {
        console.log('Finished data retrieval for ' + config.targetProducts[currTargProd])
        // Go to the next product.
        if (currTargProd < config.targetProducts.length - 1) {
          currTargProd++
          app.db = utils.selectCollection(app.client, config.targetExchange + '-' + config.targetProducts[currTargProd])
          timeStamp = new Date()
          let msg = 'Starting data-minion history for ' + app.db.s.name
          console.log(msg)
          utils.log(msg)
          init(app.db, client)
        } else if(currTargProd === config.targetProducts.length) {
          utils.endProcess()
        }
      }
    })
  })
  req.on('error', err => {
    console.error(chalk.red(err))
    utils.log('Request Error: ' + err)
    utils.endProcess(1, client)
  })
  req.end()
}

function recurse() {
  setTimeout(() => {
    init(app.db, app.client)
  }, 2000)
}
