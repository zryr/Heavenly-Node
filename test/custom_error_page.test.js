var assert = require('assert');
var request = require('supertest');
var app = require('../app.js');

describe('Heavenly Custom Error Page & Error Middlewares', function() {
    describe('renderHeavenlyErrorPage HTML generator', function() {
        it('should generate valid Heavenly-themed HTML with status code and title', function() {
            var html = app.renderHeavenlyErrorPage({
                statusCode: 502,
                errorType: 'Server Not Found',
                targetUrl: 'https://example-down-site.com',
                details: 'Heavenly could not resolve the server address.'
            });

            assert.ok(html.includes('<!DOCTYPE html>'), 'Output should be valid HTML5 document');
            assert.ok(html.includes('<title>Heavenly - Error 502</title>'), 'Title should include Heavenly - Error 502');
            assert.ok(html.includes('Server Not Found'), 'Should display error status badge');
            assert.ok(html.includes('https://example-down-site.com'), 'Should display target URL');
            assert.ok(html.includes('Heavenly could not resolve the server address.'), 'Should display error details');
            assert.ok(html.includes('Try Again'), 'Should include Try Again button');
            assert.ok(html.includes('Test Direct Connection (No Proxy)'), 'Should include Test Direct Connection button');
            assert.ok(html.includes('<link rel="icon" type="image/png" href="/assets/heavenly-logo.png">'), 'Should include valid favicon link in head');
            assert.ok(html.includes('src="/assets/heavenly-logo.png"') && html.includes('class="brand-logo-img"'), 'Should render logo image with absolute path');
            assert.ok(html.includes('id="fallback-svg-logo"'), 'Should provide fallback inline SVG logo');
            assert.ok(html.includes('Return to Heavenly Home'), 'Should include Return Home button');
            assert.ok(html.includes("Return to Heavenly Home"), 'Return Home button should be present');
            assert.ok(html.includes('href="/"') && html.includes('(window.location.origin + \'/\')'), 'Return Home button should redirect to root URL');
            assert.ok(html.includes('#030712'), 'Should use Heavenly dark theme background color');
        });

        it('should sanitize HTML special characters in errorType, target URL and details', function() {
            var html = app.renderHeavenlyErrorPage({
                statusCode: 500,
                errorType: '<script>alert("xss")</script>',
                targetUrl: 'https://test.com/<script>alert(1)</script>',
                details: '<b>Error</b> & test'
            });

            assert.ok(!html.includes('<script>alert("xss")</script>'), 'HTML in errorType must be escaped');
            assert.ok(html.includes('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'), 'errorType HTML tags and quotes should be entity encoded');
            assert.ok(!html.includes('<script>alert(1)</script>'), 'HTML in targetUrl must be escaped');
            assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), 'HTML tags should be entity encoded');
            assert.ok(html.includes('&lt;b&gt;Error&lt;/b&gt; &amp; test'), 'Details should be entity encoded');
        });
    });

    describe('serverErrorResponseMiddleware (5xx response interceptor)', function() {
        it('should replace stream with Heavenly error page for 5xx HTML responses', function(done) {
            var data = {
                remoteResponse: { statusCode: 500 },
                contentType: 'text/html',
                url: 'https://broken-server.org/page',
                headers: {}
            };

            app.serverErrorResponseMiddleware(data);

            assert.strictEqual(data.headers['content-type'], 'text/html; charset=utf-8');
            assert.ok(data.headers['content-length'] > 0);

            var chunks = [];
            data.stream.on('data', function(chunk) {
                chunks.push(chunk);
            });
            data.stream.on('end', function() {
                var body = Buffer.concat(chunks).toString('utf8');
                assert.ok(body.includes('Heavenly - Error 500'));
                assert.ok(body.includes('Internal Server Error (500)'));
                assert.ok(body.includes('https://broken-server.org/page'));
                done();
            });
        });

        it('should NOT intercept non-5xx responses', function() {
            var originalStream = {};
            var data = {
                remoteResponse: { statusCode: 200 },
                contentType: 'text/html',
                url: 'https://example.com',
                stream: originalStream,
                headers: {}
            };

            app.serverErrorResponseMiddleware(data);
            assert.strictEqual(data.stream, originalStream);
        });

        it('should NOT intercept non-HTML 5xx responses (e.g. JSON API or image)', function() {
            var originalStream = {};
            var data = {
                remoteResponse: { statusCode: 500 },
                contentType: 'application/json',
                url: 'https://api.example.com/data',
                stream: originalStream,
                headers: {}
            };

            app.serverErrorResponseMiddleware(data);
            assert.strictEqual(data.stream, originalStream);
        });
    });

    describe('heavenlyErrorMiddleware (Express error handler)', function() {
        it('should handle ENOTFOUND errors and return 502 with Heavenly error page', function(done) {
            var err = new Error('getaddrinfo ENOTFOUND invalid-domain-xyz999.com');
            err.code = 'ENOTFOUND';

            var req = { originalUrl: '/proxy/https://invalid-domain-xyz999.com/' };
            var res = {
                headersSent: false,
                statusCode: 200,
                headers: {},
                status: function(code) {
                    this.statusCode = code;
                    return this;
                },
                setHeader: function(k, v) {
                    this.headers[k] = v;
                },
                send: function(body) {
                    assert.strictEqual(this.statusCode, 502);
                    assert.strictEqual(this.headers['Content-Type'], 'text/html; charset=utf-8');
                    assert.ok(body.includes('Heavenly - Error 502'));
                    assert.ok(body.includes('Server Not Found'));
                    assert.ok(body.includes('https://invalid-domain-xyz999.com/'));
                    done();
                }
            };

            app.heavenlyErrorMiddleware(err, req, res, function() {});
        });

        it('should handle ECONNREFUSED errors and return 502 with Heavenly error page', function(done) {
            var err = new Error('connect ECONNREFUSED 127.0.0.1:9999');
            err.code = 'ECONNREFUSED';

            var req = { originalUrl: '/proxy/https://localhost:9999/' };
            var res = {
                headersSent: false,
                statusCode: 200,
                headers: {},
                status: function(code) {
                    this.statusCode = code;
                    return this;
                },
                setHeader: function(k, v) {
                    this.headers[k] = v;
                },
                send: function(body) {
                    assert.strictEqual(this.statusCode, 502);
                    assert.ok(body.includes('Connection Refused'));
                    done();
                }
            };

            app.heavenlyErrorMiddleware(err, req, res, function() {});
        });

        it('should handle ETIMEDOUT errors and return 504 with Heavenly error page', function(done) {
            var err = new Error('connect ETIMEDOUT');
            err.code = 'ETIMEDOUT';

            var req = { originalUrl: '/proxy/https://slow-site.com/' };
            var res = {
                headersSent: false,
                statusCode: 200,
                headers: {},
                status: function(code) {
                    this.statusCode = code;
                    return this;
                },
                setHeader: function(k, v) {
                    this.headers[k] = v;
                },
                send: function(body) {
                    assert.strictEqual(this.statusCode, 504);
                    assert.ok(body.includes('Heavenly - Error 504'));
                    assert.ok(body.includes('Connection Timed Out'));
                    done();
                }
            };

            app.heavenlyErrorMiddleware(err, req, res, function() {});
        });

        it('should handle EAI_AGAIN DNS lookup error and return 502 with Heavenly error page', function(done) {
            var err = new Error('getaddrinfo EAI_AGAIN temp-dns-fail.com');
            err.code = 'EAI_AGAIN';

            var req = { originalUrl: '/proxy/https://temp-dns-fail.com/' };
            var res = {
                headersSent: false,
                statusCode: 200,
                headers: {},
                status: function(code) {
                    this.statusCode = code;
                    return this;
                },
                setHeader: function(k, v) {
                    this.headers[k] = v;
                },
                send: function(body) {
                    assert.strictEqual(this.statusCode, 502);
                    assert.ok(body.includes('Heavenly - Error 502'));
                    assert.ok(body.includes('Server Not Found'));
                    assert.ok(body.includes('https://temp-dns-fail.com/'));
                    assert.ok(body.includes('Heavenly could not connect or resolve the server address at https://temp-dns-fail.com/'));
                    done();
                }
            };

            app.heavenlyErrorMiddleware(err, req, res, function() {});
        });

        it('should handle ESOCKETTIMEDOUT error and return 504 with Heavenly error page', function(done) {
            var err = new Error('socket timed out');
            err.code = 'ESOCKETTIMEDOUT';

            var req = { originalUrl: '/proxy/https://laggy-stream.com/' };
            var res = {
                headersSent: false,
                statusCode: 200,
                headers: {},
                status: function(code) {
                    this.statusCode = code;
                    return this;
                },
                setHeader: function(k, v) {
                    this.headers[k] = v;
                },
                send: function(body) {
                    assert.strictEqual(this.statusCode, 504);
                    assert.ok(body.includes('Heavenly - Error 504'));
                    assert.ok(body.includes('Connection Timed Out'));
                    assert.ok(body.includes('The connection to https://laggy-stream.com/ timed out before a response was received.'));
                    done();
                }
            };

            app.heavenlyErrorMiddleware(err, req, res, function() {});
        });

        it('should handle ECONNRESET error and return 502 with Heavenly error page', function(done) {
            var err = new Error('read ECONNRESET');
            err.code = 'ECONNRESET';

            var req = { originalUrl: '/proxy/https://reset-host.org/' };
            var res = {
                headersSent: false,
                statusCode: 200,
                headers: {},
                status: function(code) {
                    this.statusCode = code;
                    return this;
                },
                setHeader: function(k, v) {
                    this.headers[k] = v;
                },
                send: function(body) {
                    assert.strictEqual(this.statusCode, 502);
                    assert.ok(body.includes('Heavenly - Error 502'));
                    assert.ok(body.includes('Connection Reset'));
                    assert.ok(body.includes('The connection to the target website was unexpectedly reset.'));
                    done();
                }
            };

            app.heavenlyErrorMiddleware(err, req, res, function() {});
        });

        it('should handle EPIPE broken pipe error and return 502 with Heavenly error page', function(done) {
            var err = new Error('write EPIPE');
            err.code = 'EPIPE';

            var req = { originalUrl: '/proxy/https://pipe-drop.com/' };
            var res = {
                headersSent: false,
                statusCode: 200,
                headers: {},
                status: function(code) {
                    this.statusCode = code;
                    return this;
                },
                setHeader: function(k, v) {
                    this.headers[k] = v;
                },
                send: function(body) {
                    assert.strictEqual(this.statusCode, 502);
                    assert.ok(body.includes('Heavenly - Error 502'));
                    assert.ok(body.includes('Connection Reset'));
                    assert.ok(body.includes('The connection to the target website was unexpectedly reset.'));
                    done();
                }
            };

            app.heavenlyErrorMiddleware(err, req, res, function() {});
        });

        it('should handle err.status in range 400-599 and return custom status and message', function(done) {
            var err = new Error('Forbidden resource access');
            err.status = 403;

            var req = { originalUrl: '/proxy/https://protected-area.com/' };
            var res = {
                headersSent: false,
                statusCode: 200,
                headers: {},
                status: function(code) {
                    this.statusCode = code;
                    return this;
                },
                setHeader: function(k, v) {
                    this.headers[k] = v;
                },
                send: function(body) {
                    assert.strictEqual(this.statusCode, 403);
                    assert.ok(body.includes('Heavenly - Error 403'));
                    assert.ok(body.includes('Error 403'));
                    assert.ok(body.includes('Forbidden resource access'));
                    done();
                }
            };

            app.heavenlyErrorMiddleware(err, req, res, function() {});
        });

        it('should fallback to err.errno when err.code is undefined', function(done) {
            var err = { errno: 'ECONNREFUSED', message: 'connection refused' };

            var req = { originalUrl: '/proxy/https://refused-server.com/' };
            var res = {
                headersSent: false,
                statusCode: 200,
                headers: {},
                status: function(code) {
                    this.statusCode = code;
                    return this;
                },
                setHeader: function(k, v) {
                    this.headers[k] = v;
                },
                send: function(body) {
                    assert.strictEqual(this.statusCode, 502);
                    assert.ok(body.includes('Connection Refused'));
                    assert.ok(body.includes('The target server at https://refused-server.com/ refused the connection.'));
                    done();
                }
            };

            app.heavenlyErrorMiddleware(err, req, res, function() {});
        });

        it('should fallback to generic err.message details when error code is unknown', function(done) {
            var err = new Error('Custom SSL Handshake Failure');

            var req = { originalUrl: '/proxy/https://ssl-error.com/' };
            var res = {
                headersSent: false,
                statusCode: 200,
                headers: {},
                status: function(code) {
                    this.statusCode = code;
                    return this;
                },
                setHeader: function(k, v) {
                    this.headers[k] = v;
                },
                send: function(body) {
                    assert.strictEqual(this.statusCode, 502);
                    assert.ok(body.includes('Server Not Found'));
                    assert.ok(body.includes('Custom SSL Handshake Failure'));
                    done();
                }
            };

            app.heavenlyErrorMiddleware(err, req, res, function() {});
        });

        it('should fallback to default details string when err has no message and unknown error code', function(done) {
            var err = {};

            var req = { originalUrl: '/proxy/https://unknown-error.com/' };
            var res = {
                headersSent: false,
                statusCode: 200,
                headers: {},
                status: function(code) {
                    this.statusCode = code;
                    return this;
                },
                setHeader: function(k, v) {
                    this.headers[k] = v;
                },
                send: function(body) {
                    assert.strictEqual(this.statusCode, 502);
                    assert.ok(body.includes('An error occurred while connecting to the requested website through Heavenly Proxy.'));
                    done();
                }
            };

            app.heavenlyErrorMiddleware(err, req, res, function() {});
        });

        it('should delegate error handling to next(err) if res.headersSent is true', function(done) {
            var err = new Error('Header already sent error');
            err.code = 'ECONNRESET';

            var req = { originalUrl: '/proxy/https://sent-headers.com/' };
            var res = { headersSent: true };

            app.heavenlyErrorMiddleware(err, req, res, function(passedErr) {
                assert.strictEqual(passedErr, err);
                done();
            });
        });

        it('should substitute "this website" in error details when targetUrl is missing or empty', function(done) {
            var err = new Error('ENOTFOUND');
            err.code = 'ENOTFOUND';

            var req = { originalUrl: '/' };
            var res = {
                headersSent: false,
                statusCode: 200,
                headers: {},
                status: function(code) {
                    this.statusCode = code;
                    return this;
                },
                setHeader: function(k, v) {
                    this.headers[k] = v;
                },
                send: function(body) {
                    assert.strictEqual(this.statusCode, 502);
                    assert.ok(body.includes('Heavenly could not connect or resolve the server address at this website.'));
                    done();
                }
            };

            app.heavenlyErrorMiddleware(err, req, res, function() {});
        });
    });

    describe('End-to-End HTTP requests to non-existent target URL', function() {
        it('should return Heavenly-themed HTML error page instead of plain text Internal Server Error', function(done) {
            request(app)
                .get('/proxy/https://invalid-nonexistent-domain-test12345.com/')
                .expect('Content-Type', /html/)
                .expect(502)
                .end(function(err, res) {
                    if (err) return done(err);
                    assert.ok(res.text.includes('Heavenly - Error 502'));
                    assert.ok(res.text.includes('Server Not Found'));
                    assert.ok(res.text.includes('https://invalid-nonexistent-domain-test12345.com/'));
                    assert.ok(res.text.includes('Try Again'));
                    assert.ok(res.text.includes('Test Direct Connection (No Proxy)'));
                    assert.ok(res.text.includes('Return to Heavenly Home'));
                    assert.ok(res.text.includes('Return to Heavenly Home'));
                    done();
                });
        });
    });
});
