'use strict'
const chalk = require('chalk')
const fs = require('fs')

const config = require('../config.json')

module.exports = {
  getTargetString: getTargetString,
  selectCollection: selectCollection,
  insertData: insertData,
  log: log,
  normData: normData,
  endProcess: endProcess
}

let logger = fs.createWriteStream(config.logDir + '/data-minion.log.txt', {'flags': 'a'})

function getTargetString (config, times, product) {
  let res =  config.targetProductString.map(function(x){
    switch (x) {
      case 'start': return times.start
      case 'end': return times.end
      case 'targetProduct': return config.targetProducts[product]
      default : return x
    }
  })
  res = res.join('')
  return res
}

function selectCollection (client, target) {
  let db = client.db(config.db.name)
  let collection = db.collection(target)
  return collection
}

function insertData (client, db, data, callback) {
  if (Array.isArray(data)) {
    db.insertMany(data, function(err, r){
      if (err) catchInsertManyError(data, err)
      else {
        console.log('Data inserted')
        log('Data inserted')
      }
      // else console.log('Insert result: ' + JSON.stringify(r))
      callback(client)
    })
  }
  else {
    console.error(chalk.red('API Error: ') + JSON.stringify(data))
    log('API Error: ' + JSON.stringify(data))
    endProcess(1, client)
  }
}

function catchInsertManyError (data,err) {
  console.log(chalk.blue(err))
  log('insertManyError: ' + err)
}

function log(data) {
  logger.write(nowstamp() + data + '\n', 'utf8')
}
function nowstamp() {return (new Date(Date.now()).toISOString() + ': ')}

function normData (data) {
  if (data.message) return data
  else {
    // map data to our schema
    data = data.map((x) => {
      return {
        _id: x[0],
        low: x[1],
        high: x[2],
        open: x[3],
        close: x[4],
        volume:x[5]
      }
    })
    // insert empty candles
    const res = []
    const l = data.length
    let i = 0
    while(i < l) {
      // make sure to enter first candle
      if (i == 0) {
        res.push(data[i])
      }
      else {
        // push sequentia candles
        if (Number(data[i -1]._id) - Number(data[i]._id) === 60) res.push(data[i])
        else {
          // or enter empty candles
          const offset = ((Number(data[i - 1]._id) - Number(data[i]._id)) / 60) - 1
          let c = 0
          while (c < offset) {
            res.push({
              _id: Number(data[i - 1]._id) - ((c + 1) * 60),
              volume: 0
            })
            c++
          }
          // then push the current candle
          res.push(data[i])
        }
      }
      i++
    }
    if (i === l) {
      return res
    }
  }
}

function endProcess (err, client) {
  if (err == null) {
    console.log(chalk.green('Process complete'))
    log('Process complete')
  }
  client.close()
  logger.end()
  process.exit()
}
