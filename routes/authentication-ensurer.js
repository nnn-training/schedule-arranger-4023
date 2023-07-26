'use strict';

function ensure(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  // 未ログイン時にアクセスされたurlにログイン時にリダイレクトする
  // 認証失敗時にどこにアクセスしようとしたのかをURLに含めてリダイレクトさせる
  // req.originalUrlにはリクエストされたパス部分のみが入ります
  res.redirect('/login?from=' + req.originalUrl);
}

module.exports = ensure;
