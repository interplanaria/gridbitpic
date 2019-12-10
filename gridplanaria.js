const Planaria = require('gridplanaria')
const MongoClient = require('mongodb')
const mingo = require('mingo')
const path = require('path')
const bitpic = require('bitpic')
const fs = require('fs')
var db;
const save = function(tx) {
  let hash = tx.tx.h;
  let ps = tx.out.map(function(out) {
    return new Promise(function(resolve, reject) {
      let buf = null
      let content
      if (out.tape.length > 2) {
        if (out.tape[1].cell[1].lb && typeof out.tape[1].cell[1].lb === 'string') {
          buf = Buffer.from(out.tape[1].cell[1].lb, 'base64');
        } else if (out.tape[1].cell[1].b && typeof out.tape[1].cell[1].b === 'string') {
          buf = Buffer.from(out.tape[1].cell[1].b, 'base64');
        }
        fs.writeFile(process.cwd() + '/files/' + out.tape[2].cell[1].s, buf, function(er) {
          if (er) {
            console.log("Error = ", er)
            reject()
          } else {
            resolve(out.tape[2].cell[1].s)
          }
        })
      } else {
        resolve(null)
      }
    })
  })
  return Promise.all(ps)
}
const connect = function(cb) {
  MongoClient.connect("mongodb://localhost:27017", {useNewUrlParser: true}, function(err, client) {
    if (err) {
      console.log("retrying...")
      setTimeout(function() {
        connect(cb);
      }, 1000)
    } else {
      let id = "bitpic"
      db = client.db(id)
      cb();
    }
  })
}
const planaria = new Planaria();
var _filter = new mingo.Query({
  "out.tape.cell.s": "18pAqbYqhzErT6Zk3a5dwxHtB9icv8jH2p"
})
planaria.start({
  filter: {
    //"from": 609000,
    "from": 609341,
    "host": {
      rpc: { user: "root", pass: "bitcoin" }
    },
    "l": {
      filter: (e) => {
        let matched = (
          e.out[0].tape.length > 2 &&
          e.out[0].tape[2] &&
          e.out[0].tape[2].cell[0] &&
          e.out[0].tape[2].cell[0].s === "18pAqbYqhzErT6Zk3a5dwxHtB9icv8jH2p" ) ||
          (
            e.out.length > 1 &&
            e.out[1].tape.length > 2 &&
            e.out[1].tape[2] &&
            e.out[1].tape[2].cell[0] &&
            e.out[1].tape[2].cell[0].s === "18pAqbYqhzErT6Zk3a5dwxHtB9icv8jH2p"
          )
        if (matched) console.log("Matched", JSON.stringify(e,null,2))
        return matched
      }
    }
  },
  onmempool: async function(e) {
    console.log("E = ", e)
    let valid = await bitpic.verify(e.tx, { format: "bob" })
    if (valid) {
      let paymails = await save(e.tx)
      let paymail = paymails.filter((p) => {
        return p
      })
      console.log("delete u")
      try {
        await db.collection("u").deleteMany({
          "out.tape.cell.s": {
            "$in": paymail
          }
        })
        console.log("delete c")
        await db.collection("c").deleteMany({
          "out.tape.cell.s": {
            "$in": paymail
          }
        })
        console.log("insert u", e.tx)
        await db.collection("u").insertMany([e.tx])
        console.log("Inserted u")
      } catch (e) {
        console.log("Error", e)
      }
    } else {
      console.log("Invalid format", e.tx.tx.h)
    }
  },
  onblock: function(e) {
    console.log("onblock")
    return new Promise((resolve, reject) => {
      let txArrayStream = e.tx(100) // Get a stream of transaction arrays
      console.time("block " + e.header.height)
      txArrayStream.on("data", async (txArray) => {
        txArrayStream.pause();

        let invalidTxs = [];
        for(let i=0; i<txArray.length; i++) {
          let valid = await bitpic.verify(txArray[i], { format: "bob" })
          if (valid) {
            let paymails = await save(txArray[i])
            let paymail = paymails.filter((p) => {
              return p
            })
            await db.collection("c").deleteMany({
              "out.tape.cell.s": {
                "$in": paymail
              }
            })
          } else {
            console.log("Invalid format", txArray[i].tx.h)
            invalidTxs.push(txArray[i].tx.h)
          }
        }
        if (invalidTxs.length > 0) {
          console.log("Filtering invalid txs...", invalidTxs)
          txArray = txArray.filter((tx) => {
            return invalidTxs.includes(tx.tx.h)
          })
        }
        let paymailSet = new Set();
        let dedupTxArray = [];
        for(let i=txArray.length-1; i>=0; i--) {
          let tx = txArray[i];
          let paymail = tx.out[0].tape[2].cell[1].s
          console.log("FOund paymail", paymail)
          if (!paymailSet.has(paymail)) {
            dedupTxArray.push(tx) 
          }
          paymailSet.add(paymail)
        }
        txArray = dedupTxArray.reverse()
        console.log("inserting", txArray.length)
        try {
          await db.collection("c").insertMany(txArray) // insert each batch
        } catch (err) {
          console.log("Error = ", err)
        }
        console.log("inserted")
        txArrayStream.resume();
      })
      .on("end", () => {
        console.log("block End", e.header.height)
        db.collection("u").deleteMany({}).then(() => {
          console.timeEnd("block " + e.header.height)
          resolve()
        })
      })
    })
  },
  onstart: function(e) {
    return new Promise(async function(resolve, reject) {
      if (!e.tape.self.start) {
        await planaria.exec("docker", ["pull", "mongo:4.0.4"])
        await planaria.exec("docker", ["run", "-d", "-p", "27017-27019:27017-27019", "-v", process.cwd() + "/db:/data/db", "mongo:4.0.4"])
      }
      if (!fs.existsSync(process.cwd() + "/files")) {
        fs.mkdirSync(process.cwd() + "/files")
      }
      connect(async () => {
        console.log("creating index")
        await db.collection("c").createIndex({"tx.h": 1}, { unique: true})
        await db.collection("c").createIndex({"blk.i": 1})
        await db.collection("c").createIndex({"out.tape.cell.s": 1})
        await db.collection("u").createIndex({"tx.h": 1}, { unique: true})
        await db.collection("u").createIndex({"out.tape.cell.s": 1})
        console.log("created index")
        if (e.tape.self.start) {
          await db.collection("c").deleteMany({
            "blk.i": { "$gt": e.tape.self.end }
          })
          resolve()
        } else {
          resolve();
        }
      })
    })
  },
})
