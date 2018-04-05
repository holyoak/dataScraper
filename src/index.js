#!/usr/bin/env node
'use strict'
const chalk = require('chalk')
const https = require('https')
const fs = require('fs')
const MongoClient = require('mongodb').MongoClient

const config = require('../config.json')
const utils = require('./utils')

let timeStamp = new Date('Friday, December 22, 2017 12:53:20 AM GMT-08:00')
const app = {}

MongoClient.connect(config.dbUrl, function (err, client) {
  console.log('connecting to mongo')
  if (err) {
    console.log('MonggDB error')
    console.log(chalk.red(err))
    utils.log('MonggDB error: ' + err)
    utils.endProcess(1, null)
  }
  else {
    const db = client.db(config.dbName)
    const collection = db.collection(config.targetExchange + '-' + config.targetProduct)
    app.client = client
    app.db = collection
    const message = 'Starting data-minion history for '
      + config.targetExchange + '/' + config.targetProduct + '\n'
      + 'Connected successfully to ' + config.dbName + ' database'
    console.log(chalk.green(message))
    utils.log(message)
    init(collection, client)
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
    path: utils.getTargetString(config, stamps),
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
      data = utils.normData(data)
      utils.insertData(client, db, data, recurse)
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
