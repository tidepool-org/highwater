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
var crypto = require('crypto-js');
var log = require('../log.js')('highwaterApi.js');

var request = require('request');

/*
 Http interface for group-api
 */
module.exports = function (userApiClient, metricshost, apikey, salt) {

  /*
   HELPERS
   */

  function store_metrics(req, res, next) {
    // first, continue things so we're not waiting around for KISSmetrics to finish
    res.send(200);

    // fill in the required parameters
    var parms = {
      _p: req._user,
      _k: apikey,
      _n: req.params.eventname
    };
    // do the timestamp if it's specified
    var args = _.clone(req.query);
    log.info('metrics');
    log.info(req.query);
    log.info(req.params);
    if (args.timestamp) {
      parms._t = args.timestamp;
      parms._d = 1;
      delete(args.timestamp);
    }

    // copy the rest of the query parameters
    for (var arg in args) {
      parms[arg] = args[arg];
    }

    // build the query to kissmetrics
    var reqOptions = {
      uri: metricshost,
      qs: parms,
      method: 'GET',
    };

    // and do the request
    log.debug(reqOptions);
    request(reqOptions, function (error, response, body) {
      // doesn't matter if it worked, get on with our lives.
      return next();
    });
  }

  function hash_id(userid, len) {
    var hash = crypto.algo.SHA1.create();
    hash.update(salt);
    hash.update(userid);
    return hash.finalize().toString().substr(0, len);
  }

  return {
    /** HEALTH CHECK **/
    status: function (req, res, next) {
      log.debug('status: params[%j], url[%s], method[%s]', req.params, req.url, req.method);
      res.send(200, '"OK"');
    },

    /*
     IMPLEMENTATIONS OF METHODS
     */
    named_user: function (req, res, next) {
      log.debug('named_user: params[%j], url[%s], method[%s]', req.params, req.url, req.method);
      req._user = hash_id(req.params.userid, 10);
      store_metrics(req, res, next);
    },

    token_user: function (req, res, next) {
      log.debug('token_user: params[%j], url[%s], method[%s]', req.params, req.url, req.method);
      req._user = hash_id(req._tokendata.userid, 10);
      store_metrics(req, res, next);
    },

    server_user: function (req, res, next) {
      log.debug('server_user: params[%j], url[%s], method[%s]', req.params, req.url, req.method);
      req._user = req.params.servername;
      store_metrics(req, res, next);
    }
  };
};
