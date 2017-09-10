var express = require('express');
var router = express.Router();
var http = require('http');
var auth = require('basic-auth')
var async = require('async')
var request = require('request');
var fs = require('fs');
var path = require('path');
var appDir = path.dirname(require.main.filename);
appDir = path.join(appDir, "..");

var starturl = 'logs.spaceshipsin.space';

/* GET home page. */
router.get('/', function(req, res, next) {
  res.writeHead(302, {
    'Location': "/"+starturl
  });
  res.end();
});

router.get('/post', function(req, res, next) {
  var credentials = auth(req)

  if (!credentials || credentials.name !== 'john' || credentials.pass !== 'secret') {
    res.statusCode = 401
    res.setHeader('WWW-Authenticate', 'Basic realm="example"')
    res.end('Access denied')
  } else {
    res.end('Access granted')
  }
})

/* GET home page. */
router.get('/:url', function(req, res, next) {
  var prefix = 'http://';
  var url = req.params.url;
  if (url.substr(0, prefix.length) !== prefix)
  {
      url = prefix + url;
  }
  const options = {
    url :  url,
    json : true
  };
  request(options,
    function(err, rs, parsedData) {
      if (parsedData) {
        fixRotonde(parsedData, req.params.url);
        if (err){
          next();
        } else {
          parsedData.feed.sort(function(a,b){
            return b.time-a.time
          })
          getAll(parsedData.portal, function(feed) {
              parsedData.portalFeed = feed;
              res.render('rotonde', parsedData);
          }, [req.params.url]);
        }
      } else {
        next();
      }
    }
  );
});

function fixRotonde(rotonde, url) {
  var url = url.replace("http://","");
  var defaultRot = JSON.parse(fs.readFileSync(path.join(appDir, "public", "default.json")));
  var defaultPost = JSON.parse(fs.readFileSync(path.join(appDir, "public", "post.json")));
  defaultRot.meta.canonical = url;
  defaultRot.profile.name = url;
  for (var v in defaultRot) {
    if (defaultRot.hasOwnProperty(v)) {
      rotonde[v] = rotonde.getDef(v,defaultRot[v]);
    }
  }
  for (var v in defaultRot.meta){
    if (defaultRot.meta.hasOwnProperty(v)){
      rotonde.meta[v] = rotonde.meta.getDef(v,defaultRot.meta[v]);
    }
  }
  for (var v in defaultRot.profile){
    if (defaultRot.profile.hasOwnProperty(v)){
      rotonde.profile[v] = rotonde.profile.getDef(v,defaultRot.profile[v]);
    }
  }
  for (var i = 0; i < rotonde.feed.length; i++) {
    for (var v in defaultPost){
      if (defaultPost.hasOwnProperty(v)){
        rotonde.feed[i][v] = rotonde.feed[i].getDef(v,defaultPost[v]);
      }
    }
  }
}
function httpGet(url, callback) {
  var prefix = 'http://';
  if (url.substr(0, prefix.length) !== prefix)
  {
      url = prefix + url;
  }
  const options = {
    url :  url,
    json : true
  };
  request(options,
    function(err, res, body) {
      if (typeof body == 'object'){
        fixRotonde(body, url);
        body.url = url;
      }
      callback(err, body);
    }
  );
}

function getAll(rotondes, cb, ignores) {
  ignores.map(function(url){
    return url.replace("http://","");
  });
  async.map(rotondes, httpGet, function (err, res){
    if (err){
      cb([]);
      return;
    } else {
      var feed = []
      console.log("-------");
      for (var v in res) {
        if (res.hasOwnProperty(v)) {
          if (typeof res[v] == 'object' && !ignores.includes(res[v].url.replace("http://",""))) {
              var rot = res[v];
              feed = feed.concat(rot.feed.map(function(post){
                return {
                  url: rot.url,
                  profile: rot.profile,
                  post: post
                }
              }));
          }
        }
      }
      feed.sort(function(a, b){
        return b.post.time-a.post.time;
      })
      feed = feed.slice(0,30);
      cb(feed);
    }
  });
}
Object.prototype.isThing = function(key){
  if (!this.hasOwnProperty(key)){
    return false;
  } else {
    if (this[key])
      return true;
    else
      return false;
  }
}
Object.prototype.getDef = function (key, def) {
  return this.isThing(key) ? this[key] : def;
};


module.exports = router;
