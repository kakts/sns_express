var express = require('express');
var app = express();
var http = require('http');
var path = require('path');

// db関連
var mongodb = require('mongodb');
var Db = mongodb.Db;
var Server = mongodb.Server;
var server_config = new Server( 'localhost', 27017, {auto_reconnect: true, native_parser: true});
var db = new Db( 'authtest', server_config, {});
var User = new Db('User', server_config, {});
var mongoStore = require('connect-mongodb');
var auth;

// post リクエストボディー関連
var bodyParser = require('body-parser');

// session関連
var cookieParser = require('cookie-parser');
var session = require('express-session');

// viewエンジン、フォルダの設定
app.set('view engine', 'jade');
app.set('views', __dirname + '/views');
// app.engine('html', require('jade').renderFile);

// bodyParserを通さないと req.bodyにパラメータセットされない
app.use(bodyParser());

// cookie関連のミドルウェア設定
// これがないと　　req.sessionはない
// piggpa　すでにある
// どこかでこれを追加している？
// TODO cookieParserとsessionはどう使い分けるか調べる
// http://uchida75cm.hatenablog.com/entry/20110712/1310469113
app.use(cookieParser());

app.use(session({
  secret: 'test',
  cookie: {maxAge: 60000 * 20},
  store: auth = new mongoStore({db: db})
}));

// トップ
// session持っていたらログイン後ページ
// 持ってなかったらlogin にリダイレクト
app.get('/', function(req, res) {
  // auth
  console.log('----auth check');
  console.log(auth);
  console.log('----res');
  console.log(res);
  console.log('----req.session');
  console.log(req.session);
  // dbから
  auth.get(req.session.id, function(err, sess) {
    console.log('---sess');
    console.log(sess);
    if (sess && sess.views) {
      // index.jade のtitleに値を渡す
      res.render('index', {
        title: req.session.userid
      });
    } else {
      res.redirect('/login');
    }
  });
});

// loginフォーム表示
app.get('/login', function(req, res, next) {
  res.render('login');
});

app.post('/test', function(req, res,next) {
  if (id === req.body.id && pass === req.body.pw) {
    req.session.flg = true;
    res.redirect('/');
  }
});

// test
// jsonを返す
app.get('/json', function(req, res, next) {
  // console.log('----', req);
  for (var key in req.query) {
    var a = req.query[key];
    console.log(a);
  }
  //res.send('/test');
  next();
}, function(req, res) {
  res.json({
    a: 123,
    b: 'test'
  });
});

// 認証チェック
// user passチェックして成功したらセッションにuserid viewsを持たせる
app.post('/check', function(req, res) {
  // authtest dbのUserコレクション取得
  var User = db.collection('User');
  console.log('----req');
  console.log(req.body);
  User.findOne({id: req.body.id}, function(err, docs) {
    if (docs != null && docs.passwd === req.body.pw) {
      // 成功
      // sessionにuseridを持たせる方針だとリクエストのたびにuseridだだ漏れ
      // sessionIdを渡して、リクエストのたびにsessionIdをキーに検索して認証チェック
      req.session.userid = req.body.id;
      req.session.views = 1;
      res.redirect('/');
    } else {
      // ログイン失敗
      // errorメッセージもビューに渡す
      res.render('login', {
        title: 'login',
        message: 'login form',
        error_message: 'password failed'
      });
    }
  });
});

// ログアウト処理
// 要はセッションをdestroyさせる
app.get('/logout', function(req, res) {
  // mongodbのセッションストアに対してdestroyの処理を行う
  auth.destroy(req.session.id, function(err) {
    req.session.destroy();
    console.log('deleted session');
    res.redirect('/');
  });
});

var server = app.listen(3000, function() {
  var host = server.address().address;
  var port = server.address().port;
  console.log('example app listening at http://%s:%s', host, port);
});
