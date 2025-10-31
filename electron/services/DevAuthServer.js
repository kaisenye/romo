const http = require('http')
const { URL } = require('url')

/**
 * DevAuthServer
 * Localhost callback server for development auth flow
 * More reliable than deep links which don't work in Electron dev mode
 */
class DevAuthServer {
  constructor() {
    this.server = null
    this.port = 54321
    this.authCallback = null
  }

  /**
   * Start the callback server
   * @param {Function} callback - Called with (hashedToken, email) when auth is received
   */
  start(callback) {
    if (this.server) {
      console.log('[DevAuthServer] Already running on port', this.port)
      return Promise.resolve()
    }

    this.authCallback = callback

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        // Enable CORS for localhost
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        // Handle preflight
        if (req.method === 'OPTIONS') {
          res.writeHead(200)
          res.end()
          return
        }

        const url = new URL(req.url, `http://localhost:${this.port}`)

        // Auth callback endpoint
        if (url.pathname === '/auth') {
          const hashedToken = url.searchParams.get('hashed_token')
          const email = url.searchParams.get('email')

          console.log('[DevAuthServer] Received auth:', { email, hasToken: !!hashedToken })

          if (hashedToken && email) {
            // Send success page
            res.writeHead(200, { 'Content-Type': 'text/html' })
            res.end(`
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <title>Authentication Successful</title>
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      min-height: 100vh;
                      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                      padding: 20px;
                    }
                    .container {
                      text-align: center;
                      background: white;
                      padding: 48px;
                      border-radius: 16px;
                      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                      max-width: 400px;
                    }
                    .checkmark {
                      width: 80px;
                      height: 80px;
                      margin: 0 auto 24px;
                    }
                    .checkmark__circle {
                      stroke-dasharray: 166;
                      stroke-dashoffset: 166;
                      stroke-width: 2;
                      stroke: #4CAF50;
                      fill: none;
                      animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
                    }
                    .checkmark__check {
                      transform-origin: 50% 50%;
                      stroke-dasharray: 48;
                      stroke-dashoffset: 48;
                      stroke: #4CAF50;
                      stroke-width: 3;
                      fill: none;
                      animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
                    }
                    @keyframes stroke {
                      100% { stroke-dashoffset: 0; }
                    }
                    h1 {
                      color: #333;
                      font-size: 24px;
                      margin-bottom: 12px;
                      font-weight: 600;
                    }
                    p {
                      color: #666;
                      font-size: 14px;
                      line-height: 1.5;
                    }
                    .email {
                      color: #667eea;
                      font-weight: 500;
                      margin-top: 8px;
                    }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                      <circle class="checkmark__circle" cx="26" cy="26" r="25"/>
                      <path class="checkmark__check" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                    </svg>
                    <h1>✅ Authentication Successful!</h1>
                    <p>You've been signed in to Romo</p>
                    <p class="email">${email}</p>
                    <p style="margin-top: 24px; color: #999; font-size: 13px;">
                      Redirecting to dashboard...
                    </p>
                  </div>
                  <script>
                    // Redirect to dashboard after showing success message
                    setTimeout(() => {
                      window.location.href = 'http://localhost:3000/dashboard';
                    }, 2000);
                  </script>
                </body>
              </html>
            `)

            // Trigger callback
            if (this.authCallback) {
              this.authCallback(hashedToken, email)
            }
          } else {
            res.writeHead(400, { 'Content-Type': 'text/plain' })
            res.end('Bad Request: Missing auth parameters')
          }
          return
        }

        // Health check
        if (url.pathname === '/ping') {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ status: 'ok', service: 'romo-dev-auth' }))
          return
        }

        // 404
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end('Not Found')
      })

      this.server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`[DevAuthServer] Port ${this.port} in use, trying ${this.port + 1}`)
          this.port++
          this.server = null
          this.start(callback).then(resolve).catch(reject)
        } else {
          console.error('[DevAuthServer] Server error:', err)
          reject(err)
        }
      })

      this.server.listen(this.port, '127.0.0.1', () => {
        console.log(`[DevAuthServer] ✅ Auth server started on http://localhost:${this.port}`)
        resolve()
      })
    })
  }

  /**
   * Stop the server
   */
  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('[DevAuthServer] Server stopped')
          this.server = null
          resolve()
        })
      } else {
        resolve()
      }
    })
  }

  /**
   * Get the callback URL for the web app to redirect to
   */
  getCallbackUrl() {
    return `http://localhost:${this.port}/auth`
  }

  /**
   * Check if server is running
   */
  isRunning() {
    return this.server !== null && this.server.listening
  }

  /**
   * Get the port number
   */
  getPort() {
    return this.port
  }
}

// Export singleton
const devAuthServer = new DevAuthServer()
module.exports = devAuthServer
