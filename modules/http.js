'use strict';

let express = require('express')

module.exports = class Http {
    constructor(config, ta, signalHttp, backtest) {
        this.config = config
        this.ta = ta
        this.signalHttp = signalHttp
        this.backtest = backtest
    }

    start() {
        let periods = ['15m', '1h'];

        var twig = require("twig"),
            express = require('express'),
            app = express();

        twig.extendFilter('price_format', function(value) {
            if (parseFloat(value) < 1) {
                return Intl.NumberFormat('en-US', {useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 6}).format(value)
            }

            return Intl.NumberFormat('en-US', {useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2}).format(value)
        });

        app.set('twig options', {
            allow_async: true,
            strict_variables: true
        });

        app.use(express.urlencoded())
        app.use(express.static(__dirname + '/../web/static'))

        let ta = this.ta

        app.get('/', (req, res) => {
            ta.getTaForPeriods(periods).then((result) => {
                res.render('../templates/base.html.twig', result);
            })
        });

        app.get('/backtest', async (req, res) => {
            res.render('../templates/backtest.html.twig', {
                'strategies': this.backtest.getBacktestStrategies(),
                'pairs': this.backtest.getBacktestPairs(),
            });
        });

        app.post('/backtest/submit', async (req, res) => {
            let pair = req.body.pair.split('.')

            res.render('../templates/backtest_submit.html.twig', await this.backtest.getBacktestResult(
                parseInt(req.body['ticker_interval']),
                req.body.hours,
                req.body.strategy,
                pair[0],
                pair[1],
                req.body.options ? JSON.parse(req.body.options) : {}
            ));
        });

        app.get('/tradingview/:symbol', (req, res) => {
            res.render('../templates/tradingview.html.twig', {
                symbol: req.params.symbol,
            });
        });

        app.get('/signals', async (req, res) => {
            res.render('../templates/signals.html.twig', {
                signals: await this.signalHttp.getSignals(Math.floor(Date.now() / 1000) - (60 * 60 * 48)),
            });
        });


        let port = this.config.webserver.port || 8080;

        app.listen(port);

        console.log('Webserver listening on: ' + port)
    }
};