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

// We use an in-memory cache for tokens; if we ever have multiple deploys of this
// endpoint, they wouldn't share the cache, but right now we don't think that matters.
var tokencache = {};
var duration = 900; // how long in seconds that the token cache lasts
var sessionTokenHeader = 'x-tidepool-session-token';


function createServer(serverConfig, highwaterApi, userApiClient) {
  log.info('Creating server[%s]', serverConfig.name);
  var retVal = restify.createServer(serverConfig);
  retVal.use(restify.plugins.queryParser());
  retVal.use(restify.plugins.bodyParser());

  var userApiMiddleware = require('user-api-client').middleware;
  var checkToken = userApiMiddleware.checkToken(userApiClient);

  function requireServerToken(req, res, next) {
    if (req._tokendata != null && req._tokendata.isserver) {
      return next();
    }
    log.error('requireServerToken failed. uid=%s isserver=%s', req._tokendata.userid, req._tokendata.isserver);
    res.send(401, 'Insufficient Permissions');
    return next(false);
  }

  function requireUserToken(req, res, next) {
    if (req._tokendata != null && !req._tokendata.isserver) {
      return next();
    }
    log.error('requireUserToken failed. uid=%s isserver=%s', req._tokendata.userid, req._tokendata.isserver);
    res.send(401, 'Insufficient Permissions');
    return next(false);
  }

  // memoizes the checkToken middleware; won't cache error returns
  function memoized_checkToken(req, res, next) {
    var sessionToken = req.headers[sessionTokenHeader];
    // if the metricsToken was used, set up dummy token data
    if (serverConfig.metricsToken && serverConfig.metricsToken === sessionToken) {
      req._sessionToken = sessionToken;
      req._tokendata = {userid: 'noUserID', isserver: true};
      return next();
    }

    // we return the cached, unexpired token data
    var now = moment();
    if (sessionToken in tokencache && tokencache[sessionToken].expires >= now) {
      req._sessionToken = sessionToken;
      req._tokendata = tokencache[sessionToken].tokendata;
      return next();
    } else {
      // It wasn't validly in the cache, so we have to run the checkToken function.
      // To get control after calling the middleware, we need to wrap next() and
      // pass that in to checkToken.
      var wrapped_next = function(err) {
        if (arguments.length !== 0) {
          log.error('bad token (1) passed to metrics %s', sessionToken);
          return next(err);
        } else if (!req._tokendata) {
          log.error('bad token (2) passed to metrics %s', sessionToken);
          return next(false);
        } else {
          // if we get here, the req has been modified
          tokencache[sessionToken] = {
            tokendata: req._tokendata,
            expires: now.add(duration, 'seconds')
          };
          return next();
        }
      };
      // log.info('checking token %s', sessionToken);
      // now we can call the middleware but give it our wrapped_next()
      checkToken(req, res, wrapped_next);
      // whenever we get a cache miss, let's look for cache entries that have expired and delete them
      // log.info('before tokencache contains %d items', Object.keys(tokencache).length);
      tokencache = _.omit(tokencache, function(value, key) {
        return (tokencache[key].expires < now);
      });
    }
  }

  //health check
  retVal.get('/status', highwaterApi.status);

  // manage the private information
  if (serverConfig.noauth) {
    log.info('adding noauth endpoint because config parameter was set.');
    retVal.get('/noauth/:userid/:eventname', highwaterApi.named_user);
  }
  retVal.get('/user/:userid/:eventname', memoized_checkToken, highwaterApi.named_user);
  retVal.get('/thisuser/:eventname', memoized_checkToken, requireUserToken, highwaterApi.token_user);
  retVal.get('/server/:servername/:eventname', memoized_checkToken, requireServerToken, highwaterApi.server_user);

  retVal.on('uncaughtException', function(req, res, route, err){
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
        function(user) {
          return _.contains(envConfig.ucsf.whitelist, user);
        },
        require('./kiss/kissClient.js')(envConfig.ucsf.apikey, envConfig.metricshost)
      );
      clients.push(filteredKissClient);
    }
  }

  var metricsClient = require('./compositeClient.js')(clients);

  var highwaterApi = require('./routes/highwaterApi')(
    userApiClient, metricsClient, envConfig.saltDeploy);

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
