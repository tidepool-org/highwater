/*
 == BSD2 LICENSE ==
 Copyright (c) 2014, Tidepool Project

 This program is free software; you can redistribute it and/or modify it under
 the terms of the associated License, which is identical to the BSD 2-Clause
 License as published by the Open Source Initiative at opensource.org.

 This program is distributed in the hope that it will be useful, but WITHOUT
 ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 FOR A PARTICULAR PURPOSE. See the License for more details.

 You should have received a copy of the License along with this program; if
 not, you can obtain one from Tidepool Project at tidepool.org.
 == BSD2 LICENSE ==
 */

'use strict';

var _ = require('lodash');
var restify = require('restify');
var moment = require('moment');

var log = require('./log.js')('highwaterService.js');

function createServer(serverConfig, highwaterApi, userApiClient) {
  log.info('Creating server[%s]', serverConfig.name);
  var retVal = restify.createServer(serverConfig);
  retVal.use(restify.queryParser());
  retVal.use(restify.bodyParser());

  var userAPIMiddleware = require('user-api-client').middleware;
  var checkTokenInternal = userAPIMiddleware.checkToken(userApiClient, userAPIMiddleware.TidepoolInternalScope);

  //health check
  retVal.get('/status', highwaterApi.status);

  // manage the private information
  if (serverConfig.noauth) {
    log.info('adding noauth endpoint because config parameter was set.');
    retVal.get('/noauth/:userid/:eventname', highwaterApi.named_user);
  }
  retVal.get('/user/:userid/:eventname', checkTokenInternal, highwaterApi.named_user);
  retVal.get('/thisuser/:eventname', checkTokenInternal, highwaterApi.token_user);
  retVal.get('/server/:servername/:eventname', checkTokenInternal, highwaterApi.server_user);

  retVal.on('uncaughtException', function (req, res, route, err) {
    log.error(err, 'Uncaught exception on route[%s]!', route.spec ? route.spec.path : 'unknown');
    res.send(500);
  });

  return retVal;
}

module.exports = function highwaterService(userApiClient, envConfig) {
  var server = null;
  var servicePort = null;

  var clients = [];

  if (!_.isEmpty(envConfig.apikey)) {
    var kissClient = require('./kiss/kissClient.js')(
      envConfig.apikey, envConfig.metricshost);
    clients.push(kissClient);

    if (!_.isEmpty(envConfig.ucsf)) {
      var filteredKissClient = require('./kiss/filteredKissClient.js')(
        function (user) {
          return _.contains(envConfig.ucsf.whitelist, user);
        },
        require('./kiss/kissClient.js')(envConfig.ucsf.apikey, envConfig.metricshost)
      );
      clients.push(filteredKissClient);
    }
  }

  var metricsClient = require('./compositeClient.js')(clients);

  var highwaterApi = require('./routes/highwaterApi')(userApiClient, metricsClient, envConfig.saltDeploy);

  //create the server depending on the type
  if (envConfig.httpPort != null) {
    servicePort = envConfig.httpPort;
    server = createServer({
      name: 'HighwaterHttp',
      noauth: envConfig.noauth,
      metricsToken: envConfig.metricsToken
    }, highwaterApi, userApiClient);
  }

  if (envConfig.httpsPort != null) {
    servicePort = envConfig.httpsPort;
    server = createServer(_.extend({
      name: 'HighwaterHttps',
      noauth: envConfig.noauth,
      metricsToken: envConfig.metricsToken
    }, envConfig.httpsConfig), highwaterApi, userApiClient);
  }

  return {
    close: function () {
      log.info('Stopping the Highwater API server');
      server.close();
    },
    start: function (cb) {
      log.info('Start Highwater API server serving on port[%s]', servicePort);
      server.listen(servicePort, cb);
    }
  };
};
