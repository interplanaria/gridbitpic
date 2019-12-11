const { planarium, planaria } = require('neonplanaria')
const bitquery = require('bitquery')
const express = require('express')
const fs = require('fs')
const ejs = require('ejs')
const id = "bitpic"
var template;
fs.readFile("public/show.ejs", "utf-8", (err, str) => {
  console.log("str = ", str)
  template = ejs.compile(str);
})
planarium.start({
  name: "bitpic",
  port: 3004,
  onstart: async function() {
    let db = await bitquery.init({ url: "mongodb://localhost:27017", address: id });
    return { db: db };
  },
  onquery: function(e) {
    let code = Buffer.from(e.query, 'base64').toString()
    let req = JSON.parse(code)
    if (req.q && req.q.find) {
      e.core.db.read(id, req).then(function(result) {
        e.res.json(result)
      })
    } else {
      e.res.json([])
    }
  },
  custom: function (e) {
    e.app.use(express.static('public'))
    e.app.set('view engine', 'ejs');
    e.app.get('/', (req, res) => {
      res.sendFile(process.cwd() + "/public/index.html")
    })
    e.app.get('/about', (req, res) => {
      res.sendFile(process.cwd() + "/public/about.html")
    })
    e.app.get('/upload', (req, res) => {
      res.sendFile(process.cwd() + "/public/upload.html")
    })
    e.app.get('/me/:paymail', (req, res) => {
      // user avatar landing page
      res.set('Content-Type', 'text/html');
      console.log(req.url)
      let url = req.originalUrl
      let r = template({
        paymail: req.params.paymail,
      })
      res.send(Buffer.from(r))
    })
    e.app.get('/u/:paymail', (req, res) => {
      // avatar serve
      res.setHeader("Content-Type","image/jpeg");
      let filename = process.cwd() + "/files/" + req.params.paymail
      fs.access(filename, (err) => {
        if (err) {
          filename = process.cwd() + "/public/unknown.png"
        }
        let filestream = fs.createReadStream(filename)
        filestream.on("error", function(e) {
          res.status(500).send(e.message);
        });
        filestream.pipe(res);
      })
    })
    e.app.get('/exists/:paymail', (req, res) => {
      // 'exists'
      let filename = process.cwd() + "/files/" + req.params.paymail
      fs.access(filename, (err) => {
        if (err) {
          res.send("0")
        } else {
          res.send("1")
        }
      })
    })
  },
})
