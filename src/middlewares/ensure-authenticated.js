// ページの閲覧に認証を必須にするミドルウェア
function ensureAuthenticated() {
  return async (c, next) => {
    const session = c.get('session');
    if (!session.user) {
      return c.redirect('/login?from=' + c.req.path);
    }
    await next();
  };
}

module.exports = ensureAuthenticated;
