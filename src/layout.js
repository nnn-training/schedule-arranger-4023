const { html } = require("hono/html");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({ log: ["query"] });
const getColorMode = require("./utils/color-mode");

async function layout(c, title, body) {
  const { user } = c.get("session") ?? {};
  title = title ? `${title} - 予定調整くん` : "予定調整くん";

  // light or dark
  const colorMode = getColorMode(user);

  return html`
    <!doctype html>
    <html data-bs-theme="${colorMode}">
      <head>
        <title>${title}</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="/stylesheets/bundle.css" />
      </head>
      <body>
        <nav class="navbar navbar-expand-md navbar-${colorMode} bg-${colorMode}">
          <div class="container-fluid">
            <a class="navbar-brand" href="/">予定調整くん</a>
            <button
              class="navbar-toggler"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#navbarResponsive"
              aria-controls="navbarResponsive"
              aria-expanded="false"
              aria-label="Toggle navigation"
            >
              <span class="navbar-toggler-icon"></span>
            </button>
            <div id="navbarResponsive" class="collapse navbar-collapse">
              <ul class="navbar-nav ms-auto">
                ${user && html`
                    <li class="nav-item">
                      
                      <a class="nav-link" href="/settings?from=${c.req.path}">
                        <i class="bi bi-gear"></i>
                        設定
                      </a>
                    </li>`
                }

                ${user
                  ? html`
                      <li class="nav-item">
                        <a class="nav-link" href="/logout"
                          >${user.login} をログアウト</a
                        >
                      </li>
                    `
                  : html`
                      <li class="nav-item">
                        <a class="nav-link" href="/login">ログイン</a>
                      </li>
                    `}
              </ul>
            </div>
          </div>
        </nav>
        <div class="container">${body}</div>
        <script src="/javascripts/bundle.js"></script>
      </body>
    </html>
  `;
}

module.exports = layout;
